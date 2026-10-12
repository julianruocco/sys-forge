import { userCount } from "@/lib/server/accounts"
import { fromError, jsonError, readJson, asRecord, asString } from "@/lib/server/http"
import { bootstrap } from "@/lib/server/projects"
import { startSession } from "@/lib/server/session"

export async function POST(request: Request) {
  try {
    if (userCount() > 0) return jsonError("An administrator already exists.", 409)
    const body = asRecord(await readJson(request))
    const result = bootstrap({
      name: asString(body?.name),
      email: asString(body?.email),
      password: asString(body?.password),
    })
    await startSession(result.user.id, request)
    return Response.json({ user: result.user, projectId: result.project.id })
  } catch (error) {
    return fromError(error)
  }
}
