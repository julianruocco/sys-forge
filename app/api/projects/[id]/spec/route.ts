import { isMbseModel } from "@/lib/mbse/check"
import { toMarkdown } from "@/lib/mbse/queries"
import { fromError, isUser, jsonError, requireApiUser } from "@/lib/server/http"
import { projectAccess, writeSpec } from "@/lib/server/projects"

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id } = await context.params
    const access = projectAccess(user, id)
    if (!access) return jsonError("That project is not available on your account.", 404)
    if (!access.canEdit) return jsonError("You can review this project, but you cannot write the spec.", 403)
    const text = await request.text()
    if (text.length > 8_000_000) return jsonError("That model is too large.", 413)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return jsonError("The body is not JSON.", 400)
    }
    if (!isMbseModel(parsed)) return jsonError("Refusing to write a spec from an unrecognized model.", 400)
    const specPath = writeSpec(id, toMarkdown(parsed))
    return Response.json({ ok: true, path: specPath })
  } catch (error) {
    return fromError(error)
  }
}
