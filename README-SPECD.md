# ngStato — Spec Detaillee (Vision, Etat, Strategie)

Ce document complete le `README.md`. Son but est de donner une vue claire, exploitable et durable de:

- l'objectif produit discute (battre NgRx en capacites reelles, avec moins de complexite),
- ce qui a ete implemente concretement,
- ou chaque element vit dans le projet,
- les decisions d'architecture (pourquoi),
- et la suite de travail recommandee.

---

## 1) Objectif Produit (Nord Star)

Construire un state manager:

1. aussi capable que NgRx sur les scenarios reels (CRUD, concurence, orchestration),
2. plus simple a utiliser (moins de code, moins de concepts),
3. multi-framework (Angular aujourd'hui, React/Vue ensuite) grace a `@ngstato/core`,
4. avec RxJS optionnel (integrable, jamais obligatoire).

Message cible:

- **State-first par defaut** (actions + effects + selectors memoises + helpers Promise-first),
- **Stream-first uniquement a la frontiere** (websocket, Firebase, router events, RxJS existant) via `fromStream`.

---

## 2) Architecture de Reference (Core/Angular)

### 2.1 Core = source de verite

Le moteur central est dans:

- `packages/core/src/store.ts`
- `packages/core/src/types.ts`

Principes:

- `createStore()` construit le store public,
- la logique interne reste dans `StatoStore`,
- les features avancees s'ajoutent par:
  - wrappers d'actions (`helpers/*`),
  - wrappers de config (`withPersist(...)`),
  - connectors runtime (`connectDevTools(...)`, `on(...)`).

### 2.2 Angular = adaptateur fin (thin adapter)

Integre via:

- `packages/angular/src/create-angular-store.ts`
- `packages/angular/src/inject-store.ts`
- `packages/angular/src/provide-ngstato.ts`
- `packages/angular/src/devtools.component.ts`

Raison:

- la logique metier ne doit pas dependre d'Angular,
- Angular mappe le state vers Signals + DI, sans redefinir les regles du moteur.

---

## 3) Ce qui a ete ajoute (par theme)

## 3.1 Inter-stores + Concurrence actions

### Fonctionnalites

- `on(actionFn, handler)` pour reactions inter-stores (success/error, duration, args).
- `exclusive()` (equiv. exhaustMap sur action async).
- `queued()` (equiv. concatMap sur action async).

### Fichiers

- `packages/core/src/action-bus.ts`
- `packages/core/src/store.ts` (dispatch events + binding action publique)
- `packages/core/src/index.ts` (exports)
- `packages/core/src/helpers/exclusive.ts`
- `packages/core/src/helpers/queued.ts`
- `packages/core/src/__tests__/store.test.ts`
- `packages/core/src/__tests__/helpers.test.ts`
- `packages/core/README.md`

### Demo

- `apps/student-demo/src/app/features/students/store/student.store.ts`
- `apps/student-demo/src/app/features/students/pages/students-page/students-page.component.ts`
- `apps/student-demo/README.md`

---

## 3.2 Helpers async/state patterns (Promise-first)

### Fonctionnalites

- `distinctUntilChanged()` (wrapper d'action, anti-execution inutile),
- `forkJoin()` (parallel all),
- `race()` (first wins),
- `combineLatest()` (deps state/effects, sans streams).

### Fichiers

- `packages/core/src/helpers/distinct-until-changed.ts`
- `packages/core/src/helpers/fork-join.ts`
- `packages/core/src/helpers/race.ts`
- `packages/core/src/helpers/combine-latest.ts`
- `packages/core/src/index.ts`
- `packages/core/src/__tests__/helpers.test.ts`
- `packages/core/README.md`

---

## 3.3 Streams externes optionnels (RxJS-compatible, RxJS non obligatoire)

### Fonctionnalites

- `combineLatestStream()` pour combiner des sources `.subscribe(...)`.
- Nouveau toolkit composable type RxJS:
  - `pipeStream`,
  - `mapStream`,
  - `filterStream`,
  - `switchMapStream`,
  - `concatMapStream`,
  - `exhaustMapStream`,
  - `mergeMapStream`.

### Fichiers

- `packages/core/src/helpers/combine-latest-stream.ts`
- `packages/core/src/helpers/stream-operators.ts`
- `packages/core/src/helpers/from-stream.ts` (base `StatoObservable`)
- `packages/core/src/index.ts` (exports)
- `packages/core/src/__tests__/helpers.test.ts` (semantiques validates)
- `packages/core/README.md`

### Decision cle

On garde **2 APIs distinctes**:

- `combineLatest()` pour deps state (state-first),
- `combineLatestStream()` pour flux externes (stream-first).

Pourquoi:

- semantiques differentes (pas les memes couts/runtime/lifecycle),
- meilleure lisibilite,
- types plus simples,
- moins de confusion pour les equipes.

---

## 3.4 Unification lifecycle multi-framework (point critique)

### Probleme detecte

Avant:

- Core: `createStore()` ne garantissait pas toujours un cycle init uniforme selon usage.
- Angular: `hooks.onInit` etait appele directement dans l'adapter.

Risque:

- divergence de comportement entre Angular et futur React/Vue/Node.

### Correction

- `createStore()` initialise automatiquement via `init(publicStore)`.
- `init()` est idempotent (`onInit` execute une seule fois).
- Angular appelle `coreStore.__store__.init(angularStore)` au lieu d'appeler `hooks.onInit` en direct.

### Fichiers

- `packages/core/src/store.ts`
- `packages/angular/src/create-angular-store.ts`

### Impact

- comportement coherent quel que soit l'adapter,
- base solide pour extension React/Vue.

---

## 3.5 Tooling tests demos

### Tests demos

Passage demos vers Vitest:

- `apps/student-demo/package.json`
- `apps/student-demo/vitest.config.ts`
- `apps/student-demo/src/smoke.spec.ts`
- `apps/stackblitz-demo/package.json`
- `apps/stackblitz-demo/vitest.config.ts`
- `apps/stackblitz-demo/src/smoke.spec.ts`
- `pnpm-lock.yaml`

### Verification executee

- `packages/core`: tests OK (105 tests apres ajouts stream operators)
- `packages/angular`: tests OK
- build monorepo OK (warnings styles/export conditions, non bloquants)

---

## 4) Positionnement vs NgRx (etat actuel)

## 4.1 Ou ngStato est deja tres fort

- CRUD + side effects state-first: moins de boilerplate.
- Concurrence action-level: `exclusive`, `queued`, `abortable`.
- Async patterns Promise-first: `forkJoin`, `race`, `retryable`.
- Streams externes integrables sans imposer RxJS.

## 4.2 Ce qui reste pour "niveau entreprise"

- `withEntities()` (priorite haute) pour collections massives/normalisees.
- stream operators complementaires:
  - `distinctUntilChangedStream`,
  - `debounceStream`,
  - `throttleStream`,
  - `catchErrorStream`,
  - `retryStream`.
- testing utilities dediees (`@ngstato/core/testing` / `@ngstato/angular/testing`).
- devtools avances (time-travel, filtres).

---

## 5) Strategie recommandee (ordre d'execution)

## Phase A (prioritaire): Entities

Objectif:

- couvrir le coeur "app complexe CRUD" (equivalent avantage NgRx Entity).

Sortie attendue:

- `withEntities()` + helpers CRUD normalises + selectors memoises.

## Phase B: Stream toolkit complet 80/20

Objectif:

- couvrir les patterns RxJS reelles les plus utilises, sans reproduire tout RxJS.

Sortie attendue:

- operators essentiels manquants avec tests de semantique stricte.

## Phase C: Benchmark final (a la fin comme decide)

Comparer NgRx v21+ vs ngStato sur:

- lignes de code,
- latence action->state,
- throughput updates,
- cout bundle.

---

## 6) Regles d'implementation (pour futurs contributeurs)

1. Garder `@ngstato/core` sans dependance RxJS obligatoire.
2. Toute feature doit etre:
   - soit wrapper d'action,
   - soit wrapper de config,
   - soit connector runtime.
3. Eviter d'alourdir `createStore` avec des details de domaine.
4. Ajouter tests de semantique avant doc marketing.
5. Adapter Angular/React/Vue = couche fine; le comportement vient du core.

---

## 7) Index des fichiers cles a lire avant toute modification

### Core moteur

- `packages/core/src/store.ts`
- `packages/core/src/types.ts`
- `packages/core/src/index.ts`

### Core helpers et streams

- `packages/core/src/helpers/from-stream.ts`
- `packages/core/src/helpers/combine-latest.ts`
- `packages/core/src/helpers/combine-latest-stream.ts`
- `packages/core/src/helpers/stream-operators.ts`
- `packages/core/src/helpers/exclusive.ts`
- `packages/core/src/helpers/queued.ts`
- `packages/core/src/helpers/with-persist.ts`
- `packages/core/src/action-bus.ts`

### Angular adapter

- `packages/angular/src/create-angular-store.ts`
- `packages/angular/src/inject-store.ts`
- `packages/angular/src/provide-ngstato.ts`
- `packages/angular/src/devtools.component.ts`

### Tests reference

- `packages/core/src/__tests__/helpers.test.ts`
- `packages/core/src/__tests__/store.test.ts`
- `packages/angular/src/__tests__/create-angular-store.test.ts`

### Demos

- `apps/student-demo/src/app/features/students/store/student.store.ts`
- `apps/student-demo/src/app/features/students/pages/students-page/students-page.component.ts`
- `apps/stackblitz-demo/src/app/todo.store.ts`

---

## 8) Etat git a retenir

- Le document d'analyse comparatif local est volontairement non commite:
  - `v0.2-ANALYSIS.md`

Il sert de trace de decision et de comparaison evolutive.

