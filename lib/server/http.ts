import { SiteError } from "./errors"
import type { SiteUser } from "@/lib/site"
import { currentUser } from "./session"

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export function fromError(error: unknown) {
  if (error instanceof SiteError) return jsonError(error.message, error.status)
  console.error(error)
  return jsonError("Something went wrong on the server.", 500)
}

export async function requireApiUser(): Promise<SiteUser | Response> {
  const user = await currentUser()
  if (!user) return jsonError("Sign in required.", 401)
  return user
}

export function isUser(value: SiteUser | Response): value is SiteUser {
  return !(value instanceof Response)
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown
  } catch {
    return null
  }
}

export function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function asString(value: unknown) {
  return typeof value === "string" ? value : ""
}
