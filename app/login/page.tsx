import { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { LoginForm } from "@/components/site/auth-forms"
import { userCount } from "@/lib/server/accounts"
import { currentUser } from "@/lib/server/session"

export const metadata = { title: "Sign in — Keel" }

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="site-loading">Opening Keel…</div>}>
      <LoginGate />
    </Suspense>
  )
}

async function LoginGate() {
  await connection()
  await cookies()
  if (userCount() === 0) redirect("/setup")
  if (await currentUser()) redirect("/projects")
  return <LoginForm />
}
