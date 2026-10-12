import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { uid } from "@/lib/mbse/ids"
import {
  cleanName,
  normalizeEmail,
  passwordError,
  USER_ID,
  type AccountRecord,
  type SiteRole,
  type SiteUser,
} from "@/lib/site"
import { getDb, transaction } from "./db"
import { SiteError } from "./errors"

const SESSION_MS = 14 * 24 * 60 * 60 * 1000
const DUMMY_HASH = hashPassword("keel-dummy-password")

type UserRow = {
  id: string
  email: string
  name: string
  password_hash: string
  role: string
  created_at: string
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 32).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const actual = scryptSync(password, salt, 32)
  const expected = Buffer.from(hash, "hex")
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function userCount() {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }
  return row.n
}

export function toPublic(row: { id: string; email: string; name: string; role: string }): SiteUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role === "admin" ? "admin" : "member",
  }
}

export function findUserByEmail(email: string) {
  return (getDb().prepare("SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = ?").get(email) as UserRow | undefined) ?? null
}

export function createUser(input: { name: string; email: string; password: string; role: SiteRole }): AccountRecord {
  const email = normalizeEmail(input.email)
  if (!email) throw new SiteError("Enter a valid email.")
  const name = cleanName(input.name)
  if (!name) throw new SiteError("Enter a name.")
  const problem = passwordError(input.password)
  if (problem) throw new SiteError(problem)
  if (input.role !== "admin" && input.role !== "member") throw new SiteError("Choose a role.")
  if (findUserByEmail(email)) throw new SiteError("An account with that email already exists.")
  const id = uid("usr")
  const createdAt = new Date().toISOString()
  getDb()
    .prepare("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, email, name, hashPassword(input.password), input.role, createdAt)
  return { id, email, name, role: input.role, createdAt }
}

export function authenticate(emailRaw: string, password: string): SiteUser | null {
  const email = normalizeEmail(emailRaw)
  const user = email ? findUserByEmail(email) : null
  const usable = password.length > 0 && password.length <= 200
  const ok = verifyPassword(usable ? password : "nope", user?.password_hash ?? DUMMY_HASH)
  if (!user || !ok) return null
  return toPublic(user)
}

export function listUsers(actor: SiteUser): AccountRecord[] {
  if (actor.role !== "admin") throw new SiteError("Only an administrator can view accounts.", 403)
  const rows = getDb().prepare("SELECT id, email, name, role, created_at FROM users ORDER BY created_at").all() as Array<
    Omit<UserRow, "password_hash">
  >
  return rows.map((row) => ({ ...toPublic(row), createdAt: row.created_at }))
}

export function deleteUser(actor: SiteUser, userId: string) {
  if (actor.role !== "admin") throw new SiteError("Only an administrator can remove accounts.", 403)
  if (actor.id === userId) throw new SiteError("You cannot remove your own account while you are signed in.")
  if (!USER_ID.test(userId)) throw new SiteError("Unknown account.", 404)
  const existing = getDb().prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as { id: string; role: string } | undefined
  if (!existing) throw new SiteError("Unknown account.", 404)
  if (existing.role === "admin") {
    const count = getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get() as { n: number }
    if (count.n <= 1) throw new SiteError("Keep at least one administrator.")
  }
  transaction(() => {
    const db = getDb()
    const owned = db.prepare("SELECT project_id FROM memberships WHERE user_id = ? AND role = 'owner'").all(userId) as Array<{
      project_id: string
    }>
    for (const row of owned) {
      db.prepare("DELETE FROM memberships WHERE project_id = ? AND user_id = ?").run(row.project_id, userId)
      const already = db.prepare("SELECT role FROM memberships WHERE project_id = ? AND user_id = ?").get(row.project_id, actor.id) as
        | { role: string }
        | undefined
      if (already) {
        db.prepare("UPDATE memberships SET role = 'owner' WHERE project_id = ? AND user_id = ?").run(row.project_id, actor.id)
      } else {
        db.prepare("INSERT INTO memberships (project_id, user_id, role) VALUES (?, ?, 'owner')").run(row.project_id, actor.id)
      }
    }
    db.prepare("DELETE FROM memberships WHERE user_id = ?").run(userId)
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId)
    db.prepare("UPDATE projects SET created_by = ? WHERE created_by = ?").run(actor.id, userId)
    db.prepare("DELETE FROM users WHERE id = ?").run(userId)
  })
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  getDb()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(tokenHash, userId, Date.now() + SESSION_MS)
  return token
}

export function userForToken(token: string): SiteUser | null {
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as { id: string; email: string; name: string; role: string; expires_at: number } | undefined
  if (!row) return null
  if (row.expires_at < Date.now()) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash)
    return null
  }
  return toPublic(row)
}

export function deleteSession(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return
  const tokenHash = createHash("sha256").update(token).digest("hex")
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash)
}
