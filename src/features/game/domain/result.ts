import type { GameResultView, GameRewardView } from '../types.js'

/**
 * Résultat d'un duel avec sa récompense vivante superposée : la récompense, l'Elo, la maîtrise du sujet et les badges
 * viennent de la vue `game-reward` dès qu'elle a une valeur ; un Elo `null` garde celui du résultat.
 */
export function withReward(result: GameResultView, reward: GameRewardView | null | undefined): GameResultView {
  if (!reward) return result
  return {
    ...result,
    reward: reward.reward,
    progression: {
      rating: reward.rating ?? result.progression.rating,
      peakRating: reward.peakRating,
      ratedGames: reward.ratedGames,
    },
    topicMastery: reward.topicMastery,
    eloDelta: reward.eloDelta,
    rated: reward.rated,
    opponentRating: reward.opponentRating ?? result.opponentRating,
    opponentEloDelta: reward.opponentEloDelta,
    opponentRated: reward.opponentRated,
    badges: reward.badges,
  }
}
