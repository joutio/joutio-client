import type { RoomPresence, RoomView } from '../types.js'

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
export function applyRoomPresence(rooms: readonly RoomView[], presence: RoomPresence, viewerId: string): RoomView[] | undefined {
  if (!rooms.some((room) => room.roomId === presence.roomId)) return undefined
  return rooms.map((room) => {
    if (room.roomId !== presence.roomId) return room
    // `canCancel` : le viewer est l'initiateur. Le joueur concerné est l'initiateur s'il est le viewer initiateur, ou
    // l'adversaire d'un viewer invité.
    const playerIsInitiator = (presence.playerId === viewerId) === room.canCancel
    return playerIsInitiator ? { ...room, initiatorPresent: presence.present } : { ...room, participantPresent: presence.present }
  })
}

/**
 * Sections de l'onglet Salons (`defis.md`) : salons privés partagés par lien, et salles avec un adversaire désigné
 * (défi accepté, revanche, appariement). Les salles du bot n'apparaissent dans aucune.
 */
export function splitRoomsByOrigin<T extends Pick<RoomView, 'origin'>>(rooms: readonly T[]) {
  return {
    shared: rooms.filter((room) => room.origin === 'SHARED'),
    challenges: rooms.filter((room) => room.origin === 'CHALLENGE' || room.origin === 'REMATCH' || room.origin === 'MATCHMAKING'),
  }
}
