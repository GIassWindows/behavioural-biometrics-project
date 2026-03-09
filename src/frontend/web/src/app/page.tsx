"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { FileText, ArrowRight } from "lucide-react"

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </main>
    )
  }

  return (
    <main className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <FileText className="h-5 w-5" />
          <span>Notecraft</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-20 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="max-w-xl text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Your thoughts, organized and always within reach
          </h1>
          <p className="max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            A clean, distraction-free space for capturing ideas, making lists,
            and keeping your notes in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-4">
        <p className="text-center text-sm text-muted-foreground">
          Notemetrics. Simple notes for a clear mind.
        </p>
      </footer>
    </main>
  )
}
