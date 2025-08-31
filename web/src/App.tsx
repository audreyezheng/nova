import { useEffect, useState } from 'react'
import './App.css'
import { useAuth } from './AuthContext'
import Auth from './Auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Sparkles, Send, Calendar, Clock, CheckCircle, Circle, AlertCircle, User, LogOut, Plus } from 'lucide-react'

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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background border-b sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Nova</h1>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                  Beta
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm bg-primary/10">
                        {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium">{user?.first_name || user?.username}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Upcoming Tasks */}
          <Card className="lg:col-span-1 h-fit max-h-[calc(100vh-200px)] overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 overflow-y-auto">
              {upcoming.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming tasks yet.</p>
                  <p className="text-xs">Create your first plan below!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((task) => (
                    <div key={task.id} className="group p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="font-medium text-sm leading-tight">{task.title}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {task.due_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.due_at).toLocaleDateString()}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority}
                            </span>
                            {task.estimated_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimated_minutes}m
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {task.status === 'done' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : task.status === 'in_progress' ? (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Chat & Planning */}
          <Card className="lg:col-span-2 flex flex-col h-[calc(100vh-200px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Planning Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0 pb-4">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Welcome to Nova</h3>
                    <p className="text-sm max-w-md mx-auto">
                      Describe what you need to accomplish and I'll help you break it down into actionable tasks with smart scheduling.
                    </p>
                  </div>
                )}
                
                {messages.map((message, idx) => (
                  <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule Button */}
              {lastSuggested && (
                <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Ready to schedule these tasks on your calendar?
                    </div>
                    <Button
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
                      size="sm"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Tasks
                    </Button>
                  </div>
                </div>
              )}

              {/* Schedule Preview */}
              {schedule && (
                <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Weekly Schedule
                  </h3>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {schedule.week.map((day) => (
                      <div key={day.date} className="bg-background rounded-md p-2 border">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        {day.items.length === 0 ? (
                          <div className="text-xs text-muted-foreground/60">—</div>
                        ) : (
                          <div className="space-y-1">
                            {day.items.map((item, idx) => (
                              <div key={idx} className="text-xs p-1 bg-primary/10 rounded text-primary">
                                <div className="font-medium truncate">{item.title}</div>
                                <div className="text-muted-foreground">
                                  {new Date(item.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–
                                  {new Date(item.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {schedule.quick_wins.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Quick Wins (flexible timing)</div>
                      <div className="flex flex-wrap gap-2">
                        {schedule.quick_wins.map((win, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-accent rounded-full border">
                            {win.title} · {win.estimated_minutes}m
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={onSubmit} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Tell me what you need to accomplish..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default App
