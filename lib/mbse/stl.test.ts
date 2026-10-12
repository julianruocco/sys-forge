import assert from "node:assert/strict"
import test from "node:test"
import { isMbseModel } from "./check"
import { solidTree } from "./queries"
import { inspectStl } from "./stl"
import { validate } from "./queries"
import type { MbseModel } from "./types"

test("binary and ASCII STL files are accepted", () => {
  const binary = Buffer.alloc(84 + 50)
  binary.write("solid", 0)
  binary.writeUInt32LE(1, 80)
  assert.deepEqual(inspectStl(binary, "bracket.STL"), { ok: true, kind: "binary" })

  const ascii = Buffer.from(
    "solid keel\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid keel\n",
  )
  assert.deepEqual(inspectStl(ascii, "panel.stl"), { ok: true, kind: "ascii" })
  assert.equal(inspectStl(Buffer.from("not a mesh"), "notes.txt").ok, false)
  assert.equal(inspectStl(Buffer.from("solid only"), "empty.stl").ok, false)
})

test("an STL solid is part of the assembly tree", () => {
  const model: MbseModel = {
    schema: "keel.mbse/v1",
    project: { id: "p", name: "P", description: "", version: "0.1" },
    elements: [
      {
        id: "blk",
        name: "Bracket",
        kind: "block",
        ownerId: null,
        geometry: {
          shape: "stl",
          x: 10,
          y: 20,
          z: 30,
          color: "#112233",
          stlId: "stl-0123456789abcdef",
          stlName: "bracket.stl",
          stlScale: 2,
        },
      },
    ],
    relationships: [],
    diagrams: [],
  }
  assert.deepEqual(validate(model), [])
  assert.equal(isMbseModel(model), true)
  const solid = solidTree(model, "blk")
  assert.equal(solid?.stlId, "stl-0123456789abcdef")
  assert.equal(solid?.stlScale, 2)
  const missing = structuredClone(model)
  missing.elements[0].geometry = { shape: "stl", x: 1, y: 1, z: 1, color: "#fff" }
  assert.equal(validate(missing).some((issue) => issue.includes("STL")), true)
  assert.equal(isMbseModel({ ...model, elements: [{ ...model.elements[0], geometry: { shape: "mesh" } }] }), false)
})
