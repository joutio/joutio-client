# AGENTS.md — joutio-client

`@joutio/client` : **domaine client partagé** de Joutio, en TypeScript pur, consommé par
`joutio-web` et `joutio-mobile`. Ce que les deux apps calculaient chacune de leur côté, écrit une
seule fois et testé. Décisions : ADR [0001](../../design/specs/decisions/0001-client-domain.md)
(domaine), [0002](../../design/specs/decisions/0002-client-i18n.md) (textes).

Lire : `../../AGENTS.md`, puis [`docs/frontend/architecture.md`](../../docs/frontend/architecture.md)
et le contrat du BFF ([`docs/api/`](../../docs/api/README.md)).

## Modules

| `@joutio/client/<module>` | Contenu |
|---|---|
| `game` | constantes du duel, read model `GameState`, repli des notifications, chronologie de l'arène (`sceneAt`), DTOs de résultat |
| `rooms` | salles (`Room`, repli, étapes de préparation, cadence des relances) et appariement (`Matchmaking`) |
| `authoring` | atelier : rôles, actions sur une question, brouillons, plan de modifications, signalements, plafonds, titres par palier |
| `premium` | limites du plan (`planLimits`), sujets gelés (`isFrozen`), problèmes de limite (`QUOTA_PROBLEMS`), accroches |
| `profile` | règles du pseudonyme (miroir de `joutio-profile`) et de la date de naissance, 15 ans minimum (miroir de `joutio-identity`) |
| `geo` | pays ISO 3166-1 alpha-2 : liste, noms FR/EN embarqués, tri, recherche sans accents, drapeaux |
| `share` | liens universels `go.joutio.com` : construction et analyse |
| `query` | clés React Query hiérarchiques (`queryKeys`), lectures communes du BFF (`meQuery`, `profileQuery`… : clé + `queryFn` sur un `HttpClient` injecté), transaction optimiste (`optimisticUpdate`, retour arrière ciblé), mises à jour de cache pures (`applyFollow`). `@tanstack/query-core` en dépendance pair, aucun hook |
| `forms` | schémas Zod des formulaires des deux apps (connexion, code, date de naissance, profil, sujet, titres, question, modération, signalements), limites de saisie ; messages = clés `i18n`. `zod` en dépendance pair |
| `i18n` | textes FR/EN des deux apps (`fr.ts` fait foi, `en.ts` typé), `translate`, `formatNumber`, `formatDate`, `dayLabel`, `pluralOf`, `tierKey`, `categoryKey`, `avatarLabel` (dictionnaire de l'éditeur d'avatar, `avatar/`). Préfixes : aucun (commun), `mobile.`, `ds.` |
| `api-types` | DTOs du BFF (`*View`, `*Request`) et erreur RFC 7807 (`ApiError`) |

L'entrée racine réexporte tout, sauf `i18n` (sous-chemin `@joutio/client/i18n` seulement).

## Règles

- **Aucun framework ni plateforme** (seules dépendances : `zod` et `@tanstack/query-core` en pair, ADR 0001 avenant du 2026-11-17) : pas de `react`, `react-native`, `expo`, `vite` ; pas de
  `window`, `document`, `fetch`, `localStorage`, `navigator`, `WebSocket`. ESLint l'interdit.
  `lib: ["ES2023"]` sans DOM ; tests Vitest en environnement `node`.
- Fonctions pures et types. Pas d'I/O ni d'horloge implicite : l'instant courant est un paramètre
  (`now`).
- Le serveur reste autoritaire (score, Elo, XP) : le client projette et affiche.
- Des codes sémantiques (`OR`, `SCIENCE`), jamais une couleur ou une valeur de design (elles
  vivent dans les jetons du lab).
- Imports relatifs avec l'extension `.js` (résolution `NodeNext`).
- Un contrat du BFF qui change est reporté **ici d'abord**, puis les apps montent de version.
- Une règle métier dupliquée d'un service (pseudonyme, âge) suit le service à chaque évolution.

## Commandes

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build      # dist/ : ESM + .d.ts
```

## Publication

- semantic-release à chaque push sur `main` (hors `*.md`), publication sur GitHub Packages. Ne
  jamais changer la version à la main.
- Jeton : `JOUTIO_GITHUB_TOKEN`, sinon le `GITHUB_TOKEN` du workflow (`packages: write`).
- Les apps pinnent une version publiée. Installation : `.npmrc` avec
  `@joutio:registry=https://npm.pkg.github.com` et un jeton `read:packages` (`~/.npmrc` via
  `make bootstrap`, `NODE_AUTH_TOKEN` en CI).
- **Commits sans ligne de co-auteur** dans ce dépôt.
