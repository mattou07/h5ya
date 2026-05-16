/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

const getAccessToken = jest.fn<() => Promise<string>>()

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/lib/auth.js', () => ({ getAccessToken }))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        server: 'https://example.com',
        'client-id': 'my-client-id',
        secret: 'my-secret'
      }
      return inputs[name] ?? ''
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('sets the token output on a successful login', async () => {
    getAccessToken.mockResolvedValueOnce('test-bearer-token')

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('token', 'test-bearer-token')
    expect(core.info).toHaveBeenCalledWith(
      'Successfully obtained access token from https://example.com'
    )
  })

  it('masks both the secret and the token', async () => {
    getAccessToken.mockResolvedValueOnce('test-bearer-token')

    await run()

    expect(core.setSecret).toHaveBeenCalledWith('my-secret')
    expect(core.setSecret).toHaveBeenCalledWith('test-bearer-token')
  })

  it('calls setFailed when getAccessToken throws', async () => {
    getAccessToken.mockRejectedValueOnce(
      new Error('Failed to obtain access token: 401 Unauthorized')
    )

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'Failed to obtain access token: 401 Unauthorized'
    )
    expect(core.setOutput).not.toHaveBeenCalled()
    expect(core.info).not.toHaveBeenCalled()
  })

  it('does not call setFailed when a non-Error value is thrown', async () => {
    // The guard `if (error instanceof Error)` silently swallows non-Error
    // throws to avoid passing unexpected types to setFailed.
    getAccessToken.mockRejectedValueOnce('string error')

    await run()

    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
