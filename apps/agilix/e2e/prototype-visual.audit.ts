import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync, inflateSync } from 'node:zlib'
import { test, type Page } from '@playwright/test'
import { seedData } from '../src/domain/fixtures'

const auditDir = resolve(process.cwd(), 'test-results/prototype-visual')
const referenceDir = resolve(auditDir, 'single-file-reference')
const singleFilePrototypePath = resolve(process.cwd(), '..', '..', '飞书敏捷项目管理 · 编辑台账(单文件).html')
const maxAllowedDiffRatio = 0.01

type ScreenAudit = {
  appPath: string
  height: number
  navLabel?: string
  prototypeId: string
  width: number
}

const screens: Record<string, ScreenAudit> = {
  projects: { prototypeId: 'projects', appPath: '/screen-projects.html', width: 1440, height: 860 },
  docs: { prototypeId: 'docs', appPath: '/screen-docs.html', width: 1600, height: 900 },
  kanban: { prototypeId: 'kanban', appPath: '/screen-board.html', width: 1440, height: 860 },
  ledger: { prototypeId: 'ledger', appPath: '/screen-issues.html', width: 1440, height: 860 },
  stats: { prototypeId: 'stats', appPath: '/screen-stats.html', width: 1440, height: 860 },
  standup: { prototypeId: 'standup', appPath: '/screen-standup.html', width: 1440, height: 860 },
  gantt: { prototypeId: 'gantt', appPath: '/screen-gantt.html', width: 1440, height: 860 },
  workload: { prototypeId: 'workload', appPath: '/', navLabel: '成员负载', width: 1440, height: 860 },
  density: { prototypeId: 'density', appPath: '/screen-density.html', width: 1000, height: 600 },
  boardInk: { prototypeId: 'kanbanInk', appPath: '/screen-board-ink.html', width: 1440, height: 860 },
  boardKraft: { prototypeId: 'kanbanKraft', appPath: '/screen-board-kraft.html', width: 1440, height: 860 },
  topnav: { prototypeId: 'topnav', appPath: '/screen-topnav.html', width: 1440, height: 740 },
  boardCollapsed: { prototypeId: 'kanbanCollapsed', appPath: '/screen-board-collapsed.html', width: 1440, height: 860 },
  boardSharp: { prototypeId: 'kanbanSharp', appPath: '/screen-board-sharp.html', width: 1440, height: 860 },
  boardSoft: { prototypeId: 'kanbanSoft', appPath: '/screen-board-soft.html', width: 1440, height: 860 },
  flow: { prototypeId: 'flow', appPath: '/screen-flow.html', width: 1320, height: 680 },
}

async function mockAgiliXApi(page: Page) {
  await page.route('**/api/bootstrap', async (route) => {
    await route.fulfill({ json: seedData })
  })
}

test('audits implementation screenshots against prototype screenshots', async ({ page }) => {
  mkdirSync(auditDir, { recursive: true })
  const references = extractSingleFilePrototype()

  const results: Array<{ diffRatio: number; name: string; status: 'pass' | 'fail' }> = []

  for (const [name, screen] of Object.entries(screens)) {
    await page.setViewportSize({ width: screen.width, height: screen.height })

    await page.goto(`file://${references[screen.prototypeId]}`)
    await page.locator('body').waitFor({ state: 'visible' })
    const prototype = await page.screenshot({ fullPage: false })
    writeFileSync(resolve(auditDir, `${name}-prototype.png`), prototype)

    await mockAgiliXApi(page)
    await page.goto(screen.appPath, { waitUntil: 'domcontentloaded' })
    if (screen.navLabel) {
      await page.getByRole('link', { name: screen.navLabel }).click()
      await page.getByRole('heading', { name: screen.navLabel }).waitFor()
    }
    await page.locator('body').waitFor({ state: 'visible' })
    const implementation = await page.screenshot({ fullPage: false })
    writeFileSync(resolve(auditDir, `${name}-implementation.png`), implementation)

    const diffRatio = comparePngRatio(prototype, implementation)
    results.push({
      diffRatio,
      name,
      status: diffRatio <= maxAllowedDiffRatio ? 'pass' : 'fail',
    })
  }

  writeFileSync(resolve(auditDir, 'summary.json'), JSON.stringify(results, null, 2))

  const failures = results.filter((result) => result.status === 'fail')
  if (failures.length > 0) {
    throw new Error(
      failures
        .map((result) => `${result.name}: ${(result.diffRatio * 100).toFixed(2)}%`)
        .join(', '),
    )
  }
})

function extractSingleFilePrototype(): Record<string, string> {
  const source = readFileSync(singleFilePrototypePath, 'utf8')
  const manifestMatch = source.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)
  const resourcesMatch = source.match(/<script type="__bundler\/ext_resources">\s*([\s\S]*?)\s*<\/script>/)
  if (!manifestMatch || !resourcesMatch) throw new Error('Single-file prototype bundler data not found')

  const manifest = JSON.parse(manifestMatch[1]) as Record<string, { compressed?: boolean; data: string; mime: string }>
  const resources = JSON.parse(resourcesMatch[1]) as Array<{ id: string; uuid: string }>
  mkdirSync(referenceDir, { recursive: true })

  const paths: Record<string, string> = {}
  for (const [uuid, entry] of Object.entries(manifest)) {
    const filePath = resolve(referenceDir, referenceFileName(uuid, entry.mime))
    const compressed = Buffer.from(entry.data, 'base64')
    const content = entry.compressed ? gunzipSync(compressed) : compressed
    writeFileSync(filePath, content)
  }

  for (const resource of resources) {
    const entry = manifest[resource.uuid]
    if (!entry) throw new Error(`Prototype resource not found: ${resource.id}`)
    paths[resource.id] = resolve(referenceDir, referenceFileName(resource.uuid, entry.mime))
  }

  return paths
}

function referenceFileName(uuid: string, mime: string): string {
  return mime === 'text/html' ? `${uuid}.html` : uuid
}

function comparePngRatio(expectedPng: Buffer, actualPng: Buffer): number {
  const expected = decodePng(expectedPng)
  const actual = decodePng(actualPng)
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error(
      `Screenshot dimensions differ: ${expected.width}x${expected.height} vs ${actual.width}x${actual.height}`,
    )
  }

  let diffPixels = 0
  const pixelCount = expected.width * expected.height
  for (let index = 0; index < expected.pixels.length; index += 4) {
    const channelDelta =
      Math.abs(expected.pixels[index] - actual.pixels[index]) +
      Math.abs(expected.pixels[index + 1] - actual.pixels[index + 1]) +
      Math.abs(expected.pixels[index + 2] - actual.pixels[index + 2]) +
      Math.abs(expected.pixels[index + 3] - actual.pixels[index + 3])

    if (channelDelta > 12) diffPixels += 1
  }

  return diffPixels / pixelCount
}

function decodePng(buffer: Buffer): { height: number; pixels: Uint8Array; width: number } {
  const signature = buffer.subarray(0, 8)
  if (signature.toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG signature')

  let offset = 8
  let width = 0
  let height = 0
  let colorType = 0
  const idatChunks: Buffer[] = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      const bitDepth = data[8]
      colorType = data[9]
      if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth: ${bitDepth}`)
      if (colorType !== 2 && colorType !== 6) throw new Error(`Unsupported PNG color type: ${colorType}`)
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  const channels = colorType === 6 ? 4 : 3
  const rowLength = width * channels
  const inflated = inflateSync(Buffer.concat(idatChunks))
  const rgba = new Uint8Array(width * height * 4)
  const previous = new Uint8Array(rowLength)
  const current = new Uint8Array(rowLength)
  let readOffset = 0

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[readOffset]
    readOffset += 1
    current.set(inflated.subarray(readOffset, readOffset + rowLength))
    readOffset += rowLength
    unfilterRow(current, previous, channels, filter)

    for (let x = 0; x < width; x += 1) {
      const source = x * channels
      const target = (y * width + x) * 4
      rgba[target] = current[source]
      rgba[target + 1] = current[source + 1]
      rgba[target + 2] = current[source + 2]
      rgba[target + 3] = channels === 4 ? current[source + 3] : 255
    }

    previous.set(current)
  }

  return { height, pixels: rgba, width }
}

function unfilterRow(row: Uint8Array, previous: Uint8Array, bytesPerPixel: number, filter: number) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0
    const up = previous[index] ?? 0
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0

    if (filter === 1) row[index] = (row[index] + left) & 0xff
    else if (filter === 2) row[index] = (row[index] + up) & 0xff
    else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff
    else if (filter === 4) row[index] = (row[index] + paeth(left, up, upLeft)) & 0xff
    else if (filter !== 0) throw new Error(`Unsupported PNG filter: ${filter}`)
  }
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft
  const leftDelta = Math.abs(estimate - left)
  const upDelta = Math.abs(estimate - up)
  const upLeftDelta = Math.abs(estimate - upLeft)
  if (leftDelta <= upDelta && leftDelta <= upLeftDelta) return left
  if (upDelta <= upLeftDelta) return up
  return upLeft
}
