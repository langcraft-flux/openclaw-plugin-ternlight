import test from "node:test";
import assert from "node:assert/strict";

import {
  createTernlightEmbeddingProvider,
  extractTextFromEmbeddingInput,
  normalizeEmbeddingText,
  normalizeTernlightModel,
  resetTernlightModuleCache,
  ternlightMemoryEmbeddingProviderAdapter
} from "../ternlight-adapter.js";

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

test("normalizeTernlightModel resolves aliases", () => {
  assert.equal(normalizeTernlightModel("ternlight/base").packageName, "@ternlight/base");
  assert.equal(normalizeTernlightModel("@ternlight/mini").packageName, "@ternlight/mini");
  assert.equal(normalizeTernlightModel("ternlight").packageName, "@ternlight/base");
});

test("normalizeTernlightModel rejects unknown models", () => {
  assert.throws(() => normalizeTernlightModel("ternlight/huge"), /Unsupported Ternlight model/);
});

test("normalizeEmbeddingText trims and collapses whitespace", () => {
  assert.equal(normalizeEmbeddingText("  hello\n\nworld  "), "hello world");
  assert.equal(normalizeEmbeddingText("\t   "), " ");
});

test("extractTextFromEmbeddingInput supports text-only multipart inputs", () => {
  assert.equal(
    extractTextFromEmbeddingInput({
      text: "ignored",
      parts: [
        { type: "text", text: "agent" },
        { type: "text", text: " memory" }
      ]
    }),
    "agent memory"
  );
});

test("extractTextFromEmbeddingInput rejects non-text parts", () => {
  assert.throws(
    () => extractTextFromEmbeddingInput({
      text: "x",
      parts: [{ type: "inline-data", mimeType: "image/png", data: "abc" }]
    }),
    /only supports text embedding inputs/
  );
});

test("adapter metadata is stable", () => {
  assert.equal(ternlightMemoryEmbeddingProviderAdapter.id, "ternlight");
  assert.equal(ternlightMemoryEmbeddingProviderAdapter.defaultModel, "ternlight/base");
  assert.equal(ternlightMemoryEmbeddingProviderAdapter.transport, "local");
});

test("createTernlightEmbeddingProvider returns working 384-dim embeddings", async () => {
  resetTernlightModuleCache();
  const { provider, runtime } = await createTernlightEmbeddingProvider({ model: "ternlight/base" });
  assert.equal(provider.id, "ternlight");
  assert.equal(provider.model, "ternlight/base");
  assert.equal(runtime.id, "ternlight");

  const query = await provider.embedQuery("semantic search for docs");
  const batch = await provider.embedBatch([
    "semantic search for docs",
    "heavy metal guitar riffs"
  ]);

  assert.equal(query.length, 384);
  assert.equal(batch.length, 2);
  assert.equal(batch[0].length, 384);
  assert.equal(batch[1].length, 384);
  assert.notDeepEqual(batch[0], batch[1]);
});

test("createTernlightEmbeddingProvider supports embedBatchInputs for text-only inputs", async () => {
  resetTernlightModuleCache();
  const { provider } = await createTernlightEmbeddingProvider({ model: "ternlight/base" });
  const batch = await provider.embedBatchInputs([
    { text: "semantic search" },
    { text: "ignored", parts: [{ type: "text", text: "semantic search" }] }
  ]);
  assert.equal(batch.length, 2);
  assert.deepEqual(batch[0], batch[1]);
});

test("semantic neighbors score closer than unrelated text", async () => {
  resetTernlightModuleCache();
  const { provider } = await createTernlightEmbeddingProvider({ model: "ternlight/base" });
  const [query, related, unrelated] = await provider.embedBatch([
    "open source local memory embeddings for semantic search",
    "local semantic embeddings for memory retrieval and search",
    "death metal blast beats and guitar pedals"
  ]);

  assert.ok(cosineSimilarity(query, related) > cosineSimilarity(query, unrelated));
});

test("createTernlightEmbeddingProvider supports mini tier", async () => {
  resetTernlightModuleCache();
  const { provider } = await createTernlightEmbeddingProvider({ model: "mini" });
  const query = await provider.embedQuery("memory retrieval");
  assert.equal(provider.model, "ternlight/mini");
  assert.equal(query.length, 384);
});
