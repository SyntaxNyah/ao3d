import { CharacterProject, detectMouthMorphs, type ProjectEmote } from "../authoring";
import { DESK_MODIFIER, EMOTE_MODIFIER, type Pose } from "../format";
import type { Viewport } from "../viewport/viewport";

const POSE_FIELDS = ["targetY", "distance", "yaw", "pitch", "fov"] as const;

/**
 * Phase 6 customization panel: per-emote motion/camera/modifier mapping over
 * the viewport. Renders the emote list and wires it to the authoring project.
 */
export class Customizer {
  private readonly root: HTMLElement;
  private readonly project: CharacterProject;
  private readonly viewport: Viewport;
  private readonly exportButton: HTMLButtonElement;

  constructor(root: HTMLElement, project: CharacterProject, viewport: Viewport, exportButton: HTMLButtonElement) {
    this.root = root;
    this.project = project;
    this.viewport = viewport;
    this.exportButton = exportButton;

    const nameInput = this.required<HTMLInputElement>("#char-name");
    nameInput.addEventListener("input", () => {
      this.project.options.name = nameInput.value;
    });

    this.required<HTMLButtonElement>("#btn-add-emote").addEventListener("click", () => {
      const key = `emote${this.project.emotes.length + 1}`;
      this.project.addEmote(key);
      this.render();
    });
  }

  /** Re-render the dynamic parts of the panel. */
  render(): void {
    this.required<HTMLInputElement>("#char-name").value = this.project.options.name;
    this.renderMouth();

    const emotesEl = this.required<HTMLElement>("#emotes");
    emotesEl.innerHTML = "";
    for (const emote of this.project.emotes) {
      emotesEl.appendChild(this.renderEmote(emote));
    }

    this.exportButton.disabled = !this.isExportable();
  }

  private required<T extends HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }

  private renderMouth(): void {
    const mouthEl = this.required<HTMLElement>("#mouth");
    const morphs = detectMouthMorphs(this.viewport.getMorphNames());
    const found = (Object.entries(morphs) as Array<[string, string | null]>).filter(
      ([, name]) => name !== null,
    );
    mouthEl.textContent =
      found.length > 0
        ? `Mouth morphs: ${found.map(([vowel, name]) => `${vowel}→${name}`).join(", ")}`
        : "No mouth morphs detected on the model.";
  }
  private renderEmote(emote: ProjectEmote): HTMLElement {
    const el = document.createElement("div");
    el.className = "emote";

    const title = document.createElement("h4");
    title.textContent = emote.key;
    el.appendChild(title);

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Name";
    const nameInput = document.createElement("input");
    nameInput.value = emote.key;
    nameInput.addEventListener("change", () => {
      if (nameInput.value.trim() !== "") emote.key = nameInput.value.trim();
      this.render();
    });
    nameLabel.appendChild(nameInput);
    el.appendChild(nameLabel);

    el.appendChild(this.selectField("Base motion", this.motionOptions(), emote.anim ?? "", (value) => {
      emote.anim = value === "" ? null : value;
      this.render();
    }));

    el.appendChild(this.selectField("Pre-anim", this.motionOptions(), emote.preanim ?? "", (value) => {
      emote.preanim = value === "" ? null : value;
    }));

    el.appendChild(this.selectField("Modifier", this.modifierOptions(), String(emote.modifier), (value) => {
      emote.modifier = Number(value);
    }));

    el.appendChild(
      this.selectField(
        "Desk modifier",
        this.deskOptions(),
        emote.deskMod === null ? "" : String(emote.deskMod),
        (value) => {
          emote.deskMod = value === "" ? null : Number(value);
        },
      ),
    );

    el.appendChild(this.renderCamera(emote));

    const actions = document.createElement("div");
    actions.className = "actions";
    const preview = document.createElement("button");
    preview.textContent = "Preview";
    preview.disabled = emote.anim === null;
    preview.addEventListener("click", () => {
      const motion = emote.anim ? this.project.motion(emote.anim) : undefined;
      if (motion) void this.viewport.playMotion(motion.data.buffer, motion.name);
    });
    actions.appendChild(preview);
    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      this.project.removeEmote(emote.key);
      this.render();
    });
    actions.appendChild(remove);
    el.appendChild(actions);

    return el;
  }

  private renderCamera(emote: ProjectEmote): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "camera";
    wrap.appendChild(document.createTextNode("Camera:"));
    const pose = emote.loop as Pose;
    for (const field of POSE_FIELDS) {
      const label = document.createElement("label");
      label.textContent = field;
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.1";
      input.value = String(pose[field] ?? "");
      input.addEventListener("change", () => {
        const value = Number(input.value);
        if (Number.isFinite(value)) pose[field] = value;
      });
      label.appendChild(input);
      wrap.appendChild(label);
    }
    return wrap;
  }

  private selectField(
    labelText: string,
    options: Array<[string, string]>,
    value: string,
    onChange: (value: string) => void,
  ): HTMLElement {
    const label = document.createElement("label");
    label.textContent = labelText;
    const select = document.createElement("select");
    for (const [optValue, optLabel] of options) {
      const option = document.createElement("option");
      option.value = optValue;
      option.textContent = optLabel;
      select.appendChild(option);
    }
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
    label.appendChild(select);
    return label;
  }

  private motionOptions(): Array<[string, string]> {
    const options: Array<[string, string]> = [["", "(none)"]];
    for (const motion of this.project.motions) options.push([motion.name, motion.name]);
    return options;
  }

  private modifierOptions(): Array<[string, string]> {
    return Object.entries(EMOTE_MODIFIER).map(([name, value]) => [String(value), name]);
  }

  private deskOptions(): Array<[string, string]> {
    const options: Array<[string, string]> = [["", "(default)"]];
    for (const [name, value] of Object.entries(DESK_MODIFIER)) {
      options.push([String(value), name]);
    }
    return options;
  }

  private isExportable(): boolean {
    return (
      this.project.model !== null &&
      this.project.emotes.length > 0 &&
      this.project.emotes.every((emote) => emote.anim !== null)
    );
  }

}
