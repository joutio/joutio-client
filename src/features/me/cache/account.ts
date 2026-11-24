import type { QueryClient } from '@tanstack/react-query'
import { changeFields, type Undo } from '../../../core/query/optimistic.js'
import type { MeView } from '../types.js'
import { meKeys } from '../query/keys.js'

/** Change des champs du compte en cache ; l'inverse ne touche que ces champs. */
export const changeAccount = (client: QueryClient, fields: Partial<MeView>): Undo =>
  changeFields<MeView>(client, meKeys.account(), fields)

/** Ajoute `delta` aux compteurs d'abonnements du compte ; l'inverse retranche le même delta. */
export function shiftAccountCounts(client: QueryClient, delta: { following?: number; followers?: number }): Undo {
  const shift = (sign: 1 | -1) => (me: MeView) => ({
    ...me,
    followingCount: Math.max(0, me.followingCount + sign * (delta.following ?? 0)),
    followersCount: Math.max(0, me.followersCount + sign * (delta.followers ?? 0)),
  })
  client.setQueryData(meKeys.account(), (me) => (me ? shift(1)(me) : me))
  return () => client.setQueryData(meKeys.account(), (me) => (me ? shift(-1)(me) : me))
}
