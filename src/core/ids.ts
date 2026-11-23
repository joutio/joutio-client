let sequence = 0

/** Identifiant temporaire d'une entité créée optimistement, remplacé par l'id serveur à la réponse. */
export const optimisticId = () => `pending-${Date.now()}-${++sequence}`
