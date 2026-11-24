import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { defisSections, incomingRematch, pendingInvitations, roomsWaitingForViewer } from '../domain/room-view.js'
import { getMyRooms, getRoom } from '../services/rooms-query.service.js'
import { roomKeys } from '../query/keys.js'

export const roomQueries = {
  mine: (http: HttpClient) =>
    queryOptions({ queryKey: roomKeys.mine(), queryFn: ({ signal }) => getMyRooms(http, signal) }),
  detail: (http: HttpClient, roomId: string | undefined) =>
    queryOptions({
      queryKey: roomKeys.detail(roomId),
      queryFn: roomId ? ({ signal }) => getRoom(http, roomId, signal) : skipToken,
    }),
}

/** Salles non terminales du joueur : défis reçus et envoyés, salons en attente, préparation en cours. */
export function useMyRooms() {
  const { http } = useJoutio()
  return useQuery(roomQueries.mine(http))
}

/** Onglet Défis rangé en sections : reçus, envoyés, salles en attente. */
export function useDefis() {
  const { http } = useJoutio()
  return useQuery({ ...roomQueries.mine(http), select: defisSections })
}

const selectBadge = (rooms: Parameters<typeof pendingInvitations>[0]) =>
  pendingInvitations(rooms) + roomsWaitingForViewer(rooms)

/** Pastille de l'onglet Défis : défis reçus en attente et salles où l'adversaire attend le joueur. */
export function useDefisBadge() {
  const { http } = useJoutio()
  return useQuery({ ...roomQueries.mine(http), select: selectBadge })
}

/** Revanche reçue en attente de réponse (overlay de l'écran de résultat), `undefined` sinon. */
export function useIncomingRematch() {
  const { http } = useJoutio()
  return useQuery({ ...roomQueries.mine(http), select: incomingRematch })
}

/** Une salle (vue REST). */
export function useRoom(roomId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(roomQueries.detail(http, roomId))
}
