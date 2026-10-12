import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { userCount } from "./accounts"
import { currentUser } from "./session"

export async function requireUser() {
  await connection()
  await cookies()
  if (userCount() === 0) redirect("/setup")
  const user = await currentUser()
  if (!user) redirect("/login")
  return user
}
