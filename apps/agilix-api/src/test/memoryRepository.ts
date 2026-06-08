import type { Project, SeedData } from '@agilix/app/domain/types'

export function createMemoryRepository(data: SeedData): { listProjects(): Promise<Project[]> } {
  const projects = data.projects.map((project) => ({ ...project }))

  return {
    async listProjects() {
      return projects.map((project) => ({ ...project }))
    },
  }
}
