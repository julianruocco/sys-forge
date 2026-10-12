"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SetupForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(body.error ?? "The administrator account could not be created.")
        setPending(false)
        return
      }
      router.push("/projects")
      router.refresh()
    } catch {
      setError("The server did not answer.")
      setPending(false)
    }
  }

  return (
    <AuthCard
      kicker="First account"
      lede="This server has no accounts yet. Whoever completes this form is the administrator and can add everyone else. Do this before you send the address to anyone."
    >
      <form className="site-form" onSubmit={(event) => void onSubmit(event)}>
        <label className="keel-field">
          <span>Your name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
        </label>
        <label className="keel-field">
          <span>Email</span>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
        </label>
        <label className="keel-field">
          <span>Password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <p className="keel-note">At least 8 characters. You will use this to sign in and to add other people.</p>
        {error ? <p className="site-error" role="alert">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating the account…" : "Create administrator"}
        </Button>
      </form>
    </AuthCard>
  )
}

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(body.error ?? "Sign in failed.")
        setPending(false)
        return
      }
      router.push("/projects")
      router.refresh()
    } catch {
      setError("The server did not answer.")
      setPending(false)
    }
  }

  return (
    <AuthCard kicker="Sign in" lede="Open the system models stored on this Keel server.">
      <form className="site-form" onSubmit={(event) => void onSubmit(event)}>
        <label className="keel-field">
          <span>Email</span>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
        </label>
        <label className="keel-field">
          <span>Password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="site-error" role="alert">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  )
}

function AuthCard({ kicker, lede, children }: { kicker: string; lede: string; children: React.ReactNode }) {
  return (
    <div className="site">
      <header className="site-top">
        <div className="keel-brand">
          <span className="keel-mark">Keel</span>
          <span className="keel-brand-sub">Systems modeler</span>
        </div>
      </header>
      <main className="site-auth">
        <section className="site-auth-card">
          <p className="keel-kicker">{kicker}</p>
          <h1>Keel</h1>
          <p className="site-lede">{lede}</p>
          {children}
        </section>
      </main>
    </div>
  )
}
