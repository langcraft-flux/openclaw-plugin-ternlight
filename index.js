import { definePluginEntry } from "openclaw/plugin-sdk/core";
import { ternlightMemoryEmbeddingProviderAdapter } from "./ternlight-adapter.js";

const plugin = definePluginEntry({
  id: "ternlight",
  name: "Ternlight Memory Embeddings",
  description: "Standalone local memory embedding provider powered by Ternlight.",
  register(api) {
    api.registerMemoryEmbeddingProvider(ternlightMemoryEmbeddingProviderAdapter);
  }
});

export default plugin;
export { ternlightMemoryEmbeddingProviderAdapter } from "./ternlight-adapter.js";
