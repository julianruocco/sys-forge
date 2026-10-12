import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const directory = mkdtempSync(path.join(tmpdir(), "keel-test-"))
process.env.KEEL_DATA_DIR = directory

test("accounts, project access, and STL storage", async () => {
  const { authenticate } = await import("./accounts")
  const { addMember, bootstrap, createAccount, createProject, listProjects, projectAccess, readModel, saveUploadedStl, stlPath } =
    await import("./projects")

  const first = bootstrap({ name: "Ada Lovelace", email: "ada@keel.test", password: "orbit-500" })
  assert.equal(first.user.role, "admin")
  assert.equal(authenticate("ada@keel.test", "orbit-500")?.id, first.user.id)
  assert.equal(authenticate("ada@keel.test", "wrong-password"), null)
  assert.equal(listProjects(first.user)[0]?.name, "Aether-1")
  assert.equal(readModel(first.project.id).project.name, "Aether-1")

  assert.throws(() => bootstrap({ name: "Other", email: "other@keel.test", password: "orbit-500" }), /already exists/)

  const blank = createProject(first.user, { name: "Power system", description: "Bus power", template: "blank" })
  assert.equal(blank.role, "owner")
  assert.equal(readModel(blank.id).diagrams.length, 1)

  const member = createAccount({
    name: "Grace Hopper",
    email: "grace@keel.test",
    password: "compiler",
    role: "member",
    grantExisting: false,
  })
  assert.equal(listProjects(member).length, 0)
  assert.equal(projectAccess(member, blank.id), null)

  addMember(first.user, blank.id, "grace@keel.test", "viewer")
  assert.equal(projectAccess(member, blank.id)?.canEdit, false)
  addMember(first.user, blank.id, "grace@keel.test", "editor")
  assert.equal(projectAccess(member, blank.id)?.canEdit, true)

  const editor = createAccount({
    name: "Ed",
    email: "ed@keel.test",
    password: "editor-ok",
    role: "member",
    grantExisting: true,
  })
  assert.equal(listProjects(editor).length, 2)
  assert.equal(projectAccess(first.user, blank.id)?.canEdit, true)

  const bytes = Buffer.alloc(84 + 50)
  bytes.writeUInt32LE(1, 80)
  const saved = saveUploadedStl(blank.id, bytes, "bracket.stl")
  const stored = stlPath(blank.id, saved.id)
  assert.ok(stored)
  assert.equal(saved.name, "bracket.stl")
  assert.throws(() => saveUploadedStl(blank.id, Buffer.from("hello"), "notes.stl"), /not a binary or ASCII STL/)
})
