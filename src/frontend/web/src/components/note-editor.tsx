"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Save, Loader2 } from "lucide-react"
import { apiLogKeystrokes, apiPredictKeystrokes } from "@/lib/api"
import type { Note } from "@/lib/api"

interface NoteEditorProps {
  note: Note
  onSave: (id: string, data: { title: string; content: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function NoteEditor({ note, onSave, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [authStatus, setAuthStatus] = useState<"normal" | "suspicious" | "anomaly" | null>(null)

  const batchStartTime = useRef<number | null>(null)
  const digraphTimes = useRef<number[]>([])
  const dwellTimes = useRef<number[]>([])
  const suspiciousCount = useRef<number>(0)
  const totalKeys = useRef<number>(0)
  const backspaceCount = useRef<number>(0)
  const keyDownTimes = useRef<Record<string, number>>({})
  const lastKeyUpTime = useRef<number | null>(null)
  const keystrokeBuffer = useRef<{
    dwell_time: number
    flight_time: number
    backspace_rate: number
    typing_speed: number
    dwell_variance: number
    digraph_time: number
  }[]>([])
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDirty = title !== note.title || content !== note.content

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
  }, [note.id, note.title, note.content])

  useEffect(() => {
    return () => {
      flushKeystrokes()
      if (flushTimer.current) clearTimeout(flushTimer.current)
    }
  }, [])

  async function handleSave() {
    setIsSaving(true)
    try {
      await onSave(String(note.id), { title, content })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete(String(note.id))
    } finally {
      setIsDeleting(false)
    }
  }

  async function flushKeystrokes() {
    if (keystrokeBuffer.current.length === 0) return
    const batch = [...keystrokeBuffer.current]
    const batchDwellTimes = [...dwellTimes.current]
    const batchDigraphTimes = [...digraphTimes.current]
    const batchDuration = batchStartTime.current !== null
      ? (performance.now() - batchStartTime.current) / 1000
      : 1

    const typing_speed = batch.length / batchDuration
    const mean_dwell = batchDwellTimes.reduce((a, b) => a + b, 0) / batchDwellTimes.length
    const dwell_variance = batchDwellTimes.length > 1
      ? Math.sqrt(batchDwellTimes.reduce((a, b) => a + Math.pow(b - mean_dwell, 2), 0) / batchDwellTimes.length)
      : 0
    const digraph_time = batchDigraphTimes.length > 0
      ? batchDigraphTimes.reduce((a, b) => a + b, 0) / batchDigraphTimes.length
      : 0

    const enrichedBatch = batch.map(k => ({
      ...k,
      typing_speed,
      dwell_variance,
      digraph_time
    }))

    keystrokeBuffer.current = []
    dwellTimes.current = []
    digraphTimes.current = []
    batchStartTime.current = null

    try {
      await apiLogKeystrokes(enrichedBatch)
      const result = await apiPredictKeystrokes(enrichedBatch)

      if (result.status === "suspicious") {
        suspiciousCount.current += 1
        if (suspiciousCount.current >= 2) {
          setAuthStatus("suspicious")
        }
      } else if (result.status === "anomaly") {
        suspiciousCount.current += 1
        if (suspiciousCount.current >= 2) {
          setAuthStatus("anomaly")
        }
      }
    } catch {
      console.log("something is wrong")
    }
  }

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

      keystrokeBuffer.current.push({
        dwell_time,
        flight_time,
        backspace_rate,
        typing_speed: 0,
        dwell_variance: 0,
        digraph_time: 0
      })

      delete keyDownTimes.current[e.key]

      if (keystrokeBuffer.current.length >= 10) {
        flushKeystrokes()
      } else {
        if (flushTimer.current) clearTimeout(flushTimer.current)
        flushTimer.current = setTimeout(flushKeystrokes, 5000)
      }
    }
  }

  return (
    
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes" : "Saved"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
        {authStatus === "suspicious" && (
          <div className="flex items-center justify-between bg-yellow-100 border-b border-yellow-300 px-6 py-2 text-sm text-yellow-800">
            <span>Unusual typing pattern detected. Please verify your identity.</span>
            <button onClick={() => { setAuthStatus("normal"); suspiciousCount.current = 0 }} className="text-yellow-800 underline ml-4">
              Dismiss
            </button>
          </div>
        )}
        {authStatus === "anomaly" && (
          <div className="flex items-center justify-between bg-red-100 border-b border-red-300 px-6 py-2 text-sm text-red-800">
            <span>Typing behaviour does not match the registered user.</span>
            <button onClick={() => { setAuthStatus("normal"); suspiciousCount.current = 0 }} className="text-red-800 underline ml-4">
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="border-none bg-transparent text-xl font-semibold shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder="Start writing..."
          className="flex-1 resize-none border-none bg-transparent shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
          rows={20}
        />
      </div>
    </div>
  )
}
