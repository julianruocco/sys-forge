import { uid } from "./ids"
import { MODEL_SCHEMA, type MbseModel } from "./types"

export function blankModel(name: string, description: string): MbseModel {
  const packageId = uid("pkg")
  return {
    schema: MODEL_SCHEMA,
    project: {
      id: uid("prj"),
      name,
      version: "0.1",
      description,
    },
    elements: [
      {
        id: packageId,
        name: `${name} Model`,
        kind: "package",
        ownerId: null,
        documentation: "Top-level containment for this system model.",
      },
    ],
    relationships: [],
    diagrams: [
      {
        id: uid("dia"),
        name: "Structure",
        kind: "bdd",
        ownerId: packageId,
        nodes: [],
      },
    ],
  }
}
