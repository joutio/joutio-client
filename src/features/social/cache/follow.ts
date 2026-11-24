import type { QueryClient } from '@tanstack/react-query'
import { undoAll, type Undo } from '../../../core/query/optimistic.js'
import { shiftAccountCounts } from '../../me/cache/account.js'
import { changeProfile, shiftProfileCounts } from '../../profile/cache/profile.js'
import { profileKeys } from '../../profile/query/keys.js'
import { cardOf } from '../domain/contact-card.js'
import { editContactLists, hasCard, insertCard, mapCards, removeCard } from './contacts.js'

/**
 * Abonnement à un joueur, appliqué à toutes les vues sans relecture : sa fiche (drapeau et abonnés), mes compteurs,
 * le drapeau `following` de sa carte dans toutes les listes, et sa carte ajoutée à (ou retirée de) mes listes
 * « abonnements » dont la recherche le retient. L'inverse ne défait que ce changement.
 */
export function applyPlayerFollow(client: QueryClient, meId: string, userId: string, follow: boolean): Undo {
  const profile = client.getQueryData(profileKeys.detail(userId))
  if (profile?.following === follow) return () => undefined
  const delta = follow ? 1 : -1
  const card = profile ? { ...cardOf(profile), following: follow } : undefined
  return undoAll([
    changeProfile(client, userId, { following: follow }),
    shiftProfileCounts(client, userId, { followers: delta }),
    shiftProfileCounts(client, meId, { following: delta }),
    shiftAccountCounts(client, { following: delta }),
    editContactLists(client, (list, data) => {
      const flagged = mapCards(data, (item) => (item.userId === userId ? { ...item, following: follow } : item))
      const unflag = (current: typeof data) =>
        mapCards(current, (item) =>
          item.userId === userId && item.following === follow ? { ...item, following: !follow } : item,
        )
      if (list.userId !== meId || list.direction !== 'following') return { data: flagged, revert: unflag }
      if (!follow) {
        const removed = data.pages.flatMap((page) => page.content).find((item) => item.userId === userId)
        if (!removed) return { data: flagged, revert: unflag }
        return {
          data: removeCard(flagged, userId),
          revert: (current) => (hasCard(current, userId) ? current : insertCard(current, removed, list.sort)),
        }
      }
      const matches =
        card &&
        !hasCard(data, userId) &&
        card.pseudonym.toLocaleLowerCase().includes(list.query.trim().toLocaleLowerCase())
      if (!matches) return { data: flagged, revert: unflag }
      return { data: insertCard(flagged, card, list.sort), revert: (current) => removeCard(current, userId) }
    }),
  ])
}
