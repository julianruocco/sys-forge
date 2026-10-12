import { createReadStream } from "node:fs"
import { Readable } from "node:stream"
import { fromError, isUser, jsonError, requireApiUser } from "@/lib/server/http"
import { projectAccess, removeStl, stlPath } from "@/lib/server/projects"

export async function GET(_request: Request, context: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id, assetId } = await context.params
    const access = projectAccess(user, id)
    if (!access) return jsonError("That project is not available on your account.", 404)
    const file = stlPath(id, assetId)
    if (!file) return jsonError("That STL is not in this project.", 404)
    const stream = createReadStream(file)
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "content-type": "model/stl",
        "cache-control": "private, max-age=86400",
      },
    })
  } catch (error) {
    return fromError(error)
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const { id, assetId } = await context.params
    const access = projectAccess(user, id)
    if (!access) return jsonError("That project is not available on your account.", 404)
    if (!access.canEdit) return jsonError("You cannot remove files from this project.", 403)
    removeStl(id, assetId)
    return Response.json({ ok: true })
  } catch (error) {
    return fromError(error)
  }
}
