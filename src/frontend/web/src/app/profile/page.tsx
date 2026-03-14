"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppHeader } from "@/components/app-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, updateProfile, logout } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setName(user.username)
    }
  }, [user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updateProfile({ name })
      toast.success("Profile updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  function handleLogout() {
    logout()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const initials = user.username
    ? user.username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="flex w-full max-w-lg flex-col gap-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">{user.username}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Separator />

          {/* Edit Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your display name</CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-name">Display Name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    value={user.email}
                    disabled
                    className="opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed from here
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={isSaving || name === user.username}
                >
                  {isSaving && <Loader2 className="animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Account</CardTitle>
              <CardDescription>
                Manage your account session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleLogout}>
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
