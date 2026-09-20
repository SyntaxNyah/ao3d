import { canonicalizeBoneName } from "./bones";

export interface RetargetingResult {
  /** `{ [sourceBoneName]: targetBoneName }` for `createRuntimeAnimation`. */
  map: Record<string, string>;
  /** Source bone names that had no matching target (exact or canonical). */
  missing: string[];
}

/**
 * Build a source→target bone retargeting map.
 *
 * Bones that already match by exact name are left out (babylon-mmd binds them
 * directly). Bones that match only after canonicalization get an entry mapping
 * the source name to the target name. Source bones with no match at all are
 * reported in `missing` — e.g. a motion's finger bones on a model without them.
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
      if (target !== source) map[source] = target;
    } else if (targetSet.has(source)) {
      // Exact-name match; no retargeting entry needed.
    } else {
      missing.push(source);
    }
  }

  return { map, missing };
}
