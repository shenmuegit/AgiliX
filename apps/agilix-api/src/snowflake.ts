export type SnowflakeOptions = {
  epochMs: number
  workerId: number
}

export function createSnowflakeIdGenerator(options: SnowflakeOptions) {
  let lastTimestamp = 0
  let sequence = 0
  const worker = BigInt(options.workerId & 0x3ff)
  const epoch = BigInt(options.epochMs)

  return () => {
    const timestamp = Math.max(Date.now(), lastTimestamp)

    if (timestamp === lastTimestamp) {
      sequence = (sequence + 1) & 0xfff
    } else {
      sequence = 0
      lastTimestamp = timestamp
    }

    const id = ((BigInt(timestamp) - epoch) << 22n) | (worker << 12n) | BigInt(sequence)
    return id.toString()
  }
}
