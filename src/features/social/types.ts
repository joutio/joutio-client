import type { PeopleSort } from '../profile/types.js'

export type ContactDirection = 'following' | 'followers'

/** Une liste de personnes : abonnements ou abonnés d'un joueur, par recherche et tri. */
export interface ContactsList {
  userId: string | undefined
  direction: ContactDirection
  query: string
  sort: PeopleSort
}
