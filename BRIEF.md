# AO3(D) — Project Brief

> **Hard rule:** Use **only** the sources of truth below. Do **not** rely on AO-Greenroom (the old "Green Room" preview tool) or any other project for behavior, format, or conventions. AO-Greenroom is explicitly excluded.

## Sources of truth (exact URLs)

| # | Source | URL | Role | Key files |
|---|--------|-----|------|-----------|
| 1 | **aolib-meta** *(OmniTroid)* | https://github.com/OmniTroid/aolib-meta | Canonical format spec (JSON Schema draft-07) | `schemas/assets/CharIni.schema.json`, `schemas/assets/CameraRig.schema.json`, `schemas/assets/README.md` |
| 2 | **aolib-ts** *(OmniTroid)* | https://github.com/OmniTroid/aolib-ts | Canonical TS parser/codegen — `parseCharIni` implements the spec; LemmyAO consumes it | `src/` (parser + codegen), `aolib-meta` git submodule, `scripts/codegen.ts` |
| 3 | **babylon-mmd** *(noname0310)* | https://github.com/noname0310/babylon-mmd · docs https://noname0310.github.io/babylon-mmd/ | The viewport loader/runtime API | `docs` (Loader + Runtime reference) |
| 3b | **babylon-mmd-vite-template** | https://github.com/noname0310/babylon-mmd-vite-template | Official Vite scaffold (matches our stack) | `vite.config.mts`, `src/`, `package.json` |
| 3c | **babylon-mmd-template** (webpack) | https://github.com/noname0310/babylon-mmd-template | API usage reference (`sceneBuilder.ts`) | `src/sceneBuilder.ts` |
| 4 | **LemmyAO PR #53** *(SyntaxNyah/LemmyAO, PR by OmniTroid)* | https://github.com/SyntaxNyah/LemmyAO/pull/53 | **The consumption contract** — exactly how the client loads the exported character folder | PR body + `src/client/changeChar.ts` diff + 3D scene files |
| 5 | **webAO** *(upstream)* | https://github.com/AttorneyOnline/webAO | The Attorney Online web client that LemmyAO forks (context only) | — |

### Who owns what (important)
`aolib-meta`, `aolib-ts`, and **LemmyAO PR #53 itself** are all authored/maintained by **OmniTroid** — OmniTroid is effectively the format owner. `aolib-ts` pins `aolib-meta` as a git submodule (`aolib-meta @ c291b5c`), so the two never drift. `SyntaxNyah/LemmyAO` is the client fork that hosts PR #53. **The `SyntaxNyah/*` forks of `aolib-meta`/`aolib-ts` are stale (Jun 28) — use the `OmniTroid/*` ones.**

## What it is
**AO3(D)** is a browser-based, AGPL-3.0-licensed **MMD character maker for Attorney Online 2**. A content creator drops in a `.pmx` model, its textures, and one or more `.vmd` motions, customizes every animation, and exports a finished, AO2/webAO-ready 3D character folder (`char.ini` + `camera.json` + model + motions + textures) as a zip — no INI editing required. It deploys statically to GitHub Pages and runs entirely client-side.

*(Lineage, for context only — not a source: the standalone 3D preview/maker was previously prototyped as LemmyAO's bundled `vmdviewer`, then split out as "Green Room" in PR #53 commit `f1a1e7e`. AO3(D) is its successor; do not copy from the old project.)*

## Goals
- **Instant local loading.** Load models, textures, and motions straight from the user's computer (drag-and-drop + File System Access API), *not* from a bundled `res/` folder.
- **Full animation control.** Preview and customize every emote: base-loop and preanim motions, mouth morphs, camera framing, per-emote modifiers.
- **Correct AO2 output.** Emit the exact `[emote <name>]` char.ini + `camera.json` that LemmyAO PR #53 consumes.
- **Consistent hands.** A robust bidirectional bone-name retargeting layer (Japanese ↔ English, with finger canonicalization) so a motion made for *any* model animates the target model's hands correctly.
- **Easy documentation.** Beginner-friendly docs for people who have never touched an INI file.

## Non-goals
- Not the AO2 courtroom/network client (that's LemmyAO/webAO). This is the *maker/rigger*.
- Not a physics sim or multi-model stage. Single-model preview.

## Stack
- TypeScript + Vite (app shell, modeled on `babylon-mmd-vite-template`) + Vitest (unit tests for pure format/retarget logic).
- `@babylonjs/core` `^9.18.1` + `babylon-mmd` `^1.3.0` (exact versions from the Vite template).
- **Depend on `aolib-ts` for char.ini/camera.json parse+validate** — it's the same parser LemmyAO uses, which guarantees round-trip compatibility.
- Static GitHub Pages deploy (Actions workflow + Vite `base`).
- License: **AGPL-3.0-or-later**.

> Vite config notes to inherit from `babylon-mmd-vite-template`: `root: "src"`, `build.outDir: "../dist"`, `optimizeDeps.exclude` for `@babylonjs/core`/`@babylonjs/havok`/`babylon-mmd`, and the **COOP/COEP headers** (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) required for the mmd WASM runtime. Add `base: "./"` (or repo path) for GitHub Pages — the template doesn't set one.

---

## The consumption contract (from LemmyAO PR #53 — this is what your export MUST satisfy)

- A character is rendered 3D **iff `[options] model` names a `*.pmx`**. Otherwise it's a 2D sprite.
- The emote pipeline is **idle / talking / preanim** driven by the existing IC message pipeline.
- **Idle and talking share one mouth-free base VMD** (`anim`); the mouth is morph-driven, not a separate motion. Talking layers **mouth vowel morphs** over that base motion — resolved by **kana** or exported **`Talk*_L` morph names**, eased in/out. (So your maker must not bake mouth shapes into the base motion; it must drive them as morphs.)
- **`preanim` is a one-shot** played before the loop.
- **Camera frames from skeleton bone positions, not bind-pose mesh bounds** — so a posed model fills its slot instead of floating tiny. (Same fix your viewport needs.)
- One **reparentable canvas per active char slot**, inheriting flip / offset / pan / desk layering; the 2D sprite is blanked while 3D.
- **Babylon is dynamically imported** so 2D-only sessions never load it.
- **Textures load via `blob:` URLs** — the client CSP allows `blob:` images (your maker's local-texture approach matches this; just don't require HTTP-served `res/`).
- The client parses char.ini with **`aolib-ts` `parseCharIni`** and consumes the normalized `emotes[]` fields: `id`, `name`, `anim`, `preanim`, `modifier`, `deskMod`, `sound`, `soundDelayMs` (see `changeChar.ts`). `soundDelayMs` is already **ticks→ms converted** (`TICK_MS == UPDATE_INTERVAL`); `preanim` accepts `null` and legacy `"-"`; `desk_modifier` defaults to `1` (shown); `sfx` defaults to `"0"`; `sfxdelay` defaults to `0`.
- Demo path: `bun run server` serves client + assets, `?demo3d=` drives the courtroom.

---

## Canonical format spec (from `aolib-meta` — do not guess)

**A character is 3D iff `[options] model` names a `.pmx`.** The emote table normalizes to one shape; `anim` is a sprite stem for 2D and a base VMD stem for 3D.

### char.ini — `[emote <name>]` blocks (preferred encoding, what we emit)

```ini
[options]
model = model.pmx            ; present => 3D character

[emotions]
number = 2
1 = objection
2 = think

[emote objection]
anim      = objection.vmd    ; base loop VMD, extension REQUIRED
preanim   = point.vmd        ; pre-anim VMD, or omit / `-` for none
sound     = objection.opus   ; optional; .opus/.wav/.ogg
sounddelayms = 480           ; optional, milliseconds
modifier  = zoom             ; number or EmoteModifier name
deskmod   = shown            ; optional; number or DeskModifier name

[emote think]
anim = think_loop.vmd
```

- The **block name** (`objection`, `think`) is the emote's `key`: the stable identity shared by the button and `camera.json`; independent of button order.
- Block field names are the lowercased `Emote` fields: `name` (display label, defaults to block name), `anim`, `preanim` (`-`/absent → null), `sound`, `sounddelayms` (ms), `modifier`, `deskmod`.
- **File refs in blocks MUST carry the extension** — `anim`/`preanim`: `.vmd` for 3D (`.gif`/`.webp`/`.png` for 2D); `sound`: `.opus`/`.wav`/`.ogg`.
- **`sounddelayms` is canonical** (`Emote.soundDelayMs`). Accept legacy `sounddelay` on import as a synonym; always emit `sounddelayms`.
- `modifier` / `deskmod` accept a number or the enum name (case-insensitive):
  - `modifier` (EmoteModifier): `no_preanim` 0, `preanim` 1, `preanim_and_objection` 2, `zoom` 5, `objection_zoom` 6.
  - `deskmod` (DeskModifier): `hidden` 0, `shown` 1, `hide_during_preanim` 2, `show_during_preanim` 3, `hide_and_center_during_preanim` 4, `show_during_preanim_then_center` 5.
- **Comment markers are `;` and `//` only — never `#`** (`#` delimits legacy emote fields).

### char.ini — legacy banks (import-only fallback)

```ini
[emotions]
number = 2
1 = normal#-#normal#1
2 = point#point#point#5

[soundn]
2 = shocked

[soundt]
2 = 8
```

- Records are `desc#preanim#anim#modifier#deskMod`, zipped by id with `[soundn]` (sound stem) and `[soundt]` (delay).
- **`[soundt]` is in ticks — 1 tick = 60 ms** (`TICK_MS == UPDATE_INTERVAL`) — normalize to ms (ticks × 60). Normalized `key` is the stringified id.

### camera.json (3D only)

```jsonc
{
  "default": { "targetY": 0.9, "distance": 2.5, "yaw": 0, "pitch": 0, "fov": 30 }, // resting Pose
  "emotes": {
    "objection": {
      "loop": { "targetY": 0.9, "distance": 2.2 },                 // Pose or KeyedClip
      "preanim": { "keys": [ { "t": 0, "distance": 2.2 }, { "t": 1, "distance": 1.4 } ], "easing": "easeInOut" }
    }
  }
}
```

- **Poses are height-normalized:** `targetY` = fraction of height (0 feet → 1 head), `distance` = character-heights (> 0), `yaw`/`pitch`/`fov` = degrees (`fov` 0–180).
- `Clip` = a bare `Pose` (static hold) **or** a `KeyedClip` (`{ keys: Keyframe[], easing }`); disjoint — a Pose has no `keys`.
- `Keyframe` = `{ t: 0..1, targetY?, distance?, yaw?, pitch?, fov? }`; `t` normalized across the driving motion (preanim VMD for `preanim`, base loop for `loop`), so keys retime if motion length changes.
- `easing` ∈ `linear` | `easeIn` | `easeOut` | `easeInOut` (default `easeInOut`).
- `EmoteCamera` = `{ loop?, preanim? }`. Resolution: `emotes[E].phase ?? (phase === "loop" ? default : none)`.
- A looping `loop` clip's first/last keys should be equal (`t` 0 and 1) for a seamless cycle — auto-close the loop.

### Export folder layout (what LemmyAO loads from `characters/<name>/`)
`char.ini`, `camera.json`, `<model>.pmx`, `<anim>.vmd` / `<preanim>.vmd` per emote, `textures/…` with relative paths preserved (resolved from the PMX texture table).

---

## babylon-mmd API surface (from docs + templates)

- **Loaders:** `PmxLoader` / `PmdLoader` (models), `VmdLoader` / `VpdLoader` (motions), `SdefInjector` (SDEF spherical deformation — required for models like Fenomeno), `MmdStandardMaterialBuilder`, `DxBmpTextureLoader` (BMP texture fix), `BpmxLoader`/`BvmdLoader` (optimized variants — *not* needed for single-model maker).
- **Runtime:** `MmdRuntime` (+ `MmdCamera`, `MmdPlayerControl`), `GetMmdWasmInstance` for the WASM physics/IK runtime.
- **Retargeting:** `createRuntimeAnimation(animation, retargetingMap)` — the `retargetingMap` maps animation-bone names → model-bone names. Feed your canonicalization map here. (Docs: "Use Babylon.js Animation Runtime" / "Apply MMD Animation on Non-MMD Model".)
- **Textures:** pass the PMX texture table's buffers as `referenceFiles` so local disk textures resolve (no `res/` server).

---

## Requirements

**R1 — Local asset loading.** Read `.pmx`, `.vmd`, and textures from disk via drag-drop (`webkitGetAsEntry`, preserve folder structure) and/or `showDirectoryPicker`. Resolve textures from the PMX texture table and pass them as `referenceFiles`.

**R2 — Viewport.** Babylon scene: load PMX (`PmxLoader` + `SdefInjector` + `MmdStandardMaterialBuilder`), play VMD (`VmdLoader` → `createRuntimeAnimation`), orbit/zoom camera, lighting, ground, optional outline. **Auto-frame from skeleton bone positions** (same fix as PR #53).

**R3 — Bone retargeting / hand consistency (differentiator).** Bidirectional Japanese↔English bone-name normalization with **finger canonicalization** (thumb/index/middle/ring/pinky → index 0/1/2 per finger; handle the UmaViewer off-by-one: `親指１ = Thumb_02`, not `Thumb_01`). Detect missing finger bones and warn when a motion can't fully bind. Feed the map to `createRuntimeAnimation`.

**R4 — Format import.** Parse `[emote <name>]` blocks *and* legacy `[emotions]/[soundn]/[soundt]` banks (use `aolib-ts` `parseCharIni`). Accept `sounddelay` and `sounddelayms` as synonyms; normalize `[soundt]` ticks × 60 → ms.

**R5 — Format export.** Emit canonical char.ini (`sounddelayms`, symbolic `modifier`/`deskmod`, extensions on `anim`/`preanim`/`sound`) + `camera.json` (height-normalized `Pose`/`KeyedClip`) + a client-side ZIP of the full folder.

**R6 — Customization UI.** Per emote: base-loop motion, optional preanim, camera pose (`targetY`/`distance`/`yaw`/`pitch`/`fov`), **mouth morphs (kana / `Talk*_L` names — kept as morphs, not baked into the base motion)**, `modifier`/`deskmod`. Sensible defaults so a whole character can be rigged without typing a number.

**R7 — Docs.** `README.md` + a user guide explaining the workflow and the format in plain language.

## Acceptance criteria
- Drop `fenomeno` (`1127_Fenomeno.pmx` + `Texture2D/` + `UMA_*.vmd`) → model renders fully textured (SDEF + subfolder textures resolved).
- A Japanese-named VMD animates an English-named model's fingers correctly (and vice-versa), with a visible warning when hands can't bind.
- Export produces a zip that **LemmyAO PR #53** loads as a 3D character (mouth morphs drive talking; camera frames from the skeleton).
- `npm run build` produces a static site deployable to GitHub Pages.

---

## Plan

**Phase 0 — Scaffold.** Vite + TS + Vitest (clone `babylon-mmd-vite-template` setup: root/outDir, optimizeDeps exclusions, COOP/COEP headers, add `base`), `@babylonjs/core` + `babylon-mmd` + `aolib-ts`, AGPL-3.0 LICENSE, GitHub Pages Actions workflow.

**Phase 1 — Local loading.** File-picker + drag-drop; read PMX/VMD/textures into `ArrayBuffer`s; PMX texture-table resolver; `referenceFiles` wiring.

**Phase 2 — Viewport.** Scene + model load + VMD playback + orbit camera + lighting; frame-from-skeleton.

**Phase 3 — Bone retargeting.** Pure TS retargeter (bidirectional + finger canonicalization) with full unit tests — verified against the Fenomeno-style English bone naming.

**Phase 4 — Formats.** Wrap `aolib-ts` `parseCharIni` for import; pure TS writer for char.ini + camera.json; unit-test both against `OmniTroid/aolib-meta` `schemas/assets/`.

**Phase 5 — Export.** Dependency-free ZIP writer; assemble the character folder; download.

**Phase 6 — Customization UI.** Emote/motion/camera/morph mapping wizard over the viewport.

**Phase 7 — Docs + deploy + validate.** User guide, README, build, and a real Fenomeno end-to-end test against LemmyAO's `?demo3d=` path.

**Decisions assumed (flag if you want otherwise):**
1. **Vite over webpack** — confirmed by the official `babylon-mmd-vite-template`; scaffold from it.
2. **Accept `sounddelay` on import, emit `sounddelayms`** — confirmed canonical by `CharIni.schema.json`.
3. **Depend on `aolib-ts` for parse/validate** instead of a hand-rolled parser — LemmyAO already swapped its local parser for `parseCharIni` (commit `f430551`), so this is the safest way to guarantee compatibility.
