import { describe, expect, it } from 'vitest'

import { GET } from './route'

describe('health route', () => {
  it('stays healthy while reporting AI configuration separately', async () => {
    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      service: 'food-sense-api',
      status: 'ok'
    })
    expect(typeof body.aiConfigured).toBe('boolean')
  })
})
