export const STL_MAX_BYTES = 32 * 1024 * 1024

export function inspectStl(
  bytes: Uint8Array,
  filename: string,
): { ok: true; kind: "ascii" | "binary" } | { ok: false; error: string } {
  if (!filename.toLowerCase().endsWith(".stl")) return { ok: false, error: "Use a .stl file." }
  if (bytes.byteLength === 0) return { ok: false, error: "The STL file is empty." }
  if (bytes.byteLength > STL_MAX_BYTES) return { ok: false, error: "STL files need to be 32 MB or smaller." }

  if (bytes.byteLength >= 84) {
    const count = readUint32LE(bytes, 80)
    const expected = 84 + count * 50
    if (count > 0 && expected === bytes.byteLength) return { ok: true, kind: "binary" }
  }

  const sample = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.byteLength, 4096))).toLowerCase()
  if (sample.startsWith("solid") && (sample.includes("facet") || sample.includes("endsolid"))) {
    return { ok: true, kind: "ascii" }
  }
  return { ok: false, error: "That file is not a binary or ASCII STL." }
}

export function safeStlName(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? "model.stl"
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, "").slice(0, 120)
  if (!cleaned) return "model.stl"
  return cleaned.toLowerCase().endsWith(".stl") ? cleaned : `${cleaned}.stl`
}

function readUint32LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536 + bytes[offset + 3] * 16777216
}
