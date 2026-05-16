/**
 * Unit tests for the authentication library, src/lib/auth.ts
 *
 * Covers URL normalisation (normalizeServerUrl) and OAuth2 token acquisition
 * (getAccessToken). The global fetch is replaced with a jest mock so no real
 * network requests are made.
 */
import { jest } from '@jest/globals'
import {
  getAccessToken,
  normalizeServerUrl,
  verifyToken
} from '../src/lib/auth.js'

describe('normalizeServerUrl', () => {
  it('leaves a well-formed https URL unchanged (minus trailing slash)', () => {
    expect(normalizeServerUrl('https://example.com')).toBe(
      'https://example.com'
    )
  })

  it('prepends https:// when no protocol is supplied', () => {
    expect(normalizeServerUrl('example.com')).toBe('https://example.com')
  })

  it('prepends https:// for bare hostnames with subdomains', () => {
    expect(normalizeServerUrl('mysite.example.com')).toBe(
      'https://mysite.example.com'
    )
  })

  it('strips trailing slashes after normalisation', () => {
    expect(normalizeServerUrl('example.com/')).toBe('https://example.com')
    expect(normalizeServerUrl('https://example.com/')).toBe(
      'https://example.com'
    )
  })

  it('preserves an explicit http:// protocol', () => {
    expect(normalizeServerUrl('http://example.com')).toBe('http://example.com')
  })

  it('throws for a value that cannot form a valid URL', () => {
    expect(() => normalizeServerUrl('not a url!!')).toThrow(
      'Invalid server URL'
    )
  })
})

describe('getAccessToken', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as typeof fetch
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns the access token and expiry on a successful response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 299
      })
    })

    const result = await getAccessToken(
      'https://example.com',
      'my-client-id',
      'my-secret'
    )

    expect(result).toEqual({ token: 'test-token', expiresIn: 299 })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/umbraco/management/api/v1/security/back-office/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.stringContaining('grant_type=client_credentials')
      })
    )
  })

  it('includes client_id and client_secret in the request body', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', expires_in: 299 })
    })

    await getAccessToken('https://example.com', 'my-client-id', 'my-secret')

    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string
    expect(body).toContain('client_id=my-client-id')
    expect(body).toContain('client_secret=my-secret')
  })

  it('normalises a bare hostname by prepending https:// before fetching', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', expires_in: 299 })
    })

    await getAccessToken('example.com', 'id', 'secret')

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toBe(
      'https://example.com/umbraco/management/api/v1/security/back-office/token'
    )
  })

  it('throws an error when the response is not ok', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    await expect(
      getAccessToken('https://example.com', 'id', 'secret')
    ).rejects.toThrow('Failed to obtain access token: 401 Unauthorized')
  })
})

describe('verifyToken', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as typeof fetch
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns the authenticated user name on a successful response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'test-api-user' })
    })

    const name = await verifyToken('https://example.com', 'test-token')

    expect(name).toBe('test-api-user')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/umbraco/management/api/v1/user/current',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token'
        })
      })
    )
  })

  it('throws when the token is rejected by the API', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    await expect(
      verifyToken('https://example.com', 'bad-token')
    ).rejects.toThrow('Token verification failed: 401 Unauthorized')
  })

  it('normalises a bare hostname before requesting the current user', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'test-api-user' })
    })

    await verifyToken('example.com', 'test-token')

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toBe(
      'https://example.com/umbraco/management/api/v1/user/current'
    )
  })
})
