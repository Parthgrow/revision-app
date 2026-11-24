import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TrkError } from '../tracker/errors'
import type { TrackerService } from '../tracker/service'
import type { Agent, Task, TaskStatus, TrackerEvent } from '../tracker/types'

// AgentTracker tools: Claude registers its chat as an agent, then reports what
// it starts, finishes, leaves pending or gets blocked on. Same service as the
// ContextMagic web pages. Deleting and renaming agents stay web-only.

type Ctx = { userId: string; service: TrackerService }

// Sent to Claude as the server's instructions when the connector loads.
export const TRACKER_INSTRUCTIONS = `AgentTracker keeps a timeline of what each chat is working on.
- At the start of a chat, before other work, call start_agent once with a short name for the chat (and repo/branch if you know them). Keep the returned agent id for the whole chat.
- When you begin a piece of work, call start_task with a short, outcome-shaped title ("Add tracker service", not "Working").
- When it's finished, call complete_task with a one-line summary.
- If you can't continue, call block_task with the reason. If you stop before finishing, call mark_pending.
- If you lose your agent id, or the user asks to continue earlier work, call list_agents and reuse the matching id instead of starting a new agent.`

const agentArg = z.string().min(1).describe('Your agent id from start_agent, e.g. "ag_7Kp2xQ9mZa".')
const taskArg = z.string().min(1).describe('Task id ("tk_…") or its title (case-insensitive).')

const iso = (ms: number) => new Date(ms).toISOString()

function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }
}

function error(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

async function run<T>(fn: () => Promise<T>) {
  try {
    return json(await fn())
  } catch (err) {
    if (err instanceof TrkError) return error(err.message)
    throw err
  }
}

const taskOut = (t: Task) => ({
  id: t.id,
  title: t.title,
  status: t.status,
  ...(t.note && { note: t.note }),
  started: iso(t.createdAt),
  updated: iso(t.updatedAt),
})

const agentOut = (a: Agent) => ({
  id: a.id,
  name: a.name,
  ...(a.repo && { repo: a.repo }),
  ...(a.branch && { branch: a.branch }),
  openTasks: a.openTasks,
  blockedTasks: a.blockedTasks,
  lastSeen: iso(a.lastSeenAt),
})

const eventOut = (e: TrackerEvent) => ({ id: e.id, type: e.type, at: iso(e.at) })

export function registerTrackerTools(server: McpServer, { userId, service }: Ctx) {
  server.registerTool(
    'start_agent',
    {
      description:
        'Register this chat with AgentTracker. Call once at the start of a chat and keep the returned agent id; every other tracker tool needs it. To continue an existing agent instead, use list_agents.',
      inputSchema: {
        name: z.string().min(1).max(200).describe('Short name for what this chat is about, e.g. "Monorepo split".'),
        repo: z.string().optional().describe('Repository name, if any, e.g. "revision-app".'),
        branch: z.string().optional().describe('Git branch, if any.'),
      },
    },
    async ({ name, repo, branch }) =>
      run(async () => {
        const a = await service.startAgent(userId, { name, repo, branch })
        return {
          agent: agentOut(a),
          next: `Your agent id is ${a.id}. Pass it as "agent" to start_task, complete_task, block_task, mark_pending, resume_task, abandon_task, log and my_tasks.`,
        }
      })
  )

  server.registerTool(
    'list_agents',
    {
      description:
        'Find recent agents (up to 10), each with its open tasks. Use it to recover your agent id, or to continue earlier work in a new chat by reusing that agent id.',
      inputSchema: {
        query: z.string().optional().describe('Matches the agent name, repo or branch (case-insensitive).'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query }) =>
      run(async () => {
        const found = await service.findAgents(userId, query)
        return {
          count: found.length,
          agents: found.map((a) => ({ ...agentOut(a), open: a.open.map(taskOut) })),
        }
      })
  )

  server.registerTool(
    'start_task',
    {
      description:
        'Start a task: call when you begin a distinct piece of work. Use a short, outcome-shaped title, e.g. "Add tracker service".',
      inputSchema: { agent: agentArg, title: z.string().min(1).max(500).describe('What this task will achieve.') },
    },
    async ({ agent, title }) => run(async () => ({ task: taskOut(await service.startTask(userId, agent, title)) }))
  )

  const move = (
    name: string,
    to: TaskStatus,
    description: string,
    noteField?: { key: 'summary' | 'reason' | 'note'; describe: string; required?: boolean }
  ) => {
    const shape: Record<string, z.ZodTypeAny> = { agent: agentArg, task: taskArg }
    if (noteField) {
      const field = z.string().describe(noteField.describe)
      shape[noteField.key] = noteField.required ? field.min(1) : field.optional()
    }
    server.registerTool(name, { description, inputSchema: shape }, async (args: Record<string, unknown>) =>
      run(async () => {
        const note = noteField ? args[noteField.key] : undefined
        return { task: taskOut(await service.transition(userId, String(args.agent), args.task, to, note)) }
      })
    )
  }

  move('complete_task', 'done', 'Mark a task done when its work is finished.', {
    key: 'summary',
    describe: 'One line on what was done, e.g. "Service + 36 tests, pushed to feature/agent-tracker".',
  })
  move('block_task', 'blocked', "Mark a task blocked when you can't continue without something (access, a decision, a fix elsewhere).", {
    key: 'reason',
    describe: 'What is blocking it, e.g. "Needs the Vercel project Root Directory changed".',
    required: true,
  })
  move('mark_pending', 'pending', 'Leave a task open for later when you stop before finishing it.', {
    key: 'note',
    describe: "Where it stands, or what's left.",
  })
  move('resume_task', 'in_progress', 'Pick a pending or blocked task back up.')
  move('abandon_task', 'abandoned', "Drop a task that won't be done.", {
    key: 'reason',
    describe: 'Why it was dropped.',
  })

  server.registerTool(
    'log',
    {
      description: 'Add a note to this agent\'s timeline, e.g. a decision or finding worth remembering.',
      inputSchema: {
        agent: agentArg,
        message: z.string().min(1).describe('The note.'),
        task: taskArg.optional(),
      },
    },
    async ({ agent, message, task }) =>
      run(async () => ({ event: eventOut(await service.logNote(userId, agent, message, task)) }))
  )

  server.registerTool(
    'my_tasks',
    {
      description: "List this agent's tasks, newest first. Open tasks only unless include_closed is true.",
      inputSchema: {
        agent: agentArg,
        include_closed: z.boolean().optional().describe('Also list done and abandoned tasks.'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ agent, include_closed }) =>
      run(async () => {
        const list = await service.listTasks(userId, agent, { includeClosed: !!include_closed })
        return { count: list.length, tasks: list.map(taskOut) }
      })
  )
}
