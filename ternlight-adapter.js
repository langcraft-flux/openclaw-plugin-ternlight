const MODEL_SPECS = {
  base: {
    id: "base",
    aliases: ["base", "ternlight/base", "@ternlight/base", "ternlight"],
    packageName: "@ternlight/base",
    maxInputTokens: 128
  },
  mini: {
    id: "mini",
    aliases: ["mini", "ternlight/mini", "@ternlight/mini"],
    packageName: "@ternlight/mini",
    maxInputTokens: 128
  }
};

const moduleCache = new Map();

export function normalizeTernlightModel(model) {
  const raw = String(model ?? "").trim().toLowerCase();
  if (!raw) return MODEL_SPECS.base;
  for (const spec of Object.values(MODEL_SPECS)) {
    if (spec.aliases.includes(raw)) return spec;
  }
  throw new Error(`Unsupported Ternlight model: ${model}`);
}

export function normalizeEmbeddingText(text) {
  if (typeof text !== "string") {
    throw new TypeError("Ternlight embeddings require plain text input");
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : " ";
}

export function extractTextFromEmbeddingInput(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Ternlight embedding inputs must be objects");
  }
  if (!Array.isArray(input.parts) || input.parts.length === 0) {
    return normalizeEmbeddingText(input.text ?? "");
  }
  const textParts = [];
  for (const part of input.parts) {
    if (!part || typeof part !== "object" || part.type !== "text") {
      throw new Error("Ternlight only supports text embedding inputs");
    }
    textParts.push(part.text ?? "");
  }
  return normalizeEmbeddingText(textParts.join(" "));
}

function sanitizeEmbeddingVector(vector) {
  const normalized = Array.from(vector, (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error("Ternlight returned a non-finite embedding value");
    }
    return number;
  });
  if (normalized.length === 0) {
    throw new Error("Ternlight returned an empty embedding vector");
  }
  return normalized;
}

async function loadTernlightModule(spec) {
  const cached = moduleCache.get(spec.id);
  if (cached) return cached;
  const loaded = import(spec.packageName).then((mod) => {
    if (typeof mod.embed !== "function") {
      throw new Error(`Ternlight package ${spec.packageName} does not export embed(text)`);
    }
    return mod;
  });
  moduleCache.set(spec.id, loaded);
  return await loaded;
}

export async function createTernlightEmbeddingProvider(options = {}) {
  const spec = normalizeTernlightModel(options.model);
  const mod = await loadTernlightModule(spec);

  const embedOne = async (text) => {
    const normalizedText = normalizeEmbeddingText(text);
    return sanitizeEmbeddingVector(mod.embed(normalizedText));
  };

  const embedMany = async (texts) => {
    const cache = new Map();
    return await Promise.all(texts.map(async (text) => {
      const normalizedText = normalizeEmbeddingText(text);
      const cached = cache.get(normalizedText);
      if (cached) return cached;
      const vector = sanitizeEmbeddingVector(mod.embed(normalizedText));
      cache.set(normalizedText, vector);
      return vector;
    }));
  };

  const embedBatchInputs = async (inputs) => {
    return await embedMany(inputs.map((input) => extractTextFromEmbeddingInput(input)));
  };

  return {
    provider: {
      id: "ternlight",
      model: `ternlight/${spec.id}`,
      maxInputTokens: spec.maxInputTokens,
      embedQuery: embedOne,
      embedBatch: embedMany,
      embedBatchInputs
    },
    runtime: {
      id: "ternlight",
      cacheKeyData: {
        provider: "ternlight",
        model: spec.id,
        packageName: spec.packageName
      }
    }
  };
}

export const ternlightMemoryEmbeddingProviderAdapter = {
  id: "ternlight",
  defaultModel: "ternlight/base",
  transport: "local",
  autoSelectPriority: 80,
  allowExplicitWhenConfiguredAuto: true,
  create: createTernlightEmbeddingProvider,
  formatSetupError(err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Ternlight setup failed: ${message}`;
  },
  shouldContinueAutoSelection(err) {
    const message = err instanceof Error ? err.message : String(err);
    return /unsupported ternlight model/i.test(message) === false;
  }
};

export function resetTernlightModuleCache() {
  moduleCache.clear();
}
