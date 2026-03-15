"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { apiLogKeystrokes, apiTrainModel } from "@/lib/api"

export default function SignUpPage() {
  const { signUp } = useAuth()
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [keystrokeCount, setKeystrokeCount] = useState(0)

  const [step, setStep] = useState<1 | 2>(1)
  const [typedText, setTypedText] = useState("")
  const [isEnrolling, setIsEnrolling] = useState(false)

  // Keystroke tracking refs
  const keyDownTimes = useRef<Record<string, number>>({})
  const lastKeyUpTime = useRef<number | null>(null)
  const keystrokeBuffer = useRef<{
    dwell_time: number
    flight_time: number
    backspace_rate: number
  }[]>([])
  const totalKeys = useRef<number>(0)
  const backspaceCount = useRef<number>(0)
  const dwellTimes = useRef<number[]>([])
  const digraphTimes = useRef<number[]>([])
  const batchStartTime = useRef<number | null>(null)

  function handleKeyDown(e: React.KeyboardEvent) {
    keyDownTimes.current[e.key] = performance.now()
    if (batchStartTime.current === null) {
      batchStartTime.current = performance.now()
    }
  }

  function handleKeyUp(e: React.KeyboardEvent) {
    const now = performance.now()
    const keyDownTime = keyDownTimes.current[e.key]

    if (keyDownTime !== undefined) {
      const dwell_time = now - keyDownTime
      const flight_time = lastKeyUpTime.current !== null ? now - lastKeyUpTime.current : 0

      lastKeyUpTime.current = now
      totalKeys.current += 1

      if (e.key === "Backspace") {
        backspaceCount.current += 1
      }

      dwellTimes.current.push(dwell_time)
      if (flight_time > 0) {
        digraphTimes.current.push(flight_time)
      }

      const backspace_rate = backspaceCount.current / totalKeys.current
      const batchDuration = batchStartTime.current !== null
        ? (now - batchStartTime.current) / 1000
        : 1
      const typing_speed = totalKeys.current / batchDuration
      const mean_dwell = dwellTimes.current.reduce((a, b) => a + b, 0) / dwellTimes.current.length
      const dwell_variance = dwellTimes.current.length > 1
        ? Math.sqrt(dwellTimes.current.reduce((a, b) => a + Math.pow(b - mean_dwell, 2), 0) / dwellTimes.current.length)
        : 0
      const digraph_time = digraphTimes.current.length > 0
        ? digraphTimes.current.reduce((a, b) => a + b, 0) / digraphTimes.current.length
        : 0

      keystrokeBuffer.current.push({
        dwell_time,
        flight_time,
        backspace_rate,
        typing_speed,
        dwell_variance,
        digraph_time
      })

      setKeystrokeCount(keystrokeBuffer.current.length)
      delete keyDownTimes.current[e.key]
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await signUp(username, email, password)
      toast.success("Account created successfully")
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign up")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEnrollment() {
    if (keystrokeBuffer.current.length < 200) {
      toast.error(`Please type more: ${keystrokeBuffer.current.length}/200 keystrokes captured`)
      return
    }
    setIsEnrolling(true)
    try {
      await apiLogKeystrokes(keystrokeBuffer.current)
      await apiTrainModel()
      toast.success("Typing profile created successfully")
      router.push("/dashboard")
    } catch {
      toast.error("Failed to create typing profile")
    } finally {
      setIsEnrolling(false)
    }
  }

  if (step === 2) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set up your typing profile</CardTitle>
            <CardDescription>
              Type freely in the box below, write anything you like. This could be about your day, your thoughts, or anything else.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="enrollment">Start typing...</Label>
              <Textarea
                id="enrollment"
                placeholder="Write anything you like here..."
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                rows={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {keystrokeCount} / 200 keystrokes captured
              {keystrokeCount < 200 && ". Keep typing!"}
              {keystrokeCount >= 200 && ". Ready to complete!"}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleEnrollment}
              disabled={isEnrolling}
            >
              {isEnrolling && <Loader2 className="animate-spin" />}
              Complete Setup
            </Button>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Get started with your personal note-taking space
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Sign Up
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}