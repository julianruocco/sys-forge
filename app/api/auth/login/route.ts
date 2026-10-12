import { authenticate, userCount } from "@/lib/server/accounts"
import { asRecord, asString, fromError, jsonError, readJson } from "@/lib/server/http"
import { startSession } from "@/lib/server/session"

export async function POST(request: Request) {
  try {
    if (userCount() === 0) return jsonError("Create the administrator account first.", 409)
    const body = asRecord(await readJson(request))
    const user = authenticate(asString(body?.email), asString(body?.password))
    if (!user) return jsonError("Email or password does not match an account.", 401)
    await startSession(user.id, request)
    return Response.json({ user })
  } catch (error) {
    return fromError(error)
  }
}
