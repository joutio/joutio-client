import type { DefisSections, RoomPresence, RoomStatusChange, RoomView } from '../types.js'

/** Projections sur la vue REST d'une salle (`RoomView`), partagées par les deux apps. */

/**
 * Salle où l'adversaire **attend le viewer** (2026-11-16) : salle humaine en attente, adversaire présent, viewer
 * absent. Le viewer est l'initiateur quand `canCancel` est vrai, l'invité sinon. Sert la pastille de l'onglet Défis.
 */
export function isWaitingForViewer(room: RoomView): boolean {
  if (room.vsBot || room.status !== 'WAITING_PLAYERS') return false
  const viewerPresent = room.canCancel ? room.initiatorPresent : room.participantPresent
  const opponentPresent = room.canCancel ? room.participantPresent : room.initiatorPresent
  return opponentPresent && !viewerPresent
}

/** Nombre de salles où l'adversaire attend le viewer (`isWaitingForViewer`). */
export function roomsWaitingForViewer(rooms: readonly RoomView[] | undefined): number {
  return rooms?.filter(isWaitingForViewer).length ?? 0
}

/**
 * Applique une présence poussée (`ROOM_PRESENCE`) aux salles du viewer, sans attendre la projection serveur.
 * `undefined` quand la salle n'est pas connue : l'appelant relit alors ses salles.
 */
export function applyRoomPresence(
  rooms: readonly RoomView[],
  presence: RoomPresence,
  viewerId: string,
): RoomView[] | undefined {
  if (!rooms.some((room) => room.roomId === presence.roomId)) return undefined
  return rooms.map((room) => {
    if (room.roomId !== presence.roomId) return room
    // `canCancel` : le viewer est l'initiateur. Le joueur concerné est l'initiateur s'il est le viewer initiateur, ou
    // l'adversaire d'un viewer invité.
    const playerIsInitiator = (presence.playerId === viewerId) === room.canCancel
    return playerIsInitiator
      ? { ...room, initiatorPresent: presence.present }
      : { ...room, participantPresent: presence.present }
  })
}

/**
 * Sections de l'onglet Défis (`defis.md`) : défis reçus (triés par échéance), défis envoyés, et salles qui attendent
 * les joueurs (défis acceptés, salons partagés, appariements). Les salles du bot et celles déjà en préparation
 * n'apparaissent dans aucune.
 */
export function defisSections(rooms: readonly RoomView[] | undefined): DefisSections {
  const invitations = (rooms ?? []).filter((room) => room.status === 'INVITED')
  return {
    received: invitations
      .filter((room) => !room.canCancel)
      .sort((left, right) => Date.parse(left.expiresAt) - Date.parse(right.expiresAt)),
    sent: invitations.filter((room) => room.canCancel),
    waiting: (rooms ?? []).filter((room) => room.status === 'WAITING_PLAYERS' && !room.vsBot),
  }
}

/** Nombre de défis reçus en attente de réponse (pastille de l'onglet Défis, avec `roomsWaitingForViewer`). */
export const pendingInvitations = (rooms: readonly RoomView[] | undefined) =>
  rooms?.filter((room) => room.status === 'INVITED' && !room.canCancel).length ?? 0

/** Revanche reçue en attente de réponse (fenêtre de 10 s sur l'écran de résultat), la plus récente. */
export function incomingRematch(rooms: readonly RoomView[] | undefined): RoomView | undefined {
  return rooms?.filter((room) => room.status === 'INVITED' && room.origin === 'REMATCH' && !room.canCancel).at(-1)
}

/**
 * Applique un changement d'étape poussé (`ROOM_STATUS`) aux salles du joueur : une salle terminée ou lancée quitte la
 * liste, une autre prend son nouveau statut. `undefined` quand la salle n'est pas connue : l'appelant relit ses salles.
 */
export function applyRoomStatus(rooms: readonly RoomView[], change: RoomStatusChange): RoomView[] | undefined {
  if (!rooms.some((room) => room.roomId === change.roomId)) return undefined
  if (change.status !== 'INVITED' && change.status !== 'WAITING_PLAYERS')
    return rooms.filter((room) => room.roomId !== change.roomId)
  return rooms.map((room) =>
    room.roomId === change.roomId
      ? { ...room, status: change.status, expiresAt: change.expiresAt ?? room.expiresAt }
      : room,
  )
}
