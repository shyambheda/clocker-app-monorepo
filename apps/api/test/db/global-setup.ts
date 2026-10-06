import type { TestProject } from 'vitest/node'
import { localProvider } from './local-provider'
import { neonProvider } from './neon-provider'
import type { TestDatabase, TestDatabaseProvider } from './provider'

declare module 'vitest' {
  export interface ProvidedContext {
    testDb: TestDatabase
  }
}

function selectProvider(): TestDatabaseProvider {
  const name = process.env.TEST_DB_PROVIDER ?? 'local'
  if (name === 'local') return localProvider()
  if (name === 'neon') return neonProvider()
  throw new Error('TEST_DB_PROVIDER must be local or neon')
}

// Makes one disposable database (and Redis) for the run, and removes it after the run.
// On Ctrl+C (SIGINT) or SIGTERM, the database is also removed before the process stops.
export default async function setup(project: TestProject) {
  const provider = selectProvider()

  const onSignal = (signal: NodeJS.Signals) => {
    void provider.destroy().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143))
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)

  console.log(`integration tests: making a ${provider.name} test database`)
  try {
    project.provide('testDb', await provider.create())
  } catch (error) {
    await provider.destroy()
    throw error
  }

  return async () => {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    await provider.destroy()
    console.log(`integration tests: ${provider.name} test database removed`)
  }
}
