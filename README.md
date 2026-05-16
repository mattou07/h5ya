# hy5a — High Five, You're Authenticated!

![CI](https://github.com/h5ya/h5ya/actions/workflows/ci.yml/badge.svg)
![Check dist/](https://github.com/h5ya/h5ya/actions/workflows/check-dist.yml/badge.svg)
![CodeQL](https://github.com/h5ya/h5ya/actions/workflows/codeql-analysis.yml/badge.svg)
![Coverage](./badges/coverage.svg)

A GitHub Action that authenticates to the
[Umbraco Management API](https://docs.umbraco.com/umbraco-cms/develop-with-umbraco/headless-and-apis/management-api)
using OAuth2 client credentials and outputs a bearer token for downstream steps
to use.

## Prerequisites

Before using this action you need an **API user** configured in the Umbraco
back-office with a set of client credentials:

1. In the Umbraco back-office, navigate to **Users** and create a new API user.
2. Assign the API user the permissions it needs for the downstream operations
   your workflow will perform.
3. Under the API user's **Client Credentials**, create a new client with a
   `client_id` and `client_secret`.
4. Store the `client_secret` as an
   [encrypted secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
   in your repository or organisation (e.g. `UMBRACO_CLIENT_SECRET`).

## Inputs

| Input       | Required | Description                                                                                                 |
| ----------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `server`    | Yes      | Base URL of the Umbraco instance. Accepts a full URL or a bare hostname (e.g. `my-site.azurewebsites.net`). |
| `client-id` | Yes      | The OAuth2 client ID configured in the Umbraco back-office.                                                 |
| `secret`    | Yes      | The OAuth2 client secret. Should be stored as an encrypted secret.                                          |

## Outputs

| Output  | Description                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token` | The bearer token obtained from the Umbraco Management API. The value is masked in all logs. Use as `Authorization: Bearer ${{ steps.<id>.outputs.token }}` in downstream steps. |

## Usage

### Basic example

```yaml
steps:
  - name: Authenticate with Umbraco
    id: umbraco-auth
    uses: h5ya/h5ya@v1
    with:
      server: https://my-site.com
      client-id: umbraco-back-office-my-client
      secret: ${{ secrets.UMBRACO_CLIENT_SECRET }}
```

After this step runs, the output `steps.umbraco-auth.outputs.token` contains a
valid bearer token. The action also verifies the token by calling
`GET /umbraco/management/api/v1/user/current` and logs the authenticated user
name, so a failed authentication is surfaced immediately rather than later in
the workflow.

### Using the token in a subsequent `run` step

Pass the token to a shell script via an environment variable so it is never
interpolated directly into the command string:

```yaml
steps:
  - name: Authenticate with Umbraco
    id: umbraco-auth
    uses: h5ya/h5ya@v1
    with:
      server: https://my-site.com
      client-id: umbraco-back-office-my-client
      secret: ${{ secrets.UMBRACO_CLIENT_SECRET }}

  - name: Get Current User
    env:
      UMBRACO_TOKEN: ${{ steps.umbraco-auth.outputs.token }}
    run: |
      curl --fail -X POST \
        -H "Authorization: Bearer $UMBRACO_TOKEN" \
        -H "Content-Type: application/json" \
        https://my-site.com/umbraco/management/api/v1/user/current
```

### Using the token in another action

```yaml
steps:
  - name: Authenticate with Umbraco
    id: umbraco-auth
    uses: h5ya/h5ya@v1
    with:
      server: ${{ vars.UMBRACO_SERVER }}
      client-id: ${{ vars.UMBRACO_CLIENT_ID }}
      secret: ${{ secrets.UMBRACO_CLIENT_SECRET }}

  - name: Run Example
    uses: h5ya/example@v1
    with:
      server: ${{ vars.UMBRACO_SERVER }}
      token: ${{ steps.umbraco-auth.outputs.token }}
```

### Using a bare hostname

The action accepts a bare hostname and prepends `https://` automatically:

```yaml
with:
  server: my-site.azurewebsites.net
  client-id: umbraco-back-office-my-client
  secret: ${{ secrets.UMBRACO_CLIENT_SECRET }}
```

## Local development

### Setup

```bash
npm install
```

### Run tests

```bash
npm test
```

### Test the action locally against a real Umbraco instance

Copy `.env.example` to `.env` and fill in your values:

```ini
INPUT_SERVER=https://my-site.com
INPUT_CLIENT-ID=umbraco-back-office-my-client
INPUT_SECRET=your-client-secret
```

Then run:

```bash
npm run local-action
```

A successful run logs:

```
::info::Successfully authenticated as "My API User" on https://my-site.com
```

### Bundle after making source changes

```bash
npm run bundle
```
