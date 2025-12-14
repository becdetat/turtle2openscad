import type {
  ParseResult,
  SourceRange,
  TurtleCommand,
  TurtleCommandKind,
  TurtleDiagnostic,
} from './types'

const aliasToKind: Record<string, TurtleCommandKind> = {
  FD: 'FD',
  FORWARD: 'FD',
  BK: 'BK',
  BACK: 'BK',
  LT: 'LT',
  LEFT: 'LT',
  RT: 'RT',
  RIGHT: 'RT',
  PU: 'PU',
  PENUP: 'PU',
  PD: 'PD',
  PENDOWN: 'PD',
}

function rangeForSegment(lineNumber: number, startCol: number, endCol: number): SourceRange {
  return {
    startLine: lineNumber,
    startColumn: startCol,
    endLine: lineNumber,
    endColumn: Math.max(startCol + 1, endCol),
  }
}

function diagnostic(message: string, range: SourceRange): TurtleDiagnostic {
  return { message, range }
}

export function parseTurtle(source: string): ParseResult {
  const commands: TurtleCommand[] = []
  const diagnostics: TurtleDiagnostic[] = []

  const lines = source.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    const line = lines[i]

    const hashIdx = line.indexOf('#')
    const slashIdx = line.indexOf('//')
    let cut = line.length
    if (hashIdx >= 0) cut = Math.min(cut, hashIdx)
    if (slashIdx >= 0) cut = Math.min(cut, slashIdx)
    const content = line.slice(0, cut)

    let segStart = 0
    while (segStart <= content.length) {
      const semiIdx = content.indexOf(';', segStart)
      const segEnd = semiIdx >= 0 ? semiIdx : content.length

      const raw = content.slice(segStart, segEnd)
      const leadingWs = raw.match(/^\s*/)?.[0].length ?? 0
      const trailingWs = raw.match(/\s*$/)?.[0].length ?? 0
      const trimmed = raw.trim()

      if (trimmed.length > 0) {
        const startCol = segStart + leadingWs + 1
        const endCol = segEnd - trailingWs + 1
        const segRange = rangeForSegment(lineNumber, startCol, endCol)

        const parts = trimmed.split(/\s+/)
        const cmdRaw = parts[0] ?? ''
        const cmdText = cmdRaw.toUpperCase()
        const kind = aliasToKind[cmdText]

        if (!kind) {
          diagnostics.push(diagnostic(`Unknown command: ${cmdRaw}`, segRange))
        } else {
          const expectsNumber = kind === 'FD' || kind === 'BK' || kind === 'LT' || kind === 'RT'

          if (expectsNumber) {
            if (parts.length < 2) {
              diagnostics.push(diagnostic(`${cmdText} requires a number`, segRange))
            } else if (parts.length > 2) {
              diagnostics.push(diagnostic(`Too many tokens for ${cmdText}`, segRange))
            } else {
              const value = Number(parts[1])
              if (!Number.isFinite(value)) {
                diagnostics.push(diagnostic(`Invalid number: ${parts[1]}`, segRange))
              } else {
                commands.push({ kind, value })
              }
            }
          } else {
            if (parts.length > 1) {
              diagnostics.push(diagnostic(`${cmdText} does not take a number`, segRange))
            } else {
              commands.push({ kind })
            }
          }
        }
      }

      if (semiIdx < 0) break
      segStart = semiIdx + 1
    }
  }

  return { commands, diagnostics }
}
