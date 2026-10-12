import { cookies } from "next/headers"
import { createSession, deleteSession, userForToken } from "./accounts"

const NAME = "keel_session"
const MAX_AGE = 14 * 24 * 60 * 60

function secureCookie(request?: Request) {
  if (process.env.KEEL_COOKIE_SECURE === "1") return true
  return request?.headers.get("x-forwarded-proto") === "https"
}

export async function currentUser() {
  const jar = await cookies()
  const token = jar.get(NAME)?.value
  if (!token) return null
  return userForToken(token)
}

export async function startSession(userId: string, request?: Request) {
  const token = createSession(userId)
  const jar = await cookies()
  jar.set(NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(request),
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function clearSession() {
  const jar = await cookies()
  const token = jar.get(NAME)?.value
  if (token) deleteSession(token)
  jar.set(NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  })
}
