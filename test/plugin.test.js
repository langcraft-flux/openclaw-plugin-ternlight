import test from "node:test";
import assert from "node:assert/strict";

import plugin, { ternlightMemoryEmbeddingProviderAdapter } from "../index.js";

test("plugin exports a valid OpenClaw plugin entry", () => {
  assert.equal(plugin.id, "ternlight");
  assert.equal(plugin.name, "Ternlight Memory Embeddings");
  assert.equal(typeof plugin.register, "function");
});

test("plugin registers the Ternlight adapter", () => {
  const seen = [];
  plugin.register({
    registerMemoryEmbeddingProvider(adapter) {
      seen.push(adapter);
    }
  });

  assert.equal(seen.length, 1);
  assert.equal(seen[0], ternlightMemoryEmbeddingProviderAdapter);
});
