import { createApp } from '../../../agilix-api/src/app'
import { createDbClient } from '../../../agilix-api/src/db/client'
import { createDrizzleRepository } from '../../../agilix-api/src/drizzleRepository'
import { handleAgiliXPagesRequest } from '../../../agilix-api/src/pages'

interface AgiliXPagesEnv {
  DB: D1Database
}

function requireD1Database(env: Partial<AgiliXPagesEnv>): D1Database {
  if (!env.DB) throw new Error('AgiliX Pages Function requires the DB D1 binding')
  return env.DB
}

export const onRequest: PagesFunction<AgiliXPagesEnv> = async (context) => {
  const repository = createDrizzleRepository(createDbClient(requireD1Database(context.env)))
  return handleAgiliXPagesRequest(context.request, repository)
}

export { createApp }
