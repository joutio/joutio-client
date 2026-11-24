import type { QueryClient } from '@tanstack/react-query'
import { change, nothingToUndo, removeFrom, undoAll, type Undo } from '../../../core/query/optimistic.js'
import { roomKeys } from '../query/keys.js'
import type { RoomView } from '../types.js'

const isRoom = (roomId: string) => (room: RoomView) => room.roomId === roomId

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
    change(
      client,
      { queryKey: roomKeys.mine(), exact: true },
      (rooms) => rooms.map((room) => (isRoom(roomId)(room) ? apply(room) : room)),
      (rooms) => rooms.map((room) => (isRoom(roomId)(room) ? revert(room) : room)),
    ),
    change(client, { queryKey: roomKeys.detail(roomId), exact: true }, apply, revert),
  ])
}

/** Retire une salle de la liste du joueur ; l'inverse la remet à sa place si elle n'y est pas revenue. */
export function removeRoom(client: QueryClient, roomId: string): Undo {
  const rooms = client.getQueryData(roomKeys.mine())
  if (!rooms) return nothingToUndo
  const removal = removeFrom(rooms, isRoom(roomId))
  client.setQueryData(roomKeys.mine(), removal.items)
  return () => client.setQueryData(roomKeys.mine(), (current) => (current ? removal.restore(current) : current))
}
