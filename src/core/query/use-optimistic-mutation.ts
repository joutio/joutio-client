import { useMutation, type MutationKey, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { useJoutio, type JoutioRuntime } from '../runtime/context.js'
import { cancel, type Optimistic, type Undo } from './optimistic.js'

export interface OptimisticMutation<TVariables, TData> {
  mutationKey: MutationKey
  mutationFn: (variables: TVariables, runtime: JoutioRuntime) => Promise<TData>
  /** Clés dont les lectures en vol sont annulées avant le changement. */
  touches: (variables: TVariables) => readonly QueryKey[]
  /** Applique le changement à toutes les vues concernées et renvoie son inverse ciblé. */
  apply: (client: QueryClient, variables: TVariables, runtime: JoutioRuntime) => Undo
  /** Remplace les valeurs provisoires par celles du serveur (identifiant, DTO). Jamais de relecture. */
  settle?: (client: QueryClient, data: TData, variables: TVariables) => void
  /** Après le retour arrière d'un échec partiel : réapplique ce que le serveur a déjà accepté. */
  recover?: (client: QueryClient, error: Error, variables: TVariables, runtime: JoutioRuntime) => void
}

/**
 * Mutation optimiste de la lib (`docs/frontend/donnees-et-etat.md`) : changement visible avant la réponse, lectures en
 * vol annulées, aucune relecture au succès, retour arrière de ce seul changement à l'échec. L'app réagit à l'issue par
 * appel : `mutate(variables, { onSuccess, onError })`.
 */
export function useOptimisticMutation<TVariables, TData = void>(definition: OptimisticMutation<TVariables, TData>) {
  const runtime = useJoutio()
  return useMutation<TData, Error, TVariables, Optimistic>({
    mutationKey: definition.mutationKey,
    mutationFn: (variables) => definition.mutationFn(variables, runtime),
    onMutate: async (variables, { client }) => {
      await cancel(client, definition.touches(variables))
      return { undo: definition.apply(client, variables, runtime) }
    },
    onSuccess: (data, variables, _context, { client }) => definition.settle?.(client, data, variables),
    onError: (error, variables, context, { client }) => {
      context?.undo()
      definition.recover?.(client, error, variables, runtime)
    },
  })
}

/** Échec partiel d'un lot : seuls `failed` ont été refusés, les autres sont acquis. */
export class PartialFailure extends Error {
  readonly failed: readonly string[]
  readonly causes: readonly unknown[]

  constructor(failed: readonly string[], causes: readonly unknown[]) {
    super(`${failed.length} élément(s) refusé(s)`, { cause: causes[0] })
    this.name = 'PartialFailure'
    this.failed = failed
    this.causes = causes
  }
}

export interface OptimisticBatch {
  mutationKey: MutationKey
  /** Commande d'un élément du lot. */
  run: (id: string, runtime: JoutioRuntime) => Promise<void>
  touches: (ids: readonly string[]) => readonly QueryKey[]
  /** Changement optimiste d'un élément, et son inverse. */
  apply: (client: QueryClient, id: string, runtime: JoutioRuntime) => Undo
}

/**
 * Lot de commandes optimistes (tout refuser, tout annuler) : chaque élément change tout de suite ; à l'échec, seuls les
 * éléments refusés reviennent (`PartialFailure.failed`), les autres restent acquis.
 */
export function useOptimisticBatch(definition: OptimisticBatch) {
  const runtime = useJoutio()
  return useMutation<void, Error, readonly string[], Map<string, Undo>>({
    mutationKey: definition.mutationKey,
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => definition.run(id, runtime)))
      const failed = ids.filter((_, index) => results[index]?.status === 'rejected')
      if (failed.length > 0) {
        const causes = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as unknown] : []))
        throw new PartialFailure(failed, causes)
      }
    },
    onMutate: async (ids, { client }) => {
      await cancel(client, definition.touches(ids))
      return new Map(ids.map((id) => [id, definition.apply(client, id, runtime)]))
    },
    onError: (error, ids, undos) => {
      const failed = error instanceof PartialFailure ? error.failed : ids
      failed.forEach((id) => undos?.get(id)?.())
    },
  })
}

/** Commande sans changement optimiste possible (la donnée vient du serveur : identifiant, jeton, média). */
export function useCommand<TVariables, TData = void>(
  mutationKey: MutationKey,
  mutationFn: (variables: TVariables, runtime: JoutioRuntime) => Promise<TData>,
) {
  const runtime = useJoutio()
  return useMutation<TData, Error, TVariables>({
    mutationKey,
    mutationFn: (variables) => mutationFn(variables, runtime),
  })
}
