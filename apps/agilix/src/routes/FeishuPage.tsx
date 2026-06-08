import { useState } from 'react'
import { formatFeishuCommand } from '../domain/feishu'
import type { FeishuNotificationTrigger, FeishuQueryCommand, SeedData } from '../domain/types'

interface Reply {
  title: string
  lines: string[]
}

export function FeishuPage({
  data,
  onNotify,
  onQuery,
}: {
  data: SeedData
  onNotify: (trigger: FeishuNotificationTrigger) => Promise<void>
  onQuery: (command: FeishuQueryCommand) => Promise<Reply>
}) {
  const [reply, setReply] = useState<Reply | null>(null)

  async function runQuery(command: FeishuQueryCommand) {
    setReply(await onQuery(command))
  }

  return (
    <main>
      <h1>飞书</h1>
      <section>
        <h2>群</h2>
        {data.feishu.groups.map((group) => (
          <p key={group}>{group}</p>
        ))}
      </section>
      <section>
        <h2>通知</h2>
        {data.feishu.notificationTriggers.map((trigger) => (
          <article key={trigger}>
            <span>{trigger}</span>
            <button onClick={() => void onNotify(trigger)}>记录 {trigger}</button>
          </article>
        ))}
      </section>
      <section>
        <h2>查询命令</h2>
        {data.feishu.queryCommands.map((command) => {
          const formattedCommand = formatFeishuCommand(command)

          return (
            <article key={formattedCommand}>
              <code>{formattedCommand}</code>
              <button onClick={() => void runQuery(command)}>查询 {formattedCommand}</button>
            </article>
          )
        })}
      </section>
      {reply ? (
        <section>
          <h2>{reply.title}</h2>
          {reply.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ) : null}
    </main>
  )
}
