import { typed } from '../../../core/query/keys.js'
import type { LiveValue } from '../../../core/realtime/use-live-query.js'
import type { RoomView } from '../types.js'

/** Clés des salles (défis compris : un défi est une salle `INVITED`). */
export const roomKeys = {
  root: ['rooms'] as const,
  /** Salles du joueur, toutes sessions confondues (préfixe des patchs optimistes). */
  mines: () => ['rooms', 'mine'] as const,
  /**
   * Salles non terminales du joueur (vue vivante `my-rooms`) : défis reçus et envoyés, salons en attente, préparation
   * en cours.
   */
  mine: (userId: string | undefined) => typed<LiveValue<RoomView[]>>()(['rooms', 'mine', userId]),
  detail: (roomId: string | undefined) => typed<RoomView>()(['rooms', 'detail', roomId]),
  mutations: {
    create: (kind: 'challenge' | 'shared' | 'bot') => ['rooms', 'create', kind] as const,
    respond: (answer: 'accept' | 'decline') => ['rooms', answer] as const,
    cancel: () => ['rooms', 'cancel'] as const,
    remind: () => ['rooms', 'remind'] as const,
    matchmaking: (action: 'enqueue' | 'cancel') => ['matchmaking', action] as const,
  },
}
