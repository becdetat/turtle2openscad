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
      
      // LT 90 decreases heading to -90° (counterclockwise), pointing left (-X)
      expect(result.segments[0].to.x).toBeCloseTo(-10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })

    it('should turn right', () => {
      const { commands } = parseTurtle('RT 90\nFD 10')
      const result = executeTurtle(commands, defaultOptions, [])
      
      // RT 90 increases heading to 90° (clockwise), pointing right (+X)
      expect(result.segments[0].to.x).toBeCloseTo(10)
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

  describe('EXTCOMMENTPOS command', () => {
    it('should generate position comment at origin', () => {
      const { commands, comments } = parseTurtle('EXTCOMMENTPOS')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Comment should be in commentsByPointIndex for the next point (index 0)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint!.length).toBe(1)
      expect(commentsAtPoint![0].text).toBe('// Position: x=0, y=0')
    })

    it('should generate position comment with custom label', () => {
      const { commands, comments } = parseTurtle('EXTCOMMENTPOS [Screw hole 1]')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Screw hole 1: x=0, y=0')
    })

    it('should generate position comment after movement', () => {
      const { commands, comments } = parseTurtle('SETXY 0, 0\nRT 45\nFD 10\nEXTCOMMENTPOS')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // After SETXY and FD, there are 3 points (0, 1, 2). Comment should appear after point 2, which is at index 3
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(3)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toContain('x=7.071068')
      expect(commentsAtPoint![0].text).toContain('y=7.071068')
    })

    it('should format numbers with 6 decimal places and trim trailing zeros', () => {
      const { commands, comments } = parseTurtle('SETXY 7.071067811865476, 7.071067811865476\nEXTCOMMENTPOS')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      // SETXY adds point 1, so comment should be at index 2
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toContain('x=7.071068')
      expect(commentsAtPoint![0].text).toContain('y=7.071068')
    })

    it('should place comment before next point when pen is down', () => {
      const { commands, comments } = parseTurtle('FD 10\nEXTCOMMENTPOS [After first line]\nFD 10')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Comment should appear before the second point (index 2)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// After first line: x=0, y=10')
    })

    it('should add comment to polygon comments when pen is up', () => {
      const { commands, comments } = parseTurtle('PU\nSETXY 10, 20\nEXTCOMMENTPOS [Pen up position]')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      // PU finalizes the initial polygon, then pen is up so no new polygon is started
      expect(result.polygons).toHaveLength(1)
      // The position comment should not be in this polygon since it was created with pen up
      expect(result.polygons[0].comments.length).toBe(0)
      expect(result.polygons[0].commentsByPointIndex.size).toBe(0)
    })

    it('should handle multiple EXTCOMMENTPOS commands', () => {
      const { commands, comments } = parseTurtle('EXTCOMMENTPOS [Start]\nFD 10\nEXTCOMMENTPOS [Middle]\nFD 10\nEXTCOMMENTPOS [End]')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Should have comments at indices 0, 2, and 3
      // Start at origin (index 0), Middle after first FD (index 2), End after second FD (index 3)
      const comments0 = result.polygons[0].commentsByPointIndex.get(0)
      const comments2 = result.polygons[0].commentsByPointIndex.get(2)
      const comments3 = result.polygons[0].commentsByPointIndex.get(3)
      
      expect(comments0).toBeDefined()
      expect(comments2).toBeDefined()
      expect(comments3).toBeDefined()
      
      expect(comments0![0].text).toContain('Start')
      expect(comments2![0].text).toContain('Middle')
      expect(comments3![0].text).toContain('End')
    })

    it('should work within REPEAT loops', () => {
      const { commands, comments } = parseTurtle('REPEAT 2 [FD 10; EXTCOMMENTPOS [Corner]; RT 90]')
      const result = executeTurtle(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Should have position comments from both iterations
      const allComments: string[] = []
      result.polygons[0].commentsByPointIndex.forEach((comments) => {
        comments.forEach((c) => allComments.push(c.text))
      })
      
      const cornerComments = allComments.filter(c => c.includes('Corner'))
      expect(cornerComments.length).toBe(2)
    })
  })
})
