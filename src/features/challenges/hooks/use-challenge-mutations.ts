import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { queryKeys } from '../../../core/query/keys.js'
import { afterReminder } from '../domain/challenge-reminder.js'
import { acceptChallenge, cancelChallenge, declineChallenge, remindChallenge } from '../services/challenges-command.service.js'
import { getChallenge } from '../services/challenges-query.service.js'
import type { ChallengeStatus, ChallengeView } from '../types.js'

/** Callbacks d'affichage fournis par l'app (toast, navigation…). */
export interface ChallengeMutationCallbacks<T> {
  onSuccess?: (value: T) => void
  onError?: (value: T) => void
}

const settle = (client: ReturnType<typeof useQueryClient>, ids: readonly string[], status: ChallengeStatus) =>
  client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) =>
    items?.map((item) => (ids.includes(item.challengeId) ? { ...item, status } : item)),
  )

/** Attends que la saga ait créé la salle (`roomId`), quelques relectures sans recalcul côté client. */
async function roomOfAccepted(http: HttpClient, challengeId: string, wait: (ms: number) => Promise<void>): Promise<string | null> {
  for (const delay of [0, 300, 500, 800, 1200, 1500]) {
    await wait(delay)
    try {
      const view = await getChallenge(http, challengeId)
      if (view.roomId) return view.roomId
    } catch {
      // Relecture suivante.
    }
  }
  return null
}

/**
 * Accepte un défi, puis ouvre sa salle : optimiste sur la liste, la salle est jointe dès que le
 * serveur l'a créée (`onSuccess(roomId)`). `roomId` nul : la salle n'est pas prête (`onSuccess(null)`).
 * `wait` est le planificateur injecté (pas d'horloge implicite dans la lib).
 */
export function useAcceptChallenge(http: HttpClient, wait: (ms: number) => Promise<void>, callbacks?: ChallengeMutationCallbacks<string | null>) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['challenges', 'accept'],
    mutationFn: async (challenge: ChallengeView) => {
      await acceptChallenge(http, challenge.challengeId)
      return challenge.roomId ?? (await roomOfAccepted(http, challenge.challengeId, wait))
    },
    onMutate: (challenge: ChallengeView) => {
      settle(client, [challenge.challengeId], 'ACCEPTED')
    },
    onSuccess: (roomId) => callbacks?.onSuccess?.(roomId),
    onError: () => {
      void client.invalidateQueries({ queryKey: queryKeys.challenges() })
      callbacks?.onError?.(null)
    },
  })
}

/**
 * Décline ou annule un lot de défis, avec reprise partielle : les défis refusés par le serveur
 * reviennent à leur statut précédent, les autres restent optimistes.
 */
export function useSettleChallenge(
  run: (id: string) => Promise<void>,
  status: 'DECLINED' | 'CANCELLED',
  callbacks?: ChallengeMutationCallbacks<readonly string[]>,
) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['challenges', 'settle', status],
    mutationFn: async (ids: readonly string[]) => {
      const results = await Promise.allSettled(ids.map(run))
      const failed = ids.filter((_id, index) => results[index]?.status === 'rejected')
      if (failed.length) throw Object.assign(new Error('partial failure'), { failed })
    },
    onMutate: async (ids: readonly string[]) => {
      const previous = client.getQueryData<ChallengeView[]>(queryKeys.challenges())
      settle(client, ids, status)
      return { previous }
    },
    onError: (cause, ids, context) => {
      const failed = 'failed' in cause && Array.isArray(cause.failed) ? (cause.failed as string[]) : [...ids]
      client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) =>
        items?.map((item) =>
          failed.includes(item.challengeId)
            ? { ...item, status: context?.previous?.find((before) => before.challengeId === item.challengeId)?.status ?? 'PENDING' }
            : item,
        ),
      )
      callbacks?.onError?.(ids)
    },
  })
}

/** Décline un lot de défis reçus. */
export function useDeclineChallenge(http: HttpClient, callbacks?: ChallengeMutationCallbacks<readonly string[]>) {
  return useSettleChallenge((id) => declineChallenge(http, id), 'DECLINED', callbacks)
}

/** Annule un lot de défis envoyés. */
export function useCancelChallenge(http: HttpClient, callbacks?: ChallengeMutationCallbacks<readonly string[]>) {
  return useSettleChallenge((id) => cancelChallenge(http, id), 'CANCELLED', callbacks)
}

/**
 * Relance un défi envoyé : la prochaine relance est repoussée de 10 min sur place, restaurée si le
 * serveur refuse.
 */
export function useRemindChallenge(http: HttpClient, callbacks?: ChallengeMutationCallbacks<string>) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['challenges', 'remind'],
    mutationFn: (challengeId: string) => remindChallenge(http, challengeId),
    onMutate: async (challengeId: string) => {
      const previous = client.getQueryData<ChallengeView[]>(queryKeys.challenges())
      client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) =>
        items?.map((item) => (item.challengeId === challengeId ? afterReminder(item, Date.now()) : item)),
      )
      return { previous }
    },
    onError: (_error, challengeId, context) => {
      const before = context?.previous?.find((item) => item.challengeId === challengeId)
      if (before) client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) => items?.map((item) => (item.challengeId === challengeId ? before : item)))
      void client.invalidateQueries({ queryKey: queryKeys.challenges() })
      callbacks?.onError?.(challengeId)
    },
  })
}
