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
| `rooms` | salles, défis compris (un défi est une salle `INVITED`) et appariement : `Room` et `Matchmaking` (classes réagissant aux `RoomEvent`/`MatchmakingEvent`), étapes de préparation, relances (`reminderState`, `invitationReminderDelay`), sections de l'onglet Défis (`defisSections`), lectures (`useMyRooms`, `useDefis`, `useDefisBadge`, `useIncomingRematch`, `useRoom`), flux (`useRoomStream`, `useMatchmakingStream`, `useJoinRefusal`), mutations (défier, salon, bot, accepter, refuser, annuler, relancer, appariement) |
| `authoring` | atelier : rôles, actions sur une question, brouillons, plan de modifications, signalements, plafonds, titres par palier, schémas des formulaires d'atelier, lectures et commandes (sujets champ par champ, questions, équipe, modération, signalements) |
| `profile` | profil public : règles du pseudonyme et de la date de naissance, présence, progression (XP, Elo, badges, titres), schémas pseudonyme/date de naissance, lectures `/api/profiles/{id}/*` (dont l'historique paginé) et commandes (pseudonyme, bio, pays, bannière, langue, avatar) |
| `me` | compte connecté : `MeView`, récompenses, bloqués, disponibilité du pseudonyme, schémas de connexion (e-mail, OTP) et d'édition du profil, petits hooks à `select` (`useMyId`, `useIsPremium`…), commandes (date de naissance, CGU, centres d'intérêt, suppression) |
| `premium` | limites du plan (`planLimits`), sujets gelés (`isFrozen`), problèmes de limite (`QUOTA_PROBLEMS`), accroches — logique pure, aucune lecture |
| `topics` | sujets : catalogue paginé (fusion multi-univers), facettes, fiche (`TopicOverviewView`), classements (fiche + complets paginés), DTOs du domaine, commandes (suivre / ne plus suivre) |
| `search` | recherche globale (`useSuggestions`, terme temporisé par l'app) |
| `social` | listes de personnes paginées (`useContacts`), mutations optimistes `useFollowPlayer` et `useBlockPlayer` |
| `notifications` | inbox : `NotificationView`, pagination, non-lues, préférences, mutations (lire, tout lire, retirer, préférences) |
| `sync` | `useJoutioSync(userId)` : seule synchronisation du cache sur les flux personnels (inbox, `ROOM_PRESENCE`, `ROOM_STATUS`, succès débloqués), montée une fois par l'app |
| `home` | rails de l'Accueil (`HomeView`) |
| `onboarding` | recommandations de sujets, commande de complétion |
| `core` | transverse : `JoutioClientProvider` et `useJoutio` (runtime : `http`, `realtime`, `clock`), `HttpClient` (`get`/`post`/`put`/`delete` avec `{ body, query, signal }`), `AbortSignalLike`, `segment()`, `optimisticId` — les apps implémentent le client HTTP (`lib/api`) et le transport |
| `core/types` | contrats communs du BFF : `ApiError` (RFC 7807), `PageResponse`, `IdResponse`, `Language` |
| `core/query` | politique du cache (`createJoutioQueryClient`, `shouldRetry`), clés typées (`typed`), pagination (`nextPage`, `keepPreviousWhen`, `MAX_PAGES`), optimisme à retour ciblé (`change`, `changeFields`, `removeFrom`, `undoAll`, `useOptimisticMutation`, `useOptimisticBatch`, `useCommand`, `PartialFailure`) |
| `core/realtime` | transport (`RealtimeTransport`, fourni au provider), `useEventStream` (agrégat : catch-up REST + dédup par séquence + reconnexion) et `useSubscription` (éphémère : parse + handler + resynchronisation) |
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
  `updateX`…). Un service ne contient que des fonctions d'endpoints pures — **aucun type exporté** — et n'est pas
  exporté par l'`index.ts` ;
- `query/keys.ts` : **toutes** les clés de la feature, typées (`typed<T>()`), hiérarchiques (entité → portée → id →
  objet de filtres), et les clés de mutation ; `query/queries.ts` : les `queryOptions`/`infiniteQueryOptions` ;
- `hooks/use-<f>.ts` : lectures (`useQuery` sur les options, `select` pour les projections) ;
  `hooks/use-<f>-mutations.ts` : une mutation par commande (`useOptimisticMutation`, `useOptimisticBatch` ou
  `useCommand`) ; les flux d'événements sont des hooks dédiés (`use-game-stream.ts`, `use-room-stream.ts`) ;
- `cache/` : changements de cache de la feature, chacun renvoyant son inverse ciblé (`Undo`) ;
- `schema/<f>.schema.ts` : schémas Zod (messages = clés `i18n`), seulement où il y a des formulaires ;
- `tests/` : tous les tests de la feature.

**Propriété des DTOs** : un DTO du BFF appartient à la feature de son domaine (fiches `docs/api/`) — ex.
`UserRefView` → `profile`, `TopicCardView` → `topics`, `RoomView` → `rooms`. Les autres features
l'importent en `import type` depuis son `types.ts`, jamais de re-définition.

L'entrée racine réexporte tout, sauf `i18n` (sous-chemin `@joutio/client/core/i18n` seulement).

## Règles

- **Aucune plateforme** (ADR 0001, avenant 2026-11-22) : `react` (hooks uniquement) et `@tanstack/react-query`
  (peer) sont autorisés ; pas de `react-native`, `expo`, `vite`, ni `window`, `document`, `fetch`, `localStorage`,
  `navigator`, `WebSocket`. ESLint l'interdit. `lib: ["ES2023"]` sans DOM ; tests des modules purs en
  environnement `node`, tests de hooks en jsdom (`// @vitest-environment jsdom`) + `@testing-library/react`.
- Fonctions pures et types. Pas d'I/O ni d'horloge implicite : l'instant courant est un paramètre (`now`).
- **L'app ne touche jamais au cache** (avenant ADR 0001 du 2026-11-24) : `JoutioClientProvider` reçoit `http`,
  `realtime`, `clock` et le `QueryClient` ; les hooks les lisent par `useJoutio()`. Ni `http` ni le transport ne
  sont dans une clé de cache. Aucun timer, et l'horloge vient du runtime (`clock`), jamais de `Date.now()`.
- **Deux primitives temps réel seulement** : `useEventStream` (agrégat séquencé, avec historique REST) et
  `useSubscription` (éphémère, sans historique). Aucun `subscribe` main dans les features.
- **Optimisme à retour ciblé** : `onMutate` annule les lectures en vol et applique le changement à toutes les vues ;
  il renvoie l'inverse de **ce seul** changement (champs écrits, delta, entrée insérée ou retirée), appliqué sur la
  valeur courante à l'échec ; en lot, seuls les refus reviennent. Jamais de snapshot restauré en bloc, jamais de
  relecture au succès. Les mutations ne prennent pas de callbacks : l'app passe les siens à `mutate`.
- **Fraîcheur** : la politique est celle de `createJoutioQueryClient` ; aucun hook ne fixe `staleTime` ni `retry`
  (seule exception : le renvoi d'une réponse de manche, `useAnswerQuestion`).
- `userId` est passé explicitement par l'app (lu dans sa session) ; un paramètre absent donne `skipToken` avec la
  clé de la même fabrique, jamais une clé contenant `''`.
- `core` n'importe aucune feature (ESLint) ; une feature qui écrit dans le cache d'une autre importe ses
  `query/keys.ts` ou son `cache/`.
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
npm run format     # prettier (120 colonnes)
```

Tests de hooks : `renderWithJoutio`, `fakeHttp` (enregistre les GET : aucune lecture après une commande),
`fakeRealtime` et `deferred` (`src/testing/`, hors build). Chaque mutation couvre : changement visible avant la
réponse, lectures en vol annulées, aucun GET au succès, retour arrière ciblé (une mutation concurrente reste), lot
partiel.

## Publication

- semantic-release à chaque push sur `main` (hors `*.md`), publication sur GitHub Packages. Ne
  jamais changer la version à la main.
- Jeton : `JOUTIO_GITHUB_TOKEN`, sinon le `GITHUB_TOKEN` du workflow (`packages: write`).
- Les apps pinnent une version publiée. Installation : `.npmrc` avec
  `@joutio:registry=https://npm.pkg.github.com` et un jeton `read:packages` (`~/.npmrc` via
  `make bootstrap`, `NODE_AUTH_TOKEN` en CI).
- **Commits sans ligne de co-auteur** dans ce dépôt.
