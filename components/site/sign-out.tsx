"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function SignOut() {
  const [pending, setPending] = useState(false)
  const router = useRouter()
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={() => {
        setPending(true)
        void fetch("/api/auth/logout", { method: "POST" }).finally(() => {
          router.push("/login")
          router.refresh()
        })
      }}
    >
      Sign out
    </Button>
  )
}
