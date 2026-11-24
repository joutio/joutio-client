import { queryOptions, skipToken } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { checkPseudonymAvailability, getBlockedPlayers, getMe, getRewards } from '../services/me-query.service.js'
import { meKeys } from './keys.js'

export const meQueries = {
  account: (http: HttpClient) =>
    queryOptions({ queryKey: meKeys.account(), queryFn: ({ signal }) => getMe(http, signal) }),
  rewards: (http: HttpClient) =>
    queryOptions({ queryKey: meKeys.rewards(), queryFn: ({ signal }) => getRewards(http, signal) }),
  blocked: (http: HttpClient) =>
    queryOptions({ queryKey: meKeys.blocked(), queryFn: ({ signal }) => getBlockedPlayers(http, signal) }),
  /** La saisie vide ne déclenche rien. */
  pseudonymAvailability: (http: HttpClient, value: string) =>
    queryOptions({
      queryKey: meKeys.pseudonymAvailability(value),
      queryFn: value ? ({ signal }) => checkPseudonymAvailability(http, value, signal) : skipToken,
    }),
}
