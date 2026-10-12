import { fromError, isUser, jsonError, requireApiUser } from "@/lib/server/http"
import { projectAccess, saveUploadedStl } from "@/lib/server/projects"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id } = await context.params
    const access = projectAccess(user, id)
    if (!access) return jsonError("That project is not available on your account.", 404)
    if (!access.canEdit) return jsonError("You can review this project, but you cannot add an STL.", 403)
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return jsonError("Choose an STL file.", 400)
    const bytes = Buffer.from(await file.arrayBuffer())
    const saved = saveUploadedStl(id, bytes, file.name || "model.stl")
    return Response.json(saved)
  } catch (error) {
    return fromError(error)
  }
}
