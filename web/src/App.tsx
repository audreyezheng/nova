import { useEffect, useState } from 'react'
import './App.css'
import { useAuth } from './AuthContext'
import Auth from './Auth'

type Message = { role: 'user' | 'system'; content: string }
type Suggestion = {
  title: string
  due_at?: string | null
  notes?: string | null
  priority?: 'low' | 'medium' | 'high'
  estimated_minutes?: number | null
  status?: 'todo' | 'in_progress' | 'done'
}

type Task = {
  id: number
  plan: number
  title: string
  status: 'todo' | 'in_progress' | 'done'
  due_at: string | null
  notes: string | null
  priority: 'low' | 'medium' | 'high'
  estimated_minutes: number | null
  created_at: string
  updated_at: string
}

async function generateTasks(message: string): Promise<{ plan_title: string; tasks: Suggestion[] }> {
  const res = await fetch('/api/planner/generate/llm/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) {
    throw new Error('Failed to generate tasks')
  }
  const data = await res.json()
  return { plan_title: data.plan_title, tasks: data.tasks ?? [] }
}

async function createPlanWithTasks(title: string, tasks: Suggestion[], token: string): Promise<number> {
  const planRes = await fetch('/api/planner/plans/', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`,
    },
    body: JSON.stringify({ title }),
  })
  if (!planRes.ok) throw new Error('Failed to create plan')
  const plan = await planRes.json()
  const planId = plan.id as number
  // Fire-and-forget task creations sequentially to keep it simple now
  for (const t of tasks) {
    await fetch('/api/planner/tasks/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({
        plan: planId,
        title: t.title,
        status: t.status ?? 'todo',
        priority: t.priority ?? 'medium',
        estimated_minutes: t.estimated_minutes ?? null,
        due_at: t.due_at ?? null,
        notes: t.notes ?? null,
      }),
    })
  }
  return planId
}

async function fetchUpcomingTasks(token: string): Promise<Task[]> {
  const res = await fetch('/api/planner/tasks/upcoming/', {
    headers: {
      'Authorization': `Token ${token}`,
    },
  })
  if (!res.ok) return []
  return res.json()
}

type ScheduleItem = { title: string; start: string; end: string; priority: string; estimated_minutes: number }
type ScheduleDay = { date: string; items: ScheduleItem[] }
type SchedulePreview = { week: ScheduleDay[]; quick_wins: { title: string; estimated_minutes: number; priority: string }[] }

async function fetchSchedulePreview(tasks: Suggestion[]): Promise<SchedulePreview> {
  const res = await fetch('/api/planner/schedule/preview/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  })
  if (!res.ok) throw new Error('Failed to get schedule preview')
  return res.json()
}

function App() {
  const { isAuthenticated, user, logout, token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [upcoming, setUpcoming] = useState<Task[]>([])
  const [lastSuggested, setLastSuggested] = useState<Suggestion[] | null>(null)
  const [schedule, setSchedule] = useState<SchedulePreview | null>(null)

  // Show auth screen for unauthenticated users
  if (!isAuthenticated) {
    return <Auth />
  }

  const refreshUpcoming = async () => {
    if (token) {
      const tasks = await fetchUpcomingTasks(token)
      setUpcoming(tasks)
    }
  }

  useEffect(() => {
    refreshUpcoming()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    const nextMessages: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)
    try {
      const { plan_title, tasks } = await generateTasks(trimmed)
      const bulletList = tasks
        .map((t) => `• ${t.title}${t.due_at ? ` (due ${t.due_at})` : ''}${t.priority ? ` · ${t.priority}` : ''}${t.estimated_minutes ? ` · ~${t.estimated_minutes}m` : ''}`)
        .join('\n')
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `Here are some tasks you might add:\n${bulletList}` },
      ])
      // Auto-create plan and tasks with suggested metadata
      if (token) {
        await createPlanWithTasks(plan_title, tasks, token)
        setMessages((prev) => [
          ...prev,
          { role: 'system', content: `Created plan "${plan_title}" with ${tasks.length} tasks.` },
        ])
      }
      await refreshUpcoming()
      setLastSuggested(tasks)
      setSchedule(null)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: 'Sorry, something went wrong generating tasks.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Nova</h1>
              <span className="ml-2 text-sm text-indigo-600 font-medium">Beta</span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-gray-700">
                {user?.first_name || user?.username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Left: Upcoming */}
          <div className="md:col-span-1 border rounded-xl p-4 bg-white shadow-sm overflow-auto max-h-[80vh]">
        <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="text-sm text-gray-500">No upcoming tasks yet.</div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-start justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-gray-500">
                    {t.due_at ? new Date(t.due_at).toLocaleString() : 'No due date'} · {t.priority}
                    {t.estimated_minutes ? ` · ~${t.estimated_minutes}m` : ''}
                  </div>
                </div>
                <span className="text-xs uppercase tracking-wide text-gray-400">{t.status.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

          {/* Right: Chat */}
          <div className="col-span-2 border rounded-xl p-4 bg-white shadow-sm flex flex-col max-h-[80vh]">
        <div className="flex-1 overflow-auto">
          <div className="messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`message ${m.role}`}>
                {m.content.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            ))}
            {isLoading && <div className="message system">Thinking…</div>}
          </div>

          {lastSuggested && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">Ready to place tasks on your week?</div>
              <button
                className="px-3 py-2 rounded-md bg-black text-white text-sm"
                onClick={async () => {
                  if (!lastSuggested) return
                  try {
                    setIsLoading(true)
                    const prev = await fetchSchedulePreview(lastSuggested)
                    setSchedule(prev)
                  } catch {
                    setMessages((prev) => [...prev, { role: 'system', content: 'Failed to build schedule preview.' }])
                  } finally {
                    setIsLoading(false)
                  }
                }}
                disabled={isLoading}
              >
                Schedule it for me
              </button>
            </div>
          )}

          {schedule && (
            <div className="mt-4">
              <h3 className="text-base font-semibold mb-2">Scheduling summary</h3>
              <div className="grid grid-cols-7 gap-2">
                {schedule.week.map((d) => (
                  <div key={d.date} className="border rounded-md p-2">
                    <div className="text-xs text-gray-500 mb-1">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    {d.items.length === 0 ? (
                      <div className="text-xs text-gray-400">—</div>
                    ) : (
                      <ul className="space-y-1">
                        {d.items.map((it, idx) => (
                          <li key={idx} className="text-xs">
                            <span className="font-medium">{it.title}</span>
                            <span className="text-gray-500"> · {new Date(it.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–{new Date(it.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-gray-500"> · {it.estimated_minutes}m</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              {schedule.quick_wins.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">Quick Wins (not scheduled)</div>
                  <div className="flex flex-wrap gap-2">
                    {schedule.quick_wins.map((q, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full border">{q.title} · {q.estimated_minutes}m</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form className="input-row mt-2" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Tell me what's coming up…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>Send</button>
        </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
