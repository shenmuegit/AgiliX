import { createApp } from './app'
import type { AgiliXRepository } from './repository'
import { seedAgiliX } from './seed'

export async function handleAgiliXPagesRequest(request: Request, repository: AgiliXRepository): Promise<Response> {
  if ((await repository.listProjects()).length === 0) await seedAgiliX(repository)
  return createApp(repository).request(request)
}
