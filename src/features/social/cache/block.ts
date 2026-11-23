import type { ChallengeView } from '../../challenges/types.js'
import type { MeView } from '../../me/types.js'
import type { PlayerCardView, PlayerProfileView, UserRefView } from '../../profile/types.js'
import type { PageResponse } from '../../../core/types/common.js'
import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/query-core'
import { queryKeys } from '../../../core/query/keys.js'

type Pages = InfiniteData<PageResponse<PlayerCardView>>
type ContactsKey = ReturnType<typeof queryKeys.contacts.list>

/** Vues touchées par un blocage, relues (`invalidateQueries`) en cas d'échec de `applyBlock`. */
export const blockKeys = (meId: string, userId: string): QueryKey[] => [
  queryKeys.profiles.profile(userId),
  queryKeys.profiles.profile(meId),
  queryKeys.me(),
  queryKeys.contacts.all(),
  queryKeys.challenges(),
  queryKeys.blockedPlayers(),
]

const shift = (count: number, delta: number) => Math.max(0, count + delta)

/**
 * Blocage appliqué à toutes les vues en cache, sans relecture (`donnees-et-etat.md` § Mutations) : l'effet est
 * symétrique côté serveur (abonnements dans les deux sens et défis en attente retirés).
 * - Bloquer : fiche « bloquée » et non suivie, le joueur sort de mes listes « abonnements » et « abonnés » (compteurs
 *   ajustés), ses défis en attente avec moi disparaissent, il entre dans mes bloqués si la liste est chargée.
 * - Débloquer : fiche débloquée, ligne retirée de mes bloqués ; les abonnements perdus ne reviennent pas.
 */
export function applyBlock(client: QueryClient, meId: string, userId: string, block: boolean) {
  const profileKey = queryKeys.profiles.profile(userId)
  const profile = client.getQueryData<PlayerProfileView>(profileKey)
  if (!block) {
    client.setQueryData<PlayerProfileView>(profileKey, (current) => (current ? { ...current, blocked: false } : current))
    client.setQueryData<UserRefView[]>(queryKeys.blockedPlayers(), (list) => list?.filter((item) => item.userId !== userId))
    return
  }

  const following = profile?.following === true
  let followedMe = false
  for (const [key, data] of client.getQueriesData<Pages>({ queryKey: queryKeys.contacts.all() })) {
    if (!data) continue
    const [, owner, direction] = key as unknown as ContactsKey
    const mine = owner === meId
    const listed = data.pages.some((page) => page.content.some((card) => card.userId === userId))
    if (mine && direction === 'followers' && listed) followedMe = true
    client.setQueryData<Pages>(key, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        content: page.content.filter((card) => !(mine && card.userId === userId)).map((card) => (card.userId === userId ? { ...card, following: false } : card)),
        totalElements: mine && listed ? shift(page.totalElements, -1) : page.totalElements,
      })),
    })
  }

  client.setQueryData<PlayerProfileView>(profileKey, (current) =>
    current
      ? {
          ...current,
          blocked: true,
          following: false,
          followersCount: shift(current.followersCount, following ? -1 : 0),
          followingCount: shift(current.followingCount, followedMe ? -1 : 0),
        }
      : current,
  )
  const counts = <T extends { followingCount: number; followersCount: number }>(current: T | undefined) =>
    current ? { ...current, followingCount: shift(current.followingCount, following ? -1 : 0), followersCount: shift(current.followersCount, followedMe ? -1 : 0) } : current
  client.setQueryData<MeView>(queryKeys.me(), counts)
  client.setQueryData<PlayerProfileView>(queryKeys.profiles.profile(meId), counts)
  client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (list) =>
    list?.filter((challenge) => !(challenge.status === 'PENDING' && (challenge.challenger.userId === userId || challenge.opponent.userId === userId))),
  )
  if (profile)
    client.setQueryData<UserRefView[]>(queryKeys.blockedPlayers(), (list) =>
      list && !list.some((item) => item.userId === userId)
        ? [...list, { userId, pseudonym: profile.pseudonym, avatarOptions: profile.avatarOptions, suspended: profile.suspended, premium: profile.premium }]
        : list,
    )
}
