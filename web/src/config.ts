// API Configuration
export const API_BASE_URL = 'https://nova-backend-fs1b.onrender.com'

// Use deployed backend for now since local setup is incomplete
export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/api/accounts/login/`,
  register: `${API_BASE_URL}/api/accounts/register/`,
  logout: `${API_BASE_URL}/api/accounts/logout/`,
  profile: `${API_BASE_URL}/api/accounts/profile/`,
  tasks: `${API_BASE_URL}/api/planner/tasks/`,
  plans: `${API_BASE_URL}/api/planner/plans/`,
  generate: `${API_BASE_URL}/api/planner/generate/llm/`,
  schedule: `${API_BASE_URL}/api/planner/schedule/preview/`,
}
