/**
 * Timers : disponibles sur les deux plateformes (DOM, React Native, Node). Déclarés localement
 * pour rester sans lib de plateforme (ADR 0001) — le moteur de flux en a besoin pour ses backoff.
 */
declare function setTimeout(handler: () => void, timeout?: number): unknown
declare function clearTimeout(handle?: unknown): void
