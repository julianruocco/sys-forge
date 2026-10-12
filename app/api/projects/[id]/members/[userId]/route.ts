import { fromError, isUser, requireApiUser } from "@/lib/server/http"
import { removeMember } from "@/lib/server/projects"

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id, userId } = await context.params
    removeMember(user, id, userId)
    return Response.json({ ok: true })
  } catch (error) {
    return fromError(error)
  }
}
