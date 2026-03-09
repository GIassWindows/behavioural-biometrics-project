"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FileText, User, LogOut } from "lucide-react"

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <FileText className="h-5 w-5" />
          <span>Notemetrics</span>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Notes</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile">Profile</Link>
          </Button>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user && (
            <span className="hidden text-sm text-muted-foreground md:inline-block">
              {user.username}
            </span>
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile">
              <User className="h-4 w-4" />
              <span className="sr-only">Profile</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
