import { useQuery } from '@tanstack/react-query'
import { useJoutio } from '../../../core/runtime/context.js'
import type { MeView } from '../types.js'
import { meQueries } from '../query/queries.js'

/** Le compte connecté : identité, préférences, progression. */
export function useMe() {
  const { http } = useJoutio()
  return useQuery(meQueries.account(http))
}

const selectUserId = (me: MeView) => me.userId
const selectPremium = (me: MeView) => me.premium
const selectAvatarOptions = (me: MeView) => me.avatarOptions
const selectLanguage = (me: MeView) => me.language

/** `userId` seul : le composant ne se rend pas quand le reste de `MeView` change. */
export function useMyId() {
  const { http } = useJoutio()
  return useQuery({ ...meQueries.account(http), select: selectUserId })
}

/** Droit Premium effectif, seul. */
export function useIsPremium() {
  const { http } = useJoutio()
  return useQuery({ ...meQueries.account(http), select: selectPremium })
}

/** Options d'avatar, seules. */
export function useMyAvatarOptions() {
  const { http } = useJoutio()
  return useQuery({ ...meQueries.account(http), select: selectAvatarOptions })
}

/** Langue du compte, seule. */
export function useMyLanguage() {
  const { http } = useJoutio()
  return useQuery({ ...meQueries.account(http), select: selectLanguage })
}

/** Catalogue des récompenses (styles d'avatar). */
export function useRewards() {
  const { http } = useJoutio()
  return useQuery(meQueries.rewards(http))
}

/** Joueurs bloqués par le joueur courant. */
export function useBlockedPlayers() {
  const { http } = useJoutio()
  return useQuery(meQueries.blocked(http))
}

/** Disponibilité d'un pseudonyme ; la saisie vide ne déclenche rien. */
export function usePseudonymAvailability(value: string) {
  const { http } = useJoutio()
  return useQuery(meQueries.pseudonymAvailability(http, value))
}
