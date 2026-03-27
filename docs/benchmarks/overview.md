# Benchmarks Overview

## Objective

Compare ngStato versus NgRx v21+ on realistic workloads.

## Scope

- CRUD feature with normalized entities
- search + debounce + cancellation
- concurrent async requests (exclusive/queued semantics)
- optional stream-heavy scenario

## Metrics

- lines of code (store layer)
- bundle impact
- runtime latency for user actions
- memory profile under repeated updates

## Methodology principles

- same backend contract
- same UI behavior and acceptance criteria
- reproducible scripts and open benchmark fixtures

## Status

Initial benchmark suite is being prepared. Results will be published with methodology and raw data.

