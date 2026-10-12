import { Suspense } from "react"
import { ProjectLibrary } from "@/components/site/project-library"
import { requireUser } from "@/lib/server/gate"
import { listProjects } from "@/lib/server/projects"

export const metadata = { title: "Projects — Keel" }

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="site-loading">Opening projects…</div>}>
      <Projects />
    </Suspense>
  )
}

async function Projects() {
  const user = await requireUser()
  const projects = listProjects(user)
  return <ProjectLibrary user={user} projects={projects} />
}
