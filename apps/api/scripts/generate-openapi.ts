import { writeFile } from 'node:fs/promises'
import { resolveAppName } from '@repo/shared'
import { generateOpenApiDocument } from '../src/lib/openapi-document'

// Writes docs/api/openapi.json. Run it after you change a route: `pnpm --filter @repo/api openapi`.
// The title comes from APP_NAME (default: the starter name).
const target = new URL('../../../docs/api/openapi.json', import.meta.url)
// eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed path in the repo
await writeFile(target, await generateOpenApiDocument(resolveAppName(process.env.APP_NAME)))
console.log('docs/api/openapi.json written')
