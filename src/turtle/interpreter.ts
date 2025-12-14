import type { ExecuteResult, Point, TurtleCommand, TurtlePolygon, TurtleSegment } from './types'

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function executeTurtle(commands: TurtleCommand[]): ExecuteResult {
  const segments: TurtleSegment[] = []
  const polygons: TurtlePolygon[] = []

  let x = 0
  let y = 0
  let headingDeg = 0 // 0 = up
  let penDown = true

  let currentPolygon: Point[] | null = [{ x, y }]

  const finalizePolygon = () => {
    if (!currentPolygon) return
    if (currentPolygon.length === 0) currentPolygon.push({ x, y })
    polygons.push({ points: currentPolygon })
    currentPolygon = null
  }

  const ensurePolygonStarted = () => {
    if (!currentPolygon) currentPolygon = [{ x, y }]
    if (currentPolygon.length === 0) currentPolygon.push({ x, y })
  }

  for (const cmd of commands) {
    switch (cmd.kind) {
      case 'LT':
        headingDeg += cmd.value ?? 0
        break
      case 'RT':
        headingDeg -= cmd.value ?? 0
        break
      case 'PU':
        if (penDown) finalizePolygon()
        penDown = false
        break
      case 'PD':
        if (!penDown) {
          penDown = true
          currentPolygon = [{ x, y }]
        }
        break
      case 'FD':
      case 'BK': {
        const value = cmd.value ?? 0
        const dist = cmd.kind === 'BK' ? -value : value
        const rad = degToRad(headingDeg)
        const nx = x + Math.sin(rad) * dist
        const ny = y + Math.cos(rad) * dist

        segments.push({ from: { x, y }, to: { x: nx, y: ny }, penDown })

        x = nx
        y = ny

        if (penDown) {
          ensurePolygonStarted()
          currentPolygon!.push({ x, y })
        }

        break
      }
    }
  }

  if (penDown) finalizePolygon()

  return { segments, polygons }
}
