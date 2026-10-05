/**
 * Product identity. Each product sets its name with configuration:
 * - API and worker: APP_NAME
 * - Web and admin: NEXT_PUBLIC_APP_NAME (Next.js puts the value into the build)
 */

export const DEFAULT_APP_NAME = 'SaaS Starter'

/** Returns the configured product name. Returns the default name if the value is empty. */
export function resolveAppName(value: string | undefined): string {
  const name = value?.trim()
  return name ? name : DEFAULT_APP_NAME
}
