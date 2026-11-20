import type { ChallengeView } from '../api-types/index.js'

/** Délai entre deux relances d'un défi envoyé, miroir de `ChallengeReminderRules` (matchmaking). */
export const CHALLENGE_REMINDER_COOLDOWN_MS = 10 * 60 * 1000

/** Millisecondes avant la prochaine relance possible ; 0 si le lanceur peut relancer maintenant. */
export const remindDelay = (challenge: Pick<ChallengeView, 'remindableAt'>, now: number): number =>
  Math.max(0, Date.parse(challenge.remindableAt) - now)

/** Relance acceptée : la suivante est repoussée de 10 min (affichage avant la relecture du serveur). */
export const afterReminder = <T extends Pick<ChallengeView, 'remindableAt'>>(challenge: T, now: number): T => ({
  ...challenge,
  remindableAt: new Date(now + CHALLENGE_REMINDER_COOLDOWN_MS).toISOString(),
})
