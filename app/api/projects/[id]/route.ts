import { fromError, isUser, jsonError, requireApiUser } from "@/lib/server/http"
import { deleteProject } from "@/lib/server/projects"

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id } = await context.params
    deleteProject(user, id)
    return Response.json({ ok: true })
  } catch (error) {
    return fromError(error)
  }
}

export function GET() {
  return jsonError("Open the project model instead.", 404)
}
