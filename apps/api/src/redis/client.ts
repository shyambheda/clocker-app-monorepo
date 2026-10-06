import { Redis } from 'ioredis'
import { withTimeout } from '../lib/timeout'

// Redis adapter. This is the only file that imports `ioredis`.
// Libraries that need a raw connection (the rate limit store, BullMQ in Phase 3) get `connection`.

export type RedisConnection = Redis

export interface RedisClient {
  connection: RedisConnection
  /** Sends PING. Rejects if Redis does not answer in `timeoutMs`. */
  ping(timeoutMs: number): Promise<void>
  close(): Promise<void>
}

export interface CreateRedisOptions {
  /**
   * `http`: a command fails fast when Redis is not available, so a request does not wait.
   * `worker`: commands wait for the connection (BullMQ needs `maxRetriesPerRequest: null`).
   */
  profile: 'http' | 'worker'
  onError: (err: Error) => void
}

export function createRedis(url: string, options: CreateRedisOptions): RedisClient {
  const connection = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 5_000,
    maxRetriesPerRequest: options.profile === 'http' ? 1 : null,
    retryStrategy: (times) => Math.min(times * 200, 2_000),
  })
  // Without a listener, a connection error stops the process.
  connection.on('error', options.onError)

  return {
    connection,
    async ping(timeoutMs) {
      await withTimeout(connection.ping(), timeoutMs)
    },
    async close() {
      if (connection.status === 'wait' || connection.status === 'end') {
        connection.disconnect()
        return
      }
      try {
        await connection.quit()
      } catch {
        connection.disconnect()
      }
    },
  }
}
