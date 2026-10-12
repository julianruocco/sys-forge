import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { checkEnvelope, checkMeasure, rollup, unsatisfiedRequirements, validate } from "./queries"
import { aetherModel } from "./seed"
import { MODEL_FILE, type MbseModel } from "./types"

test("the Aether-1 seed is a consistent model", () => {
  assert.deepEqual(validate(aetherModel), [])
})

test("mass rolls up from part usages and stays inside the wet-mass requirement", () => {
  const solar = rollup(aetherModel, "blk-solar", "mass")
  assert.equal(solar, 0.18)
  const total = rollup(aetherModel, "blk-aether", "mass")
  assert.ok(total > solar * 2, "both solar array usages count")
  assert.ok(Math.abs(total - 3.31) < 0.001, `expected 3.31 kg, got ${total}`)
  const requirement = aetherModel.elements.find((element) => element.id === "req-sys-001")
  assert.ok(requirement)
  assert.equal(checkMeasure(aetherModel, requirement)?.pass, true)
})

test("power draw stays under the supply and the system limit", () => {
  const draw = rollup(aetherModel, "blk-aether", "powerDraw")
  const supply = rollup(aetherModel, "blk-aether", "powerSupply")
  assert.ok(Math.abs(draw - 6.65) < 0.001)
  assert.ok(draw < supply)
  const requirement = aetherModel.elements.find((element) => element.id === "req-sys-002")
  assert.ok(requirement)
  assert.equal(checkMeasure(aetherModel, requirement)?.pass, true)
})

test("the stowed envelope passes and radiation is still unallocated", () => {
  const envelope = aetherModel.elements.find((element) => element.id === "req-sys-003")
  assert.ok(envelope)
  assert.equal(checkEnvelope(aetherModel, envelope)?.pass, true)
  const open = unsatisfiedRequirements(aetherModel).map((element) => element.reqId)
  assert.deepEqual(open, ["REQ-SYS-006"])
})

test("the committed model file matches the seed schema and validates", () => {
  const file = JSON.parse(readFileSync(MODEL_FILE, "utf8")) as MbseModel
  assert.equal(file.schema, "keel.mbse/v1")
  assert.equal(file.project.name, "Aether-1")
  assert.deepEqual(validate(file), [])
})
