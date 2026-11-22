import { skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../http.js'
import type { MeView } from '../types.js'
import { checkPseudonymAvailability, getBlockedPlayers, getMe, getRewards } from '../services/me-query.service.js'

/** Clés React Query du compte connecté, exportées pour les écritures transversales (`queryKeys`). */
export const meKeys = {
  /** `GET /api/me` — tout ce qui touche le compte, les compteurs et la progression. */
  me: () => ['me'] as const,
  /** Disponibilité d'un pseudonyme, par clé normalisée (`pseudonymKey`). */
  pseudonymAvailability: (key: string) => ['me', 'pseudonym-availability', key] as const,
  rewards: () => ['me', 'rewards'] as const,
  /** Joueurs bloqués par le joueur courant (Réglages › Confidentialité). */
  blockedPlayers: () => ['me', 'blocked'] as const,
}

/** Le compte connecté : identité, préférences, progression. */
export function useMe(http: HttpClient) {
  return useQuery({ queryKey: meKeys.me(), queryFn: ({ signal }) => getMe(http, signal) })
}

const selectUserId = (me: MeView) => me.userId
const selectPremium = (me: MeView) => me.premium
const selectAvatarOptions = (me: MeView) => me.avatarOptions
const selectLanguage = (me: MeView) => me.language

/** `userId` seul : un composant qui n'a besoin que de l'identité ne se rend pas quand le reste de `MeView` change. */
export function useMyId(http: HttpClient) {
  return useQuery({ queryKey: meKeys.me(), queryFn: ({ signal }) => getMe(http, signal), select: selectUserId })
}

/** Droit Premium effectif, seul. */
export function useIsPremium(http: HttpClient) {
  return useQuery({ queryKey: meKeys.me(), queryFn: ({ signal }) => getMe(http, signal), select: selectPremium })
}

/** Options d'avatar, seules. */
export function useMyAvatarOptions(http: HttpClient) {
  return useQuery({ queryKey: meKeys.me(), queryFn: ({ signal }) => getMe(http, signal), select: selectAvatarOptions })
}

/** Langue du compte, seule. */
export function useMyLanguage(http: HttpClient) {
  return useQuery({ queryKey: meKeys.me(), queryFn: ({ signal }) => getMe(http, signal), select: selectLanguage })
}

/** Catalogue des récompenses (styles d'avatar). */
export function useRewards(http: HttpClient) {
  return useQuery({ queryKey: meKeys.rewards(), queryFn: ({ signal }) => getRewards(http, signal) })
}

/** Joueurs bloqués par le joueur courant. */
export function useBlockedPlayers(http: HttpClient) {
  return useQuery({ queryKey: meKeys.blockedPlayers(), queryFn: ({ signal }) => getBlockedPlayers(http, signal) })
}

/** Disponibilité d'un pseudonyme ; la saisie vide ne déclenche rien (`skipToken`). */
export function usePseudonymAvailability(http: HttpClient, value: string) {
  return useQuery({
    queryKey: meKeys.pseudonymAvailability(value),
    queryFn: value ? ({ signal }) => checkPseudonymAvailability(http, value, signal) : skipToken,
  })
}
