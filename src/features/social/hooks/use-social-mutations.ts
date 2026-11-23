import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { applyBlock, blockKeys } from '../cache/block.js'
import { applyPlayerFollow, followKeys } from '../cache/follow.js'
import { blockUser, followUser, unblockUser, unfollowUser } from '../services/social-command.service.js'
import type { SocialMutationCallbacks } from '../types.js'

const invalidate = (client: ReturnType<typeof useQueryClient>, keys: readonly QueryKey[]) =>
  keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }))

export function useFollowPlayer(http: HttpClient, meId: string, userId: string, callbacks?: SocialMutationCallbacks) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['social', 'follow', meId, userId],
    mutationFn: (follow: boolean) => (follow ? followUser : unfollowUser)(http, userId),
    // Optimisme natif TanStack : appliqué dans le cache, relu (invalidate) sur erreur seulement.
    onMutate: (follow) => {
      applyPlayerFollow(client, meId, userId, follow)
    },
    onSuccess: (_data, follow) => callbacks?.onSuccess?.(follow),
    onError: (_error, follow) => {
      invalidate(client, followKeys(meId, userId))
      callbacks?.onError?.(follow)
    },
  })
}

export function useBlockPlayer(http: HttpClient, meId: string, userId: string, callbacks?: SocialMutationCallbacks) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['social', 'block', meId, userId],
    mutationFn: (block: boolean) => (block ? blockUser : unblockUser)(http, userId),
    onMutate: (block) => {
      applyBlock(client, meId, userId, block)
    },
    onSuccess: (_data, block) => callbacks?.onSuccess?.(block),
    onError: (_error, block) => {
      invalidate(client, blockKeys(meId, userId))
      callbacks?.onError?.(block)
    },
  })
}
