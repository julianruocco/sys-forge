"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
} from "@xyflow/react"
import { graphFor } from "@/lib/mbse/queries"
import { useMbse } from "@/lib/mbse/store"
import { LINK_TOOLS, PLACE_TOOLS, type Tool } from "@/lib/mbse/types"
import { SysmlMarkers, edgeTypes, nodeTypes, type EdgeData, type NodeData } from "./sysml-nodes"
import "@xyflow/react/dist/style.css"

function CanvasInner() {
  const model = useMbse((state) => state.model)
  const diagramId = useMbse((state) => state.activeDiagramId)
  const selection = useMbse((state) => state.selection)
  const tool = useMbse((state) => state.tool)
  const canEdit = useMbse((state) => state.canEdit)
  const linkFromNodeId = useMbse((state) => state.linkFromNodeId)
  const place = useMbse((state) => state.place)
  const link = useMbse((state) => state.link)
  const armLink = useMbse((state) => state.armLink)
  const selectNode = useMbse((state) => state.selectNode)
  const selectRelationship = useMbse((state) => state.selectRelationship)
  const clearSelection = useMbse((state) => state.clearSelection)
  const connectPorts = useMbse((state) => state.connectPorts)
  const dragNode = useMbse((state) => state.dragNode)
  const pushHistory = useMbse((state) => state.pushHistory)
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow()

  const diagram = model?.diagrams.find((item) => item.id === diagramId)

  const built = useMemo(() => {
    if (!model || !diagram) return { key: "empty", nodes: [] as Node<NodeData>[], edges: [] as Edge<EdgeData>[] }
    const graph = graphFor(model, diagram)
    const structure = diagram.nodes.map((node) => `${node.id}@${node.x},${node.y}`).join("|")
    const links = model.relationships
      .map((relationship) =>
        [
          relationship.id,
          relationship.kind,
          relationship.name ?? "",
          relationship.sourceId,
          relationship.targetId,
          relationship.sourcePartId ?? "",
          relationship.targetPartId ?? "",
          relationship.sourcePortId ?? "",
          relationship.targetPortId ?? "",
        ].join(":"),
      )
      .join(";")
    return {
      key: `${diagram.id}:${structure}:${links}:${selection.nodeId ?? ""}:${selection.relationshipId ?? ""}:${model.elements.length}`,
      nodes: graph.nodes.map((node) => ({
        id: node.id,
        type: node.kind,
        position: { x: node.x, y: node.y },
        data: {
          elementId: node.elementId,
          partId: node.partId,
          partOwnerId: node.partOwnerId,
          width: node.width,
          height: node.height,
          title: node.title,
        },
        style: node.kind === "frame" ? { width: node.width, height: node.height, zIndex: 0 } : { zIndex: 2 },
        draggable: node.kind !== "frame",
        selectable: node.kind !== "frame",
        selected: node.id === selection.nodeId,
      })),
      edges: graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
        ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
        type: "sysml" as const,
        selected: edge.relationshipId === selection.relationshipId,
        data: { kind: edge.kind, label: edge.label, relationshipId: edge.relationshipId },
      })),
    }
  }, [model, diagram, selection.nodeId, selection.relationshipId])

  const [nodes, setNodes] = useState<Node<NodeData>[]>(built.nodes)
  const [edges, setEdges] = useState<Edge<EdgeData>[]>(built.edges)
  const [snapshotKey, setSnapshotKey] = useState(built.key)
  if (snapshotKey !== built.key) {
    setSnapshotKey(built.key)
    setNodes(built.nodes)
    setEdges(built.edges)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 180 })
    }, 40)
    return () => window.clearTimeout(timer)
  }, [diagramId, fitView])

  const onNodesChange: OnNodesChange<Node<NodeData>> = (changes) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }

  const placing = PLACE_TOOLS.includes(tool)
  const linking = LINK_TOOLS.includes(tool)

  return (
    <div className={`keel-canvas${placing ? " is-placing" : ""}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={null}
        selectionOnDrag={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.15}
        maxZoom={1.8}
        proOptions={{ hideAttribution: false }}
        onNodeClick={(_, node) => {
          if (node.type === "frame") return
          if (linking) {
            if (!linkFromNodeId) armLink(node.id)
            else link(linkFromNodeId, node.id)
            return
          }
          selectNode(node.id)
        }}
        onEdgeClick={(_, edge) => {
          const relationshipId = edge.data?.relationshipId
          if (relationshipId) selectRelationship(relationshipId)
        }}
        onPaneClick={(event) => {
          if (placing && diagramId) {
            const point = screenToFlowPosition({ x: event.clientX, y: event.clientY })
            place(tool as Tool & ("block" | "requirement" | "package" | "constraint"), point.x, point.y)
            return
          }
          clearSelection()
        }}
        onConnect={(connection: Connection) => {
          if (!connection.source || !connection.target) return
          connectPorts({
            sourceNodeId: connection.source,
            targetNodeId: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
          })
        }}
        onNodeDragStart={(_, node) => {
          if (node.type === "frame") return
          pushHistory()
        }}
        onNodeDragStop={(_, node) => {
          if (node.type === "frame") return
          dragNode(node.id, node.position.x, node.position.y)
        }}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.1} color="#d3dae3" />
        <SysmlMarkers />
      </ReactFlow>
      {diagram && diagram.nodes.length === 0 ? (
        <div className="keel-empty">
          Choose Block or Requirement, then click the canvas. Relationships are drawn by selecting a link tool and two symbols.
        </div>
      ) : null}
      <div className="keel-zoom">
        <button type="button" onClick={() => zoomIn({ duration: 120 })} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomOut({ duration: 120 })} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => fitView({ padding: 0.18, duration: 180 })} aria-label="Fit diagram">
          Fit
        </button>
      </div>
    </div>
  )
}

export function DiagramCanvas() {
  const diagramId = useMbse((state) => state.activeDiagramId)
  if (!diagramId) {
    return <div className="keel-empty">Create a diagram to start a view of the model.</div>
  }
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
