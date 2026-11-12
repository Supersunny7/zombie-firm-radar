import { describe, it, expect } from "vitest";
import path from "node:path";
import { resolveRequest, ROOTS } from "./serve.mjs";

const dirOf = (prefix) => ROOTS.find((r) => r.prefix === prefix).dir;

describe("serve.mjs path guarding", () => {
  it("maps the three roots", () => {
    expect(resolveRequest("/")).toBe(path.join(dirOf("/"), "index.html"));
    expect(resolveRequest("/preview.js")).toBe(path.join(dirOf("/"), "preview.js"));
    expect(resolveRequest("/assets/models/a/a.glb")).toBe(path.join(dirOf("/assets/"), "models", "a", "a.glb"));
    expect(resolveRequest("/vendor/three/build/three.module.js")).toBe(
      path.join(dirOf("/vendor/three/"), "build", "three.module.js"),
    );
  });

  it("blocks traversal in plain, encoded and backslash forms", () => {
    for (const p of [
      "/../package.json",
      "/assets/../../../package.json",
      "/assets/%2e%2e/%2e%2e/secret",
      "/assets/..%2f..%2fsecret",
      "/assets/..\\..\\secret",
      "/vendor/three/../../package.json",
      "/%00",
      "/%E0%A4%A",
      "no-leading-slash",
    ]) {
      expect(resolveRequest(p), p).toBeNull();
    }
  });
});
