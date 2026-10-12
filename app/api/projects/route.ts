import { asRecord, asString, fromError, isUser, readJson, requireApiUser } from "@/lib/server/http"
import { createProject, listProjects } from "@/lib/server/projects"

export async function GET() {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    return Response.json({ projects: listProjects(user) })
  } catch (error) {
    return fromError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser()
    if (!isUser(user)) return user
    const body = asRecord(await readJson(request))
    const template = body?.template === "aether" ? "aether" : "blank"
    const project = createProject(user, {
      name: asString(body?.name),
      description: asString(body?.description),
      template,
    })
    return Response.json({ project })
  } catch (error) {
    return fromError(error)
  }
}
