<div align="center">

# 🎬 Awesome Showreels

**리포지토리, README, 논문, 발표 자료, 웹사이트 무엇이든 프리미엄 2D 모션그래픽 쇼릴로 만들어 주는 [Claude Code](https://claude.com/claude-code) 스킬입니다. 룩은 원본 자료에서 끌어내고, 증거는 실제로 캡처하며, 모든 히트는 박자에 맞춥니다. 컷마다 MP4 한 편과 파일 하나로 완결되는 HTML 플레이어를 만듭니다.**

[🇺🇸 English](README.md) · [빠른 설치](#-빠른-설치) · [예제](#-예제-실행하기) · [작동 방식](#-작동-방식) · [사례](#-사례)

<img src="https://img.shields.io/github/stars/AwesomeZun/Awesome-Showreels?style=flat-square&color=f5c2e7" alt="Stars"/>
<img src="https://img.shields.io/badge/Claude%20Code-skill%20%2B%20plugin-cba6f7?style=flat-square" alt="Claude Code skill"/>
<img src="https://img.shields.io/badge/output-MP4%20%2B%20single--file%20HTML-89b4fa?style=flat-square" alt="MP4 + single-file HTML"/>
<img src="https://img.shields.io/badge/music-synthesized%20on%20the%20beat-94e2d5?style=flat-square" alt="Synthesized music"/>
<img src="https://img.shields.io/badge/narration-Gemini%20TTS%20(optional)-a6e3a1?style=flat-square" alt="Gemini TTS"/>
<img src="https://img.shields.io/badge/license-MIT-fab387?style=flat-square" alt="MIT"/>

<br/><br/>

<img src="assets/demo-playful-app-v1.1.0.gif" alt="Mochi Notes: 발랄한 앱 README가 봉제 마스코트와 실제 앱 화면이 나오는 파스텔 쇼릴이 되었습니다" width="410"/>
<img src="assets/demo-research-cli-v1.1.0.gif" alt="spark-bench: 건조한 연구용 CLI README가 실제 터미널 캡처가 나오는 어두운 데이터 쇼릴이 되었습니다" width="410"/>

<sub>같은 스킬, 다른 원본, 다른 쇼릴: 발랄한 앱 README → 통통 튀는 파스텔 마스코트 쇼릴 · 건조한 연구용 CLI → 어두운 데이터 쇼릴<br/>▶ 소리와 함께 보기: <a href="assets/demo-playful-app-v1.1.0.mp4">demo-playful-app-v1.1.0.mp4</a> · <a href="assets/demo-research-cli-v1.1.0.mp4">demo-research-cli-v1.1.0.mp4</a></sub>

</div>

---

## 주요 특징

- 🎨 **스타일은 원본 자료를 따릅니다.** 프리셋은 없습니다. 팔레트, 서체, 속도감, 전환, 음악, 목소리를 자료에서 측정하고, 결정마다 근거를 붙여 사양 하나에 기록합니다.
- 🧰 **이야기에 필요한 시각 도구를 모두 씁니다.** 코드로 그린 2D는 항상 쓰고, 마스코트 컷아웃(GPT-image-2 + macOS Vision + OpenCV), 실제 앱 화면, 실제 터미널·CLI 녹화, PDF 도판, 웹 화면, 실제 데이터는 주장을 증명할 때 씁니다.
- 🥁 **어떤 길이든 같은 BPM으로 만듭니다.** 15초, 30초, 60초 컷이 같은 마디 그리드 위에 놓입니다. 긴 컷은 살아 있는 홀드와 장면을 더할 뿐, 움직임을 느리게 만들지 않습니다.
- 🔊 **음악과 효과음을 박자에 맞춰 합성합니다.** 모든 히트는 화면이 읽는 바로 그 계획의 큐이며, 렌더 뒤에 측정합니다. 모든 큐는 한 프레임 안에 맞고, 라우드니스는 -14 LUFS, 트루 피크는 -1 dBTP 이하입니다.
- 🎤 **내레이션은 선택 사항이며 BYOK 방식입니다.** 사용자 본인의 API 키로 Gemini TTS를 쓰고, 모든 클립을 음성 인식으로 검증하며, 더킹 믹스와 번인 자막까지 처리합니다.
- 📦 **검증된 결과물을 냅니다.** 컷마다 커버와 공유용 사본이 붙은 1080p60 MP4를 만들고, 모든 컷과 오디오가 들어 있는 HTML 파일 하나를 만듭니다. 이 HTML은 어느 폴더에서든 오프라인으로 재생됩니다.

---

## 🎨 스타일은 원본 자료를 따릅니다 (톤 앤 매너)

`tools/extract_style.py`는 주어진 자료(README, 문서 사이트, CSS 토큰, Tailwind 설정, PDF, pptx 테마, 터미널 테마, 로고, 스크린샷)를 읽고 `style.json` 초안을 씁니다. 초안에는 대비 검사를 거친 팔레트 역할, 폰트 스택, 타입 스케일, 모션 어휘, 후처리, 사운드 팔레트, 내레이션 권장 여부가 들어갑니다. 모든 결정은 자료 속 근거를 인용합니다. Claude는 디자이너처럼 초안을 검토하고, 자료가 다르게 말하는 부분은 직접 고칩니다. 장면을 만들기 전에 한 장짜리 스타일 보드를 먼저 보여 드립니다.

두 예제는 소프트웨어에 대해 비슷한 종류의 주장을 하지만, 원본의 말투가 달라서 쇼릴도 달라집니다.

| | `playful-app` (Mochi Notes) | `research-cli` (spark-bench) |
|---|---|---|
| 원본 | 이모지가 많은 README, 파스텔 로고, 작은 웹 앱 | 인용이 달린 간결한 README, 어두운 문서 페이지, 실제 CLI |
| 무드 | playful, bouncy, friendly, energetic, warm | technical, data-driven, cool, precise, nocturnal |
| 무대와 강조색 | 밝은 `#FFF7F2` · 핑크 `#FF8FAF`, 라일락 `#B9A3F3`, 민트 `#92D2A6` | 어두운 `#0A0E17` · 시안 `#2FE4F0`, 바이올렛 `#8B7CFF`, 앰버 `#FFB547` |
| 서체 | Nunito (앱의 둥근 서체) | Space Grotesk + JetBrains Mono (문서의 서체) |
| 모션 | 활기차고 탄력 있는 `outBack`, 오버슈트 1.8, 블롭 와이프·줌·휩 전환 | 중간 속도, 감쇠가 강한 `outExpo`, 글리치·매치·줌·임팩트 전환 |
| 시각 소재 | 코드로 그린 봉제 마스코트, 폰 속 실제 앱 화면 | GPU 포인트 4,096개, 3D로 기울인 실제 터미널 캡처, 데이터 시각화 |
| 사운드 | bright-pop, 120 BPM, C 장조, glassy 효과음 | dark-synth, 128 BPM, B 단조, digital 효과음 |
| 목소리 | 음악 중심 | 내레이션 권장(Charon): 원고와 타이밍은 오프라인으로 준비했고, 실제 목소리를 합성하기 전까지는 음악 중심으로 배포합니다 |

<p align="center"><img src="assets/demo-stills-v1.1.0.png" alt="두 예제에서 고른 장면 네 개씩: 위는 Mochi Notes, 아래는 spark-bench입니다" width="820"/></p>

---

## 🧰 이야기에 필요한 시각 도구

모든 쇼릴은 코드로 그린 벡터와 키네틱 타이포그래피가 이끕니다. 장면마다 주인공 소재를 하나씩 정하는데, 회의적인 관객이 꼭 봐야 하는 바로 그것을 고릅니다.

| 소재 | 스킬 안의 도구 | 모션에 주는 것 |
|---|---|---|
| **코드로 그린 2D** (항상) | `runtime/`의 Canvas2D 엔진 + WebGL2 레이어 | 키네틱 타입, 스프링, 스쿼시와 젤리, 컴포지터 전환 10종, HUD, 포인트 클라우드와 네트워크. 모두 시간에 대한 순수 함수입니다 |
| **마스코트 컷아웃** | `tools/imagegen.md`(Codex CLI로 GPT-image-2 생성, 동의 시에만) → `tools/lift.swift`(macOS Vision) → `tools/prep_assets.py` | 기존 마스코트의 추가 포즈, 깨끗한 알파, 눈 깜빡임 짝 이미지, 발 기준점, QA 시트 |
| **OpenCV** | `tools/prep_assets.py`, `tools/capture_ui.mjs --textfree` | 모든 OS에서 쓰는 GrabCut 컷아웃, 매트 다듬기, 시트 분할, 2.5D 사진 패럴랙스와 텍스트 없는 UI 판을 위한 Telea 인페인팅 |
| **실제 앱 화면** | `tools/capture_ui.mjs`(Playwright) | 스크린샷 대신 레이어, 정적 복제본에서 만든 컴포넌트 상태, 타이핑 효과를 위한 글자 단위 행 정보 |
| **터미널 / CLI** | `tools/capture_cli.py` → `runtime/term.js` + `runtime/quad.js` | 비밀값을 가린 실제 PTY 녹화를 3D로 기울인 창에서 재생하고, 핵심 줄로 줌인합니다 |
| **PDF 도판** | `tools/pdf_figures.py` | 논문의 실제 그림과 표, 캡션, 어두운 무대용 다크 버전 |
| **웹 화면, 네이티브 앱** | `tools/capture_ui.mjs`, `tools/capture_native.md` | 브라우저 프레임 속 문서와 랜딩 페이지, macOS 창, iOS 시뮬레이터, Android |
| **실제 데이터** | 가지고 계신 JSON, CSV, 실행 로그 | 카운터, 막대, 임팩트 숫자, 포인트 클라우드. 값마다 출처를 남깁니다 |

정직성 규칙도 도구와 함께 제공됩니다. 실제 캡처는 실제 그대로 두고, 연출한 데이터에는 화면에 표시를 달며, 크레딧에서 계산한 것과 연출한 것을 나눠 밝힙니다.

---

## 🎤 내레이션 (선택)

내레이션은 **Gemini TTS**를 씁니다. 자료가 내레이션을 필요로 하고(논문, 문서, 설명 영상, 피치) 사용자가 동의할 때만 켭니다.

- 문장을 묶음으로 합성하고 긴 쉼에서 나눈 뒤, **음성 인식으로 모든 클립을 검증합니다.** 스타일 태그가 읽혀 들어갔거나 단어가 빠진 클립은 다시 만듭니다.
- 목소리에 맞춰 장면 길이를 **마디 단위로** 늘리므로, 내레이션 때문에 템포가 바뀌거나 프레임이 느려지지 않습니다.
- 목소리가 나오는 동안 음악과 효과음을 줄여 섞고, 같은 타임라인에서 SRT/VTT 자막과 번인 자막을 만듭니다.
- **BYOK(본인 키 사용) 방식입니다.** 스킬에는 키가 들어 있지 않고, 스킬이 키를 찾아다니지도 않습니다. 요금은 사용자 본인의 Google 계정에 청구됩니다. macOS에서는 직접 연 터미널 창에서 `python3 ~/.claude/skills/motion-showreel/narration/tts_gemini.py key save`를 실행해 본인의 Gemini API 키를 키체인에 한 번 저장하시면 됩니다(입력이 화면에 보이지 않습니다). Claude Code의 `!` 명령에는 숨김 입력을 받을 터미널이 없으므로 이 방법을 쓸 수 없습니다. 위 경로는 개인 스킬 기준이며, 플러그인으로 설치하셨다면 설정 절의 `find` 명령이 보여 주는 플러그인 안 `motion-showreel` 폴더의 같은 파일을, 저장소를 클론하셨다면 `skills/motion-showreel/narration/tts_gemini.py`를 쓰시면 됩니다. 또는 Claude Code를 시작할 터미널에서 시작하기 전에 `export GEMINI_API_KEY=...`(또는 `GOOGLE_API_KEY`)를 실행하시거나, 직접 고른 파일이나 변수를 `--env-file` / `--api-key-env 변수명`으로 지정하셔도 됩니다. `key status`는 어느 경로의 키를 쓰는지만 보여 주고(키 자체는 보여 주지 않습니다), `key check`는 쿼터를 쓰지 않고 키를 확인합니다. 키를 채팅창에 붙여 넣지 마세요.
- `--dry-run`을 쓰면 키 없이 자리표시 클립으로 전체 과정을 오프라인에서 만들고 시험할 수 있습니다. 자리표시 클립은 렌더·빌드 도구가 배포용으로 받지 않습니다.

---

## 🥁 어떤 길이든 같은 BPM으로

모든 쇼릴은 마디 그리드 하나 위에서 움직입니다(128 BPM에서 한 마디는 1.875초라서 8마디가 15초, 16마디가 30초, 32마디가 60초입니다). 장면은 늘어나는 구조입니다. 고정된 등장 구간, 늘어나는 홀드, 고정된 퇴장 구간으로 이루어집니다. `timing/plan_cut.py`는 남는 마디를 보조 비트가 있는 홀드와 선택 장면에 배분하고, 모든 경계를 마디선에 맞춥니다. 음악 편곡기는 같은 곡을 마디만 늘려 다시 만듭니다.

| 장면 (research-cli) | 15초 컷 | 30초 컷 | 60초 컷 | 늘어난 시간에 들어가는 것 |
|---|---|---|---|---|
| matrix | 2마디 | 2마디 | 2마디 | (훅은 늘리지 않습니다) |
| problem | (빠짐) | 2마디 | 2마디 | 선택 장면이 들어옵니다 |
| cli | 3마디 | 3마디 | 5마디 | 실행 기록의 출처 줄을 카메라가 차례로 비춥니다 |
| results | 1마디 | 3마디 | 5마디 | 추세선, p50 값과 함께 64k 강조, 길이별 spark의 우위 |
| scaling | (빠짐) | (빠짐) | 5마디 | 선택 장면: 같은 패턴을 네 길이에서 보여 주며 이득이 커집니다 |
| repeats | (빠짐) | (빠짐) | 5마디 | 선택 장면: 모든 숫자 뒤에 있는 시드 고정 반복 다섯 번 |
| impact | 1마디 | 3마디 | 4마디 | 편차가 붙은 순위표, 마디마다 스캔 |
| logo | 1마디 | 3마디 | 4마디 | 설치 명령과 크레딧 |

장면의 등장 구간은 모든 컷에서 같게 렌더링됩니다. 장면만 따로 렌더링하면 프레임이 일치하고(GPU 블렌딩을 쓰는 장면은 반올림 오차 수준까지), 전체 프레임은 필름 그레인과 HUD 타임코드만 다릅니다. 달라지는 것은 홀드뿐입니다. 전체를 균일하게 늦추거나 구간별로 늦추는 변형(`--scale`, `--warp`)은 빽빽한 내용을 읽어야 하는 관객을 위한 것입니다.

---

## 🚀 빠른 설치

**Claude Code 플러그인으로 설치**

```
/plugin marketplace add AwesomeZun/Awesome-Showreels
/plugin install awesome-showreels@awesome-showreels
```

**또는 개인 스킬로 복사**

```bash
git clone https://github.com/AwesomeZun/Awesome-Showreels.git
cp -r Awesome-Showreels/skills/motion-showreel ~/.claude/skills/
```

**렌더 런타임과 Python 도구의 1회 설정** (처음 쓸 때 Claude가 대신 실행합니다. 플러그인을 업데이트하면 스킬 폴더가 바뀌므로 다시 실행해 주세요):

```bash
cd ~/.claude/skills/motion-showreel/runtime && npm install     # 개인 스킬
# 플러그인 설치: 플러그인 안에 있는 같은 폴더에서 실행합니다. 폴더는 다음 명령으로 찾을 수 있습니다
#   find ~/.claude/plugins -type d -path '*motion-showreel/runtime' -not -path '*/node_modules/*'
python3 -m pip install numpy scipy pillow opencv-python pymupdf fonttools brotli   # pip가 거부하면 venv 안에서 설치합니다
```

그다음 Claude에게 이렇게 요청하시면 됩니다.

> 이 리포지토리로 30초 쇼릴을 만들어 주세요. SNS용 15초 컷도 함께 부탁드립니다.<br/>
> `paper.pdf`로 내레이션이 들어간 45초 설명 쇼릴을 만들어 주세요.<br/>
> `README.md`와 `docs/`의 스크린샷으로 앱 출시 티저를 만들어 주세요.

---

## 📦 구성

```
.claude-plugin/              plugin.json, marketplace.json
assets/                      README 데모 (GIF 미리보기, 소리가 있는 MP4, 스틸 모음)
skills/motion-showreel/
  SKILL.md                   Claude가 따르는 디자이너의 작업 절차
  references/                톤 앤 매너, 시각 소재, 스토리보드, 타이밍, 엔진 API, 모션 레시피 36종,
                             캡처, 이미지, 오디오, 내레이션, 렌더 파이프라인, 멀티 에이전트 제작
  runtime/                   engine.js, gl.js, quad.js, term.js, compositor.js, template.html,
                             stills.mjs (스틸, 시트, 라이브 플레이어), render.mjs (MP4), build.mjs (단일 HTML)
  timing/plan_cut.py         한 BPM으로 어떤 길이든 계획하는 마디 그리드 플래너
  tools/                     extract_style.py, source_snapshot.mjs, capture_ui.mjs, capture_cli.py,
                             pdf_figures.py, prep_assets.py, motion_qa.py, lift.swift, imagegen.md, capture_native.md
  audio/                     synth.py, arrange.py, verify_sync.py (numpy/scipy, 샘플 없음)
  narration/                 tts_gemini.py, vo_timeline.py, mix_vo.py, captions.py
  templates/                 style.schema.json, STORYBOARD, reel.config, narration, showreel-workflow.js
  examples/                  playful-app, research-cli (원본, 스타일, 스토리보드, 장면, dist/ 플레이어)
tests/                       플래너, 오디오 싱크, CLI 캡처, 도구, BYOK 키 처리, 런타임 회귀 테스트
```

---

## 🧩 작동 방식

```
 원본 자료            리포지토리 · README · 문서 · 논문 · 발표 자료 · 웹사이트 · 브랜드 가이드 · 스크린샷
       │
       ▼
 1 톤 패스            tools/extract_style.py  →  style.json  (+ 근거 로그, 스타일 보드)
       │
       ▼
 2 스토리보드         STORYBOARD.md (정확한 문구, 규칙)  +  reel.config.json (마디 단위 장면, 박 단위 큐)
       │
       ▼
 3 계획               timing/plan_cut.py  →  build/cut-15.json · cut-30.json · cut-60.json  (BPM 하나)
       │
       ├──► 소재       capture_ui.mjs · capture_cli.py · pdf_figures.py · prep_assets.py (Vision + OpenCV)
       ├──► 장면       Canvas2D/WebGL2 런타임 위의 scenes/<id>.js, 시간에 대한 순수 함수
       ├──► 사운드     audio/arrange.py: 계획된 큐에 맞춘 음악 + 효과음  →  verify_sync.py
       └──► 목소리     선택: Gemini TTS → 음성 인식 검증 → vo_timeline → mix_vo → captions
       │
       ▼
 4 확인               runtime/stills.mjs: 컨택트 시트, 모든 전환, 라이브 플레이어
       │
       ▼
 5 납품               render.mjs → 컷별 MP4 (+ 커버, 공유용 사본) · build.mjs → 자기 완결 HTML 하나
```

모든 프레임이 시간에 대한 순수 함수이므로 스틸, MP4 프레임, HTML 플레이어가 같은 픽셀을 보여 줍니다. 병렬 렌더 워커는 어느 구간이든 나눠 맡을 수 있고, 화면과 사운드트랙은 같은 큐 목록을 읽습니다. 규모가 큰 쇼릴은 `templates/showreel-workflow.js`가 에이전트 팀으로 제작을 진행합니다(장면마다 제작, 독립 검토, 수정). 아래 K-BeautyGate 쇼릴이 이 방식으로 만들어졌습니다.

---

## 🧪 예제 실행하기

모든 컷(15초/short, 30초, 60초)과 음악이 들어 있는 완성 플레이어입니다. HTML 파일 하나씩이며, 내려받아 아무 브라우저에서나 여시면 됩니다.
[`mochi-notes-v1.1.0.html`](skills/motion-showreel/examples/playful-app/dist/mochi-notes-v1.1.0.html) ·
[`spark-bench-v1.1.0.html`](skills/motion-showreel/examples/research-cli/dist/spark-bench-v1.1.0.html)
(두 컷만 담은 v1.0.0 플레이어도 옆에 그대로 남겨 두었습니다.)

클론한 폴더에서 직접 다시 만들 수 있습니다.

```bash
(cd skills/motion-showreel/runtime && npm install)      # 처음 한 번, 그리고 업데이트할 때마다 실행합니다
S=skills/motion-showreel; mkdir -p out                  # 렌더 결과는 out/에 둡니다(git에서 제외됩니다)

# Mochi Notes: 모든 컷을 계획하고 음악을 만든 뒤, 싱크를 확인하고 짧은 컷을 렌더링한 다음 플레이어를 빌드합니다
P=$S/examples/playful-app
python3 $S/timing/plan_cut.py --project $P --cut short,30,60
for c in short 30 60; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/mochi-notes-short.mp4 --poster 3
node $S/runtime/build.mjs --project $P --cuts short,30,60 --out out/mochi-notes.html --verify

# spark-bench: 같은 단계를 실행합니다(컷마다 build/의 음악을 자동으로 고릅니다). 마지막은 라이브 플레이어입니다
P=$S/examples/research-cli
python3 $S/timing/plan_cut.py --project $P --cut 15,30,60
for c in 15 30 60; do python3 $S/audio/arrange.py --project $P --cut $c; done
node $S/runtime/render.mjs --project $P --cut 15 --out out/spark-bench-15.mp4 --poster 3.3
node $S/runtime/stills.mjs --project $P --serve        # 라이브 플레이어: Space, 방향키, 1/2/3 키로 컷을 바꿉니다
```

연구 예제의 내레이션은 원고와 타이밍을 오프라인(`tts_gemini.py batch --dry-run`)으로 준비해 두었지만, 자리표시 클립은 배포하지 않습니다. 도구가 자리표시 클립으로 만든 믹스는 건너뛰고, 그 타이밍으로 만든 자막은 거부합니다. 두 경로 모두 해당 예제의 README에 정리해 두었습니다.

예제마다 README에서 원본, 톤 패스의 결정, 캡처, 전체 빌드 과정을 설명합니다(영문):
[playful-app](skills/motion-showreel/examples/playful-app/README.md) · [research-cli](skills/motion-showreel/examples/research-cli/README.md)

---

## 📚 사례

이 방법은 실제 제작에서 나왔습니다. 해당 프로젝트의 미디어는 이 리포지토리에 들어 있지 않으며, 여기서는 글로만 소개합니다.

- **K-BeautyGate (해커톤 피치).** 120 BPM의 30초 화장품 광고 × AI 에이전트 제품 투어입니다. 고객의 마스코트를 바탕으로 생성하고 macOS Vision으로 배경을 걷어 낸 파스텔 봉제 마스코트 포즈, 눈 깜빡임과 젤리 효과가 들어간 탄력 있는 캐릭터 모션, 폰 안에서 레이어로 움직이는 실제 앱 화면, 어두운 클라이맥스, 박자에 맞춰 통통 튀는 마스코트 라인업이 들어갔습니다. 45초, 53초, 60초 이해용 변형은 음악을 늘이지 않고 다시 합성했습니다. 에이전트 24개(제작, 검토, 수정)가 약 25분 만에 만들었습니다.
- **[FlyGate](https://github.com/AwesomeZun/Project-FlyGate) (내레이션 쇼릴).** 1분 인트로, 4.8분 전체 영상, 15초·30초 숏폼과 세로 버전입니다. 음성 인식으로 검증한 Gemini 내레이션, 목소리에 맞춘 장면 길이, 번인 자막, CC-statusline 문법을 따른 터미널 장면이 들어갔습니다.
- **[FDDD](https://github.com/AwesomeZun/FDDD) (연구 데이터 쇼릴).** 128 BPM에 30초는 16마디이고, 15초는 8마디로 따로 편집했습니다. 실제 포인트 클라우드, 커넥톰 선, 임팩트 숫자로 보여 준 도킹 점수, 재생과 함께 조각나는 포스터 프레임, 계산한 것과 연출한 것을 나눈 크레딧("Real docking scores. Real spikes. Nothing faked.")이 들어갔습니다.
- **CC-statusline (터미널 도구 쇼릴).** 도구의 Catppuccin 팔레트, 명령마다 거대한 단어 하나, 3D로 기울인 실제 터미널 캡처와 핵심 줄 줌인, 글리치와 타이핑 전환을 썼습니다.

---

## ✅ 요구 사항

| 의존성 | 용도 | 비고 |
|---|---|---|
| Node.js 20+ | 런타임: 스틸, MP4 렌더, HTML 빌드, UI 캡처 | `skills/motion-showreel/runtime`에서 `npm install` (playwright-core만 설치) |
| Chromium 또는 Chrome | 헤드리스 렌더링 | 자동 탐지: `CHROME_PATH`, Playwright의 Chromium, 시스템 Chrome/Chromium/Edge |
| libx264가 들어간 ffmpeg | MP4 인코딩, AAC, 미리보기 | macOS에서는 AudioToolbox AAC 인코더가 있으면 그것을 씁니다 |
| numpy, scipy, Pillow, opencv-python이 설치된 Python 3.9+ | 톤 패스, 플래너, 음악, 내레이션, 컷아웃, 텍스트 없는 UI 판 | 선택: `pymupdf`(PDF), `fonttools` + `brotli`(HTML 폰트 서브셋) |
| macOS 14+와 `swiftc` *(선택)* | Vision 피사체 분리 | 다른 OS에서는 OpenCV 경로를 씁니다 |
| ChatGPT 로그인이 된 Codex CLI *(선택)* | GPT-image-2 마스코트 포즈 | 동의하실 때만 씁니다. ChatGPT 사용량이 차감됩니다 |
| 본인의 Gemini API 키 *(선택, BYOK)* | 내레이션 | 환경 변수, macOS 키체인(`key save`), `--env-file` 중 하나로 넘깁니다. `--dry-run`은 키 없이 동작합니다 |
| LibreOffice, poppler *(선택)* | 발표 자료, PDF 대체 경로 | |

---

## 🔬 테스트

```bash
python3 -B -m unittest discover -s tests        # 플래너, 오디오 싱크, CLI 캡처와 마스킹, 도구, BYOK 키 처리
node --test tests/*.test.mjs                    # 런타임: 오디오 선택 순서, 자리표시 차단
```

---

## 📄 라이선스

[MIT](LICENSE)입니다. 예제 폰트(Nunito, Space Grotesk, JetBrains Mono)는 SIL Open Font License 1.1을 따르며, 라이선스 파일과 함께 들어 있습니다. 음악과 효과음은 모두 스킬이 합성하며, 샘플은 들어 있지 않습니다.

## 🙏 크레딧

[Claude Code](https://claude.com/claude-code)로 만들었습니다. 이 스킬은 Playwright와 Chromium, FFmpeg, OpenCV, Apple Vision, PyMuPDF, fontTools, Gemini TTS, Codex CLI를 통한 GPT-image-2를 호출해서 쓰며, 이들을 포함해 배포하지는 않습니다. 예제 프로젝트(Mochi Notes, spark-bench)와 그 데이터는 이 리포지토리를 위해 쓴 가상의 것입니다.

<div align="center">

Claude Code 커뮤니티를 위해 만들었습니다 🎬 · MIT License

⭐ **프로젝트의 진짜 매력을 잘 보여 드렸다면 별을 눌러 주세요.**

</div>
