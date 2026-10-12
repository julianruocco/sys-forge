"use client"

import type { ReactNode } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { elementById } from "@/lib/mbse/queries"
import { useMbse } from "@/lib/mbse/store"
import type { Port, RelationKind } from "@/lib/mbse/types"

export type NodeData = {
  elementId?: string
  partId?: string
  partOwnerId?: string
  width: number
  height?: number
  title?: string
}

export type EdgeData = {
  kind: RelationKind
  label: string
  relationshipId: string
}

const DASHED = new Set<RelationKind>(["satisfy", "deriveReqt", "refine", "trace", "verify", "allocate"])

function useElement(id?: string) {
  return useMbse((state) => state.model?.elements.find((element) => element.id === id))
}

function PortHandles({ ports }: { ports: Port[] }) {
  const incoming = ports.filter((port) => port.direction === "in")
  const outgoing = ports.filter((port) => port.direction === "out" || port.direction === "inout")
  return (
    <>
      {incoming.map((port, index) => (
        <Handle
          key={`${port.id}:in`}
          id={port.id}
          type="target"
          position={Position.Left}
          title={`${port.name}${port.type ? ` : ${port.type}` : ""}`}
          style={{ top: 28 + index * 16 }}
        />
      ))}
      {outgoing.map((port, index) => (
        <Handle
          key={`${port.id}:out`}
          id={port.id}
          type="source"
          position={Position.Right}
          title={`${port.name}${port.type ? ` : ${port.type}` : ""}`}
          style={{ top: 28 + index * 16 }}
        />
      ))}
    </>
  )
}

function Box({
  kind,
  selected,
  width,
  stereotype,
  title,
  children,
  ports,
}: {
  kind: string
  selected: boolean
  width: number
  stereotype: string
  title: string
  children?: ReactNode
  ports?: Port[]
}) {
  const showPorts = useMbse(
    (state) => state.model?.diagrams.find((diagram) => diagram.id === state.activeDiagramId)?.kind === "ibd",
  )
  return (
    <div className={`sysml sysml-${kind}${selected ? " is-selected" : ""}`} style={{ width }}>
      <div className="sysml-head">
        <div className="sysml-stereo">«{stereotype}»</div>
        <div className="sysml-title">{title}</div>
      </div>
      {children}
      {showPorts && ports && ports.length > 0 ? (
        <PortHandles ports={ports} />
      ) : (
        <>
          <Handle type="target" position={Position.Top} />
          <Handle type="source" position={Position.Bottom} />
        </>
      )}
    </div>
  )
}

function ValueLines({ elementId }: { elementId: string }) {
  const element = useElement(elementId)
  if (!element?.values?.length) return null
  return (
    <div className="sysml-compartment">
      {element.values.map((value) => (
        <div key={value.id} className="sysml-line">
          {value.name}: {value.type}
          {value.value ? ` = ${value.value}` : ""}
          {value.unit ? ` ${value.unit}` : ""}
        </div>
      ))}
    </div>
  )
}

function PartLines({ elementId }: { elementId: string }) {
  const element = useElement(elementId)
  const model = useMbse((state) => state.model)
  if (!element?.parts?.length || !model) return null
  return (
    <div className="sysml-compartment">
      {element.parts.map((part) => (
        <div key={part.id} className="sysml-line">
          {part.name} : {elementById(model, part.typeId)?.name ?? "missing"}
          {part.multiplicity ? ` [${part.multiplicity}]` : ""}
        </div>
      ))}
    </div>
  )
}

export function BlockNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const element = useElement(data.elementId)
  if (!element) return null
  return (
    <Box kind="block" selected={selected} width={data.width} stereotype={element.stereotype || "block"} title={element.name} ports={element.ports}>
      <ValueLines elementId={element.id} />
      <PartLines elementId={element.id} />
    </Box>
  )
}

export function PartNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const element = useElement(data.elementId)
  const owner = useElement(data.partOwnerId)
  const part = owner?.parts?.find((item) => item.id === data.partId)
  if (!element) return null
  return (
    <Box
      kind="part"
      selected={selected}
      width={data.width}
      stereotype="part"
      title={`${part?.name ?? "part"} : ${element.name}`}
      ports={element.ports}
    >
      {element.ports && element.ports.length > 0 ? (
        <div className="sysml-compartment">
          {element.ports.map((port) => (
            <div key={port.id} className="sysml-line">
              {port.direction === "out" ? "out " : port.direction === "in" ? "in " : ""}
              {port.name}
              {port.type ? ` : ${port.type}` : ""}
            </div>
          ))}
        </div>
      ) : null}
    </Box>
  )
}

export function RequirementNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const element = useElement(data.elementId)
  if (!element) return null
  return (
    <Box kind="requirement" selected={selected} width={data.width} stereotype="requirement" title={element.name}>
      <div className="sysml-compartment">
        {element.reqId ? <div className="sysml-id">{element.reqId}</div> : null}
        <div className="sysml-text">{element.text}</div>
      </div>
    </Box>
  )
}

export function PackageNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const element = useElement(data.elementId)
  if (!element) return null
  return (
    <div className={`sysml sysml-package${selected ? " is-selected" : ""}`} style={{ width: data.width }}>
      <div className="sysml-folder-tab">«package»</div>
      <div className="sysml-title">{element.name}</div>
    </div>
  )
}

export function ConstraintNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const element = useElement(data.elementId)
  if (!element) return null
  return (
    <Box kind="constraint" selected={selected} width={data.width} stereotype="constraint" title={element.name}>
      <div className="sysml-compartment">
        <div className="sysml-line sysml-expr">{`{ ${element.expression || "constraint"} }`}</div>
      </div>
    </Box>
  )
}

export function FrameNode({ data }: NodeProps<Node<NodeData>>) {
  return (
    <div className="sysml-frame" style={{ width: data.width, height: data.height }}>
      <div className="sysml-frame-tab">ibd [ {data.title} ]</div>
    </div>
  )
}

export function SysmlEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<Edge<EdgeData>>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  })
  const kind = data?.kind
  const dashed = kind ? DASHED.has(kind) : false
  const markerStart = kind === "composition" ? "url(#keel-diamond)" : undefined
  const markerEnd =
    kind === "generalization" ? "url(#keel-triangle)" : dashed ? "url(#keel-arrow)" : undefined
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "#1d4e89" : "#1c2430",
          strokeWidth: selected ? 2 : 1.2,
          strokeDasharray: dashed ? "6 4" : undefined,
        }}
      />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className={`sysml-edge-label${selected ? " is-selected" : ""}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

export const nodeTypes = {
  block: BlockNode,
  part: PartNode,
  requirement: RequirementNode,
  package: PackageNode,
  constraint: ConstraintNode,
  frame: FrameNode,
}

export const edgeTypes = {
  sysml: SysmlEdge,
}

export function SysmlMarkers() {
  return (
    <svg className="keel-markers" aria-hidden="true">
      <defs>
        <marker id="keel-diamond" viewBox="0 0 16 12" refX="8" refY="6" markerWidth="14" markerHeight="10" orient="auto-start-reverse">
          <polygon points="0,6 8,0 16,6 8,12" fill="#1c2430" />
        </marker>
        <marker id="keel-triangle" viewBox="0 0 14 12" refX="13" refY="6" markerWidth="12" markerHeight="10" orient="auto">
          <polygon points="0,0 14,6 0,12" fill="#ffffff" stroke="#1c2430" strokeWidth="1.2" />
        </marker>
        <marker id="keel-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
          <path d="M1 1 L11 6 L1 11" fill="none" stroke="#1c2430" strokeWidth="1.4" />
        </marker>
      </defs>
    </svg>
  )
}
