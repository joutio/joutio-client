export type PremiumSource = 'MANUAL' | 'APP_STORE' | 'PLAY' | 'WEB'

/** Limites du plan du joueur (`MeView.limits`) ; `2147483647` = illimité. */
export interface PlanLimitsView {
  pendingChallenges: number
  openRooms: number
  botRooms: number
  publishedTopics: number
  questionsPerTopic: number
}
