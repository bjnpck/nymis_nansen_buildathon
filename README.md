# NYMIS × Nansen

NYMIS is a wallet privacy scanner that shows what can be inferred about a person from a public blockchain address.

It reconstructs identity exposure, related wallets, exchange interactions, Safe/control relationships, funding history, privacy-tool usage, and material financial relationships, then presents those findings as an explainable privacy report and relationship graph.

Nansen enriches this analysis with wallet-level relationship and transaction intelligence, adding semantic context that is difficult to derive reliably from raw on-chain activity alone.

## Nansen integration

Nansen Profiler adds a valuable intelligence layer to NYMIS by providing structured wallet relationships and transaction history that can be normalized directly into the privacy-analysis pipeline.

NYMIS currently uses two Profiler capabilities:
- Related Wallets — surfaces relationships such as First Funder and other wallet associations that can expose how addresses are connected.
- Transactions — provides normalized transaction history that NYMIS uses to corroborate important financial relationships and investigate wallet-to-wallet flows.

The strongest contribution is semantic relationship context. A blockchain explorer can show that addresses interacted; Nansen can provide structured information about the nature of that relationship. This is particularly useful for identifying funding relationships and validating connections across a wallet graph.

NYMIS combines this intelligence with its own relationship analysis and classifies the result as:
- corroborating an independently observed relationship;
- adding useful semantic context;
- revealing a previously unidentified relationship; or
- infrastructure/deployment noise that should not be presented as a meaningful privacy finding.

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
