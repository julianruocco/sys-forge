export const MODEL_SCHEMA = "keel.mbse/v1" as const

export const MODEL_FILE = "model/aether-1.mbse.json"
export const SPEC_FILE = "model/AETHER-1.md"

export type ElementKind = "package" | "block" | "requirement" | "constraint"

export type RelationKind =
  | "composition"
  | "association"
  | "generalization"
  | "satisfy"
  | "deriveReqt"
  | "refine"
  | "trace"
  | "verify"
  | "allocate"
  | "connector"

export type DiagramKind = "bdd" | "ibd" | "req" | "pkg"

export type ValueProperty = {
  id: string
  name: string
  type: string
  value?: string
  unit?: string
}

export type Placement = {
  x: number
  y: number
  z: number
}

export type PartProperty = {
  id: string
  name: string
  typeId: string
  multiplicity?: string
  placement?: Placement
}

export type Port = {
  id: string
  name: string
  direction: "in" | "out" | "inout"
  type?: string
}

export type Geometry = {
  /** Millimeters. Cylinder uses x as diameter and z as length. */
  shape: "box" | "cylinder" | "frame" | "envelope"
  x: number
  y: number
  z: number
  color: string
}

export type Measure = {
  property: string
  op: "<=" | ">="
  value: number
  unit?: string
}

export type EnvelopeLimit = {
  x: number
  y: number
  z: number
  unit?: string
}

export type Element = {
  id: string
  name: string
  kind: ElementKind
  ownerId: string | null
  stereotype?: string
  documentation?: string
  values?: ValueProperty[]
  parts?: PartProperty[]
  ports?: Port[]
  geometry?: Geometry
  reqId?: string
  text?: string
  priority?: "high" | "medium" | "low"
  status?: "draft" | "approved" | "verified"
  measure?: Measure
  envelope?: EnvelopeLimit
  expression?: string
}

export type Relationship = {
  id: string
  kind: RelationKind
  sourceId: string
  targetId: string
  name?: string
  sourcePartId?: string
  targetPartId?: string
  sourcePortId?: string
  targetPortId?: string
}

export type DiagramNode = {
  id: string
  elementId: string
  x: number
  y: number
  partId?: string
  partOwnerId?: string
}

export type Diagram = {
  id: string
  name: string
  kind: DiagramKind
  ownerId: string | null
  nodes: DiagramNode[]
  contextId?: string
}

export type ProjectInfo = {
  id: string
  name: string
  description: string
  version: string
}

export type MbseModel = {
  schema: typeof MODEL_SCHEMA
  project: ProjectInfo
  elements: Element[]
  relationships: Relationship[]
  diagrams: Diagram[]
}

export type Tool =
  | "select"
  | "block"
  | "requirement"
  | "package"
  | "constraint"
  | "composition"
  | "association"
  | "generalization"
  | "satisfy"
  | "deriveReqt"
  | "refine"
  | "trace"
  | "verify"
  | "allocate"
  | "connector"

export type WorkbenchView = "diagram" | "assembly" | "matrix" | "spec"

export type Selection = {
  elementId: string | null
  nodeId: string | null
  relationshipId: string | null
  partId: string | null
  partOwnerId: string | null
  diagramId: string | null
}

export const EMPTY_SELECTION: Selection = {
  elementId: null,
  nodeId: null,
  relationshipId: null,
  partId: null,
  partOwnerId: null,
  diagramId: null,
}

export const PLACE_TOOLS: Tool[] = ["block", "requirement", "package", "constraint"]

export const LINK_TOOLS: Tool[] = [
  "composition",
  "association",
  "generalization",
  "satisfy",
  "deriveReqt",
  "refine",
  "trace",
  "verify",
  "allocate",
  "connector",
]

export const DIAGRAM_KIND_LABEL: Record<DiagramKind, string> = {
  bdd: "bdd",
  ibd: "ibd",
  req: "req",
  pkg: "pkg",
}

export const RELATION_LABEL: Record<RelationKind, string> = {
  composition: "composition",
  association: "association",
  generalization: "generalization",
  satisfy: "«satisfy»",
  deriveReqt: "«deriveReqt»",
  refine: "«refine»",
  trace: "«trace»",
  verify: "«verify»",
  allocate: "«allocate»",
  connector: "connector",
}
