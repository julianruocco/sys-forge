import { MODEL_SCHEMA, type Geometry, type MbseModel } from "./types"

const SHAPES = new Set<Geometry["shape"]>(["box", "cylinder", "frame", "envelope", "stl"])

function isGeometry(value: unknown): value is Geometry {
  if (!value || typeof value !== "object") return false
  const geometry = value as Geometry
  if (!SHAPES.has(geometry.shape)) return false
  if (![geometry.x, geometry.y, geometry.z].every((item) => typeof item === "number" && Number.isFinite(item))) {
    return false
  }
  if (typeof geometry.color !== "string" || geometry.color.length > 32) return false
  if (geometry.stlId != null && !/^stl-[a-f0-9]{16}$/.test(geometry.stlId)) return false
  if (geometry.stlName != null && (typeof geometry.stlName !== "string" || geometry.stlName.length > 180)) return false
  if (
    geometry.stlScale != null &&
    (typeof geometry.stlScale !== "number" || !Number.isFinite(geometry.stlScale) || geometry.stlScale <= 0 || geometry.stlScale > 100000)
  ) {
    return false
  }
  return true
}

export function isMbseModel(value: unknown): value is MbseModel {
  if (!value || typeof value !== "object") return false
  const model = value as MbseModel
  if (model.schema !== MODEL_SCHEMA) return false
  if (!model.project || typeof model.project.name !== "string" || typeof model.project.description !== "string") return false
  if (!Array.isArray(model.elements) || !Array.isArray(model.relationships) || !Array.isArray(model.diagrams)) return false
  for (const element of model.elements) {
    if (!element || typeof element !== "object") return false
    if (typeof element.id !== "string" || typeof element.name !== "string" || typeof element.kind !== "string") return false
    if (element.geometry && !isGeometry(element.geometry)) return false
  }
  return true
}
