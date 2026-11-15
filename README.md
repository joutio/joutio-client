# @joutio/client

Domaine client partagé de Joutio (web et mobile) : TypeScript pur, sans React, DOM ni I/O.

```ts
import { applyGameNotification, emptyGame } from '@joutio/client/game'
import { applyRoomNotification, preparationStep } from '@joutio/client/rooms'
```

Installation (GitHub Packages) : ajouter `@joutio:registry=https://npm.pkg.github.com` au `.npmrc` du projet et un
jeton `read:packages` dans `~/.npmrc`, puis `npm install @joutio/client`.

Règles, modules et publication : [`AGENTS.md`](AGENTS.md).
