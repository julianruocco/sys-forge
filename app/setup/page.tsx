import { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { SetupForm } from "@/components/site/auth-forms"
import { userCount } from "@/lib/server/accounts"
import { currentUser } from "@/lib/server/session"

export const metadata = { title: "Create administrator — Keel" }

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="site-loading">Opening Keel…</div>}>
      <SetupGate />
    </Suspense>
  )
}

async function SetupGate() {
  await connection()
  await cookies()
  if (userCount() === 0) return <SetupForm />
  const user = await currentUser()
  if (user) redirect("/projects")
  redirect("/login")
}
