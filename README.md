# AO3(D)

Browser-based MMD character maker for Attorney Online 2.

See [`BRIEF.md`](./BRIEF.md) for the full project brief, sources of truth, and
the canonical char.ini / camera.json format spec.

## Quickstart

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm test          # unit tests (Vitest)
npm run build     # type-check + production build to ./dist
npm run preview   # serve the production build locally
```

## Using the maker

1. **Load** a `.pmx` model + its textures + `.vmd` motions (drag-drop, folder
   picker, or file picker). The model renders fully textured.
2. **Rig** emotes: add an emote, pick its base motion and optional pre-anim, and
   tune the modifier / deskmod / camera if needed (defaults are sensible).
3. **Preview** each emote in the viewport, then **Export** a ready-to-install zip.

See [`USER_GUIDE.md`](./USER_GUIDE.md) for the full walkthrough and a
plain-language explanation of the format.

## Status

- **Phase 0 (scaffold)** — done: Vite + TypeScript + Vitest, `@babylonjs/core`
  + `babylon-mmd` + `aolib-ts`, AGPL-3.0 license, GitHub Pages workflow.
- **Phase 1 (local asset loading)** — done: drop/folder/file-picker collection,
  a minimal PMX 2.x texture-table parser, and a `referenceFiles` resolver that
  emits babylon-mmd-compatible `IArrayBufferFile` entries. See `src/load/`.
- **Phase 2 (viewport)** — done: `Viewport` class (`src/viewport/viewport.ts`) loads a
  PMX from buffer with `referenceFiles` textures, enables SDEF via
  `SdefInjector.OverrideEngineCreateEffect`, plays VMD motions through `MmdRuntime`,
  and frames the camera from skeleton bones.
- **Phase 3 (bone retargeting)** — done: bidirectional Japanese↔English bone-name
  normalization with finger canonicalization (incl. the UmaViewer thumb off-by-one)
  and a retargeting-map builder (`src/retarget/`). Wired into `createRuntimeAnimation`
  with a visible warning for bones that can't bind.
- **Phase 4 (formats)** — done: char.ini import (wraps `aolib-ts` `parseCharIni`,
  accepting the `sounddelay` synonym and normalizing legacy `[soundt]` ticks → ms)
  plus canonical char.ini and camera.json writers (`src/format/`), unit-tested
  against the vendored `aolib-meta` schemas.
- **Phase 5 (export)** — done: a dependency-free ZIP writer (`src/export/zip.ts`,
  DEFLATE via `CompressionStream`, UTF-8 names, CRC-32) plus character-folder
  assembly and browser download (`src/export/folder.ts`).
- **Phase 6 (customization UI)** — done: an authoring model (`src/authoring/`,
  `CharacterProject` + mouth-morph detection + ingest) and a customization panel
  (`src/ui/customizer.ts`) mapping emotes to base/preanim motions, camera pose,
  modifier/deskmod, with preview and export.
- **Phase 7 (docs + deploy + validate)** — done: user guide (`USER_GUIDE.md`),
  GitHub Pages workflow (relative `base`, `npm ci` lockfile), and an end-to-end
  export test (project → zip → re-parse char.ini/camera.json).

## Dependency pins (gotchas)

- **`@babylonjs/core` is pinned to exactly `9.18.1`** (no caret). Newer 9.x
  (e.g. 9.27.1) ships a broken type layout — `package.json` declares
  `types: index.d.ts` but the tarball omits `index.d.ts` and most subpath
  `.d.ts` files, so `tsc` reports `TS7016`. `9.18.1` matches the
  `babylon-mmd-vite-template` and has a complete type tree.
- **`vitest@5.0.1` warns `EBADENGINE` on Node 25** (its engines allow
  `^22 || ^24 || >=26`). This is benign — the suite runs and passes on
  Node 25.8.2.
