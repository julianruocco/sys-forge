import { Suspense } from "react"
import Link from "next/link"
import { Workbench } from "@/components/workbench/workbench"
import { requireUser } from "@/lib/server/gate"
import { projectAccess } from "@/lib/server/projects"

export const metadata = { title: "Model — Keel" }

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="site-loading">Opening the project…</div>}>
      <Project params={params} />
    </Suspense>
  )
}

async function Project({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const access = projectAccess(user, id)
  if (!access) {
    return (
      <div className="site">
        <main className="site-auth">
          <section className="site-auth-card">
            <h1>Project unavailable</h1>
            <p className="site-lede">That project is not on your account.</p>
            <Link href="/projects">Back to projects</Link>
          </section>
        </main>
      </div>
    )
  }
  return <Workbench projectId={id} user={user} />
}
