# Contribuer à ngStato

Merci de vouloir contribuer à ngStato !

## Prérequis

- Node.js >= 18
- pnpm >= 8 — `npm install -g pnpm`

## Installation
```bash
git clone https://github.com/ton-username/ngStato
cd ngStato
pnpm install
```

## Build
```bash
# Compiler tous les packages
pnpm build

# Compiler un package spécifique
cd packages/core
pnpm run build
```

## Tests
```bash
# Lancer tous les tests
pnpm test

# Lancer les tests d'un package
cd packages/core
pnpm test

cd packages/angular
pnpm test

# Lancer les tests de la demo app
cd apps/student-demo
npx vitest run
```

## Structure du projet
```
ngStato/
├── packages/
│    ├── core/          → @ngstato/core — logique pure
│    └── angular/       → @ngstato/angular — adaptateur Angular
├── apps/
│    └── student-demo/  → demo app Angular 18
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

## Workflow

1. Fork le repo
2. Crée une branche — `git checkout -b feature/ma-feature`
3. Fais tes modifications
4. Lance les tests — `pnpm test`
5. Commit — `git commit -m "feat: ma feature"`
6. Push — `git push origin feature/ma-feature`
7. Ouvre une Pull Request

## Convention de commits
```
feat:     nouvelle fonctionnalité
fix:      correction de bug
docs:     documentation
test:     ajout ou modification de tests
refactor: refactoring sans nouvelle fonctionnalité
chore:    maintenance
```