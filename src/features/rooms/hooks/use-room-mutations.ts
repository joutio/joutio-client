import { useCommand, useOptimisticBatch, useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import { nothingToUndo } from '../../../core/query/optimistic.js'
import { changeRoom, findMyRoom, removeRoom } from '../cache/rooms.js'
import { afterInvitationReminder } from '../domain/reminder.js'
import { roomKeys } from '../query/keys.js'
import type { CreateBotRoomCommand, CreateChallengeCommand, CreateRoomCommand } from '../types.js'
import {
  acceptInvitation,
  cancelMatchmaking,
  cancelRoom,
  createBotRoom,
  createChallenge,
  createRoom,
  declineInvitation,
  enqueueMatchmaking,
  remindRoom,
} from '../services/rooms-command.service.js'

/**
 * Défie un joueur (revanche avec `gameId`) : renvoie l'`id` de la salle, connue tout de suite. La salle rejoint les
 * défis envoyés par la vue vivante `my-rooms` : son contenu (sujet, adversaire) vient du serveur.
 */
export function useCreateChallenge() {
  return useCommand(roomKeys.mutations.create('challenge'), (command: CreateChallengeCommand, { http }) =>
    createChallenge(http, command),
  )
}

/** Ouvre un salon partagé par lien : renvoie son `id`. */
export function useCreateRoom() {
  return useCommand(roomKeys.mutations.create('shared'), (command: CreateRoomCommand, { http }) =>
    createRoom(http, command),
  )
}

/** Ouvre une salle d'entraînement contre le bot : renvoie son `id`. */
export function useCreateBotRoom() {
  return useCommand(roomKeys.mutations.create('bot'), (command: CreateBotRoomCommand, { http }) =>
    createBotRoom(http, command),
  )
}

/** Accepte un défi reçu : il passe tout de suite dans les salles en attente ; l'app ouvre alors la salle (même `roomId`). */
export function useAcceptInvitation() {
  return useOptimisticMutation({
    mutationKey: roomKeys.mutations.respond('accept'),
    mutationFn: (roomId: string, { http }) => acceptInvitation(http, roomId),
    touches: (roomId) => [roomKeys.mines(), roomKeys.detail(roomId)],
    apply: (client, roomId) =>
      changeRoom(
        client,
        roomId,
        (room) => (room.status === 'INVITED' ? { ...room, status: 'WAITING_PLAYERS' } : room),
        (room) => (room.status === 'WAITING_PLAYERS' ? { ...room, status: 'INVITED' } : room),
      ),
  })
}

/** Refuse un lot de défis reçus (Refuser, Tout refuser) : seuls les refus que le serveur rejette reviennent. */
export function useDeclineInvitations() {
  return useOptimisticBatch({
    mutationKey: roomKeys.mutations.respond('decline'),
    run: (roomId, { http }) => declineInvitation(http, roomId),
    touches: () => [roomKeys.mines()],
    apply: (client, roomId) => removeRoom(client, roomId),
  })
}

/** Annule un lot de salles du joueur (défis envoyés, salons) : seules les annulations refusées reviennent. */
export function useCancelRooms() {
  return useOptimisticBatch({
    mutationKey: roomKeys.mutations.cancel(),
    run: (roomId, { http }) => cancelRoom(http, roomId),
    touches: () => [roomKeys.mines()],
    apply: (client, roomId) => removeRoom(client, roomId),
  })
}

/**
 * Relance une salle : un défi envoyé est renvoyé à l'invité (la relance suivante est repoussée de 10 min sur place),
 * un adversaire absent est appelé (la cadence se lit sur le flux de la salle).
 */
export function useRemindRoom() {
  return useOptimisticMutation({
    mutationKey: roomKeys.mutations.remind(),
    mutationFn: (roomId: string, { http }) => remindRoom(http, roomId),
    touches: (roomId) => [roomKeys.mines(), roomKeys.detail(roomId)],
    apply: (client, roomId, { clock }) => {
      const room = findMyRoom(client, roomId)
      if (room?.status !== 'INVITED') return nothingToUndo
      const reminded = afterInvitationReminder(room, clock())
      return changeRoom(
        client,
        roomId,
        (current) => ({ ...current, remindableAt: reminded.remindableAt }),
        (current) =>
          current.remindableAt === reminded.remindableAt ? { ...current, remindableAt: room.remindableAt } : current,
      )
    },
  })
}

/** Entre dans la recherche publique d'un adversaire : renvoie le ticket, suivi ensuite par `useMatchmakingStream`. */
export function useEnqueueMatchmaking() {
  return useCommand(roomKeys.mutations.matchmaking('enqueue'), (topicId: string, { http }) =>
    enqueueMatchmaking(http, topicId),
  )
}

/** Annule la recherche en cours (bouton « Annuler »). */
export function useCancelMatchmaking() {
  return useCommand(roomKeys.mutations.matchmaking('cancel'), (ticketId: string, { http }) =>
    cancelMatchmaking(http, ticketId),
  )
}
