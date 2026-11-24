import type { RoomView } from '../types.js'

/** Délai entre deux relances d'une invitation, miroir de `RoomReminderRules` (matchmaking). */
export const INVITATION_REMINDER_COOLDOWN_MS = 10 * 60 * 1000

/** Millisecondes avant la prochaine relance de l'invitation ; 0 si le lanceur peut relancer maintenant. */
export function invitationReminderDelay(room: Pick<RoomView, 'remindableAt'>, now: number): number {
  return room.remindableAt === null ? 0 : Math.max(0, Date.parse(room.remindableAt) - now)
}

/** Relance acceptée : la suivante est repoussée de 10 min. */
export function afterInvitationReminder<T extends Pick<RoomView, 'remindableAt'>>(room: T, now: number): T {
  return { ...room, remindableAt: new Date(now + INVITATION_REMINDER_COOLDOWN_MS).toISOString() }
}
