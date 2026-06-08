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
  const group = data.feishu.groups[0]
  if (!group) throw new Error('Feishu group not found')

  async function runQuery(command: FeishuQueryCommand) {
    setReply(await onQuery(command))
  }

  return (
    <main className="fs-body">
      <header className="top">
        <div>
          <p className="kicker">Feishu Bot</p>
          <h1>飞书通知与查询</h1>
          <p>一个团队群即可，AgiliX 负责工作台，飞书群里只做通知和查询。</p>
        </div>
        <div className="actions">
          <button className="ghost" onClick={() => setReply({ title: '群配置已同步', lines: data.feishu.groups })}>
            同步群配置
          </button>
          <button className="primary" onClick={() => setReply({ title: '机器人控制台未配置', lines: ['当前数据协议没有提供机器人控制台地址'] })}>
            打开机器人控制台
          </button>
        </div>
      </header>

      <section className="summary">
        <article>
          <span>绑定群</span>
          <strong>{data.feishu.groups.length}</strong>
          <em>{group}</em>
        </article>
        <article>
          <span>通知类型</span>
          <strong>{data.feishu.notificationTriggers.length}</strong>
          <em>低噪音触发</em>
        </article>
        <article>
          <span>查询命令</span>
          <strong>{data.feishu.queryCommands.length}</strong>
          <em>按需拉取</em>
        </article>
        <article>
          <span>产品边界</span>
          <strong>通知</strong>
          <em>不做群内审批</em>
        </article>
      </section>

      <section className="fs-grid">
        <article className="fs-card">
          <div className="panel-h">
            <div>
              <span>群</span>
              <h2>单群通知 · {group}</h2>
            </div>
            <span className="tag ok">已连接</span>
          </div>
          {data.feishu.groups.map((group) => (
            <p key={group} className="fs-group">
              {group}
            </p>
          ))}
          <p className="muted">群里只做通知和查询</p>
          <p className="muted">AgiliX 内查看全量状态，飞书只承接提醒、摘要和即时查询。</p>
        </article>

        <article className="fs-card">
          <div className="panel-h">
            <div>
              <span>通知记录</span>
              <h2>自动推送</h2>
            </div>
            <span className="tag">最近 24h</span>
          </div>
          <div className="fs-command-grid">
            {data.feishu.notificationTriggers.map((trigger) => (
              <div key={trigger} className="fs-command">
                <span>{trigger}</span>
                <button onClick={() => void onNotify(trigger)}>记录 {trigger}</button>
              </div>
            ))}
          </div>
        </article>

        <article className="fs-card wide">
          <div className="panel-h">
            <div>
              <span>查询命令</span>
              <h2>群内按需查询</h2>
            </div>
            <span className="tag">只读</span>
          </div>
          <div className="fs-command-grid">
            {data.feishu.queryCommands.map((command) => {
              const formattedCommand = formatFeishuCommand(command)

              return (
                <div key={formattedCommand} className="fs-command">
                  <code>{formattedCommand}</code>
                  <button onClick={() => void runQuery(command)}>查询 {formattedCommand}</button>
                </div>
              )
            })}
          </div>
        </article>
      </section>
      {reply ? (
        <section className="fs-reply">
          <h2>{reply.title}</h2>
          {reply.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ) : null}
    </main>
  )
}
