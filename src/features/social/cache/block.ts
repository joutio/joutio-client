import type { QueryClient } from '@tanstack/react-query'
import { change, nothingToUndo, removeFrom, undoAll, type Undo } from '../../../core/query/optimistic.js'
import { shiftAccountCounts } from '../../me/cache/account.js'
import { meKeys } from '../../me/query/keys.js'
import { changeProfile, shiftProfileCounts } from '../../profile/cache/profile.js'
import { profileKeys } from '../../profile/query/keys.js'
import type { UserRefView } from '../../profile/types.js'
import { roomKeys } from '../../rooms/query/keys.js'
import type { RoomView } from '../../rooms/types.js'
import { contactKeys } from '../query/keys.js'
import { editContactLists, hasCard, insertCard, mapCards, removeCard, type Pages } from './contacts.js'

const isPlayer = (userId: string) => (item: { userId: string }) => item.userId === userId
const isOpenRoomWith = (userId: string) => (room: RoomView) =>
  (room.status === 'INVITED' || room.status === 'WAITING_PLAYERS') && room.opponent?.userId === userId

/**
 * Blocage appliqué à toutes les vues sans relecture ; l'effet est symétrique côté serveur (abonnements retirés dans
 * les deux sens, salles ouvertes entre les deux annulées) :
 * - bloquer : fiche « bloquée » et non suivie, le joueur sort de mes listes « abonnements » et « abonnés » (compteurs
 *   ajustés), nos salles ouvertes disparaissent, il entre dans mes bloqués si la liste est chargée ;
 * - débloquer : fiche débloquée, ligne retirée de mes bloqués ; les abonnements perdus ne reviennent pas.
 */
export function applyBlock(client: QueryClient, meId: string, userId: string, block: boolean): Undo {
  if (!block) {
    const blocked = client.getQueryData(meKeys.blocked())
    const removal = blocked ? removeFrom(blocked, isPlayer(userId)) : undefined
    if (removal) client.setQueryData(meKeys.blocked(), removal.items)
    return undoAll([
      changeProfile(client, userId, { blocked: false }),
      removal
        ? () => client.setQueryData(meKeys.blocked(), (current) => (current ? removal.restore(current) : current))
        : nothingToUndo,
    ])
  }

  const profile = client.getQueryData(profileKeys.detail(userId))
  const iFollow = profile?.following === true
  const followsMe = client.getQueriesData<Pages>({ queryKey: contactKeys.lists() }).some(([key, data]) => {
    const list = contactKeys.listOf(key)
    return list.userId === meId && list.direction === 'followers' && data !== undefined && hasCard(data, userId)
  })
  const blockedRef: UserRefView | undefined = profile && {
    userId,
    pseudonym: profile.pseudonym,
    avatarOptions: profile.avatarOptions,
    suspended: profile.suspended,
    premium: profile.premium,
  }
  const rooms = client.getQueryData(roomKeys.mine())
  const roomRemoval = rooms ? removeFrom(rooms, isOpenRoomWith(userId)) : undefined
  if (roomRemoval) client.setQueryData(roomKeys.mine(), roomRemoval.items)

  return undoAll([
    changeProfile(client, userId, { blocked: true, following: false }),
    shiftProfileCounts(client, userId, { followers: iFollow ? -1 : 0, following: followsMe ? -1 : 0 }),
    shiftProfileCounts(client, meId, { following: iFollow ? -1 : 0, followers: followsMe ? -1 : 0 }),
    shiftAccountCounts(client, { following: iFollow ? -1 : 0, followers: followsMe ? -1 : 0 }),
    editContactLists(client, (list, data) => {
      const unflagged = mapCards(data, (card) => (card.userId === userId ? { ...card, following: false } : card))
      const removed = data.pages.flatMap((page) => page.content).find(isPlayer(userId))
      if (list.userId !== meId || !removed)
        return {
          data: unflagged,
          revert: (current) =>
            mapCards(current, (card) =>
              card.userId === userId ? { ...card, following: removed?.following ?? card.following } : card,
            ),
        }
      return {
        data: removeCard(unflagged, userId),
        revert: (current) => (hasCard(current, userId) ? current : insertCard(current, removed, list.sort)),
      }
    }),
    roomRemoval
      ? () => client.setQueryData(roomKeys.mine(), (current) => (current ? roomRemoval.restore(current) : current))
      : nothingToUndo,
    blockedRef
      ? change(
          client,
          { queryKey: meKeys.blocked(), exact: true },
          (list) => (list.some(isPlayer(userId)) ? list : [...list, blockedRef]),
          (list) => list.filter((item) => !isPlayer(userId)(item)),
        )
      : nothingToUndo,
  ])
}
