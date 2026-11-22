import type { TopicRefView } from '../topics/types.js'
import type { UserRefView } from '../profile/types.js'

/** `POST /api/challenges` : défi nominatif sur un sujet. */
export interface ChallengeCommand {
  topicId: string
  opponentId: string
}

export type ChallengeStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED'

/** `GET /api/challenges/{id}` : défi nominatif (revanche quand `gameId` est présent). */
export interface ChallengeView {
  challengeId: string
  topic: TopicRefView
  challenger: UserRefView
  opponent: UserRefView
  status: ChallengeStatus
  /** Salle créée à l'acceptation. */
  roomId: string | null
  gameId: string | null
  createdAt: string
  expiresAt: string
  /** Prochaine relance possible par le lanceur (10 min après l'envoi, puis après chaque relance). */
  remindableAt: string
}
