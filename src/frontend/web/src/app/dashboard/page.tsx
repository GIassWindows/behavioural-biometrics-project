"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppHeader } from "@/components/app-header"
import { NotesSidebar } from "@/components/notes-sidebar"
import { NoteEditor } from "@/components/note-editor"
import {
  type Note,
  apiGetNotes,
  apiCreateNote,
  apiUpdateNote,
  apiDeleteNote,
} from "@/lib/api"
import { toast } from "sonner"
import { FileText } from "lucide-react"

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoadingNotes, setIsLoadingNotes] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isLoading, isAuthenticated, router])

  const fetchNotes = useCallback(async () => {
    try {
      const res = await apiGetNotes()
      const sorted = res.notes.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      setNotes(sorted)
    } catch {
      toast.error("Failed to load notes")
    } finally {
      setIsLoadingNotes(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes()
    }
  }, [isAuthenticated, fetchNotes])

  async function handleNewNote() {
    try {
      const res = await apiCreateNote({ title: "", content: "" })
      setNotes((prev) => [res.note, ...prev])
      setSelectedId(String(res.note.id))
    } catch {
      toast.error("Failed to create note")
    }
  }

  async function handleSave(
    id: string,
    data: { title: string; content: string }
  ) {
    try {
      const res = await apiUpdateNote(id, data)
      setNotes((prev) =>
        prev
          .map((notes) => (String(notes.id) === id ? res.note : notes))
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      )
      toast.success("Note saved")
    } catch {
      toast.error("Failed to save note")
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDeleteNote(id)
      setNotes((prev) => prev.filter((notes) => String(notes.id) !== id))
      if (selectedId === id) {
        setSelectedId(null)
      }
      toast.success("Note deleted")
    } catch {
      toast.error("Failed to delete note")
    }
  }

  const selectedNote = notes.find((notes) => String(notes.id) === selectedId) ?? null

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-svh flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <NotesSidebar
          notes={notes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={handleNewNote}
        />
        <main className="flex-1">
          {isLoadingNotes ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
            </div>
          ) : selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="text-sm">
                {notes.length === 0
                  ? "Create your first note to get started"
                  : "Select a note from the sidebar"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
