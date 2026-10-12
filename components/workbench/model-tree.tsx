"use client"

import { useMemo, useState } from "react"
import {
  Box,
  ChevronDown,
  ChevronRight,
  Component,
  Diamond,
  Folder,
  ScrollText,
  SquareDashed,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { elementById } from "@/lib/mbse/queries"
import { useMbse } from "@/lib/mbse/store"
import type { Diagram, Element, ElementKind } from "@/lib/mbse/types"

function ancestorIds(elements: Element[], id: string) {
  const ids = new Set<string>()
  const byId = new Map(elements.map((element) => [element.id, element]))
  let owner = byId.get(id)?.ownerId ?? null
  while (owner) {
    ids.add(owner)
    owner = byId.get(owner)?.ownerId ?? null
  }
  return ids
}

export function ModelTree() {
  const model = useMbse((state) => state.model)
  const selection = useMbse((state) => state.selection)
  const activeDiagramId = useMbse((state) => state.activeDiagramId)
  const selectElement = useMbse((state) => state.selectElement)
  const selectPart = useMbse((state) => state.selectPart)
  const selectDiagram = useMbse((state) => state.selectDiagram)
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const visible = useMemo(() => {
    if (!model || !query.trim()) return null
    const needle = query.trim().toLowerCase()
    const ids = new Set<string>()
    for (const element of model.elements) {
      const hay = `${element.name} ${element.reqId ?? ""} ${element.text ?? ""}`.toLowerCase()
      if (!hay.includes(needle)) continue
      ids.add(element.id)
      for (const ancestor of ancestorIds(model.elements, element.id)) ids.add(ancestor)
    }
    return ids
  }, [model, query])

  if (!model) return null
  const roots = model.elements.filter((element) => element.ownerId === null)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="keel-pane-head">Containment</div>
      <div className="px-2 py-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a block or requirement"
          aria-label="Find in the model"
          className="h-7 text-xs"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-1 pb-3">
        {roots.map((element) => (
          <TreeElement
            key={element.id}
            element={element}
            depth={0}
            visible={visible}
            collapsed={collapsed}
            toggle={(id) => setCollapsed((current) => ({ ...current, [id]: !current[id] }))}
            selectionId={selection.partId ?? selection.elementId}
            activeDiagramId={activeDiagramId}
            onElement={selectElement}
            onPart={selectPart}
            onDiagram={selectDiagram}
          />
        ))}
        {visible && visible.size === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Nothing in the model matches that search.</p>
        ) : null}
      </div>
    </div>
  )
}

function TreeElement({
  element,
  depth,
  visible,
  collapsed,
  toggle,
  selectionId,
  activeDiagramId,
  onElement,
  onPart,
  onDiagram,
}: {
  element: Element
  depth: number
  visible: Set<string> | null
  collapsed: Record<string, boolean>
  toggle: (id: string) => void
  selectionId: string | null
  activeDiagramId: string | null
  onElement: (id: string) => void
  onPart: (ownerId: string, partId: string) => void
  onDiagram: (id: string) => void
}) {
  const model = useMbse((state) => state.model)
  if (!model) return null
  if (visible && !visible.has(element.id)) return null
  const children = model.elements.filter((item) => item.ownerId === element.id)
  const diagrams = model.diagrams.filter((diagram) => diagram.ownerId === element.id)
  const parts = element.parts ?? []
  const hasKids = children.length + diagrams.length + parts.length > 0
  const isCollapsed = collapsed[element.id] && !visible

  return (
    <div>
      <div className="flex items-stretch" style={{ paddingLeft: depth * 12 }}>
        <button
          type="button"
          className="keel-twist"
          aria-label={isCollapsed ? `Expand ${element.name}` : `Collapse ${element.name}`}
          onClick={() => toggle(element.id)}
          disabled={!hasKids}
        >
          {hasKids ? isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} /> : null}
        </button>
        <button
          type="button"
          className={`keel-tree-row${selectionId === element.id ? " is-selected" : ""}`}
          onClick={() => onElement(element.id)}
        >
          <KindGlyph kind={element.kind} />
          <span className="truncate">{element.reqId ? `${element.reqId} ${element.name}` : element.name}</span>
        </button>
      </div>
      {isCollapsed ? null : (
        <>
          {parts.map((part) => {
            const type = elementById(model, part.typeId)
            return (
              <button
                key={part.id}
                type="button"
                className={`keel-tree-row w-[calc(100%-8px)]${selectionId === part.id ? " is-selected" : ""}`}
                style={{ marginLeft: (depth + 1) * 12 + 22 }}
                onClick={() => onPart(element.id, part.id)}
              >
                <Component size={13} />
                <span className="truncate">
                  {part.name}
                  <span className="keel-tree-meta"> : {type?.name ?? "missing"}</span>
                </span>
              </button>
            )
          })}
          {diagrams.map((diagram) => (
            <DiagramRow
              key={diagram.id}
              diagram={diagram}
              depth={depth + 1}
              active={diagram.id === activeDiagramId}
              onOpen={onDiagram}
            />
          ))}
          {children.map((child) => (
            <TreeElement
              key={child.id}
              element={child}
              depth={depth + 1}
              visible={visible}
              collapsed={collapsed}
              toggle={toggle}
              selectionId={selectionId}
              activeDiagramId={activeDiagramId}
              onElement={onElement}
              onPart={onPart}
              onDiagram={onDiagram}
            />
          ))}
        </>
      )}
    </div>
  )
}

function DiagramRow({
  diagram,
  depth,
  active,
  onOpen,
}: {
  diagram: Diagram
  depth: number
  active: boolean
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      className={`keel-tree-row${active ? " is-selected" : ""}`}
      style={{ marginLeft: depth * 12 + 22 }}
      onClick={() => onOpen(diagram.id)}
    >
      <SquareDashed size={13} />
      <span className="truncate">
        <span className="keel-tree-meta">{diagram.kind} </span>
        {diagram.name}
      </span>
    </button>
  )
}

function KindGlyph({ kind }: { kind: ElementKind }) {
  if (kind === "package") return <Folder size={13} />
  if (kind === "requirement") return <ScrollText size={13} />
  if (kind === "constraint") return <Diamond size={13} />
  return <Box size={13} />
}
