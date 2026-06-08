import type { Project } from '@agilix/app/domain/types'
import { Hono } from 'hono'

interface ProjectRepository {
  listProjects(): Promise<Project[]>
}

export function createApp(repository: ProjectRepository) {
  const app = new Hono()

  app.get('/api/projects', async (context) => {
    return context.json(await repository.listProjects())
  })

  return app
}
