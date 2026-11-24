import { typed } from '../../../core/query/keys.js'
import type { RoomView } from '../types.js'

/** Clés des salles (défis compris : un défi est une salle `INVITED`). */
export const roomKeys = {
  root: ['rooms'] as const,
  /** Salles non terminales du joueur : défis reçus et envoyés, salons en attente, préparation en cours. */
  mine: () => typed<RoomView[]>()(['rooms', 'mine']),
  detail: (roomId: string | undefined) => typed<RoomView>()(['rooms', 'detail', roomId]),
  mutations: {
    create: (kind: 'challenge' | 'shared' | 'bot') => ['rooms', 'create', kind] as const,
    respond: (answer: 'accept' | 'decline') => ['rooms', answer] as const,
    cancel: () => ['rooms', 'cancel'] as const,
    remind: () => ['rooms', 'remind'] as const,
    matchmaking: (action: 'enqueue' | 'cancel') => ['matchmaking', action] as const,
  },
}
