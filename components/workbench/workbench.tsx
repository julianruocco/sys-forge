"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMbse } from "@/lib/mbse/store"
import type { DiagramKind, Tool, WorkbenchView } from "@/lib/mbse/types"
import { DiagramCanvas } from "./diagram-canvas"
import { Inspector } from "./inspector"
import { MatrixView } from "./matrix-view"
import { ModelTree } from "./model-tree"
import { SpecView } from "./spec-view"

const AssemblyView = dynamic(
  () => import("./assembly-view").then((mod) => mod.AssemblyView),
  { ssr: false, loading: () => <div className="keel-empty">Loading the assembly…</div> },
)

const VIEWS: { id: WorkbenchView; label: string }[] = [
  { id: "diagram", label: "Diagram" },
  { id: "assembly", label: "Assembly" },
  { id: "matrix", label: "Matrix" },
  { id: "spec", label: "Spec" },
]

const TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "block", label: "Block" },
  { id: "requirement", label: "Requirement" },
  { id: "package", label: "Package" },
  { id: "constraint", label: "Constraint" },
  { id: "composition", label: "Composition" },
  { id: "association", label: "Association" },
  { id: "generalization", label: "Generalization" },
  { id: "satisfy", label: "Satisfy" },
  { id: "deriveReqt", label: "Derive" },
  { id: "refine", label: "Refine" },
  { id: "verify", label: "Verify" },
  { id: "allocate", label: "Allocate" },
  { id: "connector", label: "Connector" },
]

export function Workbench() {
  const status = useMbse((state) => state.status)
  const error = useMbse((state) => state.error)
  const load = useMbse((state) => state.load)

  useEffect(() => {
    void load()
  }, [load])

  if (status === "loading") {
    return (
      <div className="keel">
        <TopBar />
        <div className="keel-empty">Opening the Aether-1 model…</div>
      </div>
    )
  }
  if (status === "error") {
    return (
      <div className="keel">
        <TopBar />
        <div className="keel-empty">
          <p>{error ?? "The model could not be opened."}</p>
          <Button className="mt-3" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }
  return <Shell />
}

function Shell() {
  const model = useMbse((state) => state.model)
  const saveState = useMbse((state) => state.saveState)
  const view = useMbse((state) => state.view)
  const tool = useMbse((state) => state.tool)
  const linkFromNodeId = useMbse((state) => state.linkFromNodeId)
  const [mobilePane, setMobilePane] = useState<"tree" | "stage" | "spec">("stage")
  const [diagramOpen, setDiagramOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
          if (event.key === "Escape") target.blur()
          return
        }
      }
      const state = useMbse.getState()
      if (event.key === "Escape") {
        state.cancelLink()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void state.save()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault()
        state.redo()
        return
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault()
        if (event.shiftKey) state.deleteSelectedElement()
        else if (state.selection.relationshipId) state.deleteSelectedRelationship()
        else state.removeSelectedFromDiagram()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (saveState !== "dirty") return
    const timer = window.setTimeout(() => {
      void useMbse.getState().save()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [saveState, model])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = useMbse.getState().saveState
      if (state === "dirty" || state === "saving") event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  const banner =
    linkFromNodeId && view === "diagram"
      ? `Select the target element for ${tool}. Escape cancels.`
      : tool !== "select" && view === "diagram"
        ? tool === "connector"
          ? "Drag from a port to another port, or click two symbols."
          : ["block", "requirement", "package", "constraint"].includes(tool)
            ? `Click the canvas to place a ${tool}.`
            : `Click the source, then the target, to add a ${tool} link.`
        : null

  return (
    <div className="keel">
      <TopBar onNewDiagram={() => setDiagramOpen(true)} onReset={() => setResetOpen(true)} />
      {view === "diagram" ? <DiagramTabs /> : null}
      {view === "diagram" ? (
        <div className="keel-tools">
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`keel-tool${tool === item.id ? " is-on" : ""}`}
              aria-pressed={tool === item.id}
              onClick={() => useMbse.getState().setTool(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {banner ? <div className="keel-banner">{banner}</div> : null}
      <div className="keel-body">
        <aside className={`keel-side${mobilePane === "tree" ? " is-open" : ""}`}>
          <ModelTree />
        </aside>
        <main className={`keel-stage${mobilePane === "stage" ? " is-open" : ""}`}>
          {view === "diagram" ? <DiagramCanvas /> : null}
          {view === "assembly" ? <AssemblyView /> : null}
          {view === "matrix" ? <MatrixView /> : null}
          {view === "spec" ? <SpecView /> : null}
        </main>
        <aside className={`keel-side keel-inspector${mobilePane === "spec" ? " is-open" : ""}`}>
          <Inspector />
        </aside>
      </div>
      <footer className="keel-footer">
        <span>model/aether-1.mbse.json</span>
        <span>{saveLabel(saveState)}</span>
        <span className="hidden md:inline">Delete removes a symbol. Shift+Delete deletes the element.</span>
        <Issues />
      </footer>
      <nav className="keel-mobile-nav">
        <button type="button" className={mobilePane === "tree" ? "is-on" : ""} onClick={() => setMobilePane("tree")}>
          Model
        </button>
        <button type="button" className={mobilePane === "stage" ? "is-on" : ""} onClick={() => setMobilePane("stage")}>
          View
        </button>
        <button type="button" className={mobilePane === "spec" ? "is-on" : ""} onClick={() => setMobilePane("spec")}>
          Spec
        </button>
      </nav>
      <NewDiagramDialog open={diagramOpen} onOpenChange={setDiagramOpen} />
      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  )
}

function TopBar({ onNewDiagram, onReset }: { onNewDiagram?: () => void; onReset?: () => void }) {
  const model = useMbse((state) => state.model)
  const view = useMbse((state) => state.view)
  const setView = useMbse((state) => state.setView)
  const undo = useMbse((state) => state.undo)
  const redo = useMbse((state) => state.redo)
  const save = useMbse((state) => state.save)
  const past = useMbse((state) => state.past.length)
  const future = useMbse((state) => state.future.length)
  return (
    <header className="keel-top">
      <div className="keel-brand">
        <span className="keel-mark">Keel</span>
        <span className="keel-brand-sub">Systems modeler</span>
      </div>
      <div className="keel-project">
        <strong>{model?.project.name ?? "Keel"}</strong>
        <span>{model ? `v${model.project.version}` : ""}</span>
      </div>
      <div className="keel-views">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? "is-on" : ""}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="keel-top-actions">
        <Button size="xs" variant="outline" onClick={undo} disabled={past === 0}>
          Undo
        </Button>
        <Button size="xs" variant="outline" onClick={redo} disabled={future === 0}>
          Redo
        </Button>
        <Button size="xs" variant="outline" onClick={onNewDiagram} disabled={!model || !onNewDiagram}>
          New diagram
        </Button>
        <Button size="xs" variant="outline" onClick={() => void save()} disabled={!model}>
          Save
        </Button>
        <Button size="xs" variant="ghost" onClick={onReset} disabled={!model || !onReset}>
          Reset example
        </Button>
      </div>
    </header>
  )
}

function DiagramTabs() {
  const diagrams = useMbse((state) => state.model?.diagrams ?? [])
  const activeId = useMbse((state) => state.activeDiagramId)
  const setActiveDiagram = useMbse((state) => state.setActiveDiagram)
  return (
    <div className="keel-tabs" role="tablist" aria-label="Diagrams">
      {diagrams.map((diagram) => (
        <button
          key={diagram.id}
          type="button"
          role="tab"
          aria-selected={diagram.id === activeId}
          className={diagram.id === activeId ? "is-on" : ""}
          onClick={() => setActiveDiagram(diagram.id)}
        >
          <span>{diagram.kind}</span>
          {diagram.name}
        </button>
      ))}
    </div>
  )
}

function Issues() {
  const issues = useMbse((state) => state.issues)
  if (issues.length === 0) return <span>Model checks out</span>
  return <span title={issues.join("\n")}>{issues.length} model {issues.length === 1 ? "issue" : "issues"}</span>
}

function saveLabel(state: ReturnType<typeof useMbse.getState>["saveState"]) {
  if (state === "saving") return "Saving…"
  if (state === "dirty") return "Unsaved changes"
  if (state === "error") return "Save failed"
  return "Saved"
}

function NewDiagramDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("Untitled diagram")
  const [kind, setKind] = useState<DiagramKind>("bdd")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New diagram</DialogTitle>
          <DialogDescription>
            The diagram starts empty. Show existing elements from the specification, or place new ones.
          </DialogDescription>
        </DialogHeader>
        <label className="keel-field">
          <span>Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="keel-field">
          <span>Kind</span>
          <Select value={kind} onValueChange={(value) => { if (value) setKind(value as DiagramKind) }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bdd">Block definition</SelectItem>
              <SelectItem value="ibd">Internal block</SelectItem>
              <SelectItem value="req">Requirements</SelectItem>
              <SelectItem value="pkg">Packages</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <DialogFooter>
          <Button
            onClick={() => {
              useMbse.getState().newDiagram(name, kind)
              onOpenChange(false)
            }}
          >
            Create diagram
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset to the Aether-1 example?</DialogTitle>
          <DialogDescription>
            This replaces the working model with the CubeSat example and writes that model back to disk.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep working
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              useMbse.getState().resetExample()
              onOpenChange(false)
            }}
          >
            Reset example
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
