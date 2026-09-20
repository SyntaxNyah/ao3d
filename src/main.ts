import { CharacterProject } from "./authoring";
import { ingestCharacter } from "./authoring/ingest";
import { buildCharacterArchive, downloadBlob } from "./export";
import { initFileLoading } from "./load";
import { Customizer } from "./ui/customizer";
import { Viewport } from "./viewport/viewport";

const canvas = document.getElementById("viewport") as HTMLCanvasElement | null;
const exportButton = document.getElementById("btn-export") as HTMLButtonElement | null;
const customize = document.getElementById("customize") as HTMLElement | null;
const status = document.getElementById("status") as HTMLElement | null;
if (!canvas || !exportButton || !customize || !status) {
  throw new Error("Missing required #viewport/#hud elements");
}

const viewport = new Viewport(canvas);
const project = new CharacterProject();
const customizer = new Customizer(customize, project, viewport, exportButton);

exportButton.addEventListener("click", () => {
  void (async () => {
    try {
      const blob = await buildCharacterArchive(project.buildFolder());
      downloadBlob(blob, `${project.options.name || "character"}.zip`);
      status.textContent = "Exported character folder.";
    } catch (error) {
      status.textContent = `Export failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error("[ao3d] export failed", error);
    }
  })();
});

// Local asset loading (Phase 1) feeds the viewport (Phase 2) and the
// customization panel (Phase 6).
initFileLoading((character) => {
  void (async () => {
    try {
      await viewport.loadCharacter(character);
      const ingested = ingestCharacter(character);

      project.reset();
      project.setModel(ingested.model);
      for (const motion of ingested.motions) project.addMotion(motion);
      for (const texture of ingested.textures) project.addTexture(texture);
      project.options.name = ingested.model.name.replace(/\.(pmx|pmd)$/i, "");

      customize.hidden = false;
      customizer.render();

      // Auto-play the first motion so the model animates immediately (the
      // per-emote "Preview" button still lets you audition individual emotes).
      let boneWarning = "";
      const firstMotion = ingested.motions[0];
      if (firstMotion) {
        const missing = await viewport.playMotion(firstMotion.data.buffer, firstMotion.name);
        if (missing.length > 0) {
          const sample = missing.slice(0, 6).join(", ");
          boneWarning =
            missing.length > 6
              ? ` ${missing.length} motion bone(s) could not bind (e.g. ${sample}, …).`
              : ` ${missing.length} motion bone(s) could not bind (${sample}).`;
          console.warn(`[ao3d] ${missing.length} bone(s) in "${firstMotion.name}" could not bind`, missing);
        }
      }

      const missingTextures = character.missingTextures.length;
      const textureHint =
        missingTextures > 0
          ? ` ${missingTextures} texture(s) MISSING — drop the whole character folder (incl. Texture2D/) or use Open folder…`
          : "";
      status.textContent =
        `Loaded ${ingested.model.name} — ${ingested.motions.length} motion(s), ` +
        `${ingested.textures.length} texture(s) resolved.${boneWarning}${textureHint}`;
    } catch (error) {
      status.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
      console.error("[ao3d] failed to load character", error);
    }
  })();
});


