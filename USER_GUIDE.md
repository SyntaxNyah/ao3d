# AO3(D) — User Guide

AO3(D) turns an MMD model + motions into a finished 3D character for Attorney
Online 2 — entirely in your browser. No INI editing, no server.

## What you need

- A `.pmx` model and its textures (usually a `Texture2D/` folder next to the model).
- One or more `.vmd` motion files.

## 1. Load your character

1. Open the site (`npm run dev`, or the deployed GitHub Pages URL).
2. Click **Load files…** and select the model + textures + motions, or
   **Open folder…** to pick the character's folder, or just drag everything in.
3. The model appears, fully textured and framed. Detected mouth morphs (the
   shapes used for talking) are shown in the panel.

## 2. Rig your emotes

1. Click **Add emote**, then set its **Name** (the button label, e.g. `objection`).
2. Pick a **Base motion** (the looping animation) and, optionally, a **Pre-anim**
   (a one-shot played first, e.g. a point).
3. Tune **Modifier** (e.g. `zoom`, `objection_zoom`) and **Desk modifier**
   (e.g. `shown`, `hidden`) if that emote should move the camera or the desk.
4. Adjust the **Camera** numbers (`targetY` / `distance` / `yaw` / `pitch` / `fov`)
   if the framing needs a nudge — the defaults already look right for most models.
5. **Preview** plays the base motion so you can check the result.

Repeat for every emote. Change the **Character name** at the top if you like.

## 3. Export

Click **Export…**. AO3(D) writes `char.ini` + `camera.json` and zips them with the
model, motions, and textures into a single `.zip`.

## 4. Install into Attorney Online

Unzip into `characters/<name>/` (or wherever your client reads characters from).
In LemmyAO (PR #53) the character is 3D because `[options] model` names a `.pmx`;
the demo path `?demo3d=` drives the courtroom with it.

## The format, in plain language

- **`char.ini`** describes the character and each emote. The key 3D line is
  `[options] model = <file>.pmx`, plus one `[emote <name>]` block per emote with:
  - `anim` — the looping base VMD (extension required),
  - `preanim` — the optional one-shot VMD,
  - `modifier` / `deskmod` — camera / desk behaviour, written as names (`zoom`, `shown`).
- **`camera.json`** holds framing: a `default` resting shot plus optional per-emote
  `loop` / `preanim` shots. Positions are height-normalized — `targetY` is a
  fraction of the model's height, `distance` is in character-heights, and
  `yaw` / `pitch` / `fov` are in degrees.
- **Mouth motion is not baked into the base VMD.** The model's mouth morphs (kana
  like `あ`, or `Talk*_L` names) drive talking at runtime, so AO3(D) only detects
  and displays them — it never edits the animation.

## Troubleshooting

- **"N motion bone(s) could not bind"** — the motion targets differently-named
  bones. AO3(D) retargets Japanese↔English names automatically; any bones it still
  can't map are listed so you know what won't animate.
- **"No mouth morphs detected"** — the model names its mouth shapes outside the
  kana / `Talk*` conventions. AO3(D) still exports; talking just won't move the
  mouth until those morphs are named to a convention the client recognizes.
- **Missing textures** — drop the textures alongside the model with their folder
  structure intact. The status line reports the texture count on load.
