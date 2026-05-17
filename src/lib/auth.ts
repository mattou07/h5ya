/**
 * Normalises a server URL entered by the user:
 * - Prepends `https://` when no protocol is present.
 * - Strips trailing slashes.
 * - Throws a descriptive error for anything that is still not a valid URL.
 */
export function normalizeServerUrl(server: string): string {
  let base = server.trim()
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`
  }
  base = base.replace(/\/+$/, '')
  try {
    new URL(base)
  } catch {
    throw new Error(
      `Invalid server URL "${server}". Please provide a valid URL (e.g. https://my-site.com).`
    )
  }
  return base
}

/**
 * Obtains an OAuth2 bearer token from the Umbraco back-office token endpoint
 * using the client credentials grant.
 *
 */
export interface AccessTokenResult {
  token: string
  expiresIn: number
}

/**
 * Obtains an OAuth2 bearer token from the Umbraco back-office token endpoint
 * using the client credentials grant.
 *
 * Reference: uSync.Commands.Core/Http/HttpClientExtensions.cs GetAccessToken()
 */
export async function getAccessToken(
  server: string,
  clientId: string,
  secret: string
): Promise<AccessTokenResult> {
  const base = normalizeServerUrl(server)
  const url = `${base}/umbraco/management/api/v1/security/back-office/token`

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: secret
  }).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) {
    throw new Error(
      `Failed to obtain access token: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
  }
  return { token: data.access_token, expiresIn: data.expires_in }
}

/**
 * Verifies that a bearer token is accepted by the Umbraco Management API by
 * calling the current-user endpoint. Returns the authenticated user's name so
 * callers can confirm which API user the credentials map to.
 */
export async function verifyToken(
  server: string,
  token: string
): Promise<string> {
  const base = normalizeServerUrl(server)
  const url = `${base}/umbraco/management/api/v1/user/current`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(
      `Token verification failed: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as { name: string }
  return data.name
}
