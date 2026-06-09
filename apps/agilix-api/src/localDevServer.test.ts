import { appStateResponseSchema } from '@agilix/contract'
import { describe, expect, it } from 'vitest'
import { createLocalDevApiFetch } from './localDevServer'

describe('local dev API server', () => {
  it('serves JSON bootstrap data without Cloudflare Pages', async () => {
    const fetchApi = createLocalDevApiFetch()

    const response = await fetchApi(new Request('http://localhost:8788/api/bootstrap'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toMatchObject({
      projects: expect.arrayContaining([expect.objectContaining({ id: 'search' })]),
    })
  })

  it('serves shared contract app state without Cloudflare Pages', async () => {
    const fetchApi = createLocalDevApiFetch()

    const response = await fetchApi(new Request('http://localhost:8788/api/app-state'))

    expect(response.status).toBe(200)
    expect(appStateResponseSchema.parse(await response.json()).projects.length).toBeGreaterThan(0)
  })
})
