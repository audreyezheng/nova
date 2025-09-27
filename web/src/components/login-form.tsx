import React, { useState } from "react"
import { Loader2 } from "lucide-react"

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>
  loading: boolean
  message: string
}

export function LoginForm({ onLogin, loading, message }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onLogin(username, password)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold shadow-lg text-2xl">
            N
          </div>
          <div className="font-bold text-2xl text-slate-800">Project Nova</div>
        </div>
        <p className="text-slate-600">Sign in to continue</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50 shadow-sm flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-lg text-sm ${
            message.includes("❌") 
              ? "bg-red-50 border border-red-200 text-red-700" 
              : "bg-green-50 border border-green-200 text-green-700"
          }`}>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${message.includes("❌") ? "bg-red-500" : "bg-green-500"}`}></div>
              {message}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
