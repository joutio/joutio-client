/**
 * Clés React Query des deux apps, hiérarchiques : un préfixe (`topic.all`, `profiles.all`, `authoring.topic`…) vise
 * toutes les vues d'une entité. Les invalidations, du temps réel comme des mutations, visent ces clés, jamais une
 * chaîne écrite à la main. Toujours des fonctions, même sans paramètre.
 */
export const queryKeys = {
  me: () => ['me'] as const,
  /** Disponibilité d'un pseudonyme, par clé normalisée (`pseudonymKey`). */
  pseudonymAvailability: (key: string) => ['me', 'pseudonym-availability', key] as const,
  rewards: () => ['me', 'rewards'] as const,
  /** Horloge du serveur (`/api/clock`). */
  serverTime: () => ['server-time'] as const,
  /** Recherche globale. */
  suggestions: {
    term: (term: string) => ['suggestions', term] as const,
    players: (query: string) => ['suggestions', 'players', query] as const,
  },
  home: () => ['home'] as const,
  topics: {
    all: () => ['topics'] as const,
    /** Toutes les pages du catalogue, quel que soit le filtre. */
    lists: () => ['topics', 'list'] as const,
    list: (filters: object) => ['topics', 'list', filters] as const,
    facets: (query: string, scope = 'ALL') => ['topics', 'facets', query, { scope }] as const,
  },
  topic: {
    all: (topicId: string) => ['topic', topicId] as const,
    overview: (topicId: string) => ['topic', topicId, 'overview'] as const,
    leaderboard: (topicId: string) => ['topic', topicId, 'leaderboard'] as const,
    /** Classement filtré et paginé (Tous les classements). */
    board: (topicId: string, filters: object) => ['topic', topicId, 'board', filters] as const,
    games: (topicId: string, userId: string) => ['topic', topicId, 'games', userId] as const,
  },
  profiles: {
    /** Tout ce qui concerne un joueur (profil, titres, badges, parties…). */
    all: (userId: string) => ['profiles', userId] as const,
    profile: (userId: string) => ['profiles', userId, 'profile'] as const,
    activity: (userId: string) => ['profiles', userId, 'activity'] as const,
    titles: (userId: string) => ['profiles', userId, 'titles'] as const,
    badges: (userId: string) => ['profiles', userId, 'badges'] as const,
    topics: (userId: string) => ['profiles', userId, 'topics'] as const,
    recentGames: (userId: string) => ['profiles', userId, 'games', 'recent'] as const,
    games: (userId: string, filters: object) => ['profiles', userId, 'games', filters] as const,
    headToHead: (userId: string, against: string) => ['profiles', userId, 'head-to-head', against] as const,
  },
  /** Abonnements / abonnés d'un joueur, par recherche et tri. */
  contacts: {
    all: () => ['contacts'] as const,
    list: (userId: string, direction: 'following' | 'followers', query: string, sort: string) => ['contacts', userId, direction, query, sort] as const,
  },
  /** Défis nominatifs du joueur (reçus et envoyés). */
  challenges: () => ['challenges', 'mine'] as const,
  /** Salons du joueur (`/api/rooms/mine`) : Défis, sa pastille et la reprise de partie. */
  myRooms: () => ['rooms', 'mine'] as const,
  /** Un salon (`/api/rooms/{id}`). */
  room: (roomId: string) => ['rooms', 'room', roomId] as const,
  games: {
    /** Toutes les listes de parties en cours (préfixe). */
    activeAll: () => ['games', 'active'] as const,
    /** Parties en cours du joueur (`/api/games?active=true`). */
    active: (userId: string) => ['games', 'active', userId] as const,
    result: (gameId: string) => ['games', gameId, 'result'] as const,
    notifications: (gameId: string) => ['games', gameId, 'notifications'] as const,
    streakUnlock: (gameId: string) => ['games', gameId, 'streak-unlock'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    list: () => ['notifications', 'list'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  notificationPreferences: () => ['notification-preferences'] as const,
  /** Atelier de création (`creation.md`). */
  authoring: {
    all: () => ['authoring'] as const,
    topics: () => ['authoring', 'topics'] as const,
    created: () => ['authoring', 'created'] as const,
    todo: () => ['authoring', 'todo'] as const,
    /** Sujets publiés au nom proche, pour l'avertissement de doublon de « Nouveau sujet ». */
    named: (query: string) => ['authoring', 'named', query] as const,
    /** Tout l'atelier d'un sujet (préfixe). */
    topic: (topicId: string) => ['authoring', topicId] as const,
    workshop: (topicId: string) => ['authoring', topicId, 'workshop'] as const,
    questions: (topicId: string) => ['authoring', topicId, 'questions'] as const,
    reports: (topicId: string) => ['authoring', topicId, 'reports'] as const,
    team: (topicId: string) => ['authoring', topicId, 'team'] as const,
    /** Détails de signalement d'un sujet (préfixe). */
    reportDetails: (topicId: string) => ['authoring', topicId, 'report-detail'] as const,
  },
  onboarding: {
    recommendations: (interests: readonly string[]) => ['onboarding', 'recommendations', [...interests]] as const,
  },
} as const
