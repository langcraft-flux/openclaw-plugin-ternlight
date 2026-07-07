# openclaw-plugin-ternlight

Standalone OpenClaw plugin that registers a local memory embedding provider backed by Ternlight.

## What it does

- Registers a `ternlight` memory embedding provider for OpenClaw `memory_search`
- Runs fully local via WASM on CPU
- Supports both `@ternlight/base` and `@ternlight/mini`
- Normalizes whitespace before embedding for more stable retrieval
- Supports OpenClaw text-only `embedBatchInputs(...)`
- Ships with an independent `node:test` suite and a minimal GitHub Actions workflow

## Requirements

- Node `>=22.14.0`
- OpenClaw `>=2026.4.23`

## Install

### npm package

```bash
npm install openclaw-plugin-ternlight
```

### Local development link into OpenClaw

```bash
openclaw plugins install --link /path/to/openclaw-plugin-ternlight
```

## OpenClaw config

Point agent memory search at the `ternlight` provider and choose a Ternlight model.

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "provider": "ternlight",
        "model": "ternlight/base"
      }
    }
  }
}
```

Then restart the gateway:

```bash
openclaw gateway restart
```

## Models

The provider accepts these model ids:

- `ternlight/base` (default)
- `@ternlight/base`
- `base`
- `ternlight`
- `ternlight/mini`
- `@ternlight/mini`
- `mini`

## Retrieval notes

This plugin stays text-only on purpose. If OpenClaw passes multipart embedding inputs, the adapter accepts them only when every part is `type: "text"` and rejects inline binary data.

For better retrieval consistency, the adapter:

- collapses repeated whitespace
- trims surrounding whitespace
- reuses identical embeddings inside a batch
- validates that returned vectors are finite and non-empty

## Local development

```bash
npm install
npm test
npm run pack:check
```

## CI

A starter workflow lives at:

- `.github/workflows/test.yml`

It runs:

- `npm ci`
- `npm run test:ci`
- `npm run pack:check`

## Notes

- Ternlight embeddings are local and text-only in this plugin.
- The adapter uses Ternlight's synchronous `embed(text)` API and exposes it through OpenClaw's async embedding interface.
