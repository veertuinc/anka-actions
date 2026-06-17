import * as axios from 'axios'
import {createAxiosError} from '../src/axios-error'
import {expect, test} from '@jest/globals'

test('formats axios response errors with redacted secrets', () => {
  const error = new axios.AxiosError(
    'Request failed with status code 403',
    '403',
    {
      method: 'post',
      baseURL: 'https://api.github.com',
      url: '/repos/owner/repo/actions/runners/registration-token',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'token ghp_super_secret',
        'X-GitHub-Api-Version': '2022-11-28'
      } as unknown as axios.AxiosRequestHeaders,
      data: JSON.stringify({token: 'runner-token', note: 'safe'})
    },
    {},
    {
      status: 403,
      statusText: 'Forbidden',
      headers: {'content-type': 'application/json'},
      data: {
        message: 'Resource not accessible by integration',
        documentation_url:
          'https://docs.github.com/rest/actions/self-hosted-runners'
      },
      config: {} as axios.InternalAxiosRequestConfig,
      request: {}
    }
  )

  const formatted = createAxiosError(error)

  expect(formatted.message).toContain('HTTP request failed:')
  expect(formatted.message).toContain('"status": 403')
  expect(formatted.message).toContain(
    '"message": "Resource not accessible by integration"'
  )
  expect(formatted.message).toContain('"Authorization": "[REDACTED]"')
  expect(formatted.message).not.toContain('ghp_super_secret')
  expect(formatted.message).not.toContain('runner-token')
  expect(formatted.message).toContain('"note": "safe"')
})

test('formats axios errors without a response', () => {
  const error = new axios.AxiosError(
    'Network Error',
    'ERR_NETWORK',
    {
      method: 'get',
      baseURL: 'https://controller.example.com',
      url: '/api/v1/vm',
      headers: {
        Authorization: 'Basic secret-value'
      } as unknown as axios.AxiosRequestHeaders
    },
    {},
    undefined
  )

  const formatted = createAxiosError(error)

  expect(formatted.message).toContain('HTTP request failed (no response):')
  expect(formatted.message).toContain('"method": "GET"')
  expect(formatted.message).toContain(
    '"url": "https://controller.example.com/api/v1/vm"'
  )
  expect(formatted.message).not.toContain('secret-value')
})
