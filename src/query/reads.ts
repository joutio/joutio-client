import type {
  ActivityView,
  BadgeCollectionView,
  ChallengeView,
  HeadToHeadView,
  HomeView,
  MeView,
  NotificationPreferenceView,
  PlayerProfileView,
  PseudonymAvailability,
  RewardsView,
  TitlesView,
  TopicCardView,
  TopicLeaderboardView,
  TopicOverviewView,
  TopicStatView,
  UnreadCountView,
} from '../api-types/bff.js'
import type { ReportedQuestion, TeamMember, TopicTodo, TopicWorkshop } from '../authoring/authoring.js'
import type { ActiveGameView, GameResultView } from '../game/game-dto.js'
import type { RoomView } from '../rooms/room.js'
import { segment, type HttpClient } from './http.js'
import { queryKeys } from './keys.js'

/** Horloge du serveur (`GET /api/clock`). */
export interface ServerTimeView {
  epochMillis: number
}

/*
 * Lectures du BFF communes aux deux apps : la clé et la `queryFn`, rien d'autre. Chaque app ajoute ses options
 * (`staleTime`, `enabled`, `select`…) en étalant l'objet : `useQuery({ ...meQuery(api), staleTime: 30_000 })`.
 */

const read = <K extends readonly unknown[], T>(queryKey: K, queryFn: () => Promise<T>) => ({ queryKey, queryFn })

// Joueur connecté
export const meQuery = (http: HttpClient) => read(queryKeys.me(), () => http.get<MeView>('/api/me'))
export const rewardsQuery = (http: HttpClient) => read(queryKeys.rewards(), () => http.get<RewardsView>('/api/me/rewards'))
export const pseudonymAvailabilityQuery = (http: HttpClient, value: string, key: string) =>
  read(queryKeys.pseudonymAvailability(key), () => http.get<PseudonymAvailability>('/api/profiles/pseudonym-availability', { query: { value } }))
export const notificationPreferencesQuery = (http: HttpClient) =>
  read(queryKeys.notificationPreferences(), () => http.get<NotificationPreferenceView[]>('/api/notification-preferences'))
export const unreadCountQuery = (http: HttpClient) =>
  read(queryKeys.notifications.unreadCount(), () => http.get<UnreadCountView>('/api/notifications/unread-count'))
export const recommendationsQuery = (http: HttpClient, interests: readonly string[]) =>
  read(queryKeys.onboarding.recommendations(interests), () =>
    http.get<TopicCardView[]>('/api/me/onboarding/recommendations', { query: { interests: interests.join(',') } }),
  )
export const serverTimeQuery = (http: HttpClient) => read(queryKeys.serverTime(), () => http.get<ServerTimeView>('/api/clock'))

// Accueil, sujets
export const homeQuery = (http: HttpClient) => read(queryKeys.home(), () => http.get<HomeView>('/api/home'))
export const topicOverviewQuery = (http: HttpClient, topicId: string) =>
  read(queryKeys.topic.overview(topicId), () => http.get<TopicOverviewView>(`/api/topics/${segment(topicId)}/overview`))
export const topicLeaderboardQuery = (http: HttpClient, topicId: string) =>
  read(queryKeys.topic.leaderboard(topicId), () => http.get<TopicLeaderboardView>(`/api/topics/${segment(topicId)}/leaderboard`))

// Joueurs
export const profileQuery = (http: HttpClient, userId: string) =>
  read(queryKeys.profiles.profile(userId), () => http.get<PlayerProfileView>(`/api/profiles/${segment(userId)}`))
export const activityQuery = (http: HttpClient, userId: string) =>
  read(queryKeys.profiles.activity(userId), () => http.get<ActivityView>(`/api/profiles/${segment(userId)}/activity`))
export const badgesQuery = (http: HttpClient, userId: string) =>
  read(queryKeys.profiles.badges(userId), () => http.get<BadgeCollectionView>(`/api/profiles/${segment(userId)}/badges`))
export const playedTopicsQuery = (http: HttpClient, userId: string) =>
  read(queryKeys.profiles.topics(userId), () => http.get<TopicStatView[]>(`/api/profiles/${segment(userId)}/topics`))
export const titlesQuery = (http: HttpClient, userId: string) =>
  read(queryKeys.profiles.titles(userId), () => http.get<TitlesView>(`/api/profiles/${segment(userId)}/titles`))
/** Bilan des duels communs de `userId` contre `against`. */
export const headToHeadQuery = (http: HttpClient, userId: string, against: string) =>
  read(queryKeys.profiles.headToHead(userId, against), () =>
    http.get<HeadToHeadView>(`/api/profiles/${segment(userId)}/head-to-head`, { query: { against } }),
  )

// Défis, salons, parties
export const challengesQuery = (http: HttpClient) => read(queryKeys.challenges(), () => http.get<ChallengeView[]>('/api/challenges/mine'))
export const myRoomsQuery = (http: HttpClient) => read(queryKeys.myRooms(), () => http.get<RoomView[]>('/api/rooms/mine'))
export const roomQuery = (http: HttpClient, roomId: string) => read(queryKeys.room(roomId), () => http.get<RoomView>(`/api/rooms/${segment(roomId)}`))
export const activeGamesQuery = (http: HttpClient, userId: string) =>
  read(queryKeys.games.active(userId), () => http.get<ActiveGameView[]>('/api/games', { query: { active: true } }))
export const gameResultQuery = (http: HttpClient, gameId: string) =>
  read(queryKeys.games.result(gameId), () => http.get<GameResultView>(`/api/games/${segment(gameId)}/result`))

// Atelier
export const workshopTodoQuery = (http: HttpClient) => read(queryKeys.authoring.todo(), () => http.get<TopicTodo[]>('/api/topics/contributed/todo'))
export const workshopQuery = (http: HttpClient, topicId: string) =>
  read(queryKeys.authoring.workshop(topicId), () => http.get<TopicWorkshop>(`/api/topics/${segment(topicId)}/workshop`))
export const teamQuery = (http: HttpClient, topicId: string) =>
  read(queryKeys.authoring.team(topicId), () => http.get<TeamMember[]>(`/api/topics/${segment(topicId)}/team`))
/** File des questions signalées d'un sujet (Modération › Signalements). */
export const reportQueueQuery = (http: HttpClient, topicId: string) =>
  read(queryKeys.authoring.reports(topicId), () => http.get<ReportedQuestion[]>(`/api/question-reports/topics/${segment(topicId)}`))
