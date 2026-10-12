# Keel

Keel is a systems modeling website you can run for a team. It is a working slice of what Cameo Systems Modeler does: one model, several views, and more than one project. The example project is **Aether-1**, a 3U CubeSat for coastal imaging.

Diagrams, the satisfy matrix, the written spec, and the 3D assembly are projections of that model. Change a block name in the specification panel and every diagram that shows it updates. An STL file attached to a block is the same solid in the assembly, placed by each part usage.

Accounts, projects, and uploaded STL files live in the `data/` directory on the machine running the server. That directory is not part of the git history.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

The first visit asks you to create the administrator account. Do that before you share the address. After you sign in, Keel opens the Aether-1 project. Use **People** to add more accounts, and **Access** on a project to choose who can edit or only view it.

```bash
npm test
npm run lint
```

## Projects

The project library is the home page after sign in. Create an empty model, or copy the Aether-1 example. Each project has its own model file at `data/projects/<id>/model.json`. You can still open that file in Cursor on the machine that runs the server.

The file `model/aether-1.mbse.json` is the example template. New copies of Aether-1 start from that file.

## STL files

Select a block, set its geometry shape to **STL file**, and upload a `.stl`. Binary and ASCII files are accepted, up to 32 MB. Keel treats the file units as millimeters. If the mesh was exported in meters, set scale to 1000. The envelope sizes next to the file are still what the requirement checks use.

## What you can do in a model

- Browse the containment tree and open block definition, internal block, requirements, and package diagrams.
- Drag symbols, edit names, requirement text, value properties, ports, and part placements.
- Draw composition, satisfy, derive, and the other SysML links. On the internal block diagram, drag from port to port to add a connector.
- Check the satisfy matrix. In the example, `REQ-SYS-006` starts with no satisfying block.
- Open **Assembly** to orbit the solids. Parametric shapes and STL meshes share the same part placements.
- Open **Spec** to read mass and power rollups. **Write spec.md** saves a Markdown view in the project folder.

Edits save themselves. Undo and redo cover model edits. Delete removes a symbol from the current diagram. Shift+Delete deletes the element from the model.

## Share the website

The running site is the thing other people sign in to. The git repository is the source code.

On the machine that should host Keel, install Node 22, clone the code, then:

```bash
npm install
npm run build
npm start
```

Or build the container and keep `data/` on a volume:

```bash
docker build -t keel .
docker run --rm -p 3847:3847 -v keel-data:/app/data keel
```

Create the administrator on that server before you send anyone the URL. Then add their accounts from **People**. Everyone uses the same address. Their models and STL files stay in that server's `data/` directory.

This app stores accounts and files on disk, so it needs a normal Node server. A serverless host that wipes the disk between requests will not keep logins or uploads.

To put the source on GitHub, create an empty repository there, then from this clone:

```bash
git remote add github git@github.com:YOUR_USER/YOUR_REPO.git
git push -u github main
```

## How this maps to Cameo

Cameo keeps a model in a repository and treats every diagram as a view. Keel does the same thing with a JSON model per project.

| Cameo idea | In Keel |
| --- | --- |
| Teamwork Cloud | Accounts, project access, and the shared server |
| Containment tree | Left pane |
| Diagrams (bdd, ibd, req, pkg) | Center canvas |
| Specification | Right pane |
| Traceability | Matrix and Spec |
| Parametric check | Mass, power, and envelope rollups |
| CAD | Parametric solids plus STL meshes on blocks |

A full Cameo installation also has simulation, the rest of the SysML diagram set (activity, sequence, state, parametric), and live links into CATIA or NX. Those are further views on the same model.
