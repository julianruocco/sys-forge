"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { buttonVariants } from "@/components/ui/button"
import type { SiteUser } from "@/lib/site"
import { SignOut } from "./sign-out"

export function SiteFrame({ user, children }: { user: SiteUser; children: ReactNode }) {
  return (
    <div className="site">
      <header className="site-top">
        <Link href="/projects" className="keel-brand">
          <span className="keel-mark">Keel</span>
          <span className="keel-brand-sub">Systems modeler</span>
        </Link>
        <div className="site-account">
          <span className="site-user" title={user.email}>
            {user.name}
          </span>
          {user.role === "admin" ? (
            <Link href="/people" className={buttonVariants({ size: "xs", variant: "outline" })}>
              People
            </Link>
          ) : null}
          <SignOut />
        </div>
      </header>
      <main className="site-main">{children}</main>
    </div>
  )
}
