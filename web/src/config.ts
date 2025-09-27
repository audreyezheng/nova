// Allow overriding the API origin at build time with Vite envs.
const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const defaultBase = "https://nova-backend-fs1b.onrender.com"

const computedBase = (() => {
  if (!envBase) return defaultBase
  if (envBase === "relative" || envBase === "auto") return ""
  return envBase
})()

export const API_BASE_URL = computedBase

const join = (path: string) => {
  if (!API_BASE_URL) return path
  const normalizedBase = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL
  return `${normalizedBase}${path}`
}

export const API_ENDPOINTS = {
  login: join("/api/accounts/login/"),
  register: join("/api/accounts/register/"),
  logout: join("/api/accounts/logout/"),
  profile: join("/api/accounts/profile/"),
  tasks: join("/api/planner/tasks/"),
  plans: join("/api/planner/plans/"),
  generate: join("/api/planner/generate/llm/"),
  schedule: join("/api/planner/schedule/preview/"),
}
