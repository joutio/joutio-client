import type { TopicCardView } from '../topics/types.js'

/** `GET /api/home` : rails de l'Accueil. */
export interface HomeView {
  followedTopics: TopicCardView[]
  /** Sujets les plus joués : « Top 10 du moment ». */
  trendingTopics: TopicCardView[]
  newTopics: TopicCardView[]
  /** Sélection « Pour toi » (centres d'intérêt) — pas encore placée par la spec de l'Accueil. */
  recommendedTopics: TopicCardView[]
}
