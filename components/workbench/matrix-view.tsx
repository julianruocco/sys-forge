"use client"

import { useMbse } from "@/lib/mbse/store"

export function MatrixView() {
  const model = useMbse((state) => state.model)
  const toggleSatisfy = useMbse((state) => state.toggleSatisfy)
  const selectElement = useMbse((state) => state.selectElement)
  if (!model) return null
  const requirements = model.elements.filter((element) => element.kind === "requirement")
  const blocks = model.elements.filter((element) => element.kind === "block")
  const links = new Set(
    model.relationships
      .filter((relationship) => relationship.kind === "satisfy")
      .map((relationship) => `${relationship.sourceId}:${relationship.targetId}`),
  )

  return (
    <div className="h-full min-h-0 overflow-auto bg-white">
      <div className="keel-pane-head">Satisfy matrix</div>
      <p className="px-3 py-2 text-xs text-muted-foreground">
        A mark means the block satisfies the requirement. Click a cell to add or remove that link. REQ-SYS-006 starts open.
      </p>
      <table className="keel-matrix">
        <thead>
          <tr>
            <th>Requirement</th>
            {blocks.map((block) => (
              <th key={block.id}>
                <button type="button" onClick={() => selectElement(block.id)}>
                  {block.name}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requirements.map((requirement) => (
            <tr key={requirement.id}>
              <th>
                <button type="button" onClick={() => selectElement(requirement.id)}>
                  <span className="keel-tree-meta">{requirement.reqId}</span>
                  {requirement.name}
                </button>
              </th>
              {blocks.map((block) => {
                const on = links.has(`${block.id}:${requirement.id}`)
                return (
                  <td key={block.id}>
                    <button
                      type="button"
                      className={on ? "is-on" : ""}
                      aria-pressed={on}
                      aria-label={`${on ? "Remove" : "Add"} satisfy from ${block.name} to ${requirement.reqId ?? requirement.name}`}
                      onClick={() => toggleSatisfy(block.id, requirement.id)}
                    >
                      {on ? "●" : ""}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {requirements.length === 0 ? <p className="px-3 py-6 text-sm">This model has no requirements yet.</p> : null}
    </div>
  )
}
