"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
import type { MemberRole, MemberSummary } from "@/lib/site"

export function ShareDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [members, setMembers] = useState<MemberSummary[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"editor" | "viewer">("editor")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancel = false
    void fetch(`/api/projects/${projectId}/members`)
      .then(async (response) => {
        const body = (await response.json()) as { members?: MemberSummary[]; error?: string }
        if (cancel) return
        if (!response.ok) {
          setError(body.error ?? "Access could not be loaded.")
          return
        }
        setMembers(body.members ?? [])
        setError("")
      })
      .catch(() => {
        if (!cancel) setError("The server did not answer.")
      })
    return () => {
      cancel = true
    }
  }, [open, projectId])

  async function add(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      })
      const body = (await response.json()) as { member?: MemberSummary; error?: string }
      if (!response.ok || !body.member) {
        setError(body.error ?? "That person could not be added.")
        setPending(false)
        return
      }
      setMembers((current) => {
        const next = current.filter((item) => item.userId !== body.member!.userId)
        next.push(body.member!)
        return next.sort(byRole)
      })
      setEmail("")
      setPending(false)
    } catch {
      setError("The server did not answer.")
      setPending(false)
    }
  }

  async function remove(userId: string) {
    setError("")
    const response = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" })
    const body = (await response.json()) as { error?: string }
    if (!response.ok) {
      setError(body.error ?? "That person could not be removed.")
      return
    }
    setMembers((current) => current.filter((item) => item.userId !== userId))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project access</DialogTitle>
          <DialogDescription>
            Add someone who already has a Keel account. Editors can change the model and upload STL files. Viewers can look, not save.
          </DialogDescription>
        </DialogHeader>
        <ul className="site-members">
          {members.map((member) => (
            <li key={member.userId}>
              <div>
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
              <span className="site-role">{member.role}</span>
              {member.role === "owner" ? null : (
                <button type="button" className="keel-text-button" onClick={() => void remove(member.userId)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <form className="site-form" onSubmit={(event) => void add(event)}>
          <label className="keel-field">
            <span>Email</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="keel-field">
            <span>Role</span>
            <Select value={role} onValueChange={(value) => { if (value === "editor" || value === "viewer") setRole(value) }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {error ? <p className="site-error" role="alert">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add to project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function byRole(a: { role: MemberRole }, b: { role: MemberRole }) {
  const order = { owner: 0, editor: 1, viewer: 2 }
  return order[a.role] - order[b.role]
}
