"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { elementById, relationshipsOf, rollup } from "@/lib/mbse/queries"
import { useMbse } from "@/lib/mbse/store"
import type { Element, Geometry, Port } from "@/lib/mbse/types"

export function Inspector() {
  const model = useMbse((state) => state.model)
  const selection = useMbse((state) => state.selection)
  if (!model) return null

  const relationship = model.relationships.find((item) => item.id === selection.relationshipId)
  if (relationship) {
    return (
      <Pane title="Relationship">
        <Field label="Kind">
          <div className="keel-readonly">{relationship.kind}</div>
        </Field>
        <Field label="From">{nameOf(model, relationship.sourceId)}</Field>
        <Field label="To">{nameOf(model, relationship.targetId)}</Field>
        {relationship.name ? <Field label="Name">{relationship.name}</Field> : null}
        <div className="keel-actions">
          <Button variant="destructive" size="sm" onClick={() => useMbse.getState().deleteSelectedRelationship()}>
            Delete relationship
          </Button>
        </div>
      </Pane>
    )
  }

  if (selection.diagramId && !selection.elementId) {
    const diagram = model.diagrams.find((item) => item.id === selection.diagramId)
    if (!diagram) return <ProjectPane />
    return (
      <Pane title="Diagram">
        <Field label="Name">
          <Input
            value={diagram.name}
            onChange={(event) => useMbse.getState().editDiagram(diagram.id, { name: event.target.value })}
          />
        </Field>
        <Field label="Kind">
          <div className="keel-readonly">{diagram.kind}</div>
        </Field>
        <p className="keel-note">
          A diagram is a view. Removing it does not delete the blocks and requirements it shows.
        </p>
        <div className="keel-actions">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => useMbse.getState().removeDiagram(diagram.id)}
            disabled={model.diagrams.length <= 1}
          >
            Delete diagram
          </Button>
        </div>
      </Pane>
    )
  }

  const element = elementById(model, selection.elementId)
  if (!element) return <ProjectPane />

  return (
    <Pane title="Specification">
      {selection.partId && selection.partOwnerId ? (
        <PartUsage ownerId={selection.partOwnerId} partId={selection.partId} />
      ) : null}
      <ElementSpec element={element} />
    </Pane>
  )
}

function nameOf(model: NonNullable<ReturnType<typeof useMbse.getState>["model"]>, id: string) {
  return <div className="keel-readonly">{elementById(model, id)?.name ?? id}</div>
}

function ProjectPane() {
  const model = useMbse((state) => state.model)
  const editProject = useMbse((state) => state.editProject)
  if (!model) return null
  const root = model.elements.find((element) => (element.parts?.length ?? 0) > 0)
  const mass = root ? rollup(model, root.id, "mass") : 0
  return (
    <Pane title="Project">
      <Field label="Name">
        <Input value={model.project.name} onChange={(event) => editProject({ name: event.target.value })} />
      </Field>
      <Field label="Version">
        <Input value={model.project.version} onChange={(event) => editProject({ version: event.target.value })} />
      </Field>
      <Field label="Description">
        <Textarea
          value={model.project.description}
          onChange={(event) => editProject({ description: event.target.value })}
          rows={5}
        />
      </Field>
      <p className="keel-note">
        {model.elements.length} elements, {model.diagrams.length} diagrams
        {root ? `, ${mass.toFixed(2)} kg rolled up from ${root.name}` : ""}. Select something in the tree or on a diagram
        to edit it. The file on disk is model/aether-1.mbse.json.
      </p>
    </Pane>
  )
}

function Pane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="keel-pane-head">{title}</div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="keel-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={(next) => { if (next) onChange(next as T) }}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ElementSpec({ element }: { element: Element }) {
  const focusName = useMbse((state) => state.focusName)
  const clearFocus = useMbse((state) => state.clearFocus)
  const editElement = useMbse((state) => state.editElement)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focusName) return
    nameRef.current?.focus()
    nameRef.current?.select()
    clearFocus()
  }, [focusName, element.id, clearFocus])

  return (
    <>
      <Field label="Name">
        <Input
          ref={nameRef}
          value={element.name}
          onChange={(event) => editElement(element.id, { name: event.target.value })}
        />
      </Field>
      <Field label="Kind">
        <div className="keel-readonly">{element.kind}</div>
      </Field>
      {element.kind === "block" ? (
        <Field label="Stereotype">
          <Input
            value={element.stereotype ?? "block"}
            onChange={(event) => editElement(element.id, { stereotype: event.target.value })}
          />
        </Field>
      ) : null}
      {element.kind === "requirement" ? <RequirementFields element={element} /> : null}
      {element.kind === "constraint" ? (
        <Field label="Expression">
          <Input
            value={element.expression ?? ""}
            onChange={(event) => editElement(element.id, { expression: event.target.value })}
          />
        </Field>
      ) : null}
      <Field label="Documentation">
        <Textarea
          value={element.documentation ?? ""}
          rows={4}
          onChange={(event) => editElement(element.id, { documentation: event.target.value })}
        />
      </Field>
      {element.kind === "block" ? (
        <>
          <ValuesEditor element={element} />
          <PortsEditor element={element} />
          <PartsEditor element={element} />
          <GeometryEditor element={element} />
        </>
      ) : null}
      <Relations elementId={element.id} />
      <div className="keel-actions">
        <Button variant="outline" size="sm" onClick={() => useMbse.getState().showOnDiagram(element.id)}>
          Show on diagram
        </Button>
        <Button variant="outline" size="sm" onClick={() => useMbse.getState().removeSelectedFromDiagram()}>
          Remove symbol
        </Button>
        <Button variant="destructive" size="sm" onClick={() => useMbse.getState().deleteSelectedElement()}>
          Delete from model
        </Button>
      </div>
    </>
  )
}

function RequirementFields({ element }: { element: Element }) {
  const editElement = useMbse((state) => state.editElement)
  return (
    <>
      <Field label="Id">
        <Input value={element.reqId ?? ""} onChange={(event) => editElement(element.id, { reqId: event.target.value })} />
      </Field>
      <Field label="Text">
        <Textarea
          value={element.text ?? ""}
          rows={4}
          onChange={(event) => editElement(element.id, { text: event.target.value })}
        />
      </Field>
      <Field label="Priority">
        <Choice
          value={element.priority ?? "medium"}
          onChange={(priority) => editElement(element.id, { priority })}
          options={[
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
      </Field>
      <Field label="Status">
        <Choice
          value={element.status ?? "draft"}
          onChange={(status) => editElement(element.id, { status })}
          options={[
            { value: "draft", label: "Draft" },
            { value: "approved", label: "Approved" },
            { value: "verified", label: "Verified" },
          ]}
        />
      </Field>
    </>
  )
}

function ValuesEditor({ element }: { element: Element }) {
  const addValue = useMbse((state) => state.addValue)
  const editValue = useMbse((state) => state.editValue)
  const removeValue = useMbse((state) => state.removeValue)
  return (
    <section className="keel-section">
      <header>
        <h3>Value properties</h3>
        <Button size="xs" variant="outline" onClick={() => addValue(element.id)}>
          Add
        </Button>
      </header>
      {(element.values ?? []).map((value) => (
        <div key={value.id} className="space-y-1">
          <Input
            value={value.name}
            aria-label="Property name"
            onChange={(event) => editValue(element.id, value.id, { name: event.target.value })}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-center gap-1">
            <Input
              value={value.value ?? ""}
              aria-label="Property value"
              onChange={(event) => editValue(element.id, value.id, { value: event.target.value })}
            />
            <Input
              value={value.unit ?? ""}
              aria-label="Property unit"
              placeholder="unit"
              onChange={(event) => editValue(element.id, value.id, { unit: event.target.value })}
            />
            <button type="button" className="keel-text-button" onClick={() => removeValue(element.id, value.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      {(element.values ?? []).length === 0 ? <p className="keel-note">No value properties yet.</p> : null}
    </section>
  )
}

function PortsEditor({ element }: { element: Element }) {
  const addPort = useMbse((state) => state.addPort)
  const editPort = useMbse((state) => state.editPort)
  const removePort = useMbse((state) => state.removePort)
  return (
    <section className="keel-section">
      <header>
        <h3>Ports</h3>
        <Button size="xs" variant="outline" onClick={() => addPort(element.id)}>
          Add
        </Button>
      </header>
      {(element.ports ?? []).map((port) => (
        <div key={port.id} className="space-y-1">
          <div className="keel-grid">
            <Input
              value={port.name}
              aria-label="Port name"
              onChange={(event) => editPort(element.id, port.id, { name: event.target.value })}
            />
            <Choice<Port["direction"]>
              value={port.direction}
              onChange={(direction) => editPort(element.id, port.id, { direction })}
              options={[
                { value: "in", label: "in" },
                { value: "out", label: "out" },
                { value: "inout", label: "inout" },
              ]}
            />
          </div>
          <div className="flex gap-2">
            <Input
              value={port.type ?? ""}
              aria-label="Port type"
              placeholder="type"
              onChange={(event) => editPort(element.id, port.id, { type: event.target.value })}
            />
            <button type="button" className="keel-text-button" onClick={() => removePort(element.id, port.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

function PartsEditor({ element }: { element: Element }) {
  const model = useMbse((state) => state.model)
  const addPart = useMbse((state) => state.addPart)
  const editPart = useMbse((state) => state.editPart)
  const removePart = useMbse((state) => state.removePart)
  const selectPart = useMbse((state) => state.selectPart)
  const blocks = model?.elements.filter((item) => item.kind === "block" && item.id !== element.id) ?? []
  const [typeId, setTypeId] = useState(blocks[0]?.id ?? "")
  if (!model) return null
  return (
    <section className="keel-section">
      <header>
        <h3>Parts</h3>
      </header>
      {(element.parts ?? []).map((part) => (
        <div key={part.id} className="space-y-1 rounded-md border border-border p-2">
          <div className="keel-grid">
            <Input
              value={part.name}
              aria-label="Part name"
              onChange={(event) => editPart(element.id, part.id, { name: event.target.value })}
            />
            <div className="keel-readonly text-xs">{elementById(model, part.typeId)?.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(["x", "y", "z"] as const).map((axis) => (
              <Input
                key={axis}
                type="number"
                aria-label={`Placement ${axis}`}
                value={part.placement?.[axis] ?? 0}
                onChange={(event) =>
                  editPart(element.id, part.id, {
                    placement: {
                      x: part.placement?.x ?? 0,
                      y: part.placement?.y ?? 0,
                      z: part.placement?.z ?? 0,
                      [axis]: Number(event.target.value),
                    },
                  })
                }
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="keel-text-button" onClick={() => selectPart(element.id, part.id)}>
              Select usage
            </button>
            <button type="button" className="keel-text-button" onClick={() => removePart(element.id, part.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      {blocks.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Choice
              value={typeId || blocks[0].id}
              onChange={setTypeId}
              options={blocks.map((block) => ({ value: block.id, label: block.name }))}
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => addPart(element.id, typeId || blocks[0].id)}>
            Add part
          </Button>
        </div>
      ) : (
        <p className="keel-note">Create another block before adding a part.</p>
      )}
    </section>
  )
}

function GeometryEditor({ element }: { element: Element }) {
  const editGeometry = useMbse((state) => state.editGeometry)
  const geometry = element.geometry
  if (!geometry) {
    return (
      <section className="keel-section">
        <header>
          <h3>Geometry</h3>
        </header>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            editGeometry(element.id, { shape: "box", x: 40, y: 40, z: 20, color: "#4c6d8a" })
          }
        >
          Add a solid
        </Button>
        <p className="keel-note">Solids are parametric, in millimeters, and show up in the assembly view.</p>
      </section>
    )
  }
  const patch = (next: Partial<Geometry>) => editGeometry(element.id, { ...geometry, ...next })
  return (
    <section className="keel-section">
      <header>
        <h3>Geometry</h3>
        <Button size="xs" variant="ghost" onClick={() => editGeometry(element.id, undefined)}>
          Clear
        </Button>
      </header>
      <Field label="Shape">
        <Choice
          value={geometry.shape}
          onChange={(shape) => patch({ shape })}
          options={[
            { value: "box", label: "Box" },
            { value: "cylinder", label: "Cylinder" },
            { value: "frame", label: "Frame rails" },
            { value: "envelope", label: "Envelope" },
          ]}
        />
      </Field>
      <div className="grid grid-cols-3 gap-1">
        {(["x", "y", "z"] as const).map((axis) => (
          <Field key={axis} label={axis === "x" && geometry.shape === "cylinder" ? "diameter" : `${axis} mm`}>
            <Input
              type="number"
              value={geometry[axis]}
              onChange={(event) => patch({ [axis]: Number(event.target.value) })}
            />
          </Field>
        ))}
      </div>
      <Field label="Color">
        <Input type="color" value={geometry.color} onChange={(event) => patch({ color: event.target.value })} />
      </Field>
    </section>
  )
}

function PartUsage({ ownerId, partId }: { ownerId: string; partId: string }) {
  const model = useMbse((state) => state.model)
  const editPart = useMbse((state) => state.editPart)
  const owner = elementById(model, ownerId)
  const part = owner?.parts?.find((item) => item.id === partId)
  if (!model || !owner || !part) return null
  return (
    <section className="keel-section">
      <header>
        <h3>Part usage</h3>
      </header>
      <Field label="Role">
        <Input value={part.name} onChange={(event) => editPart(ownerId, partId, { name: event.target.value })} />
      </Field>
      <Field label="Owner">
        <div className="keel-readonly">{owner.name}</div>
      </Field>
      <p className="keel-note">Placement is in the owner frame, millimeters, Z along the bus.</p>
      <div className="grid grid-cols-3 gap-1">
        {(["x", "y", "z"] as const).map((axis) => (
          <Field key={axis} label={axis}>
            <Input
              type="number"
              value={part.placement?.[axis] ?? 0}
              onChange={(event) =>
                editPart(ownerId, partId, {
                  placement: {
                    x: part.placement?.x ?? 0,
                    y: part.placement?.y ?? 0,
                    z: part.placement?.z ?? 0,
                    [axis]: Number(event.target.value),
                  },
                })
              }
            />
          </Field>
        ))}
      </div>
    </section>
  )
}

function Relations({ elementId }: { elementId: string }) {
  const model = useMbse((state) => state.model)
  const selectRelationship = useMbse((state) => state.selectRelationship)
  if (!model) return null
  const relationships = relationshipsOf(model, elementId)
  if (relationships.length === 0) return null
  return (
    <section className="keel-section">
      <header>
        <h3>Relationships</h3>
      </header>
      {relationships.map((relationship) => {
        const otherId = relationship.sourceId === elementId ? relationship.targetId : relationship.sourceId
        const other = elementById(model, otherId)
        return (
          <button
            key={relationship.id}
            type="button"
            className="keel-relation"
            onClick={() => selectRelationship(relationship.id)}
          >
            <span>{relationship.kind}</span>
            <span>{relationship.sourceId === elementId ? "to" : "from"} {other?.name ?? otherId}</span>
          </button>
        )
      })}
    </section>
  )
}
