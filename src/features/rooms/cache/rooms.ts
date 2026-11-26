import type { QueryClient } from '@tanstack/react-query'
import { change, removeFrom, undoAll, type Undo } from '../../../core/query/optimistic.js'
import type { LiveValue } from '../../../core/realtime/use-live-query.js'
import { roomKeys } from '../query/keys.js'
import type { RoomView } from '../types.js'

const isRoom = (roomId: string) => (room: RoomView) => room.roomId === roomId

type MyRooms = LiveValue<RoomView[]>

/** Change la liste des salles du joueur (vue vivante), version inchangée : le prochain update du serveur l'emporte. */
const mapRooms = (value: MyRooms, apply: (rooms: RoomView[]) => RoomView[]): MyRooms =>
  value === null ? value : { ...value, payload: apply(value.payload) }

/** Patch optimiste des salles du joueur ; l'inverse applique `revert`. */
export function changeMyRooms(
  client: QueryClient,
  apply: (rooms: RoomView[]) => RoomView[],
  revert: (rooms: RoomView[]) => RoomView[],
): Undo {
  return change<readonly unknown[], MyRooms>(
    client,
    { queryKey: roomKeys.mines() },
    (value) => mapRooms(value, apply),
    (value) => mapRooms(value, revert),
  )
}

/** Salle du joueur en cache, quelle que soit la session. */
export function findMyRoom(client: QueryClient, roomId: string): RoomView | undefined {
  return client
    .getQueriesData<MyRooms>({ queryKey: roomKeys.mines() })
    .flatMap(([, value]) => value?.payload ?? [])
    .find(isRoom(roomId))
}

/**
 * Change une salle dans la liste du joueur et dans sa vue détaillée ; l'inverse applique `revert`. Les deux doivent
 * être ciblés (un statut, une échéance).
 */
export function changeRoom(
  client: QueryClient,
  roomId: string,
  apply: (room: RoomView) => RoomView,
  revert: (room: RoomView) => RoomView,
): Undo {
  return undoAll([
    changeMyRooms(
      client,
      (rooms) => rooms.map((room) => (isRoom(roomId)(room) ? apply(room) : room)),
      (rooms) => rooms.map((room) => (isRoom(roomId)(room) ? revert(room) : room)),
    ),
    change(client, { queryKey: roomKeys.detail(roomId), exact: true }, apply, revert),
  ])
}

/** Retire les salles qui vérifient `matches` de la liste du joueur ; l'inverse les remet si elles n'y sont pas revenues. */
export function removeRooms(client: QueryClient, matches: (room: RoomView) => boolean): Undo {
  let removal: ReturnType<typeof removeFrom<RoomView>> | undefined
  return changeMyRooms(
    client,
    (rooms) => {
      removal = removeFrom(rooms, matches)
      return removal.items
    },
    (rooms) => (removal ? removal.restore(rooms) : rooms),
  )
}

/** Retire une salle de la liste du joueur ; l'inverse la remet à sa place si elle n'y est pas revenue. */
export const removeRoom = (client: QueryClient, roomId: string): Undo => removeRooms(client, isRoom(roomId))
