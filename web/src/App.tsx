
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, CheckCircle2, Trash2, Loader2, Send, MessageCircle, ListChecks, ChevronRight, Pencil, X, Save, Wand2, LogOut } from "lucide-react";
import * as chrono from "chrono-node";
import { LoginForm } from "./components/login-form";
import { API_ENDPOINTS } from "./config";

// ---------- Types ----------
export type Task = {
  id: number;
  plan: number;
  title: string;
  notes?: string | null;
  status: "pending" | "in_progress" | "completed";
  due_at?: string | null;
  priority?: "low" | "medium" | "high";
  estimated_minutes?: number | null;
  created_at?: string;
  updated_at?: string;
};

type TaskPatch = Partial<
  Pick<Task, "title" | "notes" | "due_at" | "status" | "priority" | "estimated_minutes" | "plan">
>;

export type SuggestedTaskDTO = {
  title: string;
  notes?: string | null;
  due_at?: string | null;
  priority?: "low" | "medium" | "high";
  estimated_minutes?: number | null;
  status?: "pending" | "in_progress" | "completed";
};

export type Plan = {
  id: number;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SuggestResponse = {
  plan_title?: string;
  tasks: SuggestedTaskDTO[];
};

// ---------- API Helper ----------
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json();
}

// ---------- Date helpers ----------
function toISO(d: Date | null | undefined) {
  return d ? new Date(d).toISOString() : undefined;
}

function parseNaturalDate(input: string, ref: Date = new Date()): string | undefined {
  if (!input.trim()) return undefined;
  // Try chrono ("next fri", "tomorrow 3pm")
  const parsed = chrono.parseDate(input, ref);
  if (parsed) return toISO(parsed);
  // Fallback: Date.parse
  const d = new Date(input);
  if (!isNaN(d.getTime())) return toISO(d);
  return undefined;
}

function formatDateLabelISO(dueAt?: string | null): string {
  if (!dueAt) return "No date";
  const d = new Date(dueAt);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ---------- Toasts ----------
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  function show(m: string, ms = 2400) {
    setMsg(m);
    setTimeout(() => setMsg(null), ms);
  }
  return { msg, show };
}

// ---------- Main App ----------
export default function NovaUI() {
  const [tab, setTab] = useState<"chat" | "tasks">("chat");
  const { msg, show } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setToken(data.token);
        setIsAuthenticated(true);
        setMessage("");
      } else {
        setMessage(`❌ Login failed: ${data.non_field_errors?.[0] || "Unknown error"}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (token) {
      fetch(API_ENDPOINTS.logout, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      }).catch(() => {
        // ignore logout errors
      });
    }
    setIsAuthenticated(false);
    setUser(null);
    setToken("");
    setTab("chat");
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 flex items-center justify-center p-6 md:p-10">
        <LoginForm 
          onLogin={handleLogin}
          loading={loading}
          message={message}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <TopNav tab={tab} onTab={setTab} user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <AnimatePresence mode="wait">
          {tab === "chat" ? (
            <motion.div key="chat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <ChatView onAcceptAll={() => setTab("tasks")} onToast={show} token={token} />
            </motion.div>
          ) : (
            <motion.div key="tasks" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <TasksView onToast={show} token={token} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {msg && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-white px-6 py-3 shadow-2xl ring-1 ring-slate-200 border border-slate-100">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> 
              {msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Top Nav ----------
function TopNav({ tab, onTab, user, onLogout }: { 
  tab: "chat" | "tasks"; 
  onTab: (t: "chat" | "tasks") => void;
  user: any;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold shadow-lg text-lg">N</div>
          <div className="font-bold text-lg text-slate-800">Project Nova</div>
        </div>
        <nav className="flex gap-1 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
          <TabButton active={tab === "chat"} onClick={() => onTab("chat")} icon={<MessageCircle className="h-4 w-4" />}>Chat</TabButton>
          <TabButton active={tab === "tasks"} onClick={() => onTab("tasks")} icon={<ListChecks className="h-4 w-4" />}>Tasks</TabButton>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Welcome, {user?.username}</span>
          <button
            onClick={onLogout}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function TabButton({ active, onClick, children, icon }: { active?: boolean; onClick?: () => void; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
        active 
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
          : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
      }`}>
      {icon} {children}
    </button>
  );
}

// ---------- Chat & Suggestions ----------
function ChatView({ onAcceptAll, onToast, token }: { onAcceptAll: () => void; onToast: (m: string) => void; token: string }) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [planTitle, setPlanTitle] = useState("My Plan");

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setPending(true);
    setError(null);
    setSuggestions([]);

    try {
      const res = await api<SuggestResponse>(API_ENDPOINTS.generate, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ message: input }),
      });

      const nextPlanTitle = res.plan_title?.trim();
      if (nextPlanTitle) {
        setPlanTitle(nextPlanTitle);
      }

      const editable: EditableSuggestion[] = (res.tasks || []).map((t) => ({
        include: true,
        title: t.title,
        notes: t.notes ?? "",
        dueText: t.due_at ? new Date(t.due_at).toLocaleString() : "",
        dueAt: t.due_at ?? undefined,
        editing: false,
      }));

      setSuggestions(editable);
    } catch (err: any) {
      setError(err.message || "Failed to get suggestions");
    } finally {
      setPending(false);
    }
  }

  async function acceptAll() {
    if (suggestions.length === 0) {
      onToast("Nothing selected");
      return;
    }

    const tasks = suggestions
      .filter((t) => t.include)
      .map((t) => ({
        title: t.title.trim(),
        notes: t.notes?.trim() || undefined,
        due_at: t.dueAt,
        status: "pending" as const,
      }));

    if (tasks.length === 0) {
      onToast("Nothing selected");
      return;
    }

    try {
      const headers = {
        Authorization: `Token ${token}`,
      };

      // Try reuse plan title before creating a new one
      let targetPlanId: number | null = null;
      try {
        const plans = await api<Plan[]>(API_ENDPOINTS.plans, { headers });
        const match = plans.find((p) => p.title === planTitle);
        if (match) {
          targetPlanId = match.id;
        }
      } catch (planErr) {
        console.warn("Failed to load plans", planErr);
      }

      if (!targetPlanId) {
        const created = await api<Plan>(API_ENDPOINTS.plans, {
          method: "POST",
          headers,
          body: JSON.stringify({ title: planTitle || "My Plan" }),
        });
        targetPlanId = created.id;
      }

      for (const task of tasks) {
        await api<Task>(API_ENDPOINTS.tasks, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...task, plan: targetPlanId }),
        });
      }
      onToast("Added to tasks");
      setSuggestions([]);
      setInput("");
      onAcceptAll();
    } catch (err: any) {
      setError(err.message || "Failed to accept suggestions");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <AssistantBubble text="Tell me what's coming up and I'll suggest a plan." />
          <UserHint examples={["I'm going to a wedding next week", "QBR on Oct 3", "Travel to Mexico in November", "Dentist Friday at noon"]} />
        </div>
        
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              {error}
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <SuggestionCard
            tasks={suggestions}
            onTasksChange={setSuggestions}
            onAcceptAll={acceptAll}
          />
        )}
      </div>

      <form onSubmit={handleSuggest} className="sticky bottom-6 mt-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-end gap-3">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., I'm going to a wedding next week in Chicago"
              className="min-h-[44px] flex-1 resize-none rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-500 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={pending}
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-sm">
        <Wand2 className="h-5 w-5" />
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 border border-slate-200">
        {text}
      </div>
    </div>
  );
}

function UserHint({ examples }: { examples: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-slate-500 mb-3">Try these examples:</div>
      <div className="flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
          >
            <ChevronRight className="h-3 w-3" /> {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Suggestion Card ----------
type EditableSuggestion = {
  include: boolean;
  title: string;
  notes: string;
  dueText: string; // human editable text
  dueAt?: string; // iso string
  editing: boolean;
};

function SuggestionCard({ tasks, onTasksChange, onAcceptAll }: { 
  tasks: EditableSuggestion[]; 
  onTasksChange: (t: EditableSuggestion[]) => void;
  onAcceptAll: () => void;
}) {
  function update(idx: number, patch: Partial<EditableSuggestion>) {
    const next = [...tasks];
    next[idx] = { ...next[idx], ...patch };
    onTasksChange(next);
  }
  function remove(idx: number) {
    const next = tasks.filter((_, i) => i !== idx);
    onTasksChange(next);
  }

  function parseAndApplyDue(idx: number) {
    const t = tasks[idx];
    const iso = parseNaturalDate(t.dueText);
    if (iso) {
      update(idx, { dueAt: iso });
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center gap-3 text-sm text-slate-600">
        <Wand2 className="h-4 w-4 text-blue-500" /> 
        Here's what Nova suggests based on what you said
      </div>

      <div className="space-y-4">
        {tasks.map((t, i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div className="flex items-start gap-4">
              <input 
                type="checkbox" 
                className="mt-1 h-4 w-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500" 
                checked={t.include} 
                onChange={(e) => update(i, { include: e.target.checked })} 
              />

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <input 
                    value={t.title} 
                    onChange={(e) => update(i, { title: e.target.value })}
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-sm outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                  />
                  <button 
                    onClick={() => remove(i)} 
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <textarea 
                  value={t.notes}
                  onChange={(e) => update(i, { notes: e.target.value })}
                  placeholder="Description (optional)" 
                  rows={1}
                  className="w-full resize-none rounded-lg bg-white px-3 py-2 text-xs text-slate-600 outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                />
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <input 
                    value={t.dueText} 
                    onChange={(e) => update(i, { dueText: e.target.value })} 
                    onBlur={() => parseAndApplyDue(i)}
                    placeholder="e.g., next Fri 3pm"
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-xs outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                  />
                  {t.dueAt && (
                    <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                      {formatDateLabelISO(t.dueAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button 
          onClick={() => onTasksChange([])} 
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Dismiss
        </button>
        <button 
          onClick={onAcceptAll} 
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          Accept All
        </button>
      </div>
    </motion.div>
  );
}

// ---------- Tasks List ----------
function TasksView({ onToast, token }: { onToast: (m: string) => void; token: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const authHeaders = useMemo(() => ({ Authorization: `Token ${token}` }), [token]);

  const taskUrl = (id: number) => `${API_ENDPOINTS.tasks}${id}/`;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Task[]>(API_ENDPOINTS.tasks, {
        headers: { ...authHeaders },
      });
      setItems(data);
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleDone(task: Task) {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    const prev = [...items];
    setItems((list) => list.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      await api<Task>(taskUrl(task.id), {
        method: "PATCH",
        headers: { ...authHeaders },
        body: JSON.stringify({ status: nextStatus }),
      });
      onToast(nextStatus === "completed" ? "Nice – completed" : "Reopened");
    } catch (e) {
      setItems(prev); // revert
    }
  }

  async function del(task: Task) {
    const prev = [...items];
    setItems((x) => x.filter((t) => t.id !== task.id));
    try {
      await api(taskUrl(task.id), { 
        method: "DELETE",
        headers: { ...authHeaders },
      });
      onToast("Deleted");
    } catch (e) {
      setItems(prev);
    }
  }

  async function save(task: Task, patch: TaskPatch) {
    const nextLocal = items.map((t) => (t.id === task.id ? { ...t, ...patch } : t));
    setItems(nextLocal);
    try {
      const saved = await api<Task>(taskUrl(task.id), {
        method: "PATCH",
        headers: { ...authHeaders },
        body: JSON.stringify(patch),
      });
      setItems((list) => list.map((t) => (t.id === saved.id ? saved : t)));
      onToast("Saved");
    } catch (e) {
      // reload to reconcile
      load();
    }
  }

  async function createQuick(title: string) {
    if (!title.trim()) return;
    try {
      const created = await api<Task>(API_ENDPOINTS.tasks, { 
        method: "POST", 
        headers: { ...authHeaders },
        body: JSON.stringify({ title }) 
      });
      setItems((x) => [created, ...x]);
      onToast("Task added");
    } catch (e: any) {
      setError(e.message || "Failed to create task");
    }
  }

  const groups = useMemo(() => groupTasks(items), [items]);

  return (
    <div className="mx-auto max-w-4xl">
      <QuickAdd onAdd={createQuick} />

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" /> 
          Loading tasks...
        </div>
      )}
      
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            {error}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState />
      )}

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section key={g.label}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {g.label.charAt(0).toUpperCase() + g.label.slice(1)} ({g.items.length})
            </h3>
            <div className="space-y-3">
              {g.items.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => toggleDone(t)} onDelete={() => del(t)} onSave={(patch) => save(t, patch)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(val);
          setVal("");
        }}
        className="flex items-center gap-3"
      >
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Plus className="h-5 w-5 text-slate-400" />
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Quick add a task..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
        </div>
        <button className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
          Add Task
        </button>
      </form>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <ListChecks className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">No tasks yet</h3>
      <div className="text-sm text-slate-600 mb-4">Try telling Nova what's coming up:</div>
      <div className="text-sm text-slate-500 space-y-1">
        <div>"I'm traveling next month"</div>
        <div>"Demo on Tuesday"</div>
        <div>"Kid's birthday Saturday"</div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete, onSave }: { task: Task; onToggle: () => void; onDelete: () => void; onSave: (patch: TaskPatch) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [dueText, setDueText] = useState(task.due_at ? new Date(task.due_at).toLocaleString() : "");

  function commit() {
    const trimmedTitle = title.trim() || task.title;
    const trimmedNotes = notes.trim();
    const payload: TaskPatch = {
      title: trimmedTitle,
      notes: trimmedNotes ? trimmedNotes : null,
    };

    const trimmedDue = dueText.trim();
    if (!trimmedDue) {
      payload.due_at = null;
    } else {
      const parsed = parseNaturalDate(trimmedDue);
      if (parsed) {
        payload.due_at = parsed;
      }
    }

    onSave(payload);
    setEditing(false);
  }

  return (
    <div className={`rounded-xl p-4 border transition-all ${
      task.status === "completed" 
        ? "bg-slate-50 border-slate-200" 
        : "bg-white border-slate-200 hover:border-slate-300"
    }`}>
      <div className="flex items-start gap-4">
        <button 
          onClick={onToggle} 
          className={`mt-1 rounded-lg p-2 transition-colors ${
            task.status === "completed" 
              ? "text-green-600 hover:bg-green-50" 
              : "text-slate-400 hover:bg-slate-100"
          }`} 
          title="Toggle done"
        >
          <CheckCircle2 className={`h-5 w-5 ${task.status === "completed" ? "text-green-600" : ""}`} />
        </button>

        <div className="flex-1 min-w-0 space-y-3">
          {editing ? (
            <>
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="w-full rounded-lg bg-white px-3 py-2 text-sm outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
              />
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Description (optional)" 
                rows={1} 
                className="w-full resize-none rounded-lg bg-white px-3 py-2 text-xs outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
              />
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <Calendar className="h-4 w-4" />
                <input 
                  value={dueText} 
                  onChange={(e) => setDueText(e.target.value)} 
                  placeholder="e.g., tomorrow 4pm" 
                  className="flex-1 rounded-lg bg-white px-3 py-2 outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className={`text-sm font-medium ${task.status === "completed" ? "text-slate-500 line-through" : "text-slate-800"}`}>
                  {task.title}
                </div>
                {task.due_at && (
                  <div className="flex-shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700 border border-blue-200">
                    {formatDateLabelISO(task.due_at)}
                  </div>
                )}
              </div>
              {task.notes && (
                <div className={`text-xs ${task.status === "completed" ? "text-slate-400" : "text-slate-600"}`}>
                  {task.notes}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button 
                onClick={() => setEditing(false)} 
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <button 
                onClick={commit} 
                className="rounded-lg p-2 text-green-600 hover:bg-green-50 transition-colors"
              >
                <Save className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setEditing(true)} 
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button 
                onClick={onDelete} 
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Grouping ----------
function groupTasks(tasks: Task[]) {
  const today = new Date();
  const s = startOfDay(today).getTime();

  const buckets: { [k: string]: Task[] } = { upcoming: [], overdue: [], completed: [] };
  for (const t of tasks) {
    if (t.status === "completed") {
      buckets["completed"].push(t);
      continue;
    }
    if (!t.due_at) {
      buckets["upcoming"].push(t);
      continue;
    }
    const time = new Date(t.due_at).getTime();
    if (time < s) buckets["overdue"].push(t);
    else buckets["upcoming"].push(t);
  }
  const order = ["overdue", "upcoming", "completed"] as const;
  return order.map((label) => ({ label, items: buckets[label] }));
}
