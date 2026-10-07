// lift.swift - subject lifting with macOS Vision (VNGenerateForegroundInstanceMaskRequest, macOS 14+).
//
// Build:  swiftc -O lift.swift -o lift      (prep_assets.py compiles and caches this automatically)
// Usage:  lift <input-image> <out-prefix> [options]
//
// Outputs (input resolution, EXIF orientation applied, sRGB):
//   <prefix>_all.png        RGBA, every detected subject instance
//   <prefix>_<i>.png        RGBA, one per instance (Vision's 1-based index) when there are 2+ instances,
//                           or always with --instances
//   <prefix>_all_mask.png   soft alpha mask, 8-bit gray, exact values (with --masks);
//   <prefix>_<i>_mask.png   the same per instance
// Options:
//   --masks        also write soft masks (no colour management; byte = round(mask * 255))
//   --no-images    skip the RGBA images (use with --masks when compositing yourself)
//   --instances    per-instance files even when there is only one instance
//   --crop         crop RGBA images to the instance extent (JSON bboxes stay in full-frame pixels)
//   --min-area F   no per-instance files for instances covering < F of the frame (default 0.0005)
//   --list         analyse only, write no files
//   --json         print a JSON summary on stdout; log lines go to stderr
// JSON: {"input","width","height","count",
//        "all":{"bbox":[x,y,w,h],"area","edgePx":{"top","bottom","left","right"},"image"?,"mask"?},
//        "instances":[{"index","bbox","area","edgePx","skipped"?,"image"?,"mask"?}, ...]}
//   bbox: pixels with mask > 0.05 (top-left origin). area: mean mask value over the frame (0..1).
//   edgePx: pixels with mask > 0.5 in the outer 2 px of each frame side (> 0 means the subject may be cut off).
// Exit codes: 0 ok, 1 usage, 2 unreadable input, 3 no subject found, 4 Vision failure or macOS < 14.

import CoreImage
import CoreVideo
import Foundation
import ImageIO
import Vision

let usage = """
  usage: lift <input-image> <out-prefix> [--masks] [--no-images] [--instances] [--crop]
              [--min-area F] [--list] [--json]
  """

func say(_ s: String) { FileHandle.standardError.write((s + "\n").data(using: .utf8)!) }
func fail(_ code: Int32, _ s: String) -> Never { say(s); exit(code) }

// ---------- arguments ----------
var positional: [String] = []
var wantMasks = false, wantImages = true, forceInstances = false, crop = false
var listOnly = false, asJSON = false
var minArea = 0.0005
var argv = CommandLine.arguments.dropFirst().makeIterator()
while let a = argv.next() {
  switch a {
  case "--masks": wantMasks = true
  case "--no-images": wantImages = false
  case "--instances": forceInstances = true
  case "--crop": crop = true
  case "--list": listOnly = true
  case "--json": asJSON = true
  case "--min-area":
    guard let v = argv.next(), let f = Double(v) else { fail(1, "--min-area needs a number\n" + usage) }
    minArea = f
  case "-h", "--help":
    print(usage)
    exit(0)
  default:
    if a.hasPrefix("--") { fail(1, "unknown option \(a)\n" + usage) }
    positional.append(a)
  }
}
if listOnly { wantMasks = false; wantImages = false }
guard positional.count == 2 || (listOnly && positional.count == 1) else { fail(1, usage) }
let inPath = positional[0]
let prefix = positional.count > 1 ? positional[1] : ""
if !listOnly && !prefix.isEmpty {  // create the output folder of the prefix
  let dir = (prefix as NSString).deletingLastPathComponent
  if !dir.isEmpty { try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true) }
}

// human-readable lines go to stdout unless stdout carries JSON
func note(_ s: String) { if asJSON { say(s) } else { print(s) } }

// ---------- mask analysis ----------
struct MaskInfo {
  var w = 0, h = 0
  var bbox = [0, 0, 0, 0]
  var area = 0.0
  var edge = ["top": 0, "bottom": 0, "left": 0, "right": 0]
  var gray: [UInt8] = []
}

func analyse(_ pb: CVPixelBuffer) -> MaskInfo {
  CVPixelBufferLockBaseAddress(pb, .readOnly)
  defer { CVPixelBufferUnlockBaseAddress(pb, .readOnly) }
  var m = MaskInfo()
  let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb)
  let rowBytes = CVPixelBufferGetBytesPerRow(pb)
  let fmt = CVPixelBufferGetPixelFormatType(pb)
  guard let base = CVPixelBufferGetBaseAddress(pb) else { fail(4, "mask buffer has no data") }
  m.w = w
  m.h = h
  m.gray = [UInt8](repeating: 0, count: w * h)
  var x0 = w, y0 = h, x1 = -1, y1 = -1
  var sum = 0.0
  for y in 0..<h {
    let row = base.advanced(by: y * rowBytes)
    for x in 0..<w {
      var v: Float
      switch fmt {
      case kCVPixelFormatType_OneComponent32Float: v = row.load(fromByteOffset: x * 4, as: Float.self)
      case kCVPixelFormatType_OneComponent16Half: v = Float(row.load(fromByteOffset: x * 2, as: Float16.self))
      case kCVPixelFormatType_OneComponent8: v = Float(row.load(fromByteOffset: x, as: UInt8.self)) / 255
      default: fail(4, "unexpected mask pixel format \(fmt)")
      }
      v = min(max(v, 0), 1)
      let b = UInt8((v * 255).rounded())
      m.gray[y * w + x] = b
      sum += Double(v)
      if b > 12 {
        if x < x0 { x0 = x }
        if x > x1 { x1 = x }
        if y < y0 { y0 = y }
        if y > y1 { y1 = y }
      }
      if v > 0.5 {
        if y < 2 { m.edge["top"]! += 1 }
        if y >= h - 2 { m.edge["bottom"]! += 1 }
        if x < 2 { m.edge["left"]! += 1 }
        if x >= w - 2 { m.edge["right"]! += 1 }
      }
    }
  }
  m.area = sum / Double(max(w * h, 1))
  if x1 >= x0 && y1 >= y0 { m.bbox = [x0, y0, x1 - x0 + 1, y1 - y0 + 1] }
  return m
}

// ---------- writers ----------
func writeGray(_ m: MaskInfo, _ path: String) throws {
  let data = Data(m.gray) as CFData
  guard let provider = CGDataProvider(data: data),
    let img = CGImage(
      width: m.w, height: m.h, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: m.w,
      space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue),
      provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent),
    let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, "public.png" as CFString, 1, nil)
  else { throw NSError(domain: "lift", code: 1, userInfo: [NSLocalizedDescriptionKey: "cannot create \(path)"]) }
  CGImageDestinationAddImage(dest, img, nil)
  if !CGImageDestinationFinalize(dest) {
    throw NSError(domain: "lift", code: 2, userInfo: [NSLocalizedDescriptionKey: "cannot write \(path)"])
  }
}

let ciContext = CIContext()
let sRGB = CGColorSpace(name: CGColorSpace.sRGB)!

@available(macOS 14.0, *)
func writeMasked(_ obs: VNInstanceMaskObservation, _ handler: VNImageRequestHandler, _ set: IndexSet, _ path: String)
  throws
{
  let buf = try obs.generateMaskedImage(ofInstances: set, from: handler, croppedToInstancesExtent: crop)
  try ciContext.writePNGRepresentation(
    of: CIImage(cvPixelBuffer: buf), to: URL(fileURLWithPath: path), format: .RGBA8, colorSpace: sRGB)
}

// ---------- main ----------
@available(macOS 14.0, *)
func run() {
  let url = URL(fileURLWithPath: inPath)
  guard let image = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]) else {
    fail(2, "cannot read \(inPath)")
  }
  let W = Int(image.extent.width.rounded()), H = Int(image.extent.height.rounded())
  let handler = VNImageRequestHandler(ciImage: image, options: [:])
  let request = VNGenerateForegroundInstanceMaskRequest()
  do { try handler.perform([request]) } catch { fail(4, "Vision request failed: \(error.localizedDescription)") }

  var summary: [String: Any] = ["input": inPath, "width": W, "height": H, "count": 0, "instances": [Any]()]
  guard let obs = request.results?.first, !obs.allInstances.isEmpty else {
    if asJSON { emit(summary) }
    fail(3, "no subject found in \(inPath)")
  }
  let all = obs.allInstances
  summary["count"] = all.count

  let perInstanceFiles = all.count > 1 || forceInstances

  // index 0 = the union of all instances
  func describe(_ set: IndexSet, _ name: String, index: Int) throws -> [String: Any] {
    let m = analyse(try obs.generateScaledMaskForImage(forInstances: set, from: handler))
    if m.w != W || m.h != H { say("warning: mask is \(m.w)x\(m.h), image is \(W)x\(H)") }
    let area = NSDecimalNumber(string: String(format: "%.6f", m.area))  // plain decimals in the JSON
    var d: [String: Any] = ["bbox": m.bbox, "area": area, "edgePx": m.edge]
    var write = true
    if index > 0 {
      d["index"] = index
      if m.area < minArea { d["skipped"] = true }  // too small for its own files (specks, stray sparkles)
      write = perInstanceFiles && m.area >= minArea
    }
    if write && wantImages {
      let p = prefix + "_\(name).png"
      try writeMasked(obs, handler, set, p)
      d["image"] = p
      note("wrote \(p)")
    }
    if write && wantMasks {
      let p = prefix + "_\(name)_mask.png"
      try writeGray(m, p)
      d["mask"] = p
      note("wrote \(p)")
    }
    return d
  }

  do {
    summary["all"] = try describe(all, "all", index: 0)
    summary["instances"] = try all.map { try describe(IndexSet(integer: $0), "\($0)", index: $0) }
  } catch {
    fail(4, "mask generation or writing failed: \(error.localizedDescription)")
  }
  if asJSON { emit(summary) } else { print("instances: \(all.count)") }
}

func emit(_ obj: [String: Any]) {
  let opts: JSONSerialization.WritingOptions = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
  let data = try! JSONSerialization.data(withJSONObject: obj, options: opts)
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}

if #available(macOS 14.0, *) {
  run()
} else {
  fail(4, "lift needs macOS 14 or later (VNGenerateForegroundInstanceMaskRequest)")
}
