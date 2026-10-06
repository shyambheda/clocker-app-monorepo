import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { generateOpenApiDocument } from '../../src/lib/openapi-document'

describe('docs/api/openapi.json', () => {
  it('agrees with the code (run `pnpm --filter @repo/api openapi` to update it)', async () => {
    const file = new URL('../../../../docs/api/openapi.json', import.meta.url)
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed path in the repo
    const committed = JSON.parse(await readFile(file, 'utf8')) as { info: { title: string } }
    // The title comes from APP_NAME, which each product sets. Compare all other content.
    const appName = committed.info.title.replace(/ API$/, '')
    const generated = JSON.parse(await generateOpenApiDocument(appName)) as unknown
    expect(generated).toEqual(committed)
  })

  it('documents the input and output of each route', async () => {
    const document = JSON.parse(await generateOpenApiDocument('Test')) as {
      paths: Record<string, Record<string, { responses: Record<string, unknown> }>>
    }
    expect(Object.keys(document.paths).sort()).toEqual(['/health/live', '/health/ready'])
    expect(Object.keys(document.paths['/health/ready']!.get!.responses).sort()).toEqual([
      '200',
      '503',
    ])
  })
})
