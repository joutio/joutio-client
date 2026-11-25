import { useCommand, useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import type { Language } from '../../../core/types/common.js'
import { profileKeys } from '../../profile/query/keys.js'
import { changeProfile } from '../../profile/cache/profile.js'
import { undoAll } from '../../../core/query/optimistic.js'
import { changeAccount } from '../cache/account.js'
import { meKeys } from '../query/keys.js'
import {
  acceptTerms,
  deleteAccount,
  requestDeletionCode,
  setAutoTrain,
  setBirthDate,
  updateInterests,
  updateLanguage,
  updateProfile,
} from '../services/me-command.service.js'

/** Date de naissance privée (`AAAA-MM-JJ`) : la demande de date disparaît tout de suite. */
export function useSetBirthDate() {
  return useOptimisticMutation({
    mutationKey: meKeys.mutations.birthDate(),
    mutationFn: (birthDate: string, { http }) => setBirthDate(http, birthDate),
    touches: () => [meKeys.account()],
    apply: (client, birthDate) => changeAccount(client, { birthDate, birthDateRequired: false }),
  })
}

/** Acceptation des CGU en vigueur (`MeView.termsVersion`). */
export function useAcceptTerms() {
  return useOptimisticMutation({
    mutationKey: meKeys.mutations.terms(),
    mutationFn: (version: string, { http }) => acceptTerms(http, version),
    touches: () => [meKeys.account()],
    apply: (client) => changeAccount(client, { termsUpToDate: true }),
  })
}

/** Centres d'intérêt (codes d'univers ordonnés, 3 au plus). */
export function useUpdateInterests() {
  return useOptimisticMutation({
    mutationKey: meKeys.mutations.interests(),
    mutationFn: (interests: readonly string[], { http }) => updateInterests(http, interests),
    touches: () => [meKeys.account()],
    apply: (client, interests) => changeAccount(client, { interests: [...interests] }),
  })
}

export interface ProfileEdit {
  pseudonym: string
  bio: string
  country: string | null
}

/** Édition du profil (pseudonyme, bio, pays) : compte et fiche publique changent ensemble ; le serveur renvoie le compte. */
export function useUpdateMyProfile(userId: string) {
  return useOptimisticMutation({
    mutationKey: meKeys.mutations.profile(),
    mutationFn: (edit: ProfileEdit, { http }) => updateProfile(http, edit),
    touches: () => [meKeys.account(), profileKeys.detail(userId)],
    apply: (client, { pseudonym, bio, country }) =>
      undoAll([
        changeAccount(client, { pseudonym, bio: bio || null, country }),
        changeProfile(client, userId, { pseudonym, bio: bio || null, country }),
      ]),
    settle: (client, me) => client.setQueryData(meKeys.account(), me),
  })
}

/** Langue du compte. */
export function useUpdateLanguage(userId: string) {
  return useOptimisticMutation({
    mutationKey: meKeys.mutations.language(),
    mutationFn: (language: Language, { http }) => updateLanguage(http, userId, language),
    touches: () => [meKeys.account()],
    apply: (client, language) => changeAccount(client, { language }),
  })
}

/** Entraînement automatique contre le bot quand une recherche d'adversaire expire (`MeView.autoTrainOnTimeout`). */
export function useSetAutoTrain(userId: string) {
  return useOptimisticMutation({
    mutationKey: meKeys.mutations.autoTrain(),
    mutationFn: (enabled: boolean, { http }) => setAutoTrain(http, userId, enabled),
    touches: () => [meKeys.account()],
    apply: (client, enabled) => changeAccount(client, { autoTrainOnTimeout: enabled }),
  })
}

/** Demande le code de suppression du compte (envoyé par e-mail). */
export function useRequestDeletionCode() {
  return useCommand(meKeys.mutations.deletionCode(), (_: void, { http }) => requestDeletionCode(http))
}

/** Supprime le compte avec le code reçu : l'app termine la session au succès. */
export function useDeleteAccount() {
  return useCommand(meKeys.mutations.deletion(), (code: string, { http }) => deleteAccount(http, code))
}
