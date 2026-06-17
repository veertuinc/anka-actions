import * as http from 'http'
import {expect, test} from '@jest/globals'
import {Runner} from '../src/runner'

const PORT = 4445
const BASE_URL = `http://127.0.0.1:${PORT}`

interface CapturedRequest {
  method?: string
  url?: string
  authorization?: string | string[]
}

// Spins up a throwaway HTTP server that always replies with `responseBody`
// (and optional `statusCode`), captures the incoming request for later
// assertions, runs `fn` against a Runner pointed at it, and always closes the
// server afterwards. Assertions are done in `fn` (after the response is sent)
// so a mismatch never leaves the socket hanging.
function withServer<T>(
  responseBody: string,
  statusCode: number,
  fn: (runner: Runner, captured: CapturedRequest) => Promise<T>
): Promise<T> {
  const captured: CapturedRequest = {}
  return new Promise<T>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      captured.method = req.method
      captured.url = req.url
      captured.authorization = req.headers.authorization
      res.statusCode = statusCode
      res.setHeader('Content-Type', 'application/json')
      // Disable keep-alive so the client never reuses a pooled socket from a
      // previous (now-closed) server instance on the same port.
      res.setHeader('Connection', 'close')
      res.end(responseBody)
    })
    server.listen(PORT, () => {
      const runner = new Runner('pat', BASE_URL, 'owner', 'repo')
      fn(runner, captured)
        .then(result => {
          server.close()
          resolve(result)
        })
        .catch(reason => {
          server.close()
          reject(reason)
        })
    })
  })
}

test('create token', async () => {
  await withServer(
    JSON.stringify({
      token: 'token',
      expires_at: '2020-01-29T12:13:35.123-08:00'
    }),
    201,
    async (runner, captured) => {
      expect(await runner.createToken()).toEqual('token')
      expect(captured.method).toEqual('POST')
      expect(captured.url).toEqual(
        '/repos/owner/repo/actions/runners/registration-token'
      )
      expect(captured.authorization).toEqual('token pat')
    }
  )
})

test('get runner by name', async () => {
  await withServer(
    JSON.stringify({
      total_count: 2,
      runners: [
        {id: 23, name: 'linux_runner'},
        {id: 24, name: 'mac_runner'}
      ]
    }),
    200,
    async (runner, captured) => {
      expect(await runner.getRunnerByName('linux_runner')).toEqual(23)
      expect(captured.method).toEqual('GET')
      expect(captured.url).toEqual(
        '/repos/owner/repo/actions/runners?per_page=100&page=1'
      )
    }
  )
})

test('get runner by name returns null when not found', async () => {
  await withServer(
    JSON.stringify({total_count: 1, runners: [{id: 24, name: 'mac_runner'}]}),
    200,
    async runner =>
      expect(await runner.getRunnerByName('linux_runner')).toBeNull()
  )
})

test('delete', async () => {
  await withServer('', 204, async (runner, captured) => {
    expect(await runner.delete(7)).toBeUndefined()
    expect(captured.method).toEqual('DELETE')
    expect(captured.url).toEqual('/repos/owner/repo/actions/runners/7')
  })
})
