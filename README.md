# NYMIS × Nansen

NYMIS is a wallet privacy scanner that shows what can be inferred about a person from a public blockchain address.

It reconstructs identity exposure, related wallets, exchange interactions, Safe/control relationships, funding history, privacy-tool usage, and material financial relationships, then presents those findings as an explainable privacy report and relationship graph.

Nansen enriches this analysis with wallet-level relationship and transaction intelligence, adding semantic context that is difficult to derive reliably from raw on-chain activity alone.

## Nansen integration

Nansen Profiler adds a valuable intelligence layer to NYMIS by providing structured wallet relationships and transaction history that can be normalized directly into the privacy-analysis pipeline.

NYMIS currently uses two Profiler capabilities:
- Related Wallets - surfaces relationships such as First Funder and other wallet associations that can expose how addresses are connected.
- Transactions - provides normalized transaction history that NYMIS uses to corroborate important financial relationships and investigate wallet-to-wallet flows.

The strongest contribution is semantic relationship context. A blockchain explorer can show that addresses interacted; Nansen can provide structured information about the nature of that relationship. This is particularly useful for identifying funding relationships and validating connections across a wallet graph.

NYMIS combines this intelligence with its own relationship analysis and classifies the result as:
- corroborating an independently observed relationship;
- adding useful semantic context;
- revealing a previously unidentified relationship; or
- infrastructure/deployment noise that should not be presented as a meaningful privacy finding.

## Architecture

```text
Wallet
  │
  ├── NYMIS on-chain analysis
  │     ├── identity exposure
  │     ├── exchanges / privacy tools
  │     ├── Safe & control relationships
  │     ├── funding relationships
  │     └── related wallets
  │
  └── Nansen Profiler
        ├── Related Wallets
        └── Transactions
              │
              ▼
       normalize + classify
              │
              ▼
        NYMIS relationship graph
              │
              ▼
      privacy findings + ChainMap
```

Nansen data is normalized into NYMIS’s relationship model rather than displayed as an isolated API response. This lets Nansen-derived intelligence participate in the same evidence and relationship pipeline as independently reconstructed on-chain findings.

## Nansen Analysis Campaign

To evaluate the integration across a broad wallet set, we ran a structured Nansen Profiler campaign against real wallet-analysis cohorts covering ordinary EOAs, multichain wallets, Safe-heavy accounts, exchange-heavy wallets, privacy-tool users, and wallets with known related-address structure.

The campaign exercises both related-wallets and transactions, with endpoint-specific chain validation, bounded concurrency, local filtering of unsupported combinations, and structured result classification.

The resulting dataset is used to measure where Nansen provides the most value: relationship discovery, First Funder semantics, transaction corroboration, and distinguishing meaningful wallet links from infrastructure noise.

## Benchmark results

The benchmark showed that Nansen is especially useful when NYMIS needs to move from raw transaction evidence to relationship semantics.

Where Nansen was strongest:
- First Funder: provides a clean semantic relationship for an otherwise multi-step historical reconstruction.
- Related-wallet corroboration: independently confirms wallet relationships found by NYMIS.
- Transaction context: gives a normalized second source for validating material flows.
- Graph validation: helps distinguish meaningful wallet relationships from deployment/factory and other infrastructure activity.

In many cases Nansen corroborated relationships that NYMIS had independently reconstructed. This is valuable in a privacy product: agreement between independent analysis paths increases confidence without requiring NYMIS to rely on a single source.

## Public-code adaptation

This repository contains the Nansen-facing portion of the NYMIS analysis workflow used for the Buildathon.

The public export preserves the core campaign behavior:

- Nansen request construction and authentication
- endpoint-specific chain validation
- address-only dispatch
- bounded concurrency
- batch scheduling
- compact result logging
- relationship and transaction classification

Private NYMIS datasets, local caches, production configuration, deployment code, and unrelated provider integrations are intentionally excluded.

The campaign cohort is supplied through explicit JSON input so the Nansen integration can be reviewed and run independently without access to the private NYMIS environment.
