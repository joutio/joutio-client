import type { AbortSignalLike, HttpClient } from '../../../http.js'
import { segment } from '../../../http.js'
import type { PageResponse } from '../../../types/common.js'
import type { PeopleSort, PlayerCardView, PlayerProfileView } from '../../profile/types.js'

export type ContactDirection = 'following' | 'followers'

export const CONTACTS_PAGE_SIZE = 20

/** Carte joueur d'un profil suivi (tri RECENT du BFF : le plus récent en tête). */
export const cardOf = (profile: PlayerProfileView): PlayerCardView => ({
  userId: profile.userId,
  pseudonym: profile.pseudonym,
  avatarOptions: profile.avatarOptions,
  rating: profile.progression?.rating ?? 0,
  following: true,
  presence: profile.presence,
  suspended: profile.suspended,
  premium: profile.premium,
})

/** Listes de personnes (`/api/profiles/{id}/following|followers`). */
export async function getContactsPage(
  http: HttpClient,
  userId: string,
  direction: ContactDirection,
  query: string,
  sort: PeopleSort,
  pageIndex: number,
  signal?: AbortSignalLike,
): Promise<PageResponse<PlayerCardView>> {
  return http.get<PageResponse<PlayerCardView>>(`/api/profiles/${segment(userId)}/${direction}`, {
    query: { q: query || undefined, sort, page: pageIndex, size: CONTACTS_PAGE_SIZE },
    signal,
  })
}
