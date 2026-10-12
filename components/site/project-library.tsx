"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectSummary, SiteUser } from "@/lib/site"
import { ShareDialog } from "./share-dialog"
import { SiteFrame } from "./site-frame"

export function ProjectLibrary({ user, projects: initial }: { user: SiteUser; projects: ProjectSummary[] }) {
  const [projects, setProjects] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [shareId, setShareId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const router = useRouter()

  async function remove(project: ProjectSummary) {
    setError("")
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" })
    const body = (await response.json()) as { error?: string }
    if (!response.ok) {
      setError(body.error ?? "The project could not be deleted.")
      return
    }
    setProjects((current) => current.filter((item) => item.id !== project.id))
  }

  return (
    <SiteFrame user={user}>
      <div className="site-heading">
        <div>
          <p className="keel-kicker">Projects</p>
          <h1>System models</h1>
          <p className="site-lede">
            Each project is its own model. Diagrams, requirements, the satisfy matrix, and STL solids stay inside that project.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New project</Button>
      </div>
      {error ? <p className="site-error" role="alert">{error}</p> : null}
      {projects.length === 0 ? (
        <div className="site-empty">
          <p>No projects on your account yet.</p>
          <Button onClick={() => setCreating(true)}>Create a project</Button>
        </div>
      ) : (
        <div className="site-grid">
          {projects.map((project) => (
            <article key={project.id} className="site-card">
              <p className="site-role">{project.role}</p>
              <h2>{project.name}</h2>
              <p>{project.description || "No description yet."}</p>
              <p className="site-meta">Updated {formatWhen(project.updatedAt)}</p>
              <div className="site-card-actions">
                <Link href={`/projects/${project.id}`} className={buttonVariants({ size: "sm" })}>
                  Open
                </Link>
                {project.role === "owner" || project.role === "admin" || user.role === "admin" ? (
                  <Button size="sm" variant="outline" onClick={() => setShareId(project.id)}>
                    Access
                  </Button>
                ) : null}
                {project.role === "owner" || user.role === "admin" ? (
                  <DeleteProject project={project} onDelete={() => void remove(project)} />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      <NewProjectDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(project) => {
          router.push(`/projects/${project.id}`)
          router.refresh()
        }}
      />
      {shareId ? <ShareDialog projectId={shareId} open={Boolean(shareId)} onOpenChange={(open) => { if (!open) setShareId(null) }} /> : null}
    </SiteFrame>
  )
}

function NewProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (project: ProjectSummary) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [template, setTemplate] = useState<"blank" | "aether">("blank")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function create(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description, template }),
      })
      const body = (await response.json()) as { project?: ProjectSummary; error?: string }
      if (!response.ok || !body.project) {
        setError(body.error ?? "The project could not be created.")
        setPending(false)
        return
      }
      onCreated(body.project)
    } catch {
      setError("The server did not answer.")
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Start from an empty package, or copy the Aether-1 CubeSat example. The copy is a separate model.
          </DialogDescription>
        </DialogHeader>
        <form className="site-form" onSubmit={(event) => void create(event)}>
          <label className="keel-field">
            <span>Name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Power system" required />
          </label>
          <label className="keel-field">
            <span>Description</span>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
          <label className="keel-field">
            <span>Starting model</span>
            <Select value={template} onValueChange={(value) => { if (value === "blank" || value === "aether") setTemplate(value) }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Empty model</SelectItem>
                <SelectItem value="aether">Aether-1 CubeSat example</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {error ? <p className="site-error" role="alert">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteProject({ project, onDelete }: { project: ProjectSummary; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {project.name}?</DialogTitle>
            <DialogDescription>
              This removes the model and any STL files in the project. People who had access will no longer see it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatWhen(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const hours = String(date.getUTCHours()).padStart(2, "0")
  const minutes = String(date.getUTCMinutes()).padStart(2, "0")
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${hours}:${minutes} UTC`
}
