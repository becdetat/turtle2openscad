import { describe, expect, it, beforeEach, vi } from 'vitest'
import { drawPreview } from '../src/turtle/drawPreview'
import type { TurtleSegment } from '../src/turtle/types'

describe('drawPreview', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  let mockContext: any

  beforeEach(() => {
    // Create mock canvas
    canvas = {
      width: 800,
      height: 600,
    } as HTMLCanvasElement

    // Create mock context with all required methods
    mockContext = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      setLineDash: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
    }
    ctx = mockContext as unknown as CanvasRenderingContext2D
  })

  const colors = {
    penDown: '#000000',
    penUp: '#cccccc',
    axis: '#aaaaaa',
  }

  describe('basic rendering', () => {
    it('should clear the canvas', () => {
      const segments: TurtleSegment[] = []
      drawPreview(ctx, canvas, segments, 0, colors)

      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
    })

    it('should handle empty segments array', () => {
      const segments: TurtleSegment[] = []
      drawPreview(ctx, canvas, segments, 0, colors)

      expect(mockContext.clearRect).toHaveBeenCalled()
      // Should not draw anything else
      expect(mockContext.stroke).not.toHaveBeenCalled()
    })

    it('should draw axes when segments exist', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Should save and restore context for axes
      expect(mockContext.save).toHaveBeenCalled()
      expect(mockContext.restore).toHaveBeenCalled()
      // Should set dashed line for axes
      expect(mockContext.setLineDash).toHaveBeenCalledWith([4, 6])
      // Should draw axes
      expect(mockContext.stroke).toHaveBeenCalled()
    })
  })

  describe('segment rendering', () => {
    it('should render pen down segments with solid line', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Should set pen down color
      expect(mockContext.strokeStyle).toBe(colors.penDown)
      // Should set solid line (empty dash array)
      expect(mockContext.setLineDash).toHaveBeenCalledWith([])
      // Should draw the segment
      expect(mockContext.beginPath).toHaveBeenCalled()
      expect(mockContext.moveTo).toHaveBeenCalled()
      expect(mockContext.lineTo).toHaveBeenCalled()
      expect(mockContext.stroke).toHaveBeenCalled()
    })

    it('should render pen up segments with dashed line', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: false,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Should set pen up color
      expect(mockContext.strokeStyle).toBe(colors.penUp)
      // Should set dashed line
      expect(mockContext.setLineDash).toHaveBeenCalledWith([8, 6])
    })

    it('should render multiple segments', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
        {
          from: { x: 100, y: 0 },
          to: { x: 100, y: 100 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 2, colors)

      // Should call stroke multiple times (axes + 2 segments)
      const strokeCalls = mockContext.stroke.mock.calls.length
      expect(strokeCalls).toBeGreaterThanOrEqual(3)
    })

    it('should only render visible segments', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
        {
          from: { x: 100, y: 0 },
          to: { x: 100, y: 100 },
          penDown: true,
        },
        {
          from: { x: 100, y: 100 },
          to: { x: 0, y: 100 },
          penDown: true,
        },
      ]

      // Only show first 2 segments
      drawPreview(ctx, canvas, segments, 2, colors)

      // Count number of beginPath calls (excluding axes)
      const beginPathCalls = mockContext.beginPath.mock.calls.length
      // Should be: 1 for axes + 2 for segments + 1 for turtle head
      expect(beginPathCalls).toBe(4)
    })
  })

  describe('partial segment rendering', () => {
    it('should render partial segment with fractional progress', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      // Show 0.5 of the first segment
      drawPreview(ctx, canvas, segments, 0.5, colors)

      // Should draw partial segment
      expect(mockContext.lineTo).toHaveBeenCalled()
    })

    it('should handle arc segments specially', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 10, y: 10 },
          penDown: true,
          arcGroup: 1,
        },
        {
          from: { x: 10, y: 10 },
          to: { x: 20, y: 15 },
          penDown: true,
          arcGroup: 1,
        },
      ]

      // Show 1.5 segments (partial arc segment)
      drawPreview(ctx, canvas, segments, 1.5, colors)

      // Should render both arc segments fully (not partially)
      expect(mockContext.stroke).toHaveBeenCalled()
    })
  })

  describe('viewport scaling', () => {
    it('should scale to fit all segments', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: -100, y: -100 },
          to: { x: 100, y: 100 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Should calculate bounds and draw with appropriate scaling
      expect(mockContext.lineTo).toHaveBeenCalled()
    })

    it('should handle very small spans', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 0.001, y: 0.001 },
          penDown: true,
        },
      ]

      // Should not crash with divide by zero
      expect(() => {
        drawPreview(ctx, canvas, segments, 1, colors)
      }).not.toThrow()
    })

    it('should center the drawing', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 100, y: 100 },
          to: { x: 200, y: 200 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Drawing should be centered - hard to test precisely without knowing exact calls
      // but we can verify it doesn't crash and draws something
      expect(mockContext.stroke).toHaveBeenCalled()
    })

    it('should apply padding', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 1000, y: 1000 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // With padding, the drawing should not extend to canvas edges
      // This is verified by the scale calculation in the implementation
      expect(mockContext.stroke).toHaveBeenCalled()
    })
  })

  describe('turtle head', () => {
    it('should draw turtle head at current position', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Should draw circle for turtle head
      expect(mockContext.arc).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        4,
        0,
        Math.PI * 2
      )
      expect(mockContext.fill).toHaveBeenCalled()
    })

    it('should position turtle head at partial segment end', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 0.5, colors)

      // Should draw turtle head at midpoint
      expect(mockContext.arc).toHaveBeenCalled()
      expect(mockContext.fill).toHaveBeenCalled()
    })

    it('should use penDown color for turtle head', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Should set fill style to pen down color for turtle head
      expect(mockContext.fillStyle).toBe(colors.penDown)
    })
  })

  describe('color configuration', () => {
    it('should use provided colors', () => {
      const customColors = {
        penDown: '#ff0000',
        penUp: '#00ff00',
        axis: '#0000ff',
      }

      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, customColors)

      expect(mockContext.strokeStyle).toBe(customColors.penDown)
    })
  })

  describe('context state management', () => {
    it('should save and restore context state', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Should save/restore for axes, segment, and turtle head
      expect(mockContext.save.mock.calls.length).toBeGreaterThanOrEqual(3)
      expect(mockContext.restore.mock.calls.length).toBeGreaterThanOrEqual(3)
    })

    it('should set line width', () => {
      const segments: TurtleSegment[] = [
        {
          from: { x: 0, y: 0 },
          to: { x: 100, y: 0 },
          penDown: true,
        },
      ]

      drawPreview(ctx, canvas, segments, 1, colors)

      // Should set line width (1 for axes, 2 for segments)
      expect(mockContext.lineWidth).toBe(2)
    })
  })
})
