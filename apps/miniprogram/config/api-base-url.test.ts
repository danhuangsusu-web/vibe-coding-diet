import { describe, expect, it } from 'vitest'

import { resolveApiBaseUrl } from './api-base-url'

describe('resolveApiBaseUrl', () => {
  it('uses the local server for development when no value is configured', () => {
    expect(resolveApiBaseUrl('development')).toBe('http://127.0.0.1:3000')
  })

  it('does not leak the local server into production builds', () => {
    expect(resolveApiBaseUrl('production')).toBe('')
  })

  it('prefers and normalizes the configured value in every mode', () => {
    expect(
      resolveApiBaseUrl('production', ' https://api.example.com/ ')
    ).toBe('https://api.example.com')
  })
})
