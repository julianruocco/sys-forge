import { RELATION_LABEL } from "./types"
import type {
  Diagram,
  Element,
  MbseModel,
  RelationKind,
  Relationship,
} from "./types"

export function elementById(model: MbseModel | null | undefined, id: string | null | undefined) {
  if (!model || !id) return undefined
  return model.elements.find((element) => element.id === id)
}

export function childrenOf(model: MbseModel, ownerId: string | null) {
  return model.elements.filter((element) => element.ownerId === ownerId)
}

export function rootPackage(model: MbseModel) {
  return model.elements.find((element) => element.kind === "package" && element.ownerId === null)
}

export function numericValue(element: Element, name: string) {
  const property = element.values?.find((value) => value.name === name)
  if (!property?.value) return null
  const parsed = Number(property.value)
  return Number.isFinite(parsed) ? parsed : null
}

function multiplicity(value?: string) {
  if (!value) return 1
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function rollup(
  model: MbseModel,
  elementId: string,
  property: string,
  stack: Set<string> = new Set(),
): number {
  if (stack.has(elementId)) return 0
  const element = elementById(model, elementId)
  if (!element) return 0
  stack.add(elementId)
  let sum = numericValue(element, property) ?? 0
  for (const part of element.parts ?? []) {
    sum += rollup(model, part.typeId, property, stack) * multiplicity(part.multiplicity)
  }
  stack.delete(elementId)
  return sum
}

export function assemblyRoot(model: MbseModel) {
  return model.elements
    .filter((element) => element.kind === "block")
    .reduce<Element | undefined>((best, element) => {
      const count = element.parts?.length ?? 0
      const bestCount = best?.parts?.length ?? -1
      return count > bestCount ? element : best
    }, undefined)
}

export type MassLine = {
  key: string
  name: string
  own: number
  depth: number
}

export function massBreakdown(
  model: MbseModel,
  elementId: string,
  depth = 0,
  stack: Set<string> = new Set(),
): MassLine[] {
  if (stack.has(elementId)) return []
  const element = elementById(model, elementId)
  if (!element) return []
  stack.add(elementId)
  const lines: MassLine[] = []
  const own = numericValue(element, "mass")
  if (own !== null) {
    lines.push({ key: `${elementId}:${depth}:${lines.length}`, name: element.name, own, depth })
  }
  for (const part of element.parts ?? []) {
    const type = elementById(model, part.typeId)
    const nested = massBreakdown(model, part.typeId, depth + 1, stack)
    if (nested.length === 0 && type) {
      lines.push({
        key: part.id,
        name: `${part.name} : ${type.name}`,
        own: 0,
        depth: depth + 1,
      })
    } else {
      lines.push(
        ...nested.map((line, index) =>
          index === 0
            ? { ...line, key: part.id, name: `${part.name} : ${type?.name ?? line.name}` }
            : line,
        ),
      )
    }
  }
  stack.delete(elementId)
  return lines
}

export type MeasureCheck = {
  actual: number
  limit: number
  op: "<=" | ">="
  unit?: string
  pass: boolean
  property: string
}

export function checkMeasure(model: MbseModel, requirement: Element): MeasureCheck | null {
  if (!requirement.measure) return null
  const root = assemblyRoot(model)
  if (!root) return null
  const actual = rollup(model, root.id, requirement.measure.property)
  const { op, value, unit, property } = requirement.measure
  const pass = op === "<=" ? actual <= value + 1e-9 : actual >= value - 1e-9
  return { actual, limit: value, op, unit, pass, property }
}

export type EnvelopeCheck = {
  x: number
  y: number
  z: number
  limitX: number
  limitY: number
  limitZ: number
  pass: boolean
}

export function checkEnvelope(model: MbseModel, requirement: Element): EnvelopeCheck | null {
  if (!requirement.envelope) return null
  const root = assemblyRoot(model)
  const geometry = root?.geometry
  if (!geometry) return null
  const pass =
    geometry.x <= requirement.envelope.x + 1e-6 &&
    geometry.y <= requirement.envelope.y + 1e-6 &&
    geometry.z <= requirement.envelope.z + 1e-6
  return {
    x: geometry.x,
    y: geometry.y,
    z: geometry.z,
    limitX: requirement.envelope.x,
    limitY: requirement.envelope.y,
    limitZ: requirement.envelope.z,
    pass,
  }
}

export function relationshipsOf(model: MbseModel, elementId: string) {
  return model.relationships.filter(
    (relationship) => relationship.sourceId === elementId || relationship.targetId === elementId,
  )
}

export function satisfiedBy(model: MbseModel, requirementId: string) {
  return model.relationships
    .filter((relationship) => relationship.kind === "satisfy" && relationship.targetId === requirementId)
    .map((relationship) => elementById(model, relationship.sourceId))
    .filter((element): element is Element => Boolean(element))
}

export function unsatisfiedRequirements(model: MbseModel) {
  return model.elements.filter(
    (element) => element.kind === "requirement" && satisfiedBy(model, element.id).length === 0,
  )
}

export function validate(model: MbseModel) {
  const issues: string[] = []
  const ids = new Set<string>()
  for (const element of model.elements) {
    if (ids.has(element.id)) issues.push(`Duplicate element id ${element.id}`)
    ids.add(element.id)
  }
  for (const element of model.elements) {
    if (element.ownerId && !ids.has(element.ownerId)) {
      issues.push(`${element.name} owner ${element.ownerId} does not exist`)
    }
    for (const part of element.parts ?? []) {
      if (!ids.has(part.typeId)) issues.push(`${element.name}.${part.name} types a missing block`)
    }
    if (element.geometry?.shape === "stl" && !element.geometry.stlId) {
      issues.push(`${element.name} is an STL solid with no file attached`)
    }
  }
  const relIds = new Set<string>()
  for (const relationship of model.relationships) {
    if (relIds.has(relationship.id)) issues.push(`Duplicate relationship id ${relationship.id}`)
    relIds.add(relationship.id)
    if (!ids.has(relationship.sourceId) || !ids.has(relationship.targetId)) {
      issues.push(`Relationship ${relationship.id} points outside the model`)
    }
  }
  const diagramIds = new Set<string>()
  for (const diagram of model.diagrams) {
    if (diagramIds.has(diagram.id)) issues.push(`Duplicate diagram id ${diagram.id}`)
    diagramIds.add(diagram.id)
    for (const node of diagram.nodes) {
      if (!ids.has(node.elementId)) {
        issues.push(`${diagram.name} shows missing element ${node.elementId}`)
      }
    }
  }
  return issues
}

export type GraphNode = {
  id: string
  kind: "block" | "requirement" | "package" | "part" | "constraint" | "frame"
  x: number
  y: number
  width: number
  height?: number
  elementId?: string
  partId?: string
  partOwnerId?: string
  title?: string
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  kind: RelationKind
  label: string
  relationshipId: string
}

const NODE_WIDTH = {
  block: 248,
  requirement: 300,
  package: 210,
  part: 210,
  constraint: 230,
  frame: 1120,
} as const

function endpointNode(diagram: Diagram, elementId: string, partId?: string) {
  if (partId) return diagram.nodes.find((node) => node.partId === partId)
  return diagram.nodes.find((node) => !node.partId && node.elementId === elementId)
}

function edgeLabel(model: MbseModel, relationship: Relationship) {
  if (relationship.name) return relationship.name
  return RELATION_LABEL[relationship.kind]
}

export function graphFor(model: MbseModel, diagram: Diagram) {
  const nodes: GraphNode[] = []
  if (diagram.kind === "ibd") {
    const context = elementById(model, diagram.contextId)
    nodes.push({
      id: `frame-${diagram.id}`,
      kind: "frame",
      x: 16,
      y: 16,
      width: 1120,
      height: 680,
      elementId: diagram.contextId,
      title: context?.name ?? "context",
    })
  }
  for (const node of diagram.nodes) {
    const element = elementById(model, node.elementId)
    if (!element) continue
    const kind = node.partId
      ? "part"
      : element.kind === "package"
        ? "package"
        : element.kind === "requirement"
          ? "requirement"
          : element.kind === "constraint"
            ? "constraint"
            : "block"
    nodes.push({
      id: node.id,
      kind,
      x: node.x,
      y: node.y,
      width: NODE_WIDTH[kind],
      elementId: node.elementId,
      partId: node.partId,
      partOwnerId: node.partOwnerId,
    })
  }
  const edges: GraphEdge[] = []
  for (const relationship of model.relationships) {
    const source = endpointNode(diagram, relationship.sourceId, relationship.sourcePartId)
    const target = endpointNode(diagram, relationship.targetId, relationship.targetPartId)
    if (!source || !target || source.id === target.id) continue
    edges.push({
      id: `${diagram.id}:${relationship.id}`,
      source: source.id,
      target: target.id,
      sourceHandle: relationship.sourcePortId,
      targetHandle: relationship.targetPortId,
      kind: relationship.kind,
      label: edgeLabel(model, relationship),
      relationshipId: relationship.id,
    })
  }
  return { nodes, edges }
}

export type SolidNode = {
  key: string
  name: string
  elementId: string
  partId?: string
  partOwnerId?: string
  shape: NonNullable<Element["geometry"]>["shape"]
  size: { x: number; y: number; z: number }
  color: string
  stlId?: string
  stlScale?: number
  position: { x: number; y: number; z: number }
  children: SolidNode[]
}

export function solidTree(
  model: MbseModel,
  elementId: string,
  part?: { id: string; name: string; ownerId: string; placement?: { x: number; y: number; z: number } },
  stack: Set<string> = new Set(),
): SolidNode | null {
  if (stack.has(elementId)) return null
  const element = elementById(model, elementId)
  if (!element?.geometry) return null
  stack.add(elementId)
  const children: SolidNode[] = []
  for (const child of element.parts ?? []) {
    const solid = solidTree(
      model,
      child.typeId,
      {
        id: child.id,
        name: child.name,
        ownerId: element.id,
        placement: child.placement,
      },
      stack,
    )
    if (solid) children.push(solid)
  }
  stack.delete(elementId)
  return {
    key: part?.id ?? element.id,
    name: part ? `${part.name} : ${element.name}` : element.name,
    elementId: element.id,
    partId: part?.id,
    partOwnerId: part?.ownerId,
    shape: element.geometry.shape,
    size: { x: element.geometry.x, y: element.geometry.y, z: element.geometry.z },
    color: element.geometry.color,
    stlId: element.geometry.stlId,
    stlScale: element.geometry.stlScale,
    position: part?.placement ?? { x: 0, y: 0, z: 0 },
    children,
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

export function toMarkdown(model: MbseModel) {
  const root = assemblyRoot(model)
  const lines: string[] = []
  lines.push(`# ${model.project.name}`, "")
  lines.push(model.project.description, "")
  lines.push(`Version ${model.project.version}`, "")
  lines.push("This spec is generated from the project model. Edit the model, then write the spec again.", "")
  const stlBlocks = model.elements.filter((element) => element.geometry?.shape === "stl" && element.geometry.stlName)
  if (stlBlocks.length > 0) {
    lines.push("## STL solids", "")
    for (const block of stlBlocks) {
      lines.push(`- ${block.name}: ${block.geometry?.stlName}`)
    }
    lines.push("")
  }

  if (root) {
    const mass = rollup(model, root.id, "mass")
    const draw = rollup(model, root.id, "powerDraw")
    const supply = rollup(model, root.id, "powerSupply")
    lines.push("## Budgets", "")
    lines.push(`- Rolled-up mass: **${round(mass)} kg**`)
    lines.push(`- Rolled-up power draw: **${round(draw)} W**`)
    lines.push(`- Rolled-up power supply: **${round(supply)} W**`, "")
    lines.push("### Mass breakdown", "")
    lines.push("| Usage | Own mass (kg) |")
    lines.push("| --- | ---: |")
    for (const line of massBreakdown(model, root.id)) {
      const indent = "&nbsp;".repeat(line.depth * 4)
      lines.push(`| ${indent}${line.name} | ${line.own ? round(line.own) : ""} |`)
    }
    lines.push("")
  }

  lines.push("## Requirements", "")
  for (const requirement of model.elements.filter((element) => element.kind === "requirement")) {
    const satisfiers = satisfiedBy(model, requirement.id)
    const measure = checkMeasure(model, requirement)
    const envelope = checkEnvelope(model, requirement)
    lines.push(`### ${requirement.reqId ?? requirement.id} ${requirement.name}`, "")
    lines.push(requirement.text ?? "", "")
    lines.push(`- Priority: ${requirement.priority ?? "unset"}`)
    lines.push(`- Status: ${requirement.status ?? "unset"}`)
    lines.push(
      `- Satisfied by: ${satisfiers.length ? satisfiers.map((element) => element.name).join(", ") : "nobody"}`,
    )
    if (measure) {
      lines.push(
        `- Check: ${measure.property} ${round(measure.actual)} ${measure.op} ${measure.limit} ${measure.unit ?? ""} — ${measure.pass ? "pass" : "fail"}`,
      )
    }
    if (envelope) {
      lines.push(
        `- Envelope: ${envelope.x}×${envelope.y}×${envelope.z} mm against ${envelope.limitX}×${envelope.limitY}×${envelope.limitZ} mm — ${envelope.pass ? "pass" : "fail"}`,
      )
    }
    lines.push("")
  }

  lines.push("## Interfaces", "")
  for (const relationship of model.relationships.filter((item) => item.kind === "connector")) {
    const source = elementById(model, relationship.sourceId)
    const target = elementById(model, relationship.targetId)
    const sourcePort = source?.ports?.find((port) => port.id === relationship.sourcePortId)
    const targetPort = target?.ports?.find((port) => port.id === relationship.targetPortId)
    lines.push(
      `- ${relationship.name ? `${relationship.name}: ` : ""}${source?.name ?? relationship.sourceId}.${sourcePort?.name ?? "port"} → ${target?.name ?? relationship.targetId}.${targetPort?.name ?? "port"}`,
    )
  }
  lines.push("")
  return lines.join("\n")
}
