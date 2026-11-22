import { describe, expect, it } from 'vitest'
import { addLiveFrame, addRoundTrip, CLOCK_WINDOW, clockOffset, emptyClock, type ClockState } from '../domain/clock.js'

/** Appareil en retard de 5 s sur le serveur. */
const TRUE_OFFSET = 5_000

/** Aller-retour simulé : `up` ms jusqu'au serveur, `down` ms retour, envoyé à `sentAt` (horloge de l'appareil). */
const roundTrip = (sentAt: number, up: number, down: number) => ({ sentAt, serverEpochMs: sentAt + up + TRUE_OFFSET, receivedAt: sentAt + up + down })

/** Générateur déterministe (LCG) pour la gigue. */
function random(seed: number) {
  let value = seed
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) % 2 ** 32
    return value / 2 ** 32
  }
}

describe('server clock', () => {
  it('has no offset before any measure', () => {
    expect(clockOffset(emptyClock)).toBeNull()
  })

  it('takes the server instant at the middle of the round trip', () => {
    expect(clockOffset(addRoundTrip(emptyClock, roundTrip(1_000, 150, 150)))).toBe(TRUE_OFFSET)
  })

  it('never goes back on delayed live frames', () => {
    let clock = addRoundTrip(emptyClock, roundTrip(1_000, 100, 100))
    const synced = clockOffset(clock)
    // Trames poussées avec 400 à 1 500 ms de latence : chaque borne basse est sous le vrai décalage.
    for (const latency of [400, 1_500, 800]) clock = addLiveFrame(clock, 10_000 + TRUE_OFFSET, 10_000 + latency)
    expect(clockOffset(clock)).toBe(synced)
  })

  it('lets a live frame raise an underestimated offset', () => {
    // Aller très asymétrique (1 s) : le milieu sous-estime le décalage de 450 ms ; une trame quasi instantanée relève.
    let clock = addRoundTrip(emptyClock, roundTrip(1_000, 1_000, 100))
    expect(clockOffset(clock)).toBe(TRUE_OFFSET + 450)
    clock = addLiveFrame(clock, 20_000 + TRUE_OFFSET, 20_000 - 600)
    expect(clockOffset(clock)).toBe(TRUE_OFFSET + 600)
  })

  it('converges to the sample of minimal round trip', () => {
    let clock: ClockState = emptyClock
    clock = addRoundTrip(clock, roundTrip(1_000, 900, 100))
    clock = addRoundTrip(clock, roundTrip(3_000, 60, 40))
    clock = addRoundTrip(clock, roundTrip(5_000, 50, 700))
    expect(clockOffset(clock)).toBe(TRUE_OFFSET + 10)
  })

  it('stays within 100 ms of the server with 400 ms of simulated latency', () => {
    const next = random(42)
    let clock: ClockState = emptyClock
    // Rafale de 5 mesures : 400 ms de latence par trajet, plus 0 à 300 ms de gigue indépendante sur chaque trajet.
    for (let n = 0; n < 5; n += 1) clock = addRoundTrip(clock, roundTrip(1_000 + n * 2_000, 400 + next() * 300, 400 + next() * 300))
    for (let n = 0; n < 20; n += 1) clock = addLiveFrame(clock, 20_000 + n * 1_000 + TRUE_OFFSET, 20_000 + n * 1_000 + 400 + next() * 300)
    const offset = clockOffset(clock) ?? 0
    expect(Math.abs(offset - TRUE_OFFSET)).toBeLessThanOrEqual(100)
  })

  it('keeps a bounded window of recent samples', () => {
    let clock: ClockState = emptyClock
    for (let n = 0; n < CLOCK_WINDOW + 4; n += 1) clock = addRoundTrip(clock, roundTrip(1_000 + n * 1_000, 50, 50))
    expect(clock.samples).toHaveLength(CLOCK_WINDOW)
  })

  it('starts over when the device clock is moved', () => {
    let clock = addRoundTrip(emptyClock, roundTrip(1_000, 50, 50))
    clock = addLiveFrame(clock, 2_000 + TRUE_OFFSET, 2_100)
    // Montre avancée de 60 s : le vrai décalage tombe à −55 s, hors de l'intervalle de la nouvelle mesure.
    const moved = { sentAt: 70_000, serverEpochMs: 10_050 + TRUE_OFFSET, receivedAt: 70_100 }
    clock = addRoundTrip(clock, moved)
    expect(clock.floorMs).toBeNull()
    expect(clockOffset(clock)).toBe(TRUE_OFFSET - 60_000)
  })
})
