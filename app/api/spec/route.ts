import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { toMarkdown } from "@/lib/mbse/queries"
import { MODEL_SCHEMA, SPEC_FILE } from "@/lib/mbse/types"
import type { MbseModel } from "@/lib/mbse/types"

export async function PUT(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "The body is not JSON." }, { status: 400 })
  }
  const model = body as MbseModel
  if (model?.schema !== MODEL_SCHEMA) {
    return Response.json({ error: "Refusing to write a spec from an unrecognized model." }, { status: 400 })
  }
  const file = path.join(process.cwd(), SPEC_FILE)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, toMarkdown(model))
  return Response.json({ ok: true, path: SPEC_FILE })
}
