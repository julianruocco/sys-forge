import { isMbseModel } from "@/lib/mbse/check"
import { fromError, isUser, jsonError, requireApiUser } from "@/lib/server/http"
import { projectAccess, readModel, touchProject, writeModelSync } from "@/lib/server/projects"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id } = await context.params
    const access = projectAccess(user, id)
    if (!access) return jsonError("That project is not available on your account.", 404)
    const model = readModel(id)
    return Response.json({ model, canEdit: access.canEdit, role: access.role })
  } catch (error) {
    return fromError(error)
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id } = await context.params
    const access = projectAccess(user, id)
    if (!access) return jsonError("That project is not available on your account.", 404)
    if (!access.canEdit) return jsonError("You can review this project, but you cannot save changes.", 403)
    const text = await request.text()
    if (text.length > 8_000_000) return jsonError("That model is too large.", 413)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return jsonError("The body is not JSON.", 400)
    }
    if (!isMbseModel(parsed)) return jsonError("Refusing to write a file that is not a Keel model.", 400)
    if (!parsed.project.name.trim()) return jsonError("The project needs a name.", 400)
    writeModelSync(id, parsed)
    touchProject(id, parsed)
    return Response.json({ ok: true })
  } catch (error) {
    return fromError(error)
  }
}
