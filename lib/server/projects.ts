import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { isMbseModel } from "@/lib/mbse/check"
import { blankModel } from "@/lib/mbse/blank"
import { uid } from "@/lib/mbse/ids"
import { aetherModel } from "@/lib/mbse/seed"
import { inspectStl, safeStlName } from "@/lib/mbse/stl"
import { MODEL_FILE, type MbseModel } from "@/lib/mbse/types"
import {
  cleanDescription,
  cleanName,
  normalizeEmail,
  PROJECT_ID,
  STL_ID,
  USER_ID,
  type MemberRole,
  type MemberSummary,
  type ProjectRole,
  type ProjectSummary,
  type SiteUser,
} from "@/lib/site"
import { createUser, findUserByEmail, userCount } from "./accounts"
import { dataDir, getDb, transaction } from "./db"
import { SiteError } from "./errors"

type MembershipRow = { role: MemberRole }

export function projectDir(projectId: string) {
  if (!PROJECT_ID.test(projectId)) throw new SiteError("Unknown project.", 404)
  const root = path.resolve(dataDir(), "projects")
  const dir = path.resolve(root, projectId)
  if (!dir.startsWith(root + path.sep)) throw new SiteError("Unknown project.", 404)
  return dir
}

export function aetherTemplate(): MbseModel {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path.join(process.cwd(), MODEL_FILE), "utf8"))
    if (isMbseModel(parsed)) return parsed
  } catch {
    // The seed is the template when the example file is missing or unreadable.
  }
  return structuredClone(aetherModel)
}

export function projectAccess(user: SiteUser, projectId: string): { role: ProjectRole; canEdit: boolean } | null {
  if (!PROJECT_ID.test(projectId)) return null
  const project = getDb().prepare("SELECT id FROM projects WHERE id = ?").get(projectId)
  if (!project) return null
  const membership = getDb().prepare("SELECT role FROM memberships WHERE project_id = ? AND user_id = ?").get(projectId, user.id) as
    | MembershipRow
    | undefined
  if (user.role === "admin") {
    return { role: membership?.role === "owner" ? "owner" : "admin", canEdit: true }
  }
  if (!membership) return null
  return {
    role: membership.role,
    canEdit: membership.role === "owner" || membership.role === "editor",
  }
}

export function canManageProject(user: SiteUser, projectId: string) {
  const access = projectAccess(user, projectId)
  return Boolean(access && (user.role === "admin" || access.role === "owner"))
}

export function listProjects(user: SiteUser): ProjectSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.name, p.description, p.updated_at, m.role AS member_role
       FROM projects p
       LEFT JOIN memberships m ON m.project_id = p.id AND m.user_id = ?
       WHERE m.user_id IS NOT NULL OR ? = 'admin'
       ORDER BY p.updated_at DESC`,
    )
    .all(user.id, user.role) as Array<{
    id: string
    name: string
    description: string
    updated_at: string
    member_role: MemberRole | null
  }>
  return rows.flatMap((row) => {
    if (!row.member_role && user.role !== "admin") return []
    const role: ProjectRole = user.role === "admin" ? (row.member_role === "owner" ? "owner" : "admin") : row.member_role!
    const canEdit = user.role === "admin" || row.member_role === "owner" || row.member_role === "editor"
    return [
      {
        id: row.id,
        name: row.name,
        description: row.description,
        updatedAt: row.updated_at,
        role,
        canEdit,
      },
    ]
  })
}

function modelFromTemplate(template: "blank" | "aether", name: string, description: string) {
  if (template === "blank") return blankModel(name, description || "New systems project.")
  const model = aetherTemplate()
  model.project = {
    ...model.project,
    name,
    description: description || model.project.description,
  }
  return model
}

function insertProject(
  user: SiteUser,
  input: { name: string; description: string; template: "blank" | "aether" },
  remember?: (id: string) => void,
): ProjectSummary {
  const name = cleanName(input.name)
  if (!name) throw new SiteError("Enter a project name.")
  const description = cleanDescription(input.description)
  const id = uid("prj")
  remember?.(id)
  const now = new Date().toISOString()
  const model = modelFromTemplate(input.template, name, description)
  model.project.id = id
  const db = getDb()
  db.prepare("INSERT INTO projects (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    id,
    name,
    model.project.description,
    user.id,
    now,
    now,
  )
  db.prepare("INSERT INTO memberships (project_id, user_id, role) VALUES (?, ?, 'owner')").run(id, user.id)
  writeModelSync(id, model)
  return {
    id,
    name,
    description: model.project.description,
    updatedAt: now,
    role: "owner",
    canEdit: true,
  }
}

export function createProject(user: SiteUser, input: { name: string; description: string; template: "blank" | "aether" }) {
  let projectId = ""
  try {
    return transaction(() => insertProject(user, input, (id) => {
      projectId = id
    }))
  } catch (error) {
    if (projectId) rmSync(path.join(dataDir(), "projects", projectId), { recursive: true, force: true })
    throw error
  }
}

export function bootstrap(input: { name: string; email: string; password: string }) {
  let projectId = ""
  try {
    return transaction(() => {
      if (userCount() > 0) throw new SiteError("An administrator already exists.", 409)
      const user = createUser({ ...input, role: "admin" })
      const project = insertProject(
        user,
        {
          name: "Aether-1",
          description: "",
          template: "aether",
        },
        (id) => {
          projectId = id
        },
      )
      return { user, project }
    })
  } catch (error) {
    if (projectId) rmSync(path.join(dataDir(), "projects", projectId), { recursive: true, force: true })
    throw error
  }
}

export function createAccount(input: {
  name: string
  email: string
  password: string
  role: "admin" | "member"
  grantExisting: boolean
}) {
  return transaction(() => {
    const user = createUser(input)
    if (input.grantExisting) {
      const projects = getDb().prepare("SELECT id FROM projects").all() as Array<{ id: string }>
      const insert = getDb().prepare("INSERT OR IGNORE INTO memberships (project_id, user_id, role) VALUES (?, ?, 'editor')")
      for (const project of projects) insert.run(project.id, user.id)
    }
    return user
  })
}

export function deleteProject(user: SiteUser, projectId: string) {
  const access = projectAccess(user, projectId)
  if (!access) throw new SiteError("That project is not available on your account.", 404)
  if (user.role !== "admin" && access.role !== "owner") {
    throw new SiteError("Only the owner or an administrator can delete this project.", 403)
  }
  transaction(() => {
    getDb().prepare("DELETE FROM memberships WHERE project_id = ?").run(projectId)
    getDb().prepare("DELETE FROM projects WHERE id = ?").run(projectId)
  })
  rmSync(projectDir(projectId), { recursive: true, force: true })
}

export function readModel(projectId: string) {
  const file = path.join(projectDir(projectId), "model.json")
  if (!existsSync(file)) throw new SiteError("The model file is missing.", 404)
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"))
  } catch {
    throw new SiteError("The model file is not valid JSON.", 422)
  }
  if (!isMbseModel(parsed)) throw new SiteError("The model file is not a Keel model.", 422)
  return parsed
}

export function writeModelSync(projectId: string, model: MbseModel) {
  const dir = projectDir(projectId)
  mkdirSync(dir, { recursive: true })
  const target = path.join(dir, "model.json")
  const temporary = path.join(dir, "model.json.tmp")
  writeFileSync(temporary, JSON.stringify(model, null, 2) + "\n")
  renameSync(temporary, target)
}

export function touchProject(projectId: string, model: MbseModel) {
  getDb()
    .prepare("UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?")
    .run(model.project.name, model.project.description, new Date().toISOString(), projectId)
}

export function writeSpec(projectId: string, markdown: string) {
  const dir = projectDir(projectId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, "spec.md"), markdown)
  return `data/projects/${projectId}/spec.md`
}

export function listMembers(user: SiteUser, projectId: string): MemberSummary[] {
  if (!canManageProject(user, projectId)) throw new SiteError("You cannot change access for this project.", 403)
  const rows = getDb()
    .prepare(
      `SELECT m.user_id, u.name, u.email, m.role
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.project_id = ?
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.name`,
    )
    .all(projectId) as Array<{ user_id: string; name: string; email: string; role: MemberRole }>
  return rows.map((row) => ({ userId: row.user_id, name: row.name, email: row.email, role: row.role }))
}

export function addMember(actor: SiteUser, projectId: string, emailRaw: string, role: "editor" | "viewer") {
  if (!canManageProject(actor, projectId)) throw new SiteError("You cannot change access for this project.", 403)
  const email = normalizeEmail(emailRaw)
  if (!email) throw new SiteError("Enter a valid email.")
  if (role !== "editor" && role !== "viewer") throw new SiteError("Choose editor or viewer.")
  const account = findUserByEmail(email)
  if (!account) {
    throw new SiteError(
      actor.role === "admin"
        ? "No account uses that email. Add them on People first."
        : "No account uses that email. An administrator has to add them first.",
    )
  }
  const existing = getDb().prepare("SELECT role FROM memberships WHERE project_id = ? AND user_id = ?").get(projectId, account.id) as
    | { role: string }
    | undefined
  if (existing?.role === "owner") throw new SiteError("The owner already has access.")
  if (existing) {
    getDb().prepare("UPDATE memberships SET role = ? WHERE project_id = ? AND user_id = ?").run(role, projectId, account.id)
  } else {
    getDb().prepare("INSERT INTO memberships (project_id, user_id, role) VALUES (?, ?, ?)").run(projectId, account.id, role)
  }
  return { userId: account.id, name: account.name, email: account.email, role }
}

export function removeMember(actor: SiteUser, projectId: string, userId: string) {
  if (!canManageProject(actor, projectId)) throw new SiteError("You cannot change access for this project.", 403)
  if (!USER_ID.test(userId)) throw new SiteError("Unknown account.", 404)
  const existing = getDb().prepare("SELECT role FROM memberships WHERE project_id = ? AND user_id = ?").get(projectId, userId) as
    | { role: string }
    | undefined
  if (!existing) throw new SiteError("That account is not on this project.", 404)
  if (existing.role === "owner") throw new SiteError("The project owner stays on the project.")
  getDb().prepare("DELETE FROM memberships WHERE project_id = ? AND user_id = ?").run(projectId, userId)
}

export function saveUploadedStl(projectId: string, bytes: Buffer, filename: string) {
  const inspected = inspectStl(bytes, filename)
  if (!inspected.ok) throw new SiteError(inspected.error)
  const id = `stl-${randomBytes(8).toString("hex")}`
  if (!STL_ID.test(id)) throw new SiteError("Could not store that STL.", 500)
  const dir = path.join(projectDir(projectId), "stl")
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, `${id}.stl`), bytes)
  return { id, name: safeStlName(filename) }
}

export function stlPath(projectId: string, assetId: string) {
  if (!STL_ID.test(assetId)) return null
  const dir = path.resolve(projectDir(projectId), "stl")
  const file = path.resolve(dir, `${assetId}.stl`)
  if (!file.startsWith(dir + path.sep)) return null
  if (!existsSync(file)) return null
  return file
}

export function removeStl(projectId: string, assetId: string) {
  const file = stlPath(projectId, assetId)
  if (!file) throw new SiteError("That STL is not in this project.", 404)
  rmSync(file, { force: true })
}
