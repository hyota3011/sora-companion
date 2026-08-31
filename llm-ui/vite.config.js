import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";

const FORBIDDEN_CLIENT_SECRET_NAMES = [
    "VITE_OPENAI_KEY",
    "VITE_XAI_KEY",
    "VITE_ANTHROPIC_KEY",
];
const FORBIDDEN_CLIENT_SECRET_PATTERN = new RegExp(`\\b(?:${FORBIDDEN_CLIENT_SECRET_NAMES.join("|")})\\b`);
const CLIENT_SOURCE_PATH_PATTERN = /[\\/]src[\\/]/;
const EXTENSION_PAGE_CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self'",
    "object-src 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src https://api.openai.com https://api.x.ai https://api.anthropic.com",
    "frame-src 'none'",
    "worker-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
].join("; ");

const manifest = {
    manifest_version: 3,
    name: "LLM Chat UI",
    version: "0.0.0",
    action: { default_popup: "index.html" },
    permissions: ["tabs", "scripting"],
    host_permissions: ["<all_urls>"],
    content_security_policy: {
        extension_pages: EXTENSION_PAGE_CONTENT_SECURITY_POLICY,
    },
};

/**
 * Gets configured provider secrets without returning their values to build output.
 * @param {string} mode - The Vite mode whose environment files should be considered.
 * @returns {Array<{name: string, value: string}>} Configured forbidden secret names and values.
 */
function getConfiguredClientSecrets(mode) {
    const loadedEnvironment = loadEnv(mode, process.cwd(), "");
    return FORBIDDEN_CLIENT_SECRET_NAMES
        .map((name) => {
            const value = process.env[name] || loadedEnvironment[name] || "";
            return { name, value };
        })
        .filter(({ value }) => typeof value === "string" && value.length > 0);
}

/**
 * Finds a forbidden provider-secret environment variable reference in source text.
 * @param {string} source - The source text to inspect.
 * @returns {string|null} The forbidden environment variable name, if present.
 */
function findForbiddenSecretReference(source) {
    return source.match(FORBIDDEN_CLIENT_SECRET_PATTERN)?.[0] || null;
}

/**
 * Converts a Rollup output artifact into text for a non-printing secret scan.
 * @param {import("rollup").OutputChunk|import("rollup").OutputAsset} output - The generated artifact to inspect.
 * @returns {string} The artifact contents as text.
 */
function getOutputText(output) {
    if (output.type === "chunk") return output.code;
    if (typeof output.source === "string") return output.source;
    return new TextDecoder().decode(output.source);
}

/**
 * Returns raw and JSON-escaped forms of a secret for bundle comparison.
 * @param {string} value - The secret value to encode for comparison.
 * @returns {string[]} The non-empty representations that could appear in a bundle.
 */
function getSecretCandidates(value) {
    const escapedValue = JSON.stringify(value).slice(1, -1);
    return [...new Set([value, escapedValue].filter(Boolean))];
}

/**
 * Creates a build-only guard that prevents provider secrets from entering client code.
 * @param {string} mode - The Vite mode currently being built.
 * @returns {import("vite").Plugin} The Vite plugin that enforces the client-secret boundary.
 */
function createClientSecretGuard(mode) {
    const configuredSecrets = getConfiguredClientSecrets(mode);

    return {
        name: "client-secret-guard",
        apply: "build",
        enforce: "post",
        transform(source, id) {
            if (!CLIENT_SOURCE_PATH_PATTERN.test(id)) return null;
            const forbiddenName = findForbiddenSecretReference(source);
            if (forbiddenName) {
                this.error(`Client source references ${forbiddenName}. Provider secrets must not be bundled.`);
            }
            return null;
        },
        transformIndexHtml(html) {
            const forbiddenName = findForbiddenSecretReference(html);
            if (forbiddenName) {
                throw new Error(`Client HTML references ${forbiddenName}. Provider secrets must not be bundled.`);
            }
            return html;
        },
        generateBundle(_, bundle) {
            for (const [fileName, output] of Object.entries(bundle)) {
                const outputText = getOutputText(output);
                const leakedSecret = configuredSecrets.find(({ value }) => (
                    getSecretCandidates(value).some((candidate) => outputText.includes(candidate))
                ));
                if (leakedSecret) {
                    this.error(`Generated artifact "${fileName}" contains ${leakedSecret.name}. Provider secrets must not be bundled.`);
                }
            }
        },
    };
}

export default defineConfig(({ mode }) => ({
    plugins: [react(), tailwindcss(), crx({ manifest }), createClientSecretGuard(mode)],
    base: "./",
}));
