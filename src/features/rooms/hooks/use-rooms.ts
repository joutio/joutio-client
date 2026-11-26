import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { useLiveQuery, type LiveQuery, type LiveValue } from '../../../core/realtime/use-live-query.js'
import { defisSections, incomingRematch, pendingInvitations, roomsWaitingForViewer } from '../domain/room-view.js'
import { getRoom } from '../services/rooms-query.service.js'
import { roomKeys } from '../query/keys.js'
import type { RoomView } from '../types.js'

/** Nom de la vue vivante des salles du joueur côté BFF. */
export const MY_ROOMS_VIEW = 'my-rooms'

export const roomQueries = {
  detail: (http: HttpClient, roomId: string | undefined) =>
    queryOptions({
      queryKey: roomKeys.detail(roomId),
      queryFn: roomId ? ({ signal }) => getRoom(http, roomId, signal) : skipToken,
    }),
}

/**
 * Salles du joueur en vue vivante : matchmaking pousse la liste à chaque écriture d'une d'elles (invitation, réponse,
 * présence, départ, partie créée). Les mutations de salle (`rooms`) retiennent les updates le temps de leur patch.
 */
const myRooms = (userId: string | undefined): LiveQuery<RoomView[]> => ({
  queryKey: roomKeys.mine(userId),
  view: MY_ROOMS_VIEW,
  key: userId,
  mutationKey: roomKeys.root,
})

const rooms = (value: LiveValue<RoomView[]>) => value?.payload ?? []
const selectDefis = (value: LiveValue<RoomView[]>) => defisSections(rooms(value))
const selectBadge = (value: LiveValue<RoomView[]>) =>
  pendingInvitations(rooms(value)) + roomsWaitingForViewer(rooms(value))
const selectRematch = (value: LiveValue<RoomView[]>) => incomingRematch(rooms(value))

/** Salles non terminales du joueur : défis reçus et envoyés, salons en attente, préparation en cours. */
export function useMyRooms(userId: string | undefined) {
  return useLiveQuery(myRooms(userId), rooms)
}

/** Onglet Défis rangé en sections : reçus, envoyés, salles en attente. */
export function useDefis(userId: string | undefined) {
  return useLiveQuery(myRooms(userId), selectDefis)
}

/** Pastille de l'onglet Défis : défis reçus en attente et salles où l'adversaire attend le joueur. */
export function useDefisBadge(userId: string | undefined) {
  return useLiveQuery(myRooms(userId), selectBadge)
}

/** Revanche reçue en attente de réponse (overlay de l'écran de résultat), `undefined` sinon. */
export function useIncomingRematch(userId: string | undefined) {
  return useLiveQuery(myRooms(userId), selectRematch)
}

/** Une salle (vue REST). */
export function useRoom(roomId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(roomQueries.detail(http, roomId))
}
