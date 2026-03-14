const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

const TOKEN_KEY = "notes_app_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Request failed" }))
    throw new ApiError(body.message || `Request failed (${res.status})`, res.status)
  }

  return res.json()
}

// --- Auth API ---

export interface User {
  id: number
  username: string
  email: string
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface MeResponse {
  user: User
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const formData = new URLSearchParams()
  formData.append("username", email)
  formData.append("password", password)

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Login failed" }))
    throw new ApiError(body.detail || "Login failed", res.status)
  }

  const data = await res.json()
  const user = await apiFetch<User>("/auth/me", {
    headers: { Authorization: `Bearer ${data.access_token}` }
  })

  return { token: data.access_token, user }
}

export async function apiSignUp(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  await apiFetch<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username: username, email, password }),
  })
  return apiLogin(username, password)
}

export async function apiGetMe(): Promise<MeResponse> {
  const user = await apiFetch<User>("/auth/me")
  return { user }
}

export async function apiUpdateProfile(data: { name?: string }): Promise<{ user: User }> {
  return apiFetch<{ user: User }>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

// --- Notes API ---

export interface Note {
  id: number
  user_id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

export async function apiGetNotes(): Promise<{ notes: Note[] }> {
  const notes = await apiFetch<Note[]>("/notes")
  return { notes }
}

export async function apiCreateNote(data: {
  title: string
  content: string
}): Promise<{ note: Note }> {
  const note = await apiFetch<Note>("/notes", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return { note }
}

export async function apiUpdateNote(
  id: string,
  data: { title?: string; content?: string }
): Promise<{ note: Note }> {
  const note = await apiFetch<Note>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  return { note }
}

export async function apiDeleteNote(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/notes/${id}`, {
    method: "DELETE",
  })
}

// --- Keystroke Logging API ---

export async function apiLogKeystrokes(keystrokes: {
  dwell_time: number
  flight_time: number
  backspace_rate: number
  typing_speed: number
  dwell_variance: number
  digraph_time: number
}[]): Promise<void> {
  await apiFetch("/keystrokes/log", {
    method: "POST",
    body: JSON.stringify({ keystrokes }),
  })
}

export async function apiPredictKeystrokes(keystrokes: {
  dwell_time: number
  flight_time: number
  backspace_rate: number
  typing_speed: number
  dwell_variance: number
  digraph_time: number
}[]): Promise<{ status: string; anomaly_rate: number; message: string }> {
  return apiFetch("/ml/predict", {
    method: "POST",
    body: JSON.stringify({ keystrokes }),
  })
}

// --- Model Training API ---

export async function apiTrainModel(): Promise<{ message: string }> {
  return apiFetch("/ml/train", {
    method: "POST",
  })
}

export async function apiRetrainAdaptive(): Promise<void> {
  await apiFetch("/ml/retrain", { method: "POST" })
}