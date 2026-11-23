import type { PlayerCardView, PlayerProfileView } from '../../profile/types.js'

/** Carte joueur d'un profil suivi (tri RECENT du BFF : le plus récent en tête). */
export const cardOf = (profile: PlayerProfileView): PlayerCardView => ({
  userId: profile.userId,
  pseudonym: profile.pseudonym,
  avatarOptions: profile.avatarOptions,
  rating: profile.progression?.rating ?? 0,
  following: true,
  presence: profile.presence,
  suspended: profile.suspended,
  premium: profile.premium,
})
