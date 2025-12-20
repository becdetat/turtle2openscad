import { describe, expect, it } from 'vitest'
import { executeTurtle } from '../src/turtle/interpreter'
import { parseTurtle } from '../src/turtle/parser'

describe('interpreter', () => {
  const defaultOptions = { arcPointsPer90Deg: 10 }

  describe('basic movement', () => {
    it('should move forward from origin', () => {
      const { commands } = parseTurtle('FD 10')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].from).toEqual({ x: 0, y: 0 })
      expect(result.segments[0].to.y).toBeCloseTo(10)
      expect(result.segments[0].penDown).toBe(true)
    })

    it('should move backward', () => {
      const { commands } = parseTurtle('BK 10')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].to.y).toBeCloseTo(-10)
    })

    it('should track pen up/down state', () => {
      const { commands } = parseTurtle('PU\nFD 10\nPD\nFD 10')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(2)
      expect(result.segments[0].penDown).toBe(false)
      expect(result.segments[1].penDown).toBe(true)
    })

    it('should create multiple polygons with PU/PD', () => {
      const { commands } = parseTurtle('FD 10\nPU\nFD 10\nPD\nFD 10')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.polygons).toHaveLength(2)
      expect(result.polygons[0].points.length).toBeGreaterThan(1)
      expect(result.polygons[1].points.length).toBeGreaterThan(1)
    })
  })

  describe('turning', () => {
    it('should turn left', () => {
      const { commands } = parseTurtle('LT 90\nFD 10')
      const result = executeTurtle(commands, defaultOptions, [])
      
      // LT 90 increases heading to 90° (clockwise), pointing right (+X)
      expect(result.segments[0].to.x).toBeCloseTo(10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })

    it('should turn right', () => {
      const { commands } = parseTurtle('RT 90\nFD 10')
      const result = executeTurtle(commands, defaultOptions, [])
      
      // RT 90 decreases heading to -90° (counterclockwise), pointing left (-X)
      expect(result.segments[0].to.x).toBeCloseTo(-10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })

    it('should set absolute heading', () => {
      const { commands } = parseTurtle('SETH 90\nFD 10')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.x).toBeCloseTo(10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })
  })

  describe('position commands', () => {
    it('should set X coordinate', () => {
      const { commands } = parseTurtle('SETX 50')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.x).toBe(50)
      expect(result.segments[0].to.y).toBe(0)
    })

    it('should set Y coordinate', () => {
      const { commands } = parseTurtle('SETY 50')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.x).toBe(0)
      expect(result.segments[0].to.y).toBe(50)
    })

    it('should set both X and Y coordinates', () => {
      const { commands } = parseTurtle('SETXY 30, 40')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.x).toBe(30)
      expect(result.segments[0].to.y).toBe(40)
    })

    it('should return HOME', () => {
      const { commands } = parseTurtle('FD 10\nRT 45\nHOME')
      const result = executeTurtle(commands, defaultOptions, [])
      
      const lastSegment = result.segments[result.segments.length - 1]
      expect(lastSegment.to.x).toBeCloseTo(0)
      expect(lastSegment.to.y).toBeCloseTo(0)
    })
  })

  describe('arcs', () => {
    it('should generate arc segments', () => {
      const { commands } = parseTurtle('ARC 90, 50')
      const result = executeTurtle(commands, { arcPointsPer90Deg: 10 }, [])
      
      expect(result.segments.length).toBeGreaterThan(1)
      // All arc segments should have the same arcGroup ID
      const arcGroupId = result.segments[0].arcGroup
      expect(arcGroupId).toBeDefined()
      result.segments.forEach(seg => {
        expect(seg.arcGroup).toBe(arcGroupId)
      })
    })

    it('should respect arcPointsPer90Deg setting', () => {
      const { commands } = parseTurtle('ARC 90, 50')
      const result1 = executeTurtle(commands, { arcPointsPer90Deg: 5 }, [])
      const result2 = executeTurtle(commands, { arcPointsPer90Deg: 10 }, [])
      
      expect(result2.segments.length).toBeGreaterThan(result1.segments.length)
    })
  })

  describe('expressions', () => {
    it('should evaluate arithmetic expressions', () => {
      const { commands } = parseTurtle('FD 10 + 5')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(15)
    })

    it('should handle operator precedence', () => {
      const { commands } = parseTurtle('FD 2 + 3 * 4')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(14)
    })

    it('should handle parentheses', () => {
      const { commands } = parseTurtle('FD (2 + 3) * 4')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should handle exponentiation', () => {
      const { commands } = parseTurtle('FD 2 ^ 3')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(8)
    })
  })

  describe('variables', () => {
    it('should store and retrieve variables', () => {
      const { commands } = parseTurtle('MAKE "size 100\nFD :size')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(100)
    })

    it('should use variables in expressions', () => {
      const { commands } = parseTurtle('MAKE "x 10\nFD :x * 2')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should update variable values', () => {
      const { commands } = parseTurtle('MAKE "x 10\nMAKE "x 20\nFD :x')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should handle variables with expressions', () => {
      const { commands } = parseTurtle('MAKE "size 50\nMAKE "double :size * 2\nFD :double')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(100)
    })
  })

  describe('REPEAT command', () => {
    it('should execute commands in loop', () => {
      const { commands } = parseTurtle('REPEAT 4 [FD 10; RT 90]')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(4)
    })

    it('should create a square with REPEAT', () => {
      const { commands } = parseTurtle('REPEAT 4 [FD 50; RT 90]')
      const result = executeTurtle(commands, defaultOptions, [])
      
      const lastSegment = result.segments[result.segments.length - 1]
      expect(lastSegment.to.x).toBeCloseTo(0)
      expect(lastSegment.to.y).toBeCloseTo(0)
    })

    it('should handle REPEAT with variables', () => {
      const { commands } = parseTurtle('MAKE "n 3\nREPEAT :n [FD 10]')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(3)
    })
  })

  describe('functions', () => {
    it('should evaluate SQRT function', () => {
      const { commands } = parseTurtle('FD SQRT 16')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(4)
    })

    it('should evaluate LN function', () => {
      const { commands } = parseTurtle('FD LN 2.718281828459045')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(1, 5)
    })

    it('should evaluate EXP function', () => {
      const { commands } = parseTurtle('FD EXP 2')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(7.389, 3)
    })

    it('should evaluate LOG10 function', () => {
      const { commands } = parseTurtle('FD LOG10 100')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(2)
    })
  })

  describe('complex shapes', () => {
    it('should draw a square', () => {
      const { commands } = parseTurtle('REPEAT 4 [FD 100; RT 90]')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.polygons).toHaveLength(1)
      expect(result.polygons[0].points).toHaveLength(5) // 4 corners + closing point
    })

    it('should draw a hexagon', () => {
      const { commands } = parseTurtle('REPEAT 6 [FD 50; RT 60]')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.polygons).toHaveLength(1)
      expect(result.polygons[0].points).toHaveLength(7) // 6 corners + closing point
    })

    it('should handle multiple separate shapes', () => {
      const { commands } = parseTurtle('REPEAT 4 [FD 50; RT 90]\nPU\nFD 100\nPD\nREPEAT 3 [FD 50; RT 120]')
      const result = executeTurtle(commands, defaultOptions, [])
      
      expect(result.polygons).toHaveLength(2)
    })
  })

  describe('comments', () => {
    it('should associate comments with polygons', () => {
      const { commands, comments } = parseTurtle('# Draw a line\nFD 10\n# Turn\nRT 90\nFD 5')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // With multiple commands and comments, the polygon should have comments
      expect(result.polygons[0].comments.length).toBeGreaterThan(0)
    })

    it('should track comments in commentsByPointIndex', () => {
      const { commands, comments } = parseTurtle('FD 10\n// comment\nFD 10')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      expect(result.polygons[0].commentsByPointIndex.size).toBeGreaterThan(0)
    })
  })
})
