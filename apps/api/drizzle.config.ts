import { defineConfig } from 'drizzle-kit'

// drizzle-kit (db:generate) uses the owner role through the direct connection string.
// The runtime role (app_user) cannot change the schema.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_MIGRATION_URL ?? '' },
  strict: true,
  verbose: true,
})
