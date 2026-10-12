import { Suspense } from "react"
import { redirect } from "next/navigation"
import { PeoplePanel } from "@/components/site/people-panel"
import { listUsers } from "@/lib/server/accounts"
import { requireUser } from "@/lib/server/gate"

export const metadata = { title: "People — Keel" }

export default function PeoplePage() {
  return (
    <Suspense fallback={<div className="site-loading">Opening people…</div>}>
      <People />
    </Suspense>
  )
}

async function People() {
  const user = await requireUser()
  if (user.role !== "admin") redirect("/projects")
  const accounts = listUsers(user)
  return <PeoplePanel user={user} accounts={accounts} />
}
