import { seedData } from '@agilix/app/domain/fixtures'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createMemoryRepository } from './test/memoryRepository'

describe('AgiliX API app', () => {
  it('serves project data through the API package', async () => {
    const app = createApp(createMemoryRepository(seedData))

    const response = await app.request('/api/projects')
    const body = (await response.json()) as Array<{ name: string }>

    expect(response.status).toBe(200)
    expect(body.map((project) => project.name)).toContain('搜索平台')
  })
})
