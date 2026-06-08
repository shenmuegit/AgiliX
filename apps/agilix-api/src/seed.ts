import { seedData } from '@agilix/app/domain/fixtures'
import type { AgiliXRepository } from './repository'

export async function seedAgiliX(repository: AgiliXRepository) {
  await repository.seed(seedData)
}
