# Show Bezier Curve Traversal Movements

## Summary

When a `EXTBEZIERCURVE` block is evaluated, the turtle walks through a series of movement commands to collect control points. These traversal paths are currently invisible — only the final smooth curve is rendered. This feature makes those traversal paths visible in both the canvas preview and SVG export, rendered as dashed lines identical to pen-up (PU) movements. The existing "Hide PU" toggle will also suppress bezier traversal lines.

## Detailed description

Inside an `EXTBEZIERCURVE` block, the turtle executes movement commands (`FD`, `BK`, `SETX`, `SETY`, `SETXY`, `HOME`, `RT`, `LT`, `SETH`, etc.) and places control points at specific positions via `EXTDEFCONTROLPOINT`. Currently, `collectControlPoints` simulates these movements internally and discards the traversal path — only the resulting control point coordinates are kept.

After this change, each movement inside `collectControlPoints` that changes the turtle's position will produce a traversal segment recorded as `penDown: false`. These segments are appended to the main `segments` array by the `EXTBEZIERCURVE` handler, positioned immediately before the bezier curve segments for that block. Because they carry `penDown: false`, all existing downstream code (canvas renderer, SVG renderer, "Hide PU" filter) handles them correctly with no additional changes to those files.

The traversal segments appear regardless of the outer pen state — even when `PD` is active, the control-point paths are shown as dashed.

## User stories

- As a logo2openscad user, I want to see the turtle's control-point traversal path as a dashed line when I use `EXTBEZIERCURVE`, so that I can understand and debug how my bezier curve is being constructed.
- As a user who prefers a clean view, I want the "Hide PU" option to also hide bezier traversal lines, so that my preview isn't cluttered when I don't need that detail.

## Key decisions

| Decision | Outcome |
|----------|---------|
| Where to produce traversal segments | Inside `collectControlPoints`, tracking position before and after each movement command, accumulating `{from, to}` pairs returned alongside control points |
| When traversal segments are shown | Always — regardless of the current outer pen state. The traversal is always `penDown: false` |
| Visual style vs PU movements | Identical — `penDown: false` segments already render as dashed (8px dash, 6px gap) in the same colour as PU movements |
| "Hide PU" behaviour | Traversal segments use `penDown: false`, so the existing `hidePenUp && !segment.penDown` filter in `getRenderablePreviewSegments` already suppresses them |
| Code reuse | No changes needed to `drawPreview.ts`, `drawPreviewSvg.ts`, or `types.ts`. Changes are confined to `collectControlPoints` and the `EXTBEZIERCURVE` case in `interpreter.ts` |
| Segment ordering | Traversal segments are pushed before bezier curve segments for a given block, matching the visual order in which the turtle actually moved |

## Acceptance criteria

```gherkin
Feature: Bezier curve traversal movements are shown as dashed lines

  Scenario: Traversal path is visible when pen is down
    Given I have Logo code with EXTBEZIERCURVE and PD active
    When the preview is rendered
    Then the control-point traversal path segments appear as dashed lines
    And the final bezier curve appears as a solid line

  Scenario: Traversal path is visible when pen is up
    Given I have Logo code with EXTBEZIERCURVE and PU active
    When the preview is rendered
    Then the control-point traversal path segments appear as dashed lines
    And the final bezier curve also appears as a dashed line

  Scenario: Traversal path is hidden when "Hide PU" is enabled
    Given I have Logo code with EXTBEZIERCURVE
    And the "Hide PU" checkbox is checked
    When the preview is rendered
    Then no traversal path segments are visible
    And solid bezier curve segments (pen down) are still visible

  Scenario: Traversal path appears in SVG export
    Given I have Logo code with EXTBEZIERCURVE
    When I export the preview as SVG
    Then the SVG contains dashed line elements for the traversal path
    And the SVG contains solid (or dashed-if-PU) line elements for the bezier curve

  Scenario: Multiple EXTBEZIERCURVE blocks each show their own traversal
    Given I have Logo code with two EXTBEZIERCURVE blocks
    When the preview is rendered
    Then each block's traversal path is independently visible as dashed lines

  Scenario: REPEAT inside EXTBEZIERCURVE produces traversal segments for each iteration
    Given I have an EXTBEZIERCURVE block with a REPEAT command inside
    When the preview is rendered
    Then a traversal segment is produced for each movement in each iteration

  Scenario: Traversal segment count is proportional to movement commands
    Given an EXTBEZIERCURVE block with N movement commands
    When the logo is executed
    Then N traversal segments with penDown=false are added to the segment list before the bezier curve segments
```

## Manual test steps

1. Open the application and enter the following Logo code in the editor:
   ```
   PD
   EXTBEZIERCURVE [
     FD 50 EXTDEFCONTROLPOINT
     RT 90 FD 50 EXTDEFCONTROLPOINT
     FD 50 EXTDEFCONTROLPOINT
   ]
   ```
2. Observe the preview canvas. You should see:
   - A smooth bezier curve rendered as a solid line
   - Dashed lines showing the turtle's path as it walked to each control point
3. Check the "Hide PU" checkbox in the preview settings.
4. Confirm that the dashed traversal lines disappear, while the solid bezier curve remains.
5. Uncheck "Hide PU". Change `PD` to `PU` at the top of the code.
6. Confirm that both the traversal dashes and the bezier curve are now dashed.
7. Click "Export SVG". Open the SVG file in a text editor or browser and confirm that `stroke-dasharray="8,6"` elements are present for the traversal path.

## Implementation tasks

1. **Extend `collectControlPoints` to track traversal segments** — [src/logo/interpreter.ts:33-164](src/logo/interpreter.ts#L33-L164)
   - Add a local `traversalSegments: Array<{from: Point; to: Point; sourceLine?: number}>` accumulator
   - In `processCmd`, record the position before and after each movement case (`FD`/`BK`, `SETX`, `SETY`, `SETXY`, `HOME`) as a `{from, to}` pair, only if the position actually changed
   - For `REPEAT`, `CALL`, and `EXTSCALE` sub-cases, the recursive `processCmd` calls already handle sub-commands — no extra nesting needed
   - Return `traversalSegments` alongside `controlPoints`, `finalX`, `finalY`, `finalHeadingDeg`

2. **Push traversal segments in the `EXTBEZIERCURVE` handler** — [src/logo/interpreter.ts:520-553](src/logo/interpreter.ts#L520-L553)
   - Destructure `traversalSegments` from the updated `collectControlPoints` return value
   - Before pushing the bezier curve segments, iterate `traversalSegments` and call `segments.push(createSegment(t.from, t.to, false, t.sourceLine))` for each
   - The `false` for `penDown` means all existing rendering and filtering code handles them automatically

3. **Add unit tests** — create or extend `test/interpreter.test.ts` (or the nearest existing test file for the interpreter)
   - Test that an `EXTBEZIERCURVE` block with `FD` and `EXTDEFCONTROLPOINT` commands produces the expected number of `penDown: false` segments before the curve segments
   - Test that traversal segments are suppressed by `getRenderablePreviewSegments` when `hidePenUp=true`
   - Follow patterns from existing arc and PU segment tests
