import type { QueryClient } from '@tanstack/react-query'
import { undoAll, type Undo } from '../../../core/query/optimistic.js'
import { useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import type { Language } from '../../../core/types/common.js'
import { changeAccount } from '../../me/cache/account.js'
import { meKeys } from '../../me/query/keys.js'
import type { MeView } from '../../me/types.js'
import { changeFields } from '../../../core/query/optimistic.js'
import { changeProfile } from '../cache/profile.js'
import { profileKeys } from '../query/keys.js'
import type { PlayerProfileView, TitlesView } from '../types.js'
import {
  updateAvatarOptions,
  updateBanner,
  updateBio,
  updateCountry,
  updateProfileLanguage,
  updateProfileTitle,
  updatePseudonym,
} from '../services/profile-command.service.js'

type SharedField = keyof Pick<
  PlayerProfileView & MeView,
  'pseudonym' | 'bio' | 'country' | 'bannerUrl' | 'avatarOptions'
>

/** Un champ du profil, affiché à la fois dans le compte et dans la fiche publique du joueur. */
function useProfileField<K extends SharedField>(
  userId: string,
  field: K,
  send: (http: Parameters<typeof updateBio>[0], value: MeView[K]) => Promise<void>,
) {
  return useOptimisticMutation({
    mutationKey: profileKeys.mutations.field(field),
    mutationFn: (value: MeView[K], { http }) => send(http, value),
    touches: () => [meKeys.account(), profileKeys.detail(userId)],
    apply: (client, value) =>
      changeBoth(client, userId, { [field]: value } as Partial<MeView> & Partial<PlayerProfileView>),
  })
}

function changeBoth(client: QueryClient, userId: string, fields: Partial<MeView> & Partial<PlayerProfileView>): Undo {
  return undoAll([changeAccount(client, fields), changeProfile(client, userId, fields)])
}

export const useUpdatePseudonym = (userId: string) =>
  useProfileField(userId, 'pseudonym', (http, pseudonym) => updatePseudonym(http, userId, pseudonym))

/** Bio ; `null` efface. */
export const useUpdateBio = (userId: string) =>
  useProfileField(userId, 'bio', (http, bio) => updateBio(http, userId, bio))

/** Pays ISO 3166-1 alpha-2 ; `null` = non renseigné. */
export const useUpdateCountry = (userId: string) =>
  useProfileField(userId, 'country', (http, country) => updateCountry(http, userId, country))

/** Bannière (URL d'un média déjà envoyé) ; `null` efface. */
export const useUpdateBanner = (userId: string) =>
  useProfileField(userId, 'bannerUrl', (http, url) => updateBanner(http, userId, url))

/** Options d'avatar sérialisées ; `null` = avatar de base. */
export const useUpdateAvatarOptions = (userId: string) =>
  useProfileField(userId, 'avatarOptions', (http, options) => updateAvatarOptions(http, userId, options))

/** Langue du profil (et du compte). */
export function useUpdateProfileLanguage(userId: string) {
  return useOptimisticMutation({
    mutationKey: profileKeys.mutations.field('language'),
    mutationFn: (language: Language, { http }) => updateProfileLanguage(http, userId, language),
    touches: () => [meKeys.account()],
    apply: (client, language) => changeAccount(client, { language }),
  })
}

/** Porter un titre (`topicId:TIER`) ou retirer le titre porté (`null`). */
export function useWearTitle(userId: string) {
  return useOptimisticMutation({
    mutationKey: profileKeys.mutations.title(),
    mutationFn: (titleKey: string | null, { http }) => updateProfileTitle(http, userId, titleKey),
    touches: () => [profileKeys.titles(userId), meKeys.account(), profileKeys.detail(userId)],
    apply: (client, titleKey) =>
      undoAll([
        changeFields<TitlesView>(client, profileKeys.titles(userId), { equippedKey: titleKey }),
        changeBoth(client, userId, { equippedTitle: titleKey }),
      ]),
  })
}
