export type ContactDirection = 'following' | 'followers'

export interface SocialMutationCallbacks {
  onSuccess?: (active: boolean) => void
  onError?: (active: boolean) => void
}
