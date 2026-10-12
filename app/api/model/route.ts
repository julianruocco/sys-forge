export async function GET() {
  return Response.json({ error: "Open a project from the library. Models are no longer served from this address." }, { status: 410 })
}

export async function PUT() {
  return Response.json({ error: "Models are saved inside a project." }, { status: 410 })
}
