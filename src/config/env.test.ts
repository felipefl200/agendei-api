import { describe, expect, it } from 'vitest'

import { resolvePublicBaseUrl } from './env.js'

describe('resolvePublicBaseUrl', () => {
  it('uses explicit public base URL when provided', () => {
    expect(
      resolvePublicBaseUrl({
        explicitBaseUrl: 'https://api.example.com',
        nodeEnv: 'production',
        port: 3333,
      }),
    ).toBe('https://api.example.com')
  })

  it('uses the production public URL by default', () => {
    expect(
      resolvePublicBaseUrl({
        nodeEnv: 'production',
        port: 3333,
      }),
    ).toBe('https://board.linenetwork.com.br')
  })

  it('uses localhost with the configured port outside production', () => {
    expect(
      resolvePublicBaseUrl({
        nodeEnv: 'development',
        port: 4444,
      }),
    ).toBe('http://localhost:4444')
  })
})
