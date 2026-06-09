import { describe, expect, it } from 'vitest'
import { createSnowflakeIdGenerator } from './snowflake'

describe('snowflake id generator', () => {
  it('generates monotonic numeric string ids on the backend', () => {
    const nextId = createSnowflakeIdGenerator({ epochMs: 1700000000000, workerId: 1 })

    const first = nextId()
    const second = nextId()

    expect(first).toMatch(/^\d+$/)
    expect(second).toMatch(/^\d+$/)
    expect(BigInt(second)).toBeGreaterThan(BigInt(first))
  })
})
