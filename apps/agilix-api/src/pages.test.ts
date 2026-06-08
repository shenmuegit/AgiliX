import { seedData } from '@agilix/app/domain/fixtures'
import { describe, expect, it } from 'vitest'
import { handleAgiliXPagesRequest } from './pages'
import { createMemoryRepository } from './test/memoryRepository'

describe('AgiliX Pages adapter', () => {
  it('seeds an empty repository before serving the Pages API request', async () => {
    const repository = createMemoryRepository({ ...seedData, projects: [], members: [], iterations: [], issues: [], docs: [], standups: [], milestones: [] })

    const response = await handleAgiliXPagesRequest(new Request('https://agilix.example.com/api/bootstrap'), repository)
    const data = (await response.json()) as typeof seedData

    expect(response.status).toBe(200)
    expect(data.projects.map((project) => project.id)).toEqual(['search', 'data', 'api', 'mobile'])
    expect((await repository.listProjects()).map((project) => project.id)).toEqual(['search', 'data', 'api', 'mobile'])
  })

  it('uses existing repository data without reseeding over it', async () => {
    const repository = createMemoryRepository(seedData)

    expect((await handleAgiliXPagesRequest(new Request('https://agilix.example.com/api/bootstrap'), repository)).status).toBe(200)
    expect((await handleAgiliXPagesRequest(new Request('https://agilix.example.com/api/bootstrap'), repository)).status).toBe(200)
  })
})
