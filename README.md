# NYMIS × Nansen

NYMIS is a wallet privacy scanner that reconstructs what can be inferred from a public blockchain address: identity exposure, exchange interactions, Safe/control relationships, related wallets, funding origin, privacy-tool use, and financial relationships.

This is a small, public benchmark slice—not the NYMIS production application. It contains the real Nansen request, validation, normalization, and classification path used for the campaign, plus sanitized results. The private NYMIS cohort, provider responses, infrastructure, scoring system, and deployment code are intentionally excluded.

## Nansen integration

Nansen Profiler is an external intelligence and validation layer. It is not in the normal NYMIS production scan path.

The benchmark uses two endpoints:

- `POST /api/v1/profiler/address/related-wallets`
- `POST /api/v1/profiler/address/transactions`

Nansen results are normalized then compared with relationships independently reconstructed by NYMIS. The benchmark focuses on first funders, Safe signer/co-signer relationships, related-wallet evidence, transaction corroboration, potentially new useful candidates, and deployment/factory noise. A Nansen result is never treated here as an automatic production discovery; candidates require independent NYMIS evidence before promotion.

## Architecture

```text
Wallet
  ↓
NYMIS independent analysis
  ↓
relationship graph / privacy findings
  ↓
Nansen Profiler benchmark
  ↓
normalize + classify
  ↓
compare: overlap · corroboration · new candidate · infrastructure/noise
```

## Running

Requires Node 20+ and pnpm.

```sh
cp .env.example .env
# add NANSEN_API_KEY to .env
pnpm install
pnpm typecheck
pnpm test
pnpm campaign -- --dry-run
```

The included cohort is deliberately synthetic and only demonstrates deterministic validation; its Gnosis pair is skipped locally. Dry-run reports the smaller available sample rather than failing because it cannot fill a live 140/60 target. For a live benchmark, supply a reviewed, NYMIS-derived public-wallet cohort JSON with address-only `wallet` and `chain` fields:

```sh
pnpm campaign -- --cohort my-cohort.json --related 140 --transactions 60 --out ./output
pnpm summary -- output/calls.jsonl
```

Live calls require `NANSEN_API_KEY`. The runner uses at most two concurrent requests, writes compact normalized call records, validates supported chains separately by endpoint, and records unsupported pairs locally without dispatching them. It stops on an HTTP failure, rate limit, or a non-1-credit successful response. No API call is made by `--dry-run`.

## Benchmark results

The sanitized [`campaign summary`](data/campaign-summary.json), [`batch summary`](data/batch-summary.json), and [`aggregate`](data/benchmark-results.json) record current-campaign latency (788 ms median, 4,004 ms p95, 17,256 ms max), endpoint distribution, and normalized relationship distribution. Most returned relationships were classified as deployment/factory noise; first-funder and Safe/control results are retained as comparison candidates rather than asserted discoveries. [`useful-findings.json`](data/useful-findings.json) shows three address-free examples.

The raw request log, skipped-pair log, detailed wallet summaries, and raw provider payloads remain private because they contain unnecessary address-level benchmark data. [`data/example-wallet-summary.json`](data/example-wallet-summary.json) is an anonymized representative aggregate.

## Public-code adaptation

The source NYMIS campaign constructed its cohort from private local activity caches and a local label database. This export replaces only that cohort loader with an explicit JSON input. The following behavior is preserved: request bodies, endpoint-specific supported-chain checks, address-only dispatch, concurrency limit, batch scheduling, compact artifact records, and result classification. No private database, filesystem path, or production configuration is required.

## Privacy and safety

No API keys, authorization headers, raw responses, production hosts, deployment commands, or private NYMIS datasets are included. `.env` and generated output are ignored by Git.

## License

The parent NYMIS repository has no explicit license. No license is included here so that a publisher does not accidentally grant terms they do not own. Choose and add an appropriate license before publishing.
