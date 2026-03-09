"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, FileText } from "lucide-react"
import type { Note } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"

interface NotesSidebarProps {
  notes: Note[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export function NotesSidebar({
  notes,
  selectedId,
  onSelect,
  onNew,
}: NotesSidebarProps) {
  return (
    <aside className="flex h-full w-72 flex-col border-r bg-muted/30">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Notes</h2>
        <Button variant="ghost" size="icon" onClick={onNew} className="h-8 w-8">
          <Plus className="h-4 w-4" />
          <span className="sr-only">New note</span>
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
            <Button variant="outline" size="sm" onClick={onNew}>
              Create your first note
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-2 pb-4">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => onSelect(String(note.id))}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
                  selectedId === String(note.id) && "bg-accent"
                )}
              >
                <span className="line-clamp-1 text-sm font-medium">
                  {note.title || "Untitled"}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {note.content
                    ? note.content.substring(0, 80)
                    : "No content"}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(note.updated_at), {
                    addSuffix: true,
                  })}
                </span>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}
