import { describe, expect, it } from 'vitest'
import { splitRoomsByOrigin, applyRoomNotification, applyRoomPresence, emptyRoom, isWaitingForViewer, preparationComplete, preparationStep, roomFailureKind, roomsWaitingForViewer, waitingStatusLabel, type RoomView } from './room.js'
import { applyMatchmakingNotification, emptyMatchmaking } from './matchmaking.js'
import type { RoomNotification } from './room-notification.js'

const fold = (notifications: RoomNotification[]) => notifications.reduce(applyRoomNotification, emptyRoom('r1'))

const created: RoomNotification = { type: 'ROOM_CREATED', roomId: 'r1', topicId: 't1', initiatorId: 'p1', opponentId: null, vsBot: false, expiresAt: '2026-11-11T10:02:00Z' }

describe('applyRoomNotification', () => {
  it('tracks presence, then each preparation step up to the game', () => {
    const room = fold([
      created,
      { type: 'ROOM_ENTERED', roomId: 'r1', playerId: 'p1' },
      { type: 'ROOM_ENTERED', roomId: 'r1', playerId: 'p2' },
      { type: 'ROOM_ALL_PRESENT', roomId: 'r1' },
      { type: 'ROOM_PLAYERS_LOADED', roomId: 'r1' },
      { type: 'ROOM_PLAYED_QUESTIONS_LOADED', roomId: 'r1' },
      { type: 'ROOM_QUESTIONS_LOADED', roomId: 'r1' },
      { type: 'ROOM_GAME_CREATED', roomId: 'r1', gameId: 'g1' },
    ])
    expect(room.participantId).toBe('p2')
    expect(room.initiatorPresent && room.participantPresent).toBe(true)
    expect(room.status).toBe('GAME_CREATED')
    expect(room.gameId).toBe('g1')
    expect(preparationComplete(room.status)).toBe(true)
  })

  it('keeps the room open when a player leaves', () => {
    const room = fold([created, { type: 'ROOM_ENTERED', roomId: 'r1', playerId: 'p1' }, { type: 'ROOM_LEFT', roomId: 'r1', playerId: 'p1' }])
    expect(room.status).toBe('WAITING_PLAYERS')
    expect(room.initiatorPresent).toBe(false)
  })
})

describe('room failure', () => {
  it('keeps the server reason of a failed room', () => {
    const room = fold([{ type: 'ROOM_FAILED', roomId: 'r1', reason: 'TOPIC_NOT_AVAILABLE_IN_LANGUAGE' }])
    expect(room.status).toBe('FAILED')
    expect(room.failureReason).toBe('TOPIC_NOT_AVAILABLE_IN_LANGUAGE')
    expect(emptyRoom('r2').failureReason).toBeNull()
  })

  it('maps reasons to the message to show', () => {
    expect(roomFailureKind('TOPIC_NOT_AVAILABLE_IN_LANGUAGE')).toBe('language')
    expect(roomFailureKind('TOPIC_UNAVAILABLE')).toBe('topic')
    expect(roomFailureKind('QUESTION_DRAW_TIMEOUT')).toBe('timeout')
    expect(roomFailureKind('QUESTION_DRAW_FAILED')).toBe('unknown')
    expect(roomFailureKind(null)).toBe('unknown')
  })
})

describe('preparation', () => {
  it('maps server statuses to the four steps', () => {
    expect(preparationStep('WAITING_PLAYERS')).toBe(0)
    expect(preparationStep('FETCHING_QUESTIONS')).toBe(2)
    expect(preparationStep('GAME_CREATED')).toBe(3)
    expect(preparationStep('COMPLETED')).toBe(4)
  })

  it('names who the room waits for', () => {
    expect(waitingStatusLabel({ playerPresent: true, opponentPresent: true, opponentLabel: 'Sofia R.' })).toBe('Les deux joueurs sont là')
    expect(waitingStatusLabel({ playerPresent: true, opponentPresent: false, opponentLabel: 'Sofia R.' })).toBe('En attente de Sofia R.')
    expect(waitingStatusLabel({ playerPresent: true, opponentPresent: false, opponentLabel: null })).toBe("En attente d'un adversaire")
  })
})

describe('applyMatchmakingNotification', () => {
  it('goes from searching to matched', () => {
    const searching = applyMatchmakingNotification(emptyMatchmaking('m1'), { type: 'SEARCHING', ticketId: 'm1', topicId: 't1', deadlineAt: '2026-11-11T10:00:10Z' })
    expect(searching.deadlineAt).toBe('2026-11-11T10:00:10Z')
    const matched = applyMatchmakingNotification(searching, { type: 'MATCHED', ticketId: 'm1', roomId: 'r1', opponentId: 'p2', vsBot: false, opponent: null })
    expect(matched.status).toBe('MATCHED')
    expect(matched.roomId).toBe('r1')
  })
})

describe('roomsWaitingForViewer', () => {
  const view = (overrides: Partial<RoomView>): RoomView => ({
    roomId: 'r1',
    topic: { topicId: 't1', names: { fr: 'Sujet' }, category: 'GENERAL', imageUrl: null, pictogramUrl: null } as unknown as RoomView['topic'],
    status: 'WAITING_PLAYERS',
    origin: 'SHARED',
    vsBot: false,
    canCancel: true,
    opponent: null,
    initiatorPresent: false,
    participantPresent: true,
    gameId: null,
    createdAt: '2026-11-16T10:00:00Z',
    expiresAt: '2026-11-16T11:00:00Z',
    updatedAt: '2026-11-16T10:00:00Z',
    ...overrides,
  })

  it('counts rooms where the opponent waits for the viewer, initiator or guest', () => {
    expect(isWaitingForViewer(view({}))).toBe(true)
    expect(isWaitingForViewer(view({ canCancel: false, initiatorPresent: true, participantPresent: false }))).toBe(true)
    expect(roomsWaitingForViewer([view({}), view({ roomId: 'r2', canCancel: false, initiatorPresent: true, participantPresent: false })])).toBe(2)
  })

  it('ignores rooms where the viewer is there, nobody waits, a bot plays or preparation started', () => {
    expect(isWaitingForViewer(view({ initiatorPresent: true }))).toBe(false)
    expect(isWaitingForViewer(view({ participantPresent: false }))).toBe(false)
    expect(isWaitingForViewer(view({ vsBot: true }))).toBe(false)
    expect(isWaitingForViewer(view({ status: 'FETCHING_PLAYERS' }))).toBe(false)
    expect(roomsWaitingForViewer(undefined)).toBe(0)
  })
})

describe('applyRoomPresence', () => {
  const room = (overrides: Partial<RoomView>): RoomView =>
    ({ roomId: 'r1', status: 'WAITING_PLAYERS', vsBot: false, canCancel: true, initiatorPresent: false, participantPresent: false, ...overrides }) as RoomView
  const at = '2026-11-16T10:00:00Z'

  it('sets the opponent presence for an initiator and my own presence', () => {
    expect(applyRoomPresence([room({})], { roomId: 'r1', playerId: 'p2', present: true, at }, 'p1')?.[0]?.participantPresent).toBe(true)
    expect(applyRoomPresence([room({})], { roomId: 'r1', playerId: 'p1', present: true, at }, 'p1')?.[0]?.initiatorPresent).toBe(true)
  })

  it('sets the initiator presence for a guest viewer', () => {
    const next = applyRoomPresence([room({ canCancel: false, initiatorPresent: true })], { roomId: 'r1', playerId: 'p1', present: false, at }, 'p2')
    expect(next?.[0]?.initiatorPresent).toBe(false)
  })

  it('returns undefined for an unknown room', () => {
    expect(applyRoomPresence([room({})], { roomId: 'r9', playerId: 'p2', present: true, at }, 'p1')).toBeUndefined()
  })
})

describe('splitRoomsByOrigin', () => {
  it('separates shared rooms from challenge rooms and leaves bot rooms out', () => {
    const rooms = [{ origin: 'SHARED' as const }, { origin: 'CHALLENGE' as const }, { origin: 'REMATCH' as const }, { origin: 'BOT' as const }]
    const { shared, challenges } = splitRoomsByOrigin(rooms)
    expect(shared).toHaveLength(1)
    expect(challenges.map((room) => room.origin)).toEqual(['CHALLENGE', 'REMATCH'])
  })
})
