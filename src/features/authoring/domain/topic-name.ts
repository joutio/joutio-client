/** Nom de sujet comparable : sans accents, casse ni espaces superflus (« Châteaux  de la Loire » = « chateaux de la loire »). */
export function topicNameKey(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Premier sujet qui porte déjà ce nom, dans l'une de ses langues (2026-11-16) : l'atelier avertit, sans bloquer, pour
 * inciter à un titre plus original et plus facile à retrouver.
 */
export function sameNameTopic<T extends { names: Partial<Record<string, string>> }>(
  name: string,
  topics: readonly T[] | undefined,
): T | undefined {
  const key = topicNameKey(name)
  if (!key) return undefined
  return topics?.find((topic) =>
    Object.values(topic.names).some((value) => value !== undefined && topicNameKey(value) === key),
  )
}
