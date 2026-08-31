import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Reads a UTF-8 file relative to the llm-ui package directory.
 * @param {string} path - The package-relative file path.
 * @returns {string} The file contents.
 */
function readProjectFile(path) {
    return readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), path), "utf8");
}

describe("extension image policy", () => {
    it("permits only extension-local and data images in both manifests", () => {
        const rootManifest = JSON.parse(readProjectFile("../manifest.json"));
        const viteConfig = readProjectFile("vite.config.js");

        expect(rootManifest.content_security_policy.extension_pages).toContain("img-src 'self' data:");
        expect(rootManifest.content_security_policy.extension_pages).not.toMatch(/img-src[^;]*(?:blob:|chrome:|http:|https:)/);
        expect(viteConfig).toContain('"img-src \'self\' data:"');
        expect(viteConfig).not.toContain("img-src 'self' data: blob:");
    });
});
