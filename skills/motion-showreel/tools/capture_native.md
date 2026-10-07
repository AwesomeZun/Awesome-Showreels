# Native apps and devices: capture, then turn captures into layers

Use this when the product is not a web page: a desktop app, an iOS or Android app, a device. Web UIs (including
desktop web apps) go through `capture_ui.mjs`, which gives exact element rects and text rows from the DOM; native
captures are rasters, so rects and rows come from measurement (`capture_ui.mjs --textfree`, below).

The rules from `references/capture.md` apply unchanged: capture **layers** of **reachable** states, with demo data and
no personal data, and keep a sidecar that says where every pixel came from.

## 0. Before any capture

- **Clean state.** Demo account, demo data, no notifications, no real names/e-mails/tokens on screen. Close other
  windows. Hide the cursor unless the cursor is the story.
- **Fixed look.** Light or dark appearance chosen from `style.json` (`layout.theme`) or from the product's own default;
  the same locale and clock for every shot of one reel.
- **Size for the reel.** Decide where the capture lands (a phone screen 412x828 CSS px under a drawn 44 px status bar,
  a laptop window 1440x900, ...) and capture at an integer multiple (2x or 3x) of that size, so 1 capture px maps to a
  whole number of reel px.
- **Write the sidecar as you go** (section 4): device, OS version, app version, time, what was staged.

## 1. macOS

**Permission.** Window and screen captures need *System Settings > Privacy & Security > Screen & System Audio
Recording* for the app that runs the command (Terminal, iTerm, the IDE). Without it `screencapture -l` fails with
"could not create image from window" (or captures only the wallpaper). Window *titles* in the list below also need it.
Window resizing via System Events needs *Accessibility*.

**List windows** (ids for `-l`). Save as `windows.swift`, compile once with `swiftc -O windows.swift -o windows`:

```swift
import CoreGraphics
let opts: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
let list = (CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]]) ?? []
for w in list where (w[kCGWindowLayer as String] as? Int) == 0 {
  let id = w[kCGWindowNumber as String] as? Int ?? 0
  let app = w[kCGWindowOwnerName as String] as? String ?? "?"
  let title = w[kCGWindowName as String] as? String ?? ""
  let b = w[kCGWindowBounds as String] as? [String: Double] ?? [:]
  print("\(id)\t\(app)\t\(title)\t\(Int(b["X"] ?? 0)),\(Int(b["Y"] ?? 0)) \(Int(b["Width"] ?? 0))x\(Int(b["Height"] ?? 0))")
}
```

**Size the window exactly** (points; Retina captures are 2x pixels):

```bash
osascript -e 'tell application "System Events" to tell process "AppName" to set size of window 1 to {1440, 900}' \
          -e 'tell application "System Events" to tell process "AppName" to set position of window 1 to {80, 60}'
```

**Capture.**

```bash
screencapture -x -o -l <id> win.png        # one window, no shadow (-o), no sound (-x); 2x on Retina
screencapture -x -l <id> win-shadow.png    # with the macOS window shadow on a transparent margin (alpha PNG)
screencapture -x -R 80,60,1440,900 region.png   # a screen rect in points (x,y,w,h)
screencapture -x -T 3 -l <id> later.png    # after a 3 s delay (open a menu, hover a control first)
screencapture -v -V 8 -R 80,60,1440,900 clip.mov   # screen video of a rect for 8 s (-k shows clicks)
```

The shadowed window PNG composites directly over a reel background; for a 3D-tilted window prefer `-o` and let
`quad.js` (`Quad.drawPanel`, `shadow`/`reflection`) draw a shadow that follows the tilt.

**Appearance** (revert afterwards): `osascript -e 'tell application "System Events" to tell appearance preferences
to set dark mode to true'`. For a clean desktop behind region captures, use a plain wallpaper or capture windows only.

## 2. iOS Simulator (Xcode command line tools: `xcrun simctl`)

```bash
xcrun simctl list devices available                 # pick a device
xcrun simctl boot "iPhone 16 Pro" && open -a Simulator
xcrun simctl bootstatus booted -b                   # wait until booted
xcrun simctl install booted path/to/App.app && xcrun simctl launch booted com.example.app
xcrun simctl openurl booted "https://example.com/app"   # web apps / deep links
xcrun simctl ui booted appearance light            # or dark
xcrun simctl status_bar booted override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
     --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl io booted screenshot --type=png --mask=alpha shot.png   # rounded screen corners as alpha
xcrun simctl io booted recordVideo --codec=h264 --mask=alpha clip.mov  # stop with Ctrl-C
xcrun simctl status_bar booted clear               # restore
```

- Locale per launch: `xcrun simctl launch booted com.example.app -AppleLanguages "(ko)" -AppleLocale ko_KR`.
- Screenshots are device pixels (3x on Pro iPhones): 1206x2622 for a 402x874-point screen. Divide by the scale to get
  points (= CSS px in the reel's phone).
- Status bar: either crop it away (top safe area, about 54-62 pt on Dynamic Island devices) and let the reel draw its
  own, or keep the overridden one (then the reel must not draw a second one). State which in the sidecar.

## 3. Android (emulator or device: `adb`)

```bash
adb devices
adb shell wm size; adb shell wm density              # e.g. 1080x2400 @ 420 dpi -> scale 420/160 = 2.625
adb shell cmd uimode night no                        # or yes
adb shell settings put global sysui_demo_allowed 1   # clean status bar (demo mode)
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb exec-out screencap -p > shot.png                 # exec-out keeps the PNG binary-safe
adb shell screenrecord --time-limit 15 --bit-rate 12000000 /sdcard/clip.mp4 && adb pull /sdcard/clip.mp4
adb shell am broadcast -a com.android.systemui.demo -e command exit
```

Locale: set it in the emulator's settings or start the app with a locale-aware intent; keep it fixed for the reel.

## 4. Turn captures into layers

A native screenshot is one flat raster; the reel wants the same layers a web capture gives.

1. **Crop layers** at integer device-pixel rects and record each rect in **points** (device px / scale) relative to
   the screen's top-left (below the status bar if the reel draws its own):

   ```bash
   magick shot.png -crop 1050x330+78+360 +repage bubble.png       # device px: w x h + x + y
   ```

   ```json
   {"kind": "element", "file": "bubble.png", "screen": {"x": 26, "y": 120, "w": 350, "h": 110}, "dpr": 3,
    "radius": [22, 22, 6, 22], "source": {"device": "iPhone 16 Pro (Simulator)", "os": "iOS 18.0", "app": "1.4.2",
    "capturedAt": "2026-10-07T09:41:00Z", "statusBar": "overridden 9:41", "staged": "demo account"}}
   ```

   Keep the sidecars in one folder per screen (`P/assets/captures/ui/<screen>/`), like `capture_ui.mjs` output, so
   scenes place every layer the same way (`screen` rect at 1 point = 1 reel px; image px = points x dpr).
2. **Text-free copy + text rows** for typing reveals (any raster):

   ```bash
   node tools/capture_ui.mjs --textfree bubble.png --out bubble.textfree.png --roi 40,30,980,270 --dpr 3
   ```

   Writes `bubble.textfree.png`, `bubble.mask.png`, `bubble.rows.png` (QA overlay) and `bubble.rows.json` (rows in
   points). `--roi` (device px) confines the search to the text area: without it every edge counts as text. Rows are
   found from the raster, then each row's background is rebuilt from the bands above and below it (works for light or
   dark text of any size). Check the overlay: the boxes must hug each text line; the text-free copy must show no
   ghost glyphs (raise `--threshold`, default 36, for noisy backgrounds; `--fill telea` for textured ones).
3. **States** come from separate screenshots of the same screen (identical framing): one file per state, cropped with
   the same rect. Verify alignment by differencing two states outside the changing region (should be ~0).
4. **Video to states**: extract stills at the moments that matter instead of playing the recording back:
   `ffmpeg -i clip.mov -vf "select='eq(n,0)+gt(scene,0.02)',showinfo" -fps_mode vfr states/%03d.png` (first frame +
   every visual change; `showinfo` logs each kept frame's `pts_time`), or
   `ffmpeg -ss 2.4 -i clip.mov -frames:v 1 state.png`. Recordings carry the real timing; note the timestamps in the
   sidecar if the reel reproduces them.
5. **Device frame**: draw the phone/laptop in vector (engine `PHONE`, motion-recipes "Real UI in a device") and
   clip the layers to the screen's rounded rect; `--mask=alpha` screenshots already carry the corner alpha.

## 5. QA and provenance

- Contact sheet of every layer; full-resolution check of each text-free copy and rows overlay.
- Recompose the full screen from its layers at 1x and difference it against the original screenshot (mean error
  should be ~1/255 apart from glyph-edge resampling).
- No personal data, no real customer data, no third-party UI shown as yours.
- Sidecar fields: device, OS, app version, capture time, status bar (real / overridden / drawn by the reel), what was
  staged (demo data, persona), crop rects. The credits can then say "Real app UI (iOS Simulator, demo account)".
