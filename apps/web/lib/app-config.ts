import { resolveAppName } from '@repo/shared'

// Next.js puts NEXT_PUBLIC_ values into the build. Thus a change to the name needs a new build.
export const appName = resolveAppName(process.env.NEXT_PUBLIC_APP_NAME)
