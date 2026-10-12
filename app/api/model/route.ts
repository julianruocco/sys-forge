import { connection } from "next/server"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { aetherModel } from "@/lib/mbse/seed"
import { MODEL_FILE, MODEL_SCHEMA } from "@/lib/mbse/types"
import type { MbseModel } from "@/lib/mbse/types"

function modelPath() {
  return path.join(process.cwd(), MODEL_FILE)
}

function isModel(value: unknown): value is MbseModel {
  if (!value || typeof value !== "object") return false
  const model = value as MbseModel
  return (
    model.schema === MODEL_SCHEMA &&
    typeof model.project?.name === "string" &&
    Array.isArray(model.elements) &&
    Array.isArray(model.relationships) &&
    Array.isArray(model.diagrams)
  )
}

export async function GET() {
  await connection()
  const file = modelPath()
  try {
    const text = await readFile(file, "utf8")
    const parsed: unknown = JSON.parse(text)
    if (!isModel(parsed)) {
      return Response.json({ error: "The model file is not a Keel model." }, { status: 422 })
    }
    return Response.json(parsed)
  } catch {
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(aetherModel, null, 2) + "\n")
    return Response.json(aetherModel)
  }
}

export async function PUT(request: Request) {
  await connection()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "The body is not JSON." }, { status: 400 })
  }
  if (!isModel(body)) {
    return Response.json({ error: "Refusing to write a file that is not a Keel model." }, { status: 400 })
  }
  const file = modelPath()
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(body, null, 2) + "\n")
  return Response.json({ ok: true })
}
