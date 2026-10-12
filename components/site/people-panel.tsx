"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AccountRecord, SiteRole, SiteUser } from "@/lib/site"
import { SiteFrame } from "./site-frame"

export function PeoplePanel({ user, accounts: initial }: { user: SiteUser; accounts: AccountRecord[] }) {
  const [accounts, setAccounts] = useState(initial)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<SiteRole>("member")
  const [grantExisting, setGrantExisting] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [pending, setPending] = useState(false)

  async function add(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, role, grantExisting }),
      })
      const body = (await response.json()) as { account?: AccountRecord; error?: string }
      if (!response.ok || !body.account) {
        setError(body.error ?? "The account could not be created.")
        setPending(false)
        return
      }
      setAccounts((current) => [...current, body.account!])
      setNotice(`${body.account.name} can sign in with ${body.account.email} and the password you just set.`)
      setName("")
      setEmail("")
      setPassword("")
      setRole("member")
      setPending(false)
    } catch {
      setError("The server did not answer.")
      setPending(false)
    }
  }

  async function remove(account: AccountRecord) {
    setError("")
    setNotice("")
    const response = await fetch("/api/users", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: account.id }),
    })
    const body = (await response.json()) as { error?: string }
    if (!response.ok) {
      setError(body.error ?? "The account could not be removed.")
      return
    }
    setAccounts((current) => current.filter((item) => item.id !== account.id))
    setNotice(`${account.name} can no longer sign in. Projects they owned are now yours.`)
  }

  return (
    <SiteFrame user={user}>
      <div className="site-heading">
        <div>
          <p className="keel-kicker">People</p>
          <h1>Who can sign in</h1>
          <p className="site-lede">
            Add an account, then give them the email and password. Open a project and choose Access if they should not edit every current model.
          </p>
        </div>
      </div>
      <div className="site-split">
        <form className="site-card site-form" onSubmit={(event) => void add(event)}>
          <h2>Add a person</h2>
          <label className="keel-field">
            <span>Name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" required />
          </label>
          <label className="keel-field">
            <span>Email</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" required />
          </label>
          <label className="keel-field">
            <span>Password</span>
            <Input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              required
              minLength={8}
            />
          </label>
          <p className="keel-note">Shown in plain text so you can hand it to them. They can keep using it to sign in.</p>
          <label className="keel-field">
            <span>Authority</span>
            <Select value={role} onValueChange={(value) => { if (value === "admin" || value === "member") setRole(value) }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="site-check">
            <input type="checkbox" checked={grantExisting} onChange={(event) => setGrantExisting(event.target.checked)} />
            <span>Let them edit every project that already exists. They can always create their own.</span>
          </label>
          {error ? <p className="site-error" role="alert">{error}</p> : null}
          {notice ? <p className="site-notice" role="status">{notice}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add person"}
          </Button>
        </form>
        <ul className="site-people">
          {accounts.map((account) => (
            <li key={account.id} className="site-card">
              <div>
                <strong>{account.name}</strong>
                <span>{account.email}</span>
              </div>
              <span className="site-role">{account.role}</span>
              {account.id === user.id ? (
                <span className="site-meta">You</span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => void remove(account)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </SiteFrame>
  )
}
