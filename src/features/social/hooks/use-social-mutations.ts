import { useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import { meKeys } from '../../me/query/keys.js'
import { profileKeys } from '../../profile/query/keys.js'
import { roomKeys } from '../../rooms/query/keys.js'
import { applyBlock } from '../cache/block.js'
import { applyPlayerFollow } from '../cache/follow.js'
import { contactKeys } from '../query/keys.js'
import { blockUser, followUser, unblockUser, unfollowUser } from '../services/social-command.service.js'

/** Suivre (`mutate(true)`) ou ne plus suivre (`mutate(false)`) un joueur. */
export function useFollowPlayer(meId: string, userId: string) {
  return useOptimisticMutation({
    mutationKey: contactKeys.mutations.follow(userId),
    mutationFn: (follow: boolean, { http }) => (follow ? followUser : unfollowUser)(http, userId),
    touches: () => [profileKeys.detail(userId), profileKeys.detail(meId), meKeys.account(), contactKeys.lists()],
    apply: (client, follow) => applyPlayerFollow(client, meId, userId, follow),
  })
}

/** Bloquer (`mutate(true)`) ou débloquer (`mutate(false)`) un joueur. */
export function useBlockPlayer(meId: string, userId: string) {
  return useOptimisticMutation({
    mutationKey: contactKeys.mutations.block(userId),
    mutationFn: (block: boolean, { http }) => (block ? blockUser : unblockUser)(http, userId),
    touches: () => [
      profileKeys.detail(userId),
      profileKeys.detail(meId),
      meKeys.account(),
      meKeys.blocked(),
      contactKeys.lists(),
      roomKeys.mine(),
    ],
    apply: (client, block) => applyBlock(client, meId, userId, block),
  })
}
