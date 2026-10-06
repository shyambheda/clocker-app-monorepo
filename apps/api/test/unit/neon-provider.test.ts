import { afterEach, describe, expect, it, vi } from 'vitest'
import { branchName, neonClient } from '../db/neon-provider'

// The Neon API cannot be called in unit tests. These tests check the requests that the
// test database provider sends. `pnpm test:neon` checks the real API.

const created = {
  branch: { id: 'br-1', name: 'ci-test-x', created_at: '2026-10-06T09:00:00Z' },
  connection_uris: [
    {
      connection_uri: 'postgresql://owner:pw@ep-1.example.neon.tech/neondb?sslmode=require',
      connection_parameters: {
        host: 'ep-1.example.neon.tech',
        pooler_host: 'ep-1-pooler.example.neon.tech',
      },
    },
  ],
}

function response(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('neon test database provider', () => {
  it('makes a branch name with the ci-test prefix and the UTC time', () => {
    expect(branchName()).toMatch(/^ci-test-\d{8}t\d{6}z-[a-z0-9]{1,6}$/)
  })

  it('sends an expiry time and the API key', async () => {
    const fetch = vi.fn().mockResolvedValue(response(201, created))
    vi.stubGlobal('fetch', fetch)
    await neonClient('key-1', 'proj-1').createBranch('ci-test-x', 'br-parent')

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://console.neon.tech/api/v2/projects/proj-1/branches')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer key-1')
    const body = JSON.parse(init.body as string) as { branch: Record<string, string> }
    expect(body.branch.parent_id).toBe('br-parent')
    expect(body.branch.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it('makes the branch without an expiry time when the API does not accept it', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(400, { message: 'expires_at not allowed' }))
      .mockResolvedValueOnce(response(201, created))
    vi.stubGlobal('fetch', fetch)
    const result = await neonClient('key-1', 'proj-1').createBranch('ci-test-x', 'br-parent')

    expect(result.branch.id).toBe('br-1')
    const second = JSON.parse((fetch.mock.calls[1] as [string, RequestInit])[1].body as string) as {
      branch: Record<string, string>
    }
    expect(second.branch.expires_at).toBeUndefined()
  })

  it('does not put the response body into the error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(500, { detail: 'postgresql://owner:secret@host' })),
    )
    const error = await neonClient('key-1', 'proj-1')
      .listBranches()
      .catch((err: unknown) => err as Error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('500')
    expect((error as Error).message).not.toContain('secret')
  })
})
