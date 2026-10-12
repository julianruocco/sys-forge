"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  assemblyRoot,
  checkEnvelope,
  checkMeasure,
  massBreakdown,
  rollup,
  satisfiedBy,
  toMarkdown,
  unsatisfiedRequirements,
} from "@/lib/mbse/queries"
import { useMbse } from "@/lib/mbse/store"
import { SPEC_FILE } from "@/lib/mbse/types"

export function SpecView() {
  const model = useMbse((state) => state.model)
  const selectElement = useMbse((state) => state.selectElement)
  const [writeState, setWriteState] = useState<"idle" | "writing" | "done" | "error">("idle")
  if (!model) return null
  const root = assemblyRoot(model)
  const mass = root ? rollup(model, root.id, "mass") : 0
  const draw = root ? rollup(model, root.id, "powerDraw") : 0
  const supply = root ? rollup(model, root.id, "powerSupply") : 0
  const massReq = model.elements.find((element) => element.measure?.property === "mass")
  const powerReq = model.elements.find((element) => element.measure?.property === "powerDraw")
  const massCheck = massReq ? checkMeasure(model, massReq) : null
  const powerCheck = powerReq ? checkMeasure(model, powerReq) : null
  const open = unsatisfiedRequirements(model)

  async function writeSpec() {
    setWriteState("writing")
    const response = await fetch("/api/spec", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(model),
    })
    setWriteState(response.ok ? "done" : "error")
  }

  return (
    <div className="h-full min-h-0 overflow-auto">
      <article className="keel-spec">
        <p className="keel-kicker">Generated view</p>
        <h1>{model.project.name}</h1>
        <p className="keel-lead">{model.project.description}</p>
        <p className="text-xs text-muted-foreground">Version {model.project.version}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void writeSpec()} disabled={writeState === "writing"}>
            {writeState === "writing" ? "Writing…" : `Write ${SPEC_FILE}`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(toMarkdown(model))}
          >
            Copy Markdown
          </Button>
          {writeState === "done" ? <span className="self-center text-xs">Wrote {SPEC_FILE}</span> : null}
          {writeState === "error" ? <span className="self-center text-xs text-destructive">Could not write the spec.</span> : null}
        </div>

        <h2>Budgets</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Budget
            title="Wet mass"
            actual={mass}
            limit={massCheck?.limit}
            unit="kg"
            pass={massCheck?.pass}
          />
          <Budget
            title="Orbit-average power"
            actual={draw}
            limit={powerCheck?.limit}
            unit="W"
            pass={powerCheck?.pass}
            extra={supply ? `Generation ${supply.toFixed(2)} W` : undefined}
          />
        </div>

        {root ? (
          <table className="keel-spec-table">
            <thead>
              <tr>
                <th>Usage</th>
                <th>Own mass (kg)</th>
              </tr>
            </thead>
            <tbody>
              {massBreakdown(model, root.id).map((line) => (
                <tr key={line.key}>
                  <td style={{ paddingLeft: 12 + line.depth * 16 }}>{line.name}</td>
                  <td>{line.own ? line.own.toFixed(2) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {open.length > 0 ? (
          <p className="keel-callout">
            {open.length === 1 ? "One requirement has" : `${open.length} requirements have`} no satisfying block:{" "}
            {open.map((requirement) => requirement.reqId ?? requirement.name).join(", ")}.
          </p>
        ) : (
          <p className="keel-callout is-pass">Every requirement has a satisfying element.</p>
        )}

        <h2>Requirements</h2>
        <ul className="space-y-3">
          {model.elements
            .filter((element) => element.kind === "requirement")
            .map((requirement) => {
              const satisfiers = satisfiedBy(model, requirement.id)
              const measure = checkMeasure(model, requirement)
              const envelope = checkEnvelope(model, requirement)
              return (
                <li key={requirement.id}>
                  <button type="button" className="keel-req" onClick={() => selectElement(requirement.id)}>
                    <span className="keel-req-id">{requirement.reqId}</span>
                    <span className="keel-req-name">{requirement.name}</span>
                    <span className={`keel-status is-${requirement.status ?? "draft"}`}>{requirement.status ?? "draft"}</span>
                    <p>{requirement.text}</p>
                    <p className="keel-req-meta">
                      Satisfied by {satisfiers.length ? satisfiers.map((element) => element.name).join(", ") : "nobody"}
                      {measure
                        ? ` · ${measure.property} ${measure.actual.toFixed(2)} ${measure.op} ${measure.limit} ${measure.pass ? "pass" : "fail"}`
                        : ""}
                      {envelope
                        ? ` · envelope ${envelope.x}×${envelope.y}×${envelope.z} mm ${envelope.pass ? "pass" : "fail"}`
                        : ""}
                    </p>
                  </button>
                </li>
              )
            })}
        </ul>
      </article>
    </div>
  )
}

function Budget({
  title,
  actual,
  limit,
  unit,
  pass,
  extra,
}: {
  title: string
  actual: number
  limit?: number
  unit: string
  pass?: boolean
  extra?: string
}) {
  const ratio = limit ? Math.min(actual / limit, 1.15) : 1
  return (
    <section className="keel-budget">
      <header>
        <h3>{title}</h3>
        <span className={pass === false ? "is-fail" : "is-pass"}>{pass === false ? "Over" : "Within"}</span>
      </header>
      <p>
        <strong>{actual.toFixed(2)}</strong> {unit}
        {limit !== undefined ? ` of ${limit} ${unit}` : ""}
      </p>
      {extra ? <p className="text-xs text-muted-foreground">{extra}</p> : null}
      {limit !== undefined ? (
        <div className="keel-bar" aria-hidden>
          <span style={{ width: `${Math.min(ratio, 1) * 100}%` }} className={pass === false ? "is-fail" : ""} />
        </div>
      ) : null}
    </section>
  )
}
