import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis'
import { z } from 'zod'
import { loadEnv } from '../../src/config/env'
import { REDIS_IMAGE } from './local-provider'
import { migrate, type TestDatabaseProvider } from './provider'

// A disposable Neon branch for each run, made from NEON_PARENT_BRANCH (copy-on-write, so it has
// the data and the roles of the parent). This run finds differences between local Postgres and
// Neon: the pooler, role limits and extensions. Redis is a local container (Docker is necessary).

const NEON_API = 'https://console.neon.tech/api/v2'
const BRANCH_PREFIX = 'ci-test-'
const MAX_BRANCH_AGE_MS = 2 * 60 * 60 * 1000
const BRANCH_TTL_MS = 2 * 60 * 60 * 1000

export const neonEnvSchema = z.object({
  NEON_API_KEY: z.string().min(1),
  NEON_PROJECT_ID: z.string().min(1),
  NEON_PARENT_BRANCH: z.string().min(1).default('dev'),
})

const BranchSchema = z.object({ id: z.string(), name: z.string(), created_at: z.string() })
const ConnectionUriSchema = z.object({
  connection_uri: z.string(),
  connection_parameters: z.object({ pooler_host: z.string(), host: z.string() }),
})
const CreateBranchResponseSchema = z.object({
  branch: BranchSchema,
  connection_uris: z.array(ConnectionUriSchema).min(1),
})

class NeonApiError extends Error {
  override name = 'NeonApiError'
}

export function neonClient(apiKey: string, projectId: string) {
  async function call(method: string, path: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${NEON_API}/projects/${projectId}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      // Only the status: the body can contain connection details.
      throw new NeonApiError(`Neon API ${method} ${path.split('?')[0]} failed with ${res.status}`)
    }
    return res.status === 204 ? undefined : res.json()
  }

  return {
    async listBranches() {
      const data = z
        .object({ branches: z.array(BranchSchema) })
        .parse(await call('GET', '/branches'))
      return data.branches
    },
    async createBranch(name: string, parentId: string) {
      const branch = { name, parent_id: parentId }
      const endpoints = [{ type: 'read_write' }]
      const expiresAt = new Date(Date.now() + BRANCH_TTL_MS).toISOString().replace(/\.\d{3}Z$/, 'Z')
      try {
        return CreateBranchResponseSchema.parse(
          await call('POST', '/branches', {
            branch: { ...branch, expires_at: expiresAt },
            endpoints,
          }),
        )
      } catch (error) {
        // Not all plans accept an expiry time. Then make the branch without it.
        if (!(error instanceof NeonApiError) || !error.message.endsWith(' 400')) throw error
        return CreateBranchResponseSchema.parse(
          await call('POST', '/branches', { branch, endpoints }),
        )
      }
    },
    async deleteBranch(id: string) {
      await call('DELETE', `/branches/${id}`)
    },
  }
}

/** For example `ci-test-20261006t091500z-a1b2c3`. */
export function branchName(): string {
  const time = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'z')
    .toLowerCase()
  return `${BRANCH_PREFIX}${time}-${Math.random().toString(36).slice(2, 8)}`
}

export function neonProvider(): TestDatabaseProvider {
  const env = loadEnv(neonEnvSchema)
  const neon = neonClient(env.NEON_API_KEY, env.NEON_PROJECT_ID)
  let branchId: string | undefined
  let redis: StartedRedisContainer | undefined

  return {
    name: 'neon',
    async create() {
      const branches = await neon.listBranches()

      // Remove branches of old runs that could not clean up (for example after a crash).
      const oldest = Date.now() - MAX_BRANCH_AGE_MS
      const stale = branches.filter(
        (branch) => branch.name.startsWith(BRANCH_PREFIX) && Date.parse(branch.created_at) < oldest,
      )
      await Promise.allSettled(stale.map((branch) => neon.deleteBranch(branch.id)))

      const parent = branches.find((branch) => branch.name === env.NEON_PARENT_BRANCH)
      if (!parent) throw new Error(`Neon branch ${env.NEON_PARENT_BRANCH} does not exist`)

      // Keep the branch id and the container as soon as they exist, so that destroy() can remove
      // them also when create() fails. A branch that is still in creation when the process stops
      // is removed by a later run (older than 2 hours) or by its expiry time.
      const [created] = await Promise.all([
        neon.createBranch(branchName(), parent.id).then((branch) => {
          branchId = branch.branch.id
          return branch
        }),
        new RedisContainer(REDIS_IMAGE).start().then((container) => (redis = container)),
      ])
      if (!redis) throw new Error('Redis container did not start')

      // The owner URL from the API is the direct connection. app_user uses the pooled host,
      // as in production.
      const owner = created.connection_uris[0]!
      const ownerUrl = owner.connection_uri
      const pooled = new URL(ownerUrl)
      pooled.hostname = owner.connection_parameters.pooler_host
      const appUrl = await retry(() => migrate(ownerUrl, pooled.toString()))

      return { ownerUrl, appUrl, redisUrl: redis.getConnectionUrl() }
    },
    async destroy() {
      const id = branchId
      branchId = undefined
      await Promise.allSettled([id ? neon.deleteBranch(id) : undefined, redis?.stop()])
      redis = undefined
    },
  }
}

// A new branch endpoint can need some seconds before it accepts connections.
async function retry<T>(fn: () => Promise<T>, attempts = 10): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= attempts) throw error
      await new Promise((resolve) => setTimeout(resolve, 3_000))
    }
  }
}
