import { deleteUser, listUsers } from "@/lib/server/accounts"
import { asRecord, asString, fromError, isUser, jsonError, readJson, requireApiUser } from "@/lib/server/http"
import { createAccount } from "@/lib/server/projects"

export async function GET() {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    return Response.json({ accounts: listUsers(user) })
  } catch (error) {
    return fromError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    if (user.role !== "admin") return jsonError("Only an administrator can add accounts.", 403)
    const body = asRecord(await readJson(request))
    const role = body?.role === "admin" ? "admin" : "member"
    const account = createAccount({
      name: asString(body?.name),
      email: asString(body?.email),
      password: asString(body?.password),
      role,
      grantExisting: body?.grantExisting !== false,
    })
    return Response.json({ account })
  } catch (error) {
    return fromError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const body = asRecord(await readJson(request))
    deleteUser(user, asString(body?.userId))
    return Response.json({ ok: true })
  } catch (error) {
    return fromError(error)
  }
}
