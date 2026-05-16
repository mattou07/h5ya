import * as core from '@actions/core'
import { getAccessToken, verifyToken } from './lib/auth.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const server = core.getInput('server', { required: true })
    const clientId = core.getInput('client-id', { required: true })
    const secret = core.getInput('secret', { required: true })

    // Mask the secret immediately so it never appears in logs.
    core.setSecret(secret)

    const token = await getAccessToken(server, clientId, secret)

    // Mask the token before setting it as output so it is redacted from logs.
    core.setSecret(token)
    core.setOutput('token', token)

    const userName = await verifyToken(server, token)
    core.info(`Successfully authenticated as "${userName}" on ${server}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
