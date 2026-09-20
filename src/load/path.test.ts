import { describe, expect, it } from "vitest";

import { basename, dirname, joinPath, normalizePath } from "./path";

describe("normalizePath", () => {
  it("converts backslashes to forward slashes", () => {
    expect(normalizePath("Texture2D\\base.png")).toBe("Texture2D/base.png");
  });

  it("strips a leading ./ and collapses duplicate separators", () => {
    expect(normalizePath("./a//b")).toBe("a/b");
  });

  it("strips a trailing slash", () => {
    expect(normalizePath("a/b/")).toBe("a/b");
  });
});

describe("dirname / basename", () => {
  it("splits a nested path", () => {
    expect(dirname("fenomeno/Texture2D/base.png")).toBe("fenomeno/Texture2D");
    expect(basename("fenomeno/Texture2D/base.png")).toBe("base.png");
  });

  it("handles a top-level file", () => {
    expect(dirname("model.pmx")).toBe("");
    expect(basename("model.pmx")).toBe("model.pmx");
  });
});

describe("joinPath", () => {
  it("skips empty parts", () => {
    expect(joinPath("", "Texture2D/base.png")).toBe("Texture2D/base.png");
  });

  it("joins a prefix and suffix", () => {
    expect(joinPath("fenomeno", "Texture2D/base.png")).toBe("fenomeno/Texture2D/base.png");
  });
});
