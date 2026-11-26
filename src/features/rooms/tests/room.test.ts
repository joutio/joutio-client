import { describe, expect, it } from 'vitest'
import { Room } from '../domain/room.js'
import {
  defisSections,
  incomingRematch,
  isWaitingForViewer,
  pendingInvitations,
  roomsWaitingForViewer,
} from '../domain/room-view.js'
import { afterInvitationReminder, invitationReminderDelay } from '../domain/reminder.js'
import { joinRefusalOf } from '../hooks/use-room-stream.js'
import { preparationComplete, preparationStep, waitingStatusLabel } from '../domain/preparation.js'
import type { RoomView } from '../types.js'
import { Matchmaking } from '../domain/matchmaking.js'
import type { RoomEvent } from '../domain/room-event.js'

const fold = (events: RoomEvent[]) => events.reduce((room, event) => room.onRoomEvent(event), Room.empty('r1'))

const created: RoomEvent = {
  type: 'ROOM_CREATED',
  roomId: 'r1',
  topicId: 't1',
  initiatorId: 'p1',
  opponentId: null,
  vsBot: false,
  origin: 'SHARED',
  status: 'WAITING_PLAYERS',
  sourceGameId: null,
  expiresAt: '2026-11-11T10:02:00Z',
}
const invited: RoomEvent = {
  ...created,
  opponentId: 'p2',
  origin: 'REMATCH',
  status: 'INVITED',
  sourceGameId: 'g0',
  expiresAt: '2026-11-11T10:00:10Z',
}

describe('Room.onRoomEvent', () => {
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
    const room = fold([
      created,
      { type: 'ROOM_ENTERED', roomId: 'r1', playerId: 'p1' },
      { type: 'ROOM_LEFT', roomId: 'r1', playerId: 'p1' },
    ])
    expect(room.status).toBe('WAITING_PLAYERS')
    expect(room.initiatorPresent).toBe(false)
  })
})

describe('invitation', () => {
  it('starts invited, then waits for the players once accepted', () => {
    expect(fold([invited]).status).toBe('INVITED')
    expect(fold([invited]).sourceGameId).toBe('g0')
    const accepted = fold([invited, { type: 'ROOM_ACCEPTED', roomId: 'r1', expiresAt: '2026-11-12T10:00:00Z' }])
    expect(accepted.status).toBe('WAITING_PLAYERS')
    expect(accepted.expiresAt).toBe('2026-11-12T10:00:00Z')
  })

  it('ends on a refusal', () => {
    expect(fold([invited, { type: 'ROOM_DECLINED', roomId: 'r1' }]).status).toBe('DECLINED')
  })
})

describe('reminderState', () => {
  const waiting = fold([
    { ...invited, origin: 'CHALLENGE', status: 'WAITING_PLAYERS' },
    { type: 'ROOM_ENTERED', roomId: 'r1', playerId: 'p1' },
  ])

  it('lets a present player call the absent opponent, then waits for the cadence', () => {
    expect(waiting.reminderState('p1', 0)).toEqual({ available: true, cooldownEndsAt: null })
    const reminded = waiting.onRoomEvent({
      type: 'ROOM_REMINDED',
      roomId: 'r1',
      playerId: 'p1',
      targetId: 'p2',
      stage: 'PRESENCE',
      remindedAt: '2026-11-11T10:00:00Z',
      remindableAt: '2026-11-11T10:00:10Z',
    })
    const cooldownEndsAt = Date.parse('2026-11-11T10:00:10Z')
    expect(reminded.reminderState('p1', cooldownEndsAt - 1)).toEqual({ available: false, cooldownEndsAt })
    expect(reminded.reminderState('p1', cooldownEndsAt).available).toBe(true)
  })

  it('is unavailable while the room is still an invitation', () => {
    expect(fold([invited]).reminderState('p1', 0).available).toBe(false)
  })
})

describe('room failure', () => {
  it('keeps the server reason of a failed room', () => {
    const room = fold([{ type: 'ROOM_FAILED', roomId: 'r1', reason: 'TOPIC_NOT_AVAILABLE_IN_LANGUAGE' }])
    expect(room.status).toBe('FAILED')
    expect(room.failureReason).toBe('TOPIC_NOT_AVAILABLE_IN_LANGUAGE')
    expect(Room.empty('r2').failureReason).toBeNull()
  })

  it('maps reasons to the message to show', () => {
    expect(Room.failureKind('TOPIC_NOT_AVAILABLE_IN_LANGUAGE')).toBe('language')
    expect(Room.failureKind('TOPIC_UNAVAILABLE')).toBe('topic')
    expect(Room.failureKind('QUESTION_DRAW_TIMEOUT')).toBe('timeout')
    expect(Room.failureKind('QUESTION_DRAW_FAILED')).toBe('unknown')
    expect(Room.failureKind(null)).toBe('unknown')
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
    expect(waitingStatusLabel({ playerPresent: true, opponentPresent: true, opponentLabel: 'Sofia R.' })).toBe(
      'Les deux joueurs sont là',
    )
    expect(waitingStatusLabel({ playerPresent: true, opponentPresent: false, opponentLabel: 'Sofia R.' })).toBe(
      'En attente de Sofia R.',
    )
    expect(waitingStatusLabel({ playerPresent: true, opponentPresent: false, opponentLabel: null })).toBe(
      "En attente d'un adversaire",
    )
  })
})

describe('Matchmaking.onMatchmakingEvent', () => {
  it('goes from searching to matched', () => {
    const searching = Matchmaking.empty('m1').onMatchmakingEvent({
      type: 'SEARCHING',
      ticketId: 'm1',
      topicId: 't1',
      deadlineAt: '2026-11-11T10:00:10Z',
    })
    expect(searching.deadlineAt).toBe('2026-11-11T10:00:10Z')
    const matched = searching.onMatchmakingEvent({
      type: 'MATCHED',
      ticketId: 'm1',
      roomId: 'r1',
      opponentId: 'p2',
      vsBot: false,
      opponent: null,
    })
    expect(matched.status).toBe('MATCHED')
    expect(matched.roomId).toBe('r1')
  })
})

describe('roomsWaitingForViewer', () => {
  const view = (overrides: Partial<RoomView>): RoomView => ({
    roomId: 'r1',
    topic: {
      topicId: 't1',
      names: { fr: 'Sujet' },
      category: 'GENERAL',
      imageUrl: null,
      pictogramUrl: null,
    } as unknown as RoomView['topic'],
    status: 'WAITING_PLAYERS',
    origin: 'SHARED',
    access: 'OPEN_LINK',
    vsBot: false,
    canCancel: true,
    opponent: null,
    initiatorPresent: false,
    participantPresent: true,
    gameId: null,
    sourceGameId: null,
    createdAt: '2026-11-16T10:00:00Z',
    expiresAt: '2026-11-16T11:00:00Z',
    remindableAt: null,
    updatedAt: '2026-11-16T10:00:00Z',
    ...overrides,
  })

  it('counts rooms where the opponent waits for the viewer, initiator or guest', () => {
    expect(isWaitingForViewer(view({}))).toBe(true)
    expect(isWaitingForViewer(view({ canCancel: false, initiatorPresent: true, participantPresent: false }))).toBe(true)
    expect(
      roomsWaitingForViewer([
        view({}),
        view({ roomId: 'r2', canCancel: false, initiatorPresent: true, participantPresent: false }),
      ]),
    ).toBe(2)
  })

  it('ignores rooms where the viewer is there, nobody waits, a bot plays or preparation started', () => {
    expect(isWaitingForViewer(view({ initiatorPresent: true }))).toBe(false)
    expect(isWaitingForViewer(view({ participantPresent: false }))).toBe(false)
    expect(isWaitingForViewer(view({ vsBot: true }))).toBe(false)
    expect(isWaitingForViewer(view({ status: 'FETCHING_PLAYERS' }))).toBe(false)
    expect(roomsWaitingForViewer(undefined)).toBe(0)
  })
})

describe('Défis', () => {
  const view = (overrides: Partial<RoomView>) =>
    ({
      roomId: 'r1',
      status: 'INVITED',
      origin: 'CHALLENGE',
      vsBot: false,
      canCancel: false,
      expiresAt: '2026-11-16T11:00:00Z',
      ...overrides,
    }) as RoomView

  it('splits received and sent invitations from rooms waiting for the players', () => {
    const rooms = [
      view({ roomId: 'late', expiresAt: '2026-11-16T12:00:00Z' }),
      view({ roomId: 'soon', expiresAt: '2026-11-16T10:30:00Z' }),
      view({ roomId: 'sent', canCancel: true }),
      view({ roomId: 'accepted', status: 'WAITING_PLAYERS' }),
      view({ roomId: 'link', status: 'WAITING_PLAYERS', origin: 'SHARED', canCancel: true }),
      view({ roomId: 'bot', status: 'WAITING_PLAYERS', origin: 'BOT', vsBot: true }),
      view({ roomId: 'preparing', status: 'FETCHING_PLAYERS' }),
    ]
    const sections = defisSections(rooms)
    expect(sections.received.map((room) => room.roomId)).toEqual(['soon', 'late'])
    expect(sections.sent.map((room) => room.roomId)).toEqual(['sent'])
    expect(sections.waiting.map((room) => room.roomId)).toEqual(['accepted', 'link'])
    expect(pendingInvitations(rooms)).toBe(2)
  })

  it('finds the rematch waiting for an answer', () => {
    expect(incomingRematch([view({}), view({ roomId: 'rematch', origin: 'REMATCH' })])?.roomId).toBe('rematch')
    expect(incomingRematch([view({ origin: 'REMATCH', canCancel: true })])).toBeUndefined()
  })

  it('pushes the invitation reminder 10 minutes away', () => {
    const now = Date.parse('2026-11-16T10:00:00Z')
    expect(invitationReminderDelay({ remindableAt: '2026-11-16T10:05:00Z' }, now)).toBe(5 * 60 * 1000)
    expect(invitationReminderDelay(afterInvitationReminder({ remindableAt: null }, now), now)).toBe(10 * 60 * 1000)
  })
})

describe('joinRefusalOf', () => {
  it('maps the server problems to the refusal shown', () => {
    expect(joinRefusalOf('urn:joutio:room:alreadyFull')).toBe('FULL')
    expect(joinRefusalOf('urn:joutio:room:invitationPending')).toBe('NOT_INVITED')
    expect(joinRefusalOf('urn:joutio:room:notFound')).toBe('GONE')
    expect(joinRefusalOf('urn:joutio:bff:player:unavailable')).toBe('UNAVAILABLE')
  })
})
