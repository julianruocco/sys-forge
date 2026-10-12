export async function PUT() {
  return Response.json({ error: "Specs are written from inside a project." }, { status: 410 })
}
