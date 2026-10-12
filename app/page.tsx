import { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { userCount } from "@/lib/server/accounts"
import { currentUser } from "@/lib/server/session"

export default function Home() {
  return (
    <Suspense fallback={<div className="site-loading">Opening Keel…</div>}>
      <HomeGate />
    </Suspense>
  )
}

async function HomeGate() {
  await connection()
  await cookies()
  if (userCount() === 0) redirect("/setup")
  if (!(await currentUser())) redirect("/login")
  redirect("/projects")
  return null
}
