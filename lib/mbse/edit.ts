import { uid } from "./ids"
import { elementById, rootPackage } from "./queries"
import type {
  Diagram,
  DiagramKind,
  Element,
  ElementKind,
  Geometry,
  MbseModel,
  PartProperty,
  Port,
  RelationKind,
  Relationship,
  ValueProperty,
} from "./types"

function draftOf(model: MbseModel) {
  return structuredClone(model)
}

export function updateProject(model: MbseModel, patch: Partial<MbseModel["project"]>) {
  const draft = draftOf(model)
  draft.project = { ...draft.project, ...patch, id: draft.project.id }
  return draft
}

export function updateElement(model: MbseModel, id: string, patch: Partial<Element>) {
  const draft = draftOf(model)
  const element = draft.elements.find((item) => item.id === id)
  if (!element) return model
  Object.assign(element, patch, { id: element.id, kind: element.kind })
  return draft
}

export function updateDiagram(model: MbseModel, id: string, patch: Partial<Diagram>) {
  const draft = draftOf(model)
  const diagram = draft.diagrams.find((item) => item.id === id)
  if (!diagram) return model
  Object.assign(diagram, patch, { id: diagram.id, kind: diagram.kind, nodes: diagram.nodes })
  return draft
}

function factory(kind: ElementKind, id: string, ownerId: string | null, index: number): Element {
  if (kind === "requirement") {
    return {
      id,
      name: `New requirement ${index}`,
      kind,
      ownerId,
      reqId: `REQ-NEW-${String(index).padStart(3, "0")}`,
      text: "The system shall …",
      priority: "medium",
      status: "draft",
    }
  }
  if (kind === "package") {
    return { id, name: `Package ${index}`, kind, ownerId, documentation: "" }
  }
  if (kind === "constraint") {
    return {
      id,
      name: `Constraint ${index}`,
      kind,
      ownerId,
      expression: "constraint",
      documentation: "",
    }
  }
  return {
    id,
    name: `Block ${index}`,
    kind: "block",
    ownerId,
    stereotype: "block",
    documentation: "",
    values: [],
    parts: [],
    ports: [],
  }
}

export function placeElement(
  model: MbseModel,
  input: { diagramId: string; kind: ElementKind; x: number; y: number },
) {
  const draft = draftOf(model)
  const diagram = draft.diagrams.find((item) => item.id === input.diagramId)
  if (!diagram) return { model, elementId: null as string | null, nodeId: null as string | null }
  const count = draft.elements.filter((element) => element.kind === input.kind).length + 1
  const elementId = uid(input.kind === "requirement" ? "req" : input.kind === "package" ? "pkg" : input.kind === "constraint" ? "ctr" : "blk")
  const ownerId = diagram.ownerId ?? rootPackage(draft)?.id ?? null
  draft.elements.push(factory(input.kind, elementId, ownerId, count))
  const nodeId = uid("n")
  diagram.nodes.push({ id: nodeId, elementId, x: input.x, y: input.y })
  return { model: draft, elementId, nodeId }
}

export function moveNode(model: MbseModel, diagramId: string, nodeId: string, x: number, y: number) {
  const draft = draftOf(model)
  const node = draft.diagrams.find((diagram) => diagram.id === diagramId)?.nodes.find((item) => item.id === nodeId)
  if (!node) return model
  node.x = x
  node.y = y
  return draft
}

export function revealElement(model: MbseModel, diagramId: string, elementId: string) {
  const draft = draftOf(model)
  const diagram = draft.diagrams.find((item) => item.id === diagramId)
  if (!diagram) return { model, nodeId: null as string | null }
  const existing = diagram.nodes.find((node) => node.elementId === elementId && !node.partId)
  if (existing) return { model, nodeId: existing.id }
  const nodeId = uid("n")
  const offset = diagram.nodes.length * 24
  diagram.nodes.push({ id: nodeId, elementId, x: 80 + offset, y: 80 + offset })
  return { model: draft, nodeId }
}

function sameEnds(relationship: Relationship, next: Omit<Relationship, "id" | "name">) {
  return (
    relationship.kind === next.kind &&
    relationship.sourceId === next.sourceId &&
    relationship.targetId === next.targetId &&
    relationship.sourcePartId === next.sourcePartId &&
    relationship.targetPartId === next.targetPartId &&
    relationship.sourcePortId === next.sourcePortId &&
    relationship.targetPortId === next.targetPortId
  )
}

export function linkElements(
  model: MbseModel,
  input: {
    kind: RelationKind
    sourceId: string
    targetId: string
    sourcePartId?: string
    targetPartId?: string
    sourcePortId?: string
    targetPortId?: string
    name?: string
  },
) {
  if (input.sourceId === input.targetId && input.sourcePartId === input.targetPartId) return model
  const existing = model.relationships.find((relationship) => sameEnds(relationship, input))
  if (existing) return model
  const draft = draftOf(model)
  draft.relationships.push({
    id: uid("rel"),
    kind: input.kind,
    sourceId: input.sourceId,
    targetId: input.targetId,
    sourcePartId: input.sourcePartId,
    targetPartId: input.targetPartId,
    sourcePortId: input.sourcePortId,
    targetPortId: input.targetPortId,
    name: input.name,
  })
  return draft
}

export function removeRelationship(model: MbseModel, relationshipId: string) {
  const draft = draftOf(model)
  draft.relationships = draft.relationships.filter((relationship) => relationship.id !== relationshipId)
  return draft
}

export function removeNode(model: MbseModel, diagramId: string, nodeId: string) {
  const draft = draftOf(model)
  const diagram = draft.diagrams.find((item) => item.id === diagramId)
  if (!diagram) return model
  diagram.nodes = diagram.nodes.filter((node) => node.id !== nodeId)
  return draft
}

export function deleteElement(model: MbseModel, elementId: string) {
  const element = elementById(model, elementId)
  if (!element) return model
  const draft = draftOf(model)
  for (const child of draft.elements) {
    if (child.ownerId === elementId) child.ownerId = element.ownerId
  }
  for (const diagram of draft.diagrams) {
    if (diagram.ownerId === elementId) diagram.ownerId = element.ownerId
    if (diagram.contextId === elementId) diagram.contextId = undefined
    diagram.nodes = diagram.nodes.filter((node) => node.elementId !== elementId && node.partOwnerId !== elementId)
  }
  for (const owner of draft.elements) {
    if (owner.parts) owner.parts = owner.parts.filter((part) => part.typeId !== elementId)
  }
  draft.relationships = draft.relationships.filter(
    (relationship) => relationship.sourceId !== elementId && relationship.targetId !== elementId,
  )
  draft.elements = draft.elements.filter((item) => item.id !== elementId)
  return draft
}

export function createDiagram(
  model: MbseModel,
  input: { name: string; kind: DiagramKind; ownerId: string | null; contextId?: string },
) {
  const draft = draftOf(model)
  const id = uid("dia")
  draft.diagrams.push({
    id,
    name: input.name.trim() || "Untitled diagram",
    kind: input.kind,
    ownerId: input.ownerId,
    contextId: input.kind === "ibd" ? input.contextId : undefined,
    nodes: [],
  })
  return { model: draft, diagramId: id }
}

export function deleteDiagram(model: MbseModel, diagramId: string) {
  if (model.diagrams.length <= 1) return model
  const draft = draftOf(model)
  draft.diagrams = draft.diagrams.filter((diagram) => diagram.id !== diagramId)
  return draft
}

export function addValue(model: MbseModel, elementId: string) {
  const draft = draftOf(model)
  const element = draft.elements.find((item) => item.id === elementId)
  if (!element) return model
  element.values = element.values ?? []
  element.values.push({ id: uid("val"), name: "property", type: "Real", value: "", unit: "" })
  return draft
}

export function updateValue(model: MbseModel, elementId: string, valueId: string, patch: Partial<ValueProperty>) {
  const draft = draftOf(model)
  const value = draft.elements.find((item) => item.id === elementId)?.values?.find((item) => item.id === valueId)
  if (!value) return model
  Object.assign(value, patch, { id: value.id })
  return draft
}

export function removeValue(model: MbseModel, elementId: string, valueId: string) {
  const draft = draftOf(model)
  const element = draft.elements.find((item) => item.id === elementId)
  if (!element?.values) return model
  element.values = element.values.filter((value) => value.id !== valueId)
  return draft
}

export function addPart(model: MbseModel, ownerId: string, typeId: string) {
  const draft = draftOf(model)
  const owner = draft.elements.find((item) => item.id === ownerId)
  const type = elementById(draft, typeId)
  if (!owner || !type) return model
  owner.parts = owner.parts ?? []
  const part: PartProperty = {
    id: uid("part"),
    name: type.name.toLowerCase().replace(/[^a-z0-9]+/g, "") || "part",
    typeId,
    placement: { x: 0, y: 0, z: 0 },
  }
  owner.parts.push(part)
  const hasComposition = draft.relationships.some(
    (relationship) =>
      relationship.kind === "composition" && relationship.sourceId === ownerId && relationship.targetId === typeId,
  )
  if (!hasComposition) {
    draft.relationships.push({
      id: uid("rel"),
      kind: "composition",
      sourceId: ownerId,
      targetId: typeId,
      name: part.name,
    })
  }
  return draft
}

export function updatePart(model: MbseModel, ownerId: string, partId: string, patch: Partial<PartProperty>) {
  const draft = draftOf(model)
  const part = draft.elements.find((item) => item.id === ownerId)?.parts?.find((item) => item.id === partId)
  if (!part) return model
  Object.assign(part, patch, { id: part.id })
  if (patch.placement) part.placement = { ...part.placement, ...patch.placement, x: patch.placement.x, y: patch.placement.y, z: patch.placement.z }
  return draft
}

export function removePart(model: MbseModel, ownerId: string, partId: string) {
  const draft = draftOf(model)
  const owner = draft.elements.find((item) => item.id === ownerId)
  if (!owner?.parts) return model
  const part = owner.parts.find((item) => item.id === partId)
  owner.parts = owner.parts.filter((item) => item.id !== partId)
  for (const diagram of draft.diagrams) {
    diagram.nodes = diagram.nodes.filter((node) => node.partId !== partId)
  }
  draft.relationships = draft.relationships.filter(
    (relationship) => relationship.sourcePartId !== partId && relationship.targetPartId !== partId,
  )
  if (part && !owner.parts.some((item) => item.typeId === part.typeId)) {
    draft.relationships = draft.relationships.filter(
      (relationship) =>
        !(relationship.kind === "composition" && relationship.sourceId === ownerId && relationship.targetId === part.typeId),
    )
  }
  return draft
}

export function addPort(model: MbseModel, elementId: string) {
  const draft = draftOf(model)
  const element = draft.elements.find((item) => item.id === elementId)
  if (!element) return model
  element.ports = element.ports ?? []
  const port: Port = { id: uid("port"), name: "port", direction: "out", type: "Power" }
  element.ports.push(port)
  return draft
}

export function updatePort(model: MbseModel, elementId: string, portId: string, patch: Partial<Port>) {
  const draft = draftOf(model)
  const port = draft.elements.find((item) => item.id === elementId)?.ports?.find((item) => item.id === portId)
  if (!port) return model
  Object.assign(port, patch, { id: port.id })
  return draft
}

export function removePort(model: MbseModel, elementId: string, portId: string) {
  const draft = draftOf(model)
  const element = draft.elements.find((item) => item.id === elementId)
  if (!element?.ports) return model
  element.ports = element.ports.filter((port) => port.id !== portId)
  for (const relationship of draft.relationships) {
    if (relationship.sourcePortId === portId) relationship.sourcePortId = undefined
    if (relationship.targetPortId === portId) relationship.targetPortId = undefined
  }
  return draft
}

export function setGeometry(model: MbseModel, elementId: string, geometry: Geometry | undefined) {
  const draft = draftOf(model)
  const element = draft.elements.find((item) => item.id === elementId)
  if (!element) return model
  element.geometry = geometry
  return draft
}
