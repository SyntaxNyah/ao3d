import { canonicalizeBoneName } from "./bones";

export interface RetargetingResult {
  /** `{ [modelBoneName]: animationBoneName }` for `createRuntimeAnimation`. */
  map: Record<string, string>;
  /** Animation bone names that had no matching model bone (exact or canonical). */
  missing: string[];
}

/**
 * Build a model→animation bone retargeting map.
 *
 * babylon-mmd's `createRuntimeAnimation` expects a map whose keys are MODEL
 * bone names and whose values are the ANIMATION bone names to bind to them —
 * `MmdRuntimeModelAnimation.Create` looks up `retargetingMap[modelBoneName]`
 * to find which animation track drives each model bone. Bones that already
 * match by exact name are omitted (babylon-mmd binds them directly). Animation
 * bones with no matching model bone at all are reported in `missing` — e.g. a
 * motion's finger bones on a model without them.
 */
export function buildRetargetingMap(
  sourceBoneNames: readonly string[],
  targetBoneNames: readonly string[],
): RetargetingResult {
  const targetSet = new Set(targetBoneNames);
  const targetByCanonical = new Map<string, string>();
  for (const target of targetBoneNames) {
    const key = canonicalizeBoneName(target);
    if (key !== null && !targetByCanonical.has(key)) {
      targetByCanonical.set(key, target);
    }
  }

  const map: Record<string, string> = {};
  const missing: string[] = [];

  for (const source of sourceBoneNames) {
    const key = canonicalizeBoneName(source);
    if (key !== null && targetByCanonical.has(key)) {
      const target = targetByCanonical.get(key)!;
      if (target !== source) map[target] = source;
    } else if (targetSet.has(source)) {
      // Exact-name match; no retargeting entry needed.
    } else {
      missing.push(source);
    }
  }

  return { map, missing };
}
