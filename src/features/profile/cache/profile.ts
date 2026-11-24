import type { QueryClient } from '@tanstack/react-query'
import { changeFields, type Undo } from '../../../core/query/optimistic.js'
import type { PlayerProfileView } from '../types.js'
import { profileKeys } from '../query/keys.js'

/** Change des champs d'une fiche joueur en cache ; l'inverse ne touche que ces champs. */
export const changeProfile = (client: QueryClient, userId: string, fields: Partial<PlayerProfileView>): Undo =>
  changeFields<PlayerProfileView>(client, profileKeys.detail(userId), fields)

/** Ajoute `delta` aux compteurs d'une fiche ; l'inverse retranche le même delta. */
export function shiftProfileCounts(
  client: QueryClient,
  userId: string,
  delta: { following?: number; followers?: number },
): Undo {
  const shift = (sign: 1 | -1) => (profile: PlayerProfileView) => ({
    ...profile,
    followingCount: Math.max(0, profile.followingCount + sign * (delta.following ?? 0)),
    followersCount: Math.max(0, profile.followersCount + sign * (delta.followers ?? 0)),
  })
  const key = profileKeys.detail(userId)
  client.setQueryData(key, (profile) => (profile ? shift(1)(profile) : profile))
  return () => client.setQueryData(key, (profile) => (profile ? shift(-1)(profile) : profile))
}
