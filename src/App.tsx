import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Monaco from 'monaco-editor'
import { executeTurtle } from './turtle/interpreter'
import { generateOpenScad } from './turtle/openscad'
import { parseTurtle } from './turtle/parser'
import { defaultTurtleScript } from './turtle/sample'
import type { TurtleSegment } from './turtle/types'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  segments: TurtleSegment[],
  visibleSegments: number,
  colors: {
    penDown: string
    penUp: string
    axis: string
  },
) {
  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  if (segments.length === 0) return

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const s of segments) {
    minX = Math.min(minX, s.from.x, s.to.x)
    maxX = Math.max(maxX, s.from.x, s.to.x)
    minY = Math.min(minY, s.from.y, s.to.y)
    maxY = Math.max(maxY, s.from.y, s.to.y)
  }

  const pad = 24
  const spanX = Math.max(1e-9, maxX - minX)
  const spanY = Math.max(1e-9, maxY - minY)
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY)

  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const centerX = width / 2
  const centerY = height / 2

  const toScreen = (p: { x: number; y: number }) => {
    return {
      x: centerX + (p.x - midX) * scale,
      y: centerY - (p.y - midY) * scale,
    }
  }

  // Axes
  ctx.save()
  ctx.strokeStyle = colors.axis
  ctx.lineWidth = 1
  ctx.setLineDash([4, 6])
  const o = toScreen({ x: 0, y: 0 })
  ctx.beginPath()
  ctx.moveTo(0, o.y)
  ctx.lineTo(width, o.y)
  ctx.moveTo(o.x, 0)
  ctx.lineTo(o.x, height)
  ctx.stroke()
  ctx.restore()

  const fullCount = Math.floor(visibleSegments)
  const frac = visibleSegments - fullCount

  const drawSeg = (s: TurtleSegment, t: number) => {
    const a = toScreen(s.from)
    const b = toScreen(s.to)
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    const isPartial = i === fullCount && frac > 0
    const isVisible = i < fullCount || isPartial
    if (!isVisible) break

    ctx.save()
    ctx.lineWidth = 2
    if (s.penDown) {
      ctx.strokeStyle = colors.penDown
      ctx.setLineDash([])
    } else {
      ctx.strokeStyle = colors.penUp
      ctx.setLineDash([8, 6])
    }

    drawSeg(s, isPartial ? frac : 1)
    ctx.restore()
  }

  // Turtle head
  const lastIndex = Math.min(fullCount, segments.length - 1)
  if (lastIndex >= 0) {
    const last = segments[lastIndex]
    const t = lastIndex === fullCount && frac > 0 ? frac : 1
    const p = {
      x: last.from.x + (last.to.x - last.from.x) * t,
      y: last.from.y + (last.to.y - last.from.y) * t,
    }
    const sp = toScreen(p)
    ctx.save()
    ctx.fillStyle = colors.penDown
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export default function App() {
  const theme = useTheme()

  const [source, setSource] = useState(defaultTurtleScript)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(10)
  const [progress, setProgress] = useState(0)

  const parseResult = useMemo(() => parseTurtle(source), [source])
  const runResult = useMemo(() => executeTurtle(parseResult.commands), [parseResult.commands])
  const openScad = useMemo(() => generateOpenScad(runResult.polygons), [runResult.polygons])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  const monacoRef = useRef<typeof Monaco | null>(null)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])

  const handlePlay = () => {
    setProgress(0)
    lastTsRef.current = null
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  useEffect(() => {
    setIsPlaying(false)
    setProgress(0)
  }, [source])

  useEffect(() => {
    const total = runResult.segments.length
    if (!isPlaying) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
      return
    }

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts

      setProgress((p) => {
        const next = p + dt * speed
        if (next >= total) {
          setIsPlaying(false)
          return total
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [isPlaying, runResult.segments.length, speed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const nextW = Math.max(1, Math.floor(rect.width * dpr))
    const nextH = Math.max(1, Math.floor(rect.height * dpr))
    if (canvas.width !== nextW || canvas.height !== nextH) {
      canvas.width = nextW
      canvas.height = nextH
    }

    drawPreview(
      ctx,
      canvas,
      runResult.segments,
      clamp(progress, 0, runResult.segments.length),
      {
        penDown: theme.palette.primary.main,
        penUp: theme.palette.text.secondary,
        axis: alpha(theme.palette.text.secondary, 0.4),
      },
    )
  }, [progress, runResult.segments, theme.palette.primary.main, theme.palette.text.secondary])

  useEffect(() => {
    const monaco = monacoRef.current
    const editor = editorRef.current
    if (!monaco || !editor) return
    const model = editor.getModel()
    if (!model) return

    const markers: Monaco.editor.IMarkerData[] = parseResult.diagnostics.map((d) => ({
      severity: monaco.MarkerSeverity.Error,
      message: d.message,
      startLineNumber: d.range.startLine,
      startColumn: d.range.startColumn,
      endLineNumber: d.range.endLine,
      endColumn: d.range.endColumn,
    }))

    monaco.editor.setModelMarkers(model, 'turtle', markers)

    const errorLines = Array.from(new Set(parseResult.diagnostics.map((d) => d.range.startLine)))
    const decorations = errorLines.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 't2osLineError',
      },
    }))

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations)
  }, [parseResult.diagnostics])

  const onEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(openScad)
    } catch {
      // ignore
    }
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            ['--t2os-error-line-bg' as any]: alpha(theme.palette.error.main, 0.12),
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1">Turtle Script</Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={source}
              onChange={(v) => setSource(v ?? '')}
              onMount={onEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
              }}
            />
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 1, maxHeight: 140, overflow: 'auto' }}>
            {parseResult.diagnostics.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No errors
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {parseResult.diagnostics.slice(0, 50).map((d, idx) => (
                  <Typography key={idx} variant="body2" color="error">
                    L{d.range.startLine}: {d.message}
                  </Typography>
                ))}
              </Stack>
            )}
          </Box>
        </Paper>

        <Divider orientation="vertical" flexItem />

        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1">Preview</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handlePlay}
                  disabled={isPlaying || runResult.segments.length === 0}
                >
                  Play
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PauseIcon />}
                  onClick={handlePause}
                  disabled={!isPlaying}
                >
                  Pause
                </Button>
              </Stack>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
                Speed (segments/sec)
              </Typography>
              <Slider
                value={speed}
                min={1}
                max={20}
                step={1}
                onChange={(_, v) => setSpeed(Array.isArray(v) ? v[0] : v)}
                sx={{ flex: 1 }}
              />
              <Typography variant="body2" sx={{ width: 44, textAlign: 'right' }}>
                {speed}
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Box component="canvas" ref={canvasRef} sx={{ width: '100%', height: '100%', display: 'block' }} />
          </Box>
        </Paper>

        <Divider orientation="vertical" flexItem />

        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1">OpenSCAD</Typography>
              <IconButton aria-label="Copy OpenSCAD" onClick={onCopy} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
            <TextField
              value={openScad}
              fullWidth
              multiline
              minRows={10}
              InputProps={{ readOnly: true }}
              sx={{
                height: '100%',
                '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                '& textarea': {
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                },
              }}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
