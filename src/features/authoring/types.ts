import type { Language } from '../../types/common.js'

/** Motifs de signalement d'un joueur (surface BFF). */
export type UserReportReason = 'HARASSMENT' | 'HATE_SPEECH' | 'INAPPROPRIATE_CONTENT' | 'CHEATING' | 'SPAM' | 'OTHER'
/** `COPYRIGHT` (2026-11-15) : image ou contenu protégé (droit d'auteur, droit à l'image). */
export type QuestionReportReason = 'QUESTION' | 'IMAGE' | 'ANSWERS' | 'COPYRIGHT'

/** Motif d'une notification de contenu illicite (LCEN/DSA, 2026-11-15). */
export type ContentNoticeCategory = 'COPYRIGHT' | 'IMAGE_RIGHTS' | 'IMPERSONATION' | 'OTHER_ILLEGAL'

/** `POST /api/public/content-notices` : notification de contenu illicite, avec ou sans compte. */
export interface ContentNoticeRequest {
  name: string
  email: string
  quality: 'RIGHTS_HOLDER' | 'REPRESENTATIVE' | 'THIRD_PARTY'
  /** Lien du contenu visé, par exemple `go.joutio.com/t/{topicId}`. */
  contentUrl: string
  category: ContentNoticeCategory
  /** 20 à 4 000 caractères. */
  description: string
  rightsEvidence?: string
  goodFaith: boolean
}

/** Endpoint des notifications de contenu. */
export const CONTENT_NOTICES_ENDPOINT = '/api/public/content-notices'

/** Motifs proposés pour un sujet, dans l'ordre d'affichage. */
export const CONTENT_NOTICE_CATEGORIES: readonly ContentNoticeCategory[] = ['COPYRIGHT', 'IMAGE_RIGHTS', 'IMPERSONATION', 'OTHER_ILLEGAL']

/** Longueur minimale de la description (`ContentNoticeRequest` du BFF). */
export const CONTENT_NOTICE_MIN_DESCRIPTION = 20

/** Choix de réponse d'une question (enum backend `QuestionChoice`). */
export type QuestionChoice = 'A' | 'B' | 'C' | 'D'
export const QUESTION_CHOICES: readonly QuestionChoice[] = ['A', 'B', 'C', 'D']

/** Statut de modération (enum backend `QuestionStatus`). */
export type QuestionModeration = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ARCHIVED'


export interface QuestionAnswer {
  choice: QuestionChoice
  text: string
}

/** Contenu localisé (`QuestionEditorView.ContentView`). */
export interface QuestionContent {
  language: Language
  text: string
  answers: QuestionAnswer[]
  /** Description de l'image dans cette langue (lecteurs d'écran), `null` si absente. */
  imageAlt?: string | null
}

/** Question vue par l'auteur du sujet (`QuestionEditorView`), champs lus par l'app. */
export interface QuestionEditorView {
  questionId: string
  creatorId?: string
  rejectionReason?: string | null
  contents: QuestionContent[]
  correctAnswer: QuestionChoice
  imageUrl: string | null
  status: QuestionModeration
  suspended: boolean
  archived: boolean
  openReportCount: number
  totalReportCount: number
  lastReportedAt: string | null
  createdAt: string
  updatedAt: string | null
}

/** Contenu figé de la question au moment du signalement (`QuestionReportSnapshotView`). */
export interface ReportSnapshot {
  questionText: string | null
  imageUrl: string | null
  answers: QuestionAnswer[]
  correctAnswer: QuestionChoice | null
  language: string | null
}

export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'


/** Signalement vu par le propriétaire du sujet, sans identité du signalant (`OwnerQuestionReportView`). */
export interface OwnerQuestionReport {
  reportId: string
  reasons: QuestionReportReason[]
  comment: string | null
  language: Language | null
  snapshot?: ReportSnapshot | null
  status: ReportStatus
  createdAt: string
}

export interface ReportedQuestion {
  question: QuestionEditorView
  reports: OwnerQuestionReport[]
  history: { closedCount: number; lastStatus: ReportStatus; lastReviewedAt: string | null } | null
}

/** Actions en attente sur un sujet géré (`TopicTodoView`, Mes sujets › À traiter). */
export interface TopicTodo {
  topicId: string
  pending: number
  reportedQuestions: number
  suspended: number
}

/** Rôle du joueur sur le sujet, pour les actions (`creation.md`, Tri, actions et rôles). */
export type WorkshopRole = 'creator' | 'admin' | 'writer'


export type QuestionAction = 'archive' | 'restore' | 'delete'


export interface CreateQuestionInput {
  contents: QuestionContent[]
  correctAnswer: QuestionChoice
  imageUrl: string | null
}

/** Statut affiché d'une question (`creation.md` § 1, Questions). */
export type QuestionStatus = 'approved' | 'pending' | 'suspended' | 'rejected' | 'archived'


export type TeamRole = 'CREATOR' | 'ADMIN' | 'WRITER'
export interface TopicPermissions {
  role: TeamRole | null
  canContribute: boolean
  canManage: boolean
  canManageTeam: boolean
  canAddMembers: boolean
}

export interface TeamMember {
  userId: string
  pseudonym: string
  avatarOptions: string | null
  role: TeamRole
  premium: boolean
}

/** `GET /api/topics/{id}/workshop`. */
export interface TopicWorkshop {
  topic: import('../topics/types.js').TopicCardView
  permissions: TopicPermissions
  /** Titres par palier saisis par le créateur (`{ fr: { OR: "Connétable" } }`) ; vide ou absent : repli partout. */
  titles?: import('./domain/titles.js').TopicTitles | null
  /** Motif de fermeture par la modération (2026-11-15) ; absent ou `null` : sujet ouvert. */
  closedReason?: string | null
}

export interface ReportDetail {
  topicId: string
  questionId: string
  report: OwnerQuestionReport
}

/** Tris de la liste Questions (`creation.md`). « Plus signalées » n'existe qu'une fois le sujet publié. */
export const QUESTION_SORTS = ['Plus récentes', 'Plus signalées', 'Plus anciennes', 'Ordre alphabétique'] as const
export type QuestionSort = (typeof QUESTION_SORTS)[number]


/** `POST /api/topics` : brouillon de sujet. */
export interface CreateTopicCommand {
  names: { fr: string }
  category: string
}

/** `PUT /api/topics/{id}/name`. */
export interface UpdateTopicNameCommand {
  language: import('../../types/common.js').Language
  name: string
}

/** `PUT /api/topics/{id}/category`. */
export interface UpdateTopicCategoryCommand {
  category: string
}

/** `PUT /api/topics/{id}/image-url`. */
export interface UpdateTopicImageUrlCommand {
  imageUrl: string | null
}

/** `PUT /api/topics/{id}/pictogram-url`. */
export interface UpdateTopicPictogramUrlCommand {
  pictogramUrl: string | null
}

/** `PUT /api/topics/{id}/description`. */
export interface UpdateTopicDescriptionCommand {
  description: string
  language: string
}

/** `PUT /api/topics/{id}/titles` : `null` efface tout (repli « Or · Sujet »). */
export interface UpdateTopicTitlesCommand {
  titles: import('./domain/titles.js').TopicTitles | null
}

/** `POST /api/questions/{id}/reject`. */
export interface RejectQuestionCommand {
  reason: string
}

/** `POST /api/questions/{id}/reports/resolve`. */
export interface ResolveReportsCommand {
  resolution: 'RESOLVED' | 'DISMISSED'
}

/** `PUT /api/topics/{id}/team/{userId}`. */
export interface SetMemberCommand {
  role: TeamRole
}

/** `POST /api/questions/{id}/reports` : signalement d'une question. */
export interface QuestionReportRequest {
  reasons: QuestionReportReason[]
  comment?: string
}

/** `POST /api/profiles/{userId}/reports` : signalement d'un joueur. */
export interface UserReportRequest {
  reasons: UserReportReason[]
  comment?: string
}
