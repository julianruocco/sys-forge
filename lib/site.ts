export type SiteRole = "admin" | "member"

export type SiteUser = {
  id: string
  email: string
  name: string
  role: SiteRole
}

export type AccountRecord = SiteUser & {
  createdAt: string
}

export type MemberRole = "owner" | "editor" | "viewer"

export type ProjectRole = MemberRole | "admin"

export type ProjectSummary = {
  id: string
  name: string
  description: string
  updatedAt: string
  role: ProjectRole
  canEdit: boolean
}

export type MemberSummary = {
  userId: string
  name: string
  email: string
  role: MemberRole
}

export const PROJECT_ID = /^prj-[a-f0-9]{8}$/
export const USER_ID = /^usr-[a-f0-9]{8}$/
export const STL_ID = /^stl-[a-f0-9]{16}$/

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase()
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function cleanName(value: string) {
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80)
}

export function cleanDescription(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, 2000)
}

export function passwordError(password: string) {
  if (password.length < 8) return "Use at least 8 characters for the password."
  if (password.length > 200) return "That password is too long."
  return null
}
