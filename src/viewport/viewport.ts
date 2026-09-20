import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import "babylon-mmd/esm/Loader/mmdModelLoader"; // registers default MmdStandardMaterialBuilder
import "babylon-mmd/esm/Loader/pmxLoader"; // registers the PMX scene loader
import { SdefInjector } from "babylon-mmd/esm/Loader/sdefInjector";
import { VmdLoader } from "babylon-mmd/esm/Loader/vmdLoader";
import { MmdMesh, type MmdSkinnedMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeModelAnimation"; // makes MmdAnimation bindable

import type { LoadedCharacter } from "../load";
import { buildRetargetingMap } from "../retarget/retargeting";

/**
 * Phase 2 viewport: a Babylon scene that loads a PMX model (with local
 * textures), plays VMD motions, and frames the camera from skeleton bones.
 */
export class Viewport {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly mmdRuntime: MmdRuntime;
  private readonly vmdLoader: VmdLoader;
  private mmdModel: MmdModel | null = null;
  private currentMesh: Mesh | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);

    // Required for models that use SDEF spherical deformation (e.g. Fenomeno).
    SdefInjector.OverrideEngineCreateEffect(this.engine);

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.09, 0.09, 0.11, 1);

    this.camera = new ArcRotateCamera("camera", 0, Math.PI / 3, 20, Vector3.Zero(), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.wheelPrecision = 30;
    this.camera.minZ = 0.05;

    new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    const key = new DirectionalLight("key", new Vector3(-0.5, -1, -0.5), this.scene);
    key.intensity = 0.6;

    const ground = CreateGround("ground", { width: 100, height: 100 }, this.scene);
    const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
    groundMaterial.diffuseColor = new Color3(0.18, 0.18, 0.2);
    groundMaterial.specularColor = new Color3(0, 0, 0);
    ground.material = groundMaterial;

    this.mmdRuntime = new MmdRuntime(this.scene);
    this.mmdRuntime.register(this.scene);
    this.vmdLoader = new VmdLoader(this.scene);

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  /** Load a character's PMX with its resolved local textures. */
  async loadCharacter(character: LoadedCharacter): Promise<void> {
    this.disposeCurrentModel();

    const container = await LoadAssetContainerAsync(new Uint8Array(character.pmx), this.scene, {
      pluginExtension: ".pmx",
      pluginOptions: {
        mmdmodel: {
          // babylon-mmd types `referenceFiles` as `readonly File[]`, but its
          // ReferenceFileResolver accepts `IArrayBufferFile[]` too. Our
          // ReferenceFile is structurally identical to IArrayBufferFile.
          referenceFiles: character.referenceFiles as unknown as File[],
        },
      },
    });
    container.addAllToScene();

    const mmdMesh = container.meshes.find(
      (mesh): mesh is MmdSkinnedMesh => mesh instanceof Mesh && MmdMesh.isMmdSkinnedMesh(mesh),
    );
    if (!mmdMesh) {
      throw new Error("Loaded PMX produced no MmdSkinnedMesh");
    }

    this.currentMesh = mmdMesh;
    this.mmdModel = this.mmdRuntime.createMmdModel(mmdMesh, { buildPhysics: false });
    this.frameFromSkeleton(mmdMesh);
  }

  /**
   * Play a VMD motion on the loaded model, retargeting bone names (Phase 3).
   * Returns the source bone names that could not bind.
   */
  async playMotion(vmd: ArrayBufferLike, name = "motion"): Promise<string[]> {
    if (!this.mmdModel || !this.currentMesh) {
      throw new Error("No model loaded");
    }
    const animation = await this.vmdLoader.loadFromBufferAsync(name, vmd);

    const sourceBones = [
      ...animation.boneTracks.map((track) => track.name),
      ...animation.movableBoneTracks.map((track) => track.name),
    ];
    const targetBones = this.currentMesh.skeleton?.bones.map((bone) => bone.name) ?? [];
    const { map, missing } = buildRetargetingMap(sourceBones, targetBones);

    const handle = this.mmdModel.createRuntimeAnimation(animation, map);
    this.mmdModel.setRuntimeAnimation(handle);
    this.mmdRuntime.playAnimation();
    return missing;
  }

  /** Morph names (Japanese + English) of the loaded model, for mouth detection. */
  getMorphNames(): string[] {
    const morphs = this.currentMesh?.metadata?.morphs as
      | Array<{ name?: unknown; englishName?: unknown }>
      | undefined;
    if (!morphs) return [];
    const names: string[] = [];
    for (const morph of morphs) {
      if (typeof morph.name === "string" && morph.name !== "") names.push(morph.name);
      if (typeof morph.englishName === "string" && morph.englishName !== "") {
        names.push(morph.englishName);
      }
    }
    return names;
  }

  /** Frame the camera from the model's skeleton bones, not mesh bounds. */
  private frameFromSkeleton(mesh: Mesh): void {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);

    const skeleton = mesh.skeleton;
    if (skeleton && skeleton.bones.length > 0) {
      for (const bone of skeleton.bones) {
        const position = bone.getAbsolutePosition();
        min.minimizeInPlace(position);
        max.maximizeInPlace(position);
      }
    } else {
      const bounds = mesh.getBoundingInfo().boundingBox;
      min.copyFrom(bounds.minimumWorld);
      max.copyFrom(bounds.maximumWorld);
    }

    const center = min.add(max).scaleInPlace(0.5);
    const size = max.subtract(min);
    const radius = Math.max(size.length() * 0.5, 0.5);

    this.camera.setTarget(center);
    this.camera.radius = radius * 3;
    this.camera.lowerRadiusLimit = radius * 0.5;
    this.camera.upperRadiusLimit = radius * 20;
    this.camera.beta = Math.PI / 3;
    this.camera.alpha = 0;
    this.camera.minZ = Math.max(radius * 0.01, 0.05);
  }

  private disposeCurrentModel(): void {
    if (this.mmdModel) {
      this.mmdRuntime.destroyMmdModel(this.mmdModel);
      this.mmdModel = null;
    }
    if (this.currentMesh) {
      this.currentMesh.dispose(false, true);
      this.currentMesh = null;
    }
  }
}
