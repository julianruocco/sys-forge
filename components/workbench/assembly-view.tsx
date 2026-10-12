"use client"

import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react"
import { Grid, OrbitControls } from "@react-three/drei"
import { Canvas, useLoader } from "@react-three/fiber"
import type { ThreeEvent } from "@react-three/fiber"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { assemblyRoot, rollup, solidTree, type SolidNode } from "@/lib/mbse/queries"
import { useMbse } from "@/lib/mbse/store"

export function AssemblyView() {
  const model = useMbse((state) => state.model)
  if (!model) return null
  const root = assemblyRoot(model)
  const tree = root ? solidTree(model, root.id) : null
  if (!root || !tree) {
    return (
      <div className="keel-empty">
        No block with geometry is in the model yet. Select a block and add a solid in the specification.
      </div>
    )
  }
  const mass = rollup(model, root.id, "mass")
  const draw = rollup(model, root.id, "powerDraw")

  return (
    <div className="relative h-full min-h-0">
      <AssemblyBoundary>
        <Canvas camera={{ position: [420, 240, 520], fov: 32, near: 0.1, far: 50000 }} gl={{ antialias: true }}>
          <color attach="background" args={["#e7edf2"]} />
          <ambientLight intensity={0.62} />
          <directionalLight position={[220, 380, 180]} intensity={1.45} />
          <directionalLight position={[-180, 60, -140]} intensity={0.4} />
          <SceneRoot node={tree} />
          <Grid
            args={[1200, 1200]}
            position={[0, -230, 0]}
            cellSize={20}
            sectionSize={100}
            cellColor="#c5d0da"
            sectionColor="#8ea0b0"
            fadeDistance={1400}
            infiniteGrid
          />
          <OrbitControls makeDefault target={[0, 0, 0]} />
        </Canvas>
      </AssemblyBoundary>
      <div className="keel-assembly-card">
        <strong>{root.name}</strong>
        <span>{mass.toFixed(2)} kg rolled up</span>
        <span>{draw.toFixed(2)} W orbit-average draw</span>
        <span>Drag to orbit. Click a solid to select its part.</span>
        {treeHasStl(tree) ? <span>STL meshes use file units as millimeters.</span> : null}
      </div>
    </div>
  )
}

function SceneRoot({ node }: { node: SolidNode }) {
  const selection = useMbse((state) => state.selection)
  return <SolidMesh node={node} selection={selection} />
}

function SolidMesh({
  node,
  selection,
}: {
  node: SolidNode
  selection: { elementId: string | null; partId: string | null }
}) {
  const selectPart = useMbse((state) => state.selectPart)
  const selectElement = useMbse((state) => state.selectElement)
  const selected = node.partId
    ? selection.partId === node.partId
    : selection.elementId === node.elementId && !selection.partId
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (node.partId && node.partOwnerId) selectPart(node.partOwnerId, node.partId)
    else selectElement(node.elementId)
  }
  return (
    <group position={[node.position.x, node.position.z, node.position.y]}>
      <Body node={node} selected={selected} onClick={onClick} />
      {node.children.map((child) => (
        <SolidMesh key={child.key} node={child} selection={selection} />
      ))}
    </group>
  )
}

function Body({
  node,
  selected,
  onClick,
}: {
  node: SolidNode
  selected: boolean
  onClick: (event: ThreeEvent<MouseEvent>) => void
}) {
  const color = selected ? "#e2a322" : node.color
  if (node.shape === "frame") {
    const thickness = 5
    const hx = node.size.x / 2 - thickness / 2
    const hz = node.size.y / 2 - thickness / 2
    const corners: Array<[number, number]> = [
      [hx, hz],
      [hx, -hz],
      [-hx, hz],
      [-hx, -hz],
    ]
    return (
      <group>
        {corners.map(([x, z]) => (
          <mesh key={`${x}:${z}`} position={[x, 0, z]} onClick={onClick}>
            <boxGeometry args={[thickness, node.size.z, thickness]} />
            <meshStandardMaterial color={color} metalness={0.55} roughness={0.32} />
          </mesh>
        ))}
      </group>
    )
  }
  if (node.shape === "envelope") {
    return (
      <mesh raycast={() => null}>
        <boxGeometry args={[node.size.x, node.size.z, node.size.y]} />
        <meshBasicMaterial color="#5d6d7c" wireframe transparent opacity={0.55} />
      </mesh>
    )
  }
  if (node.shape === "stl") {
    const fallback = <SolidMaterial node={node} selected={selected} onClick={onClick} />
    if (!node.stlId) return fallback
    return (
      <MeshBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <StlMesh node={node} selected={selected} onClick={onClick} />
        </Suspense>
      </MeshBoundary>
    )
  }
  if (node.shape === "cylinder") {
    return (
      <mesh onClick={onClick}>
        <cylinderGeometry args={[node.size.x / 2, node.size.x / 2, node.size.z, 28]} />
        <meshStandardMaterial
          color={color}
          metalness={0.4}
          roughness={0.38}
          emissive={selected ? "#8a5a00" : "#000000"}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
    )
  }
  return <SolidMaterial node={node} selected={selected} onClick={onClick} />
}

function SolidMaterial({
  node,
  selected,
  onClick,
}: {
  node: SolidNode
  selected: boolean
  onClick: (event: ThreeEvent<MouseEvent>) => void
}) {
  const color = selected ? "#e2a322" : node.color
  return (
    <mesh onClick={onClick}>
      <boxGeometry args={[node.size.x, node.size.z, node.size.y]} />
      <meshStandardMaterial
        color={color}
        metalness={0.28}
        roughness={0.46}
        emissive={selected ? "#8a5a00" : "#000000"}
        emissiveIntensity={selected ? 0.22 : 0}
      />
    </mesh>
  )
}

function StlMesh({
  node,
  selected,
  onClick,
}: {
  node: SolidNode
  selected: boolean
  onClick: (event: ThreeEvent<MouseEvent>) => void
}) {
  const projectId = useMbse((state) => state.projectId)
  const geometry = useLoader(STLLoader, `/api/projects/${projectId}/stl/${node.stlId}`)
  const centered = useMemo(() => {
    const next = geometry.clone()
    next.computeVertexNormals()
    next.center()
    return next
  }, [geometry])
  useEffect(() => () => centered.dispose(), [centered])
  const scale = node.stlScale && node.stlScale > 0 ? node.stlScale : 1
  const color = selected ? "#e2a322" : node.color
  return (
    <mesh geometry={centered} scale={scale} onClick={onClick}>
      <meshStandardMaterial
        color={color}
        metalness={0.35}
        roughness={0.42}
        emissive={selected ? "#8a5a00" : "#000000"}
        emissiveIntensity={selected ? 0.25 : 0}
      />
    </mesh>
  )
}

function treeHasStl(node: SolidNode): boolean {
  return node.shape === "stl" || node.children.some(treeHasStl)
}

class MeshBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

class AssemblyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="keel-empty">
          The assembly view could not start WebGL in this browser. Diagrams and the specification still work.
        </div>
      )
    }
    return this.props.children
  }
}
