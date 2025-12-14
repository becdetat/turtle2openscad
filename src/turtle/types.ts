export type TurtleCommandKind = 'FD' | 'BK' | 'LT' | 'RT' | 'PU' | 'PD'

export type SourceRange = {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export type TurtleDiagnostic = {
  message: string
  range: SourceRange
}

export type TurtleCommand = {
  kind: TurtleCommandKind
  value?: number
}

export type Point = { x: number; y: number }

export type TurtleSegment = {
  from: Point
  to: Point
  penDown: boolean
}

export type TurtlePolygon = {
  points: Point[]
}

export type ParseResult = {
  commands: TurtleCommand[]
  diagnostics: TurtleDiagnostic[]
}

export type ExecuteResult = {
  segments: TurtleSegment[]
  polygons: TurtlePolygon[]
}
