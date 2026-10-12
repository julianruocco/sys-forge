"use client"

import { create } from "zustand"
import {
  addPart,
  addPort,
  addValue,
  createDiagram,
  deleteDiagram,
  deleteElement,
  linkElements,
  moveNode,
  placeElement,
  removeNode,
  removePart,
  removePort,
  removeRelationship,
  removeValue,
  revealElement,
  setGeometry,
  updateDiagram,
  updateElement,
  updatePart,
  updatePort,
  updateProject,
  updateValue,
} from "./edit"
import { validate } from "./queries"
import { aetherModel } from "./seed"
import type {
  DiagramKind,
  Element,
  ElementKind,
  Geometry,
  MbseModel,
  PartProperty,
  Port,
  RelationKind,
  Selection,
  Tool,
  ValueProperty,
  WorkbenchView,
} from "./types"
import { EMPTY_SELECTION, MODEL_SCHEMA } from "./types"

type SaveState = "saved" | "dirty" | "saving" | "error"

type MbseState = {
  model: MbseModel | null
  status: "loading" | "ready" | "error"
  error?: string
  saveState: SaveState
  saveGen: number
  issues: string[]
  activeDiagramId: string | null
  view: WorkbenchView
  tool: Tool
  linkFromNodeId: string | null
  selection: Selection
  focusName: boolean
  past: MbseModel[]
  future: MbseModel[]
  load: () => Promise<void>
  reload: () => Promise<void>
  save: () => Promise<void>
  resetExample: () => void
  undo: () => void
  redo: () => void
  pushHistory: () => void
  setView: (view: WorkbenchView) => void
  setTool: (tool: Tool) => void
  setActiveDiagram: (diagramId: string) => void
  selectElement: (elementId: string | null) => void
  selectNode: (nodeId: string | null) => void
  selectRelationship: (relationshipId: string | null) => void
  selectPart: (ownerId: string, partId: string) => void
  selectDiagram: (diagramId: string) => void
  clearSelection: () => void
  clearFocus: () => void
  cancelLink: () => void
  armLink: (nodeId: string) => void
  toggleSatisfy: (blockId: string, requirementId: string) => void
  editProject: (patch: Partial<MbseModel["project"]>) => void
  editElement: (id: string, patch: Partial<Element>) => void
  editDiagram: (id: string, patch: { name?: string }) => void
  place: (kind: ElementKind, x: number, y: number) => void
  link: (sourceNodeId: string, targetNodeId: string) => void
  connectPorts: (input: {
    sourceNodeId: string
    targetNodeId: string
    sourceHandle?: string | null
    targetHandle?: string | null
  }) => void
  dragNode: (nodeId: string, x: number, y: number) => void
  removeSelectedFromDiagram: () => void
  deleteSelectedElement: () => void
  deleteSelectedRelationship: () => void
  showOnDiagram: (elementId: string) => void
  newDiagram: (name: string, kind: DiagramKind) => void
  removeDiagram: (diagramId: string) => void
  addValue: (elementId: string) => void
  editValue: (elementId: string, valueId: string, patch: Partial<ValueProperty>) => void
  removeValue: (elementId: string, valueId: string) => void
  addPart: (ownerId: string, typeId: string) => void
  editPart: (ownerId: string, partId: string, patch: Partial<PartProperty>) => void
  removePart: (ownerId: string, partId: string) => void
  addPort: (elementId: string) => void
  editPort: (elementId: string, portId: string, patch: Partial<Port>) => void
  removePort: (elementId: string, portId: string) => void
  editGeometry: (elementId: string, geometry: Geometry | undefined) => void
}

function applyModel(
  current: MbseState,
  model: MbseModel,
  extra?: Partial<MbseState>,
): Partial<MbseState> {
  return {
    model,
    issues: validate(model),
    saveState: "dirty",
    saveGen: current.saveGen + 1,
    past: [...current.past, current.model!].slice(-40),
    future: [],
    ...extra,
  }
}

function adopt(model: MbseModel, previousDiagramId: string | null) {
  const stillThere = model.diagrams.some((diagram) => diagram.id === previousDiagramId)
  return stillThere ? previousDiagramId : (model.diagrams.find((diagram) => diagram.id === "dia-bdd")?.id ?? model.diagrams[0]?.id ?? null)
}

export const useMbse = create<MbseState>((set, get) => ({
  model: structuredClone(aetherModel),
  status: "ready",
  saveState: "saved",
  saveGen: 0,
  issues: validate(aetherModel),
  activeDiagramId: "dia-bdd",
  view: "diagram",
  tool: "select",
  linkFromNodeId: null,
  selection: EMPTY_SELECTION,
  focusName: false,
  past: [],
  future: [],

  load: async () => {
    const hadModel = Boolean(get().model)
    if (!hadModel) set({ status: "loading", error: undefined })
    try {
      const response = await fetch("/api/model", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error("The model file could not be read.")
      const model = (await response.json()) as MbseModel
      if (model.schema !== MODEL_SCHEMA) throw new Error("This file is not a Keel model.")
      set({
        model,
        status: "ready",
        saveState: "saved",
        issues: validate(model),
        activeDiagramId: adopt(model, get().activeDiagramId),
        past: [],
        future: [],
        selection: EMPTY_SELECTION,
        tool: "select",
        linkFromNodeId: null,
      })
    } catch (error) {
      if (hadModel) return
      set({
        status: "error",
        error: error instanceof Error ? error.message : "The model could not be opened.",
      })
    }
  },

  reload: async () => {
    const previous = get().activeDiagramId
    const response = await fetch("/api/model", { cache: "no-store" })
    if (!response.ok) {
      set({ saveState: "error" })
      return
    }
    const model = (await response.json()) as MbseModel
    set({
      model,
      status: "ready",
      saveState: "saved",
      issues: validate(model),
      activeDiagramId: adopt(model, previous),
      past: [],
      future: [],
      selection: EMPTY_SELECTION,
    })
  },

  save: async () => {
    const snapshot = get().model
    if (!snapshot) return
    const gen = get().saveGen
    set({ saveState: "saving" })
    try {
      const response = await fetch("/api/model", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snapshot),
      })
      if (!response.ok) throw new Error("Save failed")
      if (get().saveGen === gen) set({ saveState: "saved" })
    } catch {
      if (get().saveGen === gen) set({ saveState: "error" })
    }
  },

  resetExample: () => {
    const current = get()
    if (!current.model) return
    const model = structuredClone(aetherModel)
    set(
      applyModel(current, model, {
        activeDiagramId: "dia-bdd",
        selection: EMPTY_SELECTION,
        view: "diagram",
        tool: "select",
        linkFromNodeId: null,
      }),
    )
  },

  undo: () => {
    const { past, model, future, saveGen } = get()
    if (!model || past.length === 0) return
    const previous = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      future: [model, ...future].slice(0, 40),
      model: previous,
      issues: validate(previous),
      saveState: "dirty",
      saveGen: saveGen + 1,
      activeDiagramId: adopt(previous, get().activeDiagramId),
    })
  },

  redo: () => {
    const { past, model, future, saveGen } = get()
    if (!model || future.length === 0) return
    const next = future[0]
    set({
      future: future.slice(1),
      past: [...past, model].slice(-40),
      model: next,
      issues: validate(next),
      saveState: "dirty",
      saveGen: saveGen + 1,
      activeDiagramId: adopt(next, get().activeDiagramId),
    })
  },

  pushHistory: () => {
    const model = get().model
    if (!model) return
    set({ past: [...get().past, structuredClone(model)].slice(-40), future: [] })
  },

  setView: (view) => set({ view }),
  setTool: (tool) => set({ tool, linkFromNodeId: null }),
  setActiveDiagram: (diagramId) =>
    set({ activeDiagramId: diagramId, view: "diagram", linkFromNodeId: null, selection: { ...EMPTY_SELECTION, diagramId } }),

  selectElement: (elementId) =>
    set({
      selection: { ...EMPTY_SELECTION, elementId },
      linkFromNodeId: null,
    }),
  selectNode: (nodeId) => {
    const model = get().model
    const diagram = model?.diagrams.find((item) => item.id === get().activeDiagramId)
    const node = diagram?.nodes.find((item) => item.id === nodeId)
    set({
      selection: {
        ...EMPTY_SELECTION,
        elementId: node?.elementId ?? null,
        nodeId: nodeId,
        partId: node?.partId ?? null,
        partOwnerId: node?.partOwnerId ?? null,
      },
    })
  },
  selectRelationship: (relationshipId) =>
    set({ selection: { ...EMPTY_SELECTION, relationshipId }, linkFromNodeId: null }),
  selectPart: (ownerId, partId) => {
    const part = get().model?.elements.find((element) => element.id === ownerId)?.parts?.find((item) => item.id === partId)
    set({
      selection: {
        ...EMPTY_SELECTION,
        elementId: part?.typeId ?? null,
        partId,
        partOwnerId: ownerId,
      },
      view: get().view,
    })
  },
  selectDiagram: (diagramId) =>
    set({
      activeDiagramId: diagramId,
      view: "diagram",
      selection: { ...EMPTY_SELECTION, diagramId },
      linkFromNodeId: null,
    }),
  clearSelection: () => set({ selection: EMPTY_SELECTION, linkFromNodeId: null }),
  clearFocus: () => set({ focusName: false }),
  cancelLink: () => set({ linkFromNodeId: null, tool: "select" }),
  armLink: (nodeId) => set({ linkFromNodeId: nodeId }),
  toggleSatisfy: (blockId, requirementId) => {
    const current = get()
    if (!current.model) return
    const existing = current.model.relationships.find(
      (relationship) =>
        relationship.kind === "satisfy" &&
        relationship.sourceId === blockId &&
        relationship.targetId === requirementId,
    )
    const model = existing
      ? removeRelationship(current.model, existing.id)
      : linkElements(current.model, { kind: "satisfy", sourceId: blockId, targetId: requirementId })
    set(applyModel(current, model))
  },

  editProject: (patch) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, updateProject(current.model, patch)))
  },
  editElement: (id, patch) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, updateElement(current.model, id, patch)))
  },
  editDiagram: (id, patch) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, updateDiagram(current.model, id, patch)))
  },

  place: (kind, x, y) => {
    const current = get()
    if (!current.model || !current.activeDiagramId) return
    const result = placeElement(current.model, { diagramId: current.activeDiagramId, kind, x, y })
    if (!result.elementId || !result.nodeId) return
    set(
      applyModel(current, result.model, {
        tool: "select",
        focusName: true,
        selection: { ...EMPTY_SELECTION, elementId: result.elementId, nodeId: result.nodeId },
      }),
    )
  },

  link: (sourceNodeId, targetNodeId) => {
    const current = get()
    const tool = current.tool
    if (!current.model || !current.activeDiagramId) return
    if (tool === "select" || tool === "block" || tool === "requirement" || tool === "package" || tool === "constraint") {
      return
    }
    const diagram = current.model.diagrams.find((item) => item.id === current.activeDiagramId)
    const source = diagram?.nodes.find((node) => node.id === sourceNodeId)
    const target = diagram?.nodes.find((node) => node.id === targetNodeId)
    if (!source || !target) return
    set(
      applyModel(
        current,
        linkElements(current.model, {
          kind: tool as RelationKind,
          sourceId: source.elementId,
          targetId: target.elementId,
          sourcePartId: source.partId,
          targetPartId: target.partId,
        }),
        { tool: "select", linkFromNodeId: null },
      ),
    )
  },

  connectPorts: ({ sourceNodeId, targetNodeId, sourceHandle, targetHandle }) => {
    const current = get()
    if (!current.model || !current.activeDiagramId) return
    const diagram = current.model.diagrams.find((item) => item.id === current.activeDiagramId)
    const source = diagram?.nodes.find((node) => node.id === sourceNodeId)
    const target = diagram?.nodes.find((node) => node.id === targetNodeId)
    if (!source || !target) return
    set(
      applyModel(
        current,
        linkElements(current.model, {
          kind: "connector",
          sourceId: source.elementId,
          targetId: target.elementId,
          sourcePartId: source.partId,
          targetPartId: target.partId,
          sourcePortId: sourceHandle ?? undefined,
          targetPortId: targetHandle ?? undefined,
        }),
        { tool: "select", linkFromNodeId: null },
      ),
    )
  },

  dragNode: (nodeId, x, y) => {
    const current = get()
    if (!current.model || !current.activeDiagramId) return
    const model = moveNode(current.model, current.activeDiagramId, nodeId, x, y)
    set({
      model,
      saveState: "dirty",
      saveGen: current.saveGen + 1,
    })
  },

  removeSelectedFromDiagram: () => {
    const current = get()
    if (!current.model || !current.activeDiagramId || !current.selection.nodeId) return
    set(
      applyModel(current, removeNode(current.model, current.activeDiagramId, current.selection.nodeId), {
        selection: EMPTY_SELECTION,
      }),
    )
  },

  deleteSelectedElement: () => {
    const current = get()
    const elementId = current.selection.elementId
    if (!current.model || !elementId) return
    set(applyModel(current, deleteElement(current.model, elementId), { selection: EMPTY_SELECTION }))
  },

  deleteSelectedRelationship: () => {
    const current = get()
    const relationshipId = current.selection.relationshipId
    if (!current.model || !relationshipId) return
    set(
      applyModel(current, removeRelationship(current.model, relationshipId), {
        selection: EMPTY_SELECTION,
      }),
    )
  },

  showOnDiagram: (elementId) => {
    const current = get()
    if (!current.model || !current.activeDiagramId) return
    const result = revealElement(current.model, current.activeDiagramId, elementId)
    set(
      applyModel(current, result.model, {
        view: "diagram",
        selection: { ...EMPTY_SELECTION, elementId, nodeId: result.nodeId },
      }),
    )
  },

  newDiagram: (name, kind) => {
    const current = get()
    if (!current.model) return
    const ownerId =
      current.model.diagrams.find((diagram) => diagram.id === current.activeDiagramId)?.ownerId ??
      current.model.elements.find((element) => element.kind === "package" && !element.ownerId)?.id ??
      null
    const contextId = current.selection.elementId ?? current.model.elements.find((element) => (element.parts?.length ?? 0) > 0)?.id
    const result = createDiagram(current.model, { name, kind, ownerId, contextId })
    set(
      applyModel(current, result.model, {
        activeDiagramId: result.diagramId,
        view: "diagram",
        selection: { ...EMPTY_SELECTION, diagramId: result.diagramId },
      }),
    )
  },

  removeDiagram: (diagramId) => {
    const current = get()
    if (!current.model) return
    const model = deleteDiagram(current.model, diagramId)
    set(applyModel(current, model, { activeDiagramId: adopt(model, current.activeDiagramId), selection: EMPTY_SELECTION }))
  },

  addValue: (elementId) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, addValue(current.model, elementId)))
  },
  editValue: (elementId, valueId, patch) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, updateValue(current.model, elementId, valueId, patch)))
  },
  removeValue: (elementId, valueId) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, removeValue(current.model, elementId, valueId)))
  },
  addPart: (ownerId, typeId) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, addPart(current.model, ownerId, typeId)))
  },
  editPart: (ownerId, partId, patch) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, updatePart(current.model, ownerId, partId, patch)))
  },
  removePart: (ownerId, partId) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, removePart(current.model, ownerId, partId)))
  },
  addPort: (elementId) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, addPort(current.model, elementId)))
  },
  editPort: (elementId, portId, patch) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, updatePort(current.model, elementId, portId, patch)))
  },
  removePort: (elementId, portId) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, removePort(current.model, elementId, portId)))
  },
  editGeometry: (elementId, geometry) => {
    const current = get()
    if (!current.model) return
    set(applyModel(current, setGeometry(current.model, elementId, geometry)))
  },
}))
