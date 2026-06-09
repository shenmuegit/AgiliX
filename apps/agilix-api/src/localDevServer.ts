import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { seedData } from '@agilix/app/domain/fixtures'
import { createApp } from './app'
import { createMemoryRepository } from './test/memoryRepository'

const defaultPort = 8788
const defaultHost = '127.0.0.1'

export function createLocalDevApiFetch() {
  const app = createApp(createMemoryRepository(seedData))
  return (request: Request) => app.fetch(request)
}

export function createLocalDevApiServer() {
  const fetchApi = createLocalDevApiFetch()

  return createServer(async (incoming, outgoing) => {
    try {
      const request = nodeRequestToWebRequest(incoming)
      const response = await fetchApi(request)
      await writeWebResponse(outgoing, response)
    } catch (error) {
      outgoing.statusCode = 500
      outgoing.setHeader('content-type', 'application/json')
      outgoing.end(JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown error' }))
    }
  })
}

function nodeRequestToWebRequest(incoming: IncomingMessage): Request {
  const host = incoming.headers.host ?? `${defaultHost}:${defaultPort}`
  const url = `http://${host}${incoming.url ?? '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else if (value !== undefined) {
      headers.set(key, value)
    }
  }

  if (incoming.method === 'GET' || incoming.method === 'HEAD') {
    return new Request(url, { headers, method: incoming.method })
  }

  return new Request(url, {
    body: Readable.toWeb(incoming) as ReadableStream,
    duplex: 'half',
    headers,
    method: incoming.method,
  } as RequestInit & { duplex: 'half' })
}

async function writeWebResponse(outgoing: ServerResponse, response: Response) {
  outgoing.statusCode = response.status
  response.headers.forEach((value, key) => outgoing.setHeader(key, value))

  if (!response.body) {
    outgoing.end()
    return
  }

  for await (const chunk of response.body) {
    outgoing.write(chunk)
  }
  outgoing.end()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.AGILIX_API_PORT ?? defaultPort)
  const host = process.env.AGILIX_API_HOST ?? defaultHost
  createLocalDevApiServer().listen(port, host, () => {
    console.log(`AgiliX API listening on http://${host}:${port}`)
  })
}
