# AGENTS.md — joutio-client

`@joutio/client` : **domaine client partagé** de Joutio, en TypeScript pur, consommé par
`joutio-web` et `joutio-mobile`. Ce que les deux apps calculaient chacune de leur côté, écrit une
seule fois et testé. Décisions : ADR [0001](../../design/specs/decisions/0001-client-domain.md)
(domaine), [0002](../../design/specs/decisions/0002-client-i18n.md) (textes).

Lire : `../../AGENTS.md`, puis [`docs/frontend/architecture.md`](../../docs/frontend/architecture.md)
et le contrat du BFF ([`docs/api/`](../../docs/api/README.md)).

## Modules

`@joutio/client` est organisé par **feature** (avenant ADR 0001 du 2026-11-22) : une feature = unité qui possède
de la donnée serveur et des hooks ; un module = aide pure sans hook.

| `@joutio/client/<sous-chemin>` | Contenu |
|---|---|
| `game` | partie, manches, résultat : `Game` (classe réagissant aux `GameEvent`), arène (`Arena.sceneAt`), horloge (`ClockState`), règles du duel, lectures `/api/games` et commandes (réponse, abandon), `useGameStream` |
| `rooms` | salles et appariement : `Room` et `Matchmaking` (classes réagissant aux `RoomEvent`/`MatchmakingEvent`), étapes de préparation, cadence des relances, projections de la vue REST, lectures et commandes, `useRoomStream`/`useMatchmakingStream` et `useRoomPresenceEvents` |
| `challenges` | défis nominatifs : `ChallengeView`, relance d'un défi envoyé (`remindDelay`, `afterReminder`), lectures et commandes (envoyer, accepter, décliner, annuler, relancer) |
| `authoring` | atelier : rôles, actions sur une question, brouillons, plan de modifications, signalements, plafonds, titres par palier, schémas des formulaires d'atelier, lectures et commandes (sujets champ par champ, questions, équipe, modération, signalements) |
| `profile` | profil public : règles du pseudonyme et de la date de naissance, présence, progression (XP, Elo, badges, titres), schémas pseudonyme/date de naissance, lectures `/api/profiles/{id}/*` (dont l'historique paginé) et commandes (pseudonyme, bio, pays, bannière, langue, avatar) |
| `me` | compte connecté : `MeView`, récompenses, bloqués, disponibilité du pseudonyme, schémas de connexion (e-mail, OTP) et d'édition du profil, petits hooks à `select` (`useMyId`, `useIsPremium`…), commandes (date de naissance, CGU, centres d'intérêt, suppression) |
| `premium` | limites du plan (`planLimits`), sujets gelés (`isFrozen`), problèmes de limite (`QUOTA_PROBLEMS`), accroches — logique pure, aucune lecture |
| `topics` | sujets : catalogue paginé (fusion multi-univers), facettes, fiche (`TopicOverviewView`), classements (fiche + complets paginés), DTOs du domaine, commandes (suivre / ne plus suivre) |
| `search` | clés de la recherche globale (`suggestions`) |
| `social` | listes de personnes paginées (abonnements/abonnés), mutations optimistes `useFollowPlayer` et `useBlockPlayer` |
| `notifications` | inbox : `NotificationView` (REST + flux STOMP), pagination, non-lues, préférences, commandes (lire, retirer, préférences), flux personnel et invalidations |
| `home` | rails de l'Accueil (`HomeView`) |
| `onboarding` | recommandations de sujets, commande de complétion |
| `core` | transverse : `HttpClient` (`get`/`post`/`put`/`delete` avec `{ body, query, signal }`), `AbortSignalLike`, `segment()`, `optimisticId` — les apps implémentent le client HTTP (`lib/api`) |
| `core/types` | contrats communs du BFF : `ApiError` (RFC 7807), `PageResponse`, `IdResponse`, `Language` |
| `core/query` | clés agrégées du cache (`queryKeys`, assemblées depuis les fabriques exportées des `hooks/use-<f>.ts`) |
| `core/realtime` | transport injecté (`RealtimeTransport`), `useEventStream` (agrégat : catch-up REST + dédup par séquence + reconnexion) et `useSubscription` (éphémère : parse + handler + resynchronisation) |
| `core/geo` | pays ISO 3166-1 alpha-2 : liste, noms FR/EN embarqués, tri, recherche sans accents, drapeaux |
| `core/share` | liens universels `go.joutio.com` : construction et analyse |
| `core/i18n` | textes FR/EN des deux apps (`fr.ts` fait foi, `en.ts` typé), `translate`, `formatNumber`, `formatDate`, `dayLabel`, `pluralOf`, `tierKey`, `categoryKey`, `avatarLabel` (dictionnaire de l'éditeur d'avatar, `avatar/`). Préfixes : aucun (commun), `mobile.`, `ds.` |

Dans chaque feature :

- `index.ts` : surface publique ;
- `types.ts` : **tout** le vocabulaire de types — états du domaine, commandes, DTOs du BFF du domaine, ré-exports ;
- `domain/` : modèles purs, sans I/O ni React. Un modèle qui réagit à des événements est une **classe** (`Game`,
  `Room`…) avec `static empty(…)` et une méthode par événement (`onGameEvent`, `onRoomEvent`…) ; les événements
  vivent dans `domain/<f>-event.ts` ; les règles et helpers purs dans des fichiers par sujet (`round.ts`,
  `room-view.ts`, `preparation.ts`…) ; pas de `utils/`, pas de fourre-tout ;
- `services/<f>-query.service.ts` : lectures (`getX`), `services/<f>-command.service.ts` : écritures (`createX`,
  `updateX`…). Un service ne contient que des fonctions d'endpoints pures — **aucun type exporté** ;
- `hooks/use-<f>.ts` : clés exportées + `useQuery`/`useMutation` directs sur les fonctions du service, avec `signal`
  et `skipToken` ; les flux d'événements sont des hooks dédiés (`use-game-stream.ts`, `use-room-stream.ts`) ;
- `cache/` : mises à jour de cache internes à la feature, quand ses mutations en ont besoin ;
- `schema/<f>.schema.ts` : schémas Zod (messages = clés `i18n`), seulement où il y a des formulaires ;
- `tests/` : tous les tests de la feature.

**Propriété des DTOs** : un DTO du BFF appartient à la feature de son domaine (fiches `docs/api/`) — ex.
`UserRefView` → `profile`, `TopicCardView` → `topics`, `ChallengeView` → `challenges`. Les autres features
l'importent en `import type` depuis son `types.ts`, jamais de re-définition.

L'entrée racine réexporte tout, sauf `i18n` (sous-chemin `@joutio/client/core/i18n` seulement).

## Règles

- **Aucune plateforme** (ADR 0001, avenant 2026-11-22) : `react` (hooks uniquement) et `@tanstack/react-query`
  (peer) sont autorisés ; pas de `react-native`, `expo`, `vite`, ni `window`, `document`, `fetch`, `localStorage`,
  `navigator`, `WebSocket`. ESLint l'interdit. `lib: ["ES2023"]` sans DOM ; tests des modules purs en
  environnement `node`, tests de hooks en jsdom (`// @vitest-environment jsdom`) + `@testing-library/react`.
- Fonctions pures et types. Pas d'I/O ni d'horloge implicite : l'instant courant est un paramètre (`now`).
- `http` (et `subscribe` pour le temps réel) est **injecté** : les fabriques et hooks le reçoivent en paramètre,
  il n'est jamais dans une clé de cache (règle ESLint `exhaustive-deps` configurée en conséquence). Aucun timer ni
  horloge implicite.
- **Deux primitives temps réel seulement** : `useEventStream` (agrégat séquencé, avec historique REST) et
  `useSubscription` (éphémère, sans historique). Aucun `subscribe` main dans les features.
- **Optimisme natif TanStack Query** : `onMutate` applique la valeur optimiste, l'erreur invalide (`invalidateQueries`).
  Aucun helper de snapshot/rollback maison.
- `userId` est passé explicitement par l'app (lu dans sa session) ; un paramètre absent donne `skipToken`, jamais
  une clé contenant `''` ; `useMe(http)` reçoit seulement le client HTTP.
- Aucun composant d'affichage (`.tsx`), aucun store, aucune navigation dans la lib.
- Un service ne porte **aucun type** : le vocabulaire vit dans `types.ts`, les fonctions d'endpoints dans les
  services.
- Le serveur reste autoritaire (score, Elo, XP) : le client projette et affiche.
- Des codes sémantiques (`OR`, `SCIENCE`), jamais une couleur ou une valeur de design (elles
  vivent dans les jetons du lab).
- Imports relatifs avec l'extension `.js` (résolution `NodeNext`) ; entre features, `import type` direct depuis le
  `types.ts` propriétaire (jamais via l'`index.ts` barrel, pour éviter les cycles).
- Un contrat du BFF qui change est reporté **ici d'abord** (DTO dans la feature de son domaine), puis les apps
  montent de version.
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
