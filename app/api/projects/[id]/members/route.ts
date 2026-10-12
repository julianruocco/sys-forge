import { asRecord, asString, fromError, isUser, jsonError, readJson, requireApiUser } from "@/lib/server/http"
import { addMember, listMembers } from "@/lib/server/projects"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id } = await context.params
    return Response.json({ members: listMembers(user, id) })
  } catch (error) {
    return fromError(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id } = await context.params
    const body = asRecord(await readJson(request))
    const role = body?.role === "viewer" ? "viewer" : "editor"
    if (body?.role !== "viewer" && body?.role !== "editor") return jsonError("Choose editor or viewer.", 400)
    const member = addMember(user, id, asString(body?.email), role)
    return Response.json({ member })
  } catch (error) {
    return fromError(error)
  }
}
