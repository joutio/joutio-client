let sequence = 0

/** Identifiant temporaire d'une entité créée optimistement, remplacé par l'identifiant serveur à la réponse. */
export const optimisticId = (now: number) => `pending-${now}-${++sequence}`

/** Vrai pour un identifiant provisoire (`optimisticId`) : l'entité n'existe pas encore côté serveur. */
export const isOptimisticId = (id: string) => id.startsWith('pending-')
