import type { RoomStatus } from '../types.js'

/** Étapes de préparation affichées par le stepper (ordre du flux serveur). */
export const PREPARATION_STEPS = [
  { id: 'players', label: 'Les joueurs arrivent…' },
  { id: 'profiles', label: 'Chargement des profils…' },
  { id: 'questions', label: 'Tirage des questions…' },
  { id: 'launch', label: 'Lancement du duel…' },
] as const

/**
 * Index de l'étape en cours pour le stepper (`PREPARATION_STEPS.length` = préparation
 * terminée, la salle redirige alors vers l'arène).
 */
export function preparationStep(status: RoomStatus): number {
  switch (status) {
    case 'WAITING_PLAYERS':
      return 0
    case 'FETCHING_PLAYERS':
      return 1
    case 'FETCHING_PLAYED_QUESTIONS':
    case 'FETCHING_QUESTIONS':
      return 2
    case 'CREATING_GAME':
    case 'GAME_CREATED':
      return 3
    case 'COMPLETED':
      return PREPARATION_STEPS.length
    default:
      return 0
  }
}

/** Préparation terminée (lancement en cours ou partie créée) : wrapper du stepper en vert. */
export function preparationComplete(status: RoomStatus): boolean {
  return status === 'CREATING_GAME' || status === 'GAME_CREATED' || status === 'COMPLETED'
}

/**
 * Libellé d'état d'une salle d'attente : présence complète, puis attente nommée de
 * l'adversaire. Affiché dans le pill, au-dessus du stepper d'étapes.
 */
export function waitingStatusLabel({
  playerPresent,
  opponentPresent,
  opponentLabel,
}: {
  playerPresent: boolean
  opponentPresent: boolean
  opponentLabel: string | null
}): string {
  if (playerPresent && opponentPresent) return 'Les deux joueurs sont là'
  if (opponentLabel) return `En attente de ${opponentLabel}`
  return "En attente d'un adversaire"
}
