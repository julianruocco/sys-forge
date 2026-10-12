# Keel

Keel is a systems modeling workbench you can edit in Cursor. It is a working slice of what Cameo Systems Modeler does: one model, several views. The example project is **Aether-1**, a 3U CubeSat for coastal imaging.

The model file is `model/aether-1.mbse.json`. Diagrams, the satisfy matrix, the written spec, and the 3D assembly are projections of that file. Change a block name in the specification panel and every diagram that shows it updates. Change it in the JSON and reload the workbench.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

```bash
npm test
npm run lint
```

## What you can do

- Browse the containment tree and open block definition, internal block, requirements, and package diagrams.
- Drag symbols, edit names, requirement text, value properties, ports, and part placements.
- Draw composition, satisfy, derive, and the other SysML links. On the internal block diagram, drag from port to port to add a connector.
- Check the satisfy matrix. `REQ-SYS-006` starts with no satisfying block.
- Open **Assembly** to orbit a parametric solid model. Geometry and placement live on the blocks, in millimeters.
- Open **Spec** to read mass and power rollups. **Write model/AETHER-1.md** saves a Markdown view next to the JSON.

Edits save themselves to `model/aether-1.mbse.json`. Undo and redo cover model edits. Delete removes a symbol from the current diagram. Shift+Delete deletes the element from the model.

## How this maps to Cameo

Cameo keeps a model in a repository and treats every diagram as a view. Keel does the same thing with a JSON file in the repo, which is why the model is editable both on the canvas and as text in Cursor.

| Cameo idea | In Keel |
| --- | --- |
| Containment tree | Left pane |
| Diagrams (bdd, ibd, req, pkg) | Center canvas |
| Specification | Right pane |
| Traceability | Matrix and Spec |
| Parametric check | Mass, power, and envelope rollups |
| CAD | Parametric assembly bound to part usages |

A full Cameo installation also has Teamwork Cloud, simulation, the rest of the SysML diagram set (activity, sequence, state, parametric), and live links into CATIA or NX. Those are further views on the same model, not separate products. The next useful steps, in order:

1. Add activity, sequence, and state diagrams as more `kind` values. The elements and relationships are already the shared model.
2. Keep a SysML v2 textual view beside the JSON if you want diff-friendly models that other tools can import.
3. For real CAD, store a glTF or STEP path on a block and render that mesh in the assembly instead of a box. Placement stays on the part usage, so the mechanical model and the SysML structure stay the same object.

The assembly in this repo is not a STEP import. It is the binding people usually want first: subsystem solids, sizes, and positions driven by the system model, so a mass change and a geometry change are edits to one artifact.
