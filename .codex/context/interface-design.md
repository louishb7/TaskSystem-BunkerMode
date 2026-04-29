# Interface Design Context for BunkerMode

Source adapted from:
- https://github.com/Dammyjay93/interface-design
- https://github.com/Dammyjay93/interface-design/tree/main/.claude
- https://github.com/Dammyjay93/interface-design/tree/main/.claude-plugin
- https://github.com/Dammyjay93/interface-design/tree/main/reference

This is local Codex context, not a Claude Code plugin. Do not install or invoke `.claude` or `.claude-plugin` behavior from the source repository.

## Purpose

Use this context when designing, auditing, or improving BunkerMode UI surfaces in React or React Native.

BunkerMode is not a generic productivity app. It is a personal execution system built around non-overlapping states:

- General: plans, decides, organizes.
- Soldier: executes without renegotiation.

The UI must reinforce behavior, not decorate the product. Design choices should reduce mental negotiation, expose commitment clearly, and support focused execution.

## Operating Principles

1. Intent before visuals
   - Identify the specific human state: planning as General or executing as Soldier.
   - Identify the action verb: decide, commit, execute, justify, review.
   - Identify the desired feeling: disciplined, focused, accountable, calm under pressure.

2. Every choice must be explainable
   - Avoid "clean", "modern", "nice", or "common" as rationale.
   - Explain why spacing, density, color, hierarchy, and interaction support the current mode.

3. Consistency beats novelty
   - Reuse established tokens and component patterns.
   - Add new patterns only when the screen introduces a real reusable need.

4. Psychological tension comes from data
   - Do not use threatening colors, gimmicks, or punitive visuals.
   - Show commitments, deadlines, status, and consequences plainly.

5. Execution clarity wins
   - Soldier Mode must show only execution-relevant information and actions.
   - General Mode can support planning and organization, but should still stay operational.

## BunkerMode Design Direction

Recommended baseline:

- Personality: Precision and execution.
- Density: Medium-dense for General, tighter and narrower for Soldier.
- Foundation: Neutral, restrained, work-focused.
- Depth: Borders-only or subtle surface shifts. Avoid dramatic shadows.
- Accent: One primary accent for action; semantic colors only for status meaning.
- Radius: Small to medium. Avoid overly soft, playful shapes.
- Motion: Fast, functional, restrained.

Avoid:

- Marketing-style hero sections inside the app.
- Decorative gradients, blobs, or color-only ornament.
- Card-heavy dashboards where every item has equal emphasis.
- UI that makes Soldier Mode feel negotiable.
- Controls in Soldier Mode that suggest planning, editing, browsing, or reconsidering.

## Mode-Specific UI Rules

### General Mode

General Mode supports planning and review.

Design traits:

- More context is acceptable, but still organized.
- Navigation can expose planning, history, and review areas.
- Controls may include edit, create, schedule, decide, and review actions.
- Information hierarchy should make commitments and unresolved outcomes visible.

Checklist:

- Can the user see what needs a decision?
- Are committed missions visually distinct from drafts or undecided work?
- Are failure reasons and review needs visible without hunting?
- Does the screen encourage planning once, not constant renegotiation?

### Soldier Mode

Soldier Mode supports execution only.

Design traits:

- Narrow action set.
- Today's missions only.
- No editing affordances.
- No planning navigation.
- No secondary paths that create negotiation loops.
- Strong visual priority for the next executable mission.

Checklist:

- Is the primary action obvious within 2 seconds?
- Can the user complete or justify without seeing planning controls?
- Are irrelevant filters, dashboards, and configuration hidden?
- Is failure handled as recordable accountability, not shame?

## Token Architecture

Keep tokens small and meaningful.

Recommended primitives:

- Foreground: primary, secondary, tertiary, muted.
- Background: canvas, surface, elevated, inset.
- Border: subtle, default, strong, focus.
- Brand/action: primary action only.
- Semantic: success, warning, danger, info.
- Controls: control background, control border, control focus.

Rules:

- No random hex values in components when a token exists.
- Semantic colors must carry semantic meaning.
- Gray/neutral structure should carry most layout weight.
- Color should identify action, status, or mode.

## Spacing and Density

Use a fixed spacing scale.

Recommended:

- Base unit: 4px.
- Scale: 4, 8, 12, 16, 24, 32, 48.
- Compact controls: 32-36px height.
- Comfortable controls: 40-44px height.
- Cards/panels: 12px or 16px padding for dense tools; 20px only when readability needs it.

Rules:

- Avoid arbitrary values like 13px, 17px, 22px unless inherited from an existing system.
- Padding should usually be symmetrical.
- Same type of component should not drift in height, radius, or padding.

## Surface and Depth

Use quiet hierarchy.

Recommended:

- Page canvas: base.
- Panels/cards: same or slightly raised surface.
- Dropdowns/popovers: one elevation above parent.
- Inputs: slightly inset or distinct from surrounding surface.
- Sidebar: often same background as canvas with subtle border separation.

Avoid:

- Harsh borders.
- Thick decorative dividers.
- Strong shadow stacks.
- Different hues for surface levels.
- Pure white cards on tinted backgrounds unless already established.

Squint test:

- The hierarchy should remain visible.
- No border or surface jump should dominate attention.

## Typography

Build hierarchy through size, weight, opacity, and role.

Recommended roles:

- Screen title: clear but not oversized inside app surfaces.
- Section heading: compact, medium or semibold.
- Body: readable, stable.
- Labels: medium weight at smaller size.
- Metadata: tertiary or muted.
- Data: monospace or tabular numbers when alignment matters.

Rules:

- Do not rely on size alone.
- Use tabular numbers for metrics, dates, counts, and time.
- Avoid hero-scale type inside operational dashboards.

## Components

### Buttons

- Primary buttons are reserved for the next meaningful action.
- Secondary buttons should not compete with primary actions.
- Icon buttons should use familiar icons where possible.
- Danger actions require clear labels and confirmation when destructive.

### Cards and Panels

- Internal layout should match content type.
- A mission card, review card, and metric card should not be identical by default.
- Surface treatment can be consistent while internal hierarchy varies.

### Forms and Controls

- Inputs need default, hover, focus, disabled, error, and loading states when relevant.
- Custom selects/dropdowns are preferable when styling must be consistent.
- In Soldier Mode, forms should exist only for required execution outcomes, such as failure justification.

### Navigation

- Screens need location context.
- General navigation may expose planning and review.
- Soldier navigation should be constrained to execution.
- Avoid floating tables or panels with no app context.

## React Application Guidance

Before changing UI code:

1. Inspect existing components and CSS.
2. Identify current token and spacing patterns.
3. Reuse local conventions before adding new ones.
4. State the intended mode impact: General planning, Soldier execution, or shared shell.
5. Keep API contracts and state source unchanged.

When implementing:

- Put tokens in the existing styling layer, not scattered component literals.
- Prefer existing component primitives.
- Reload server state after mutations; do not add optimistic UI unless explicitly requested.
- Do not introduce architecture changes for visual cleanup.
- Keep responsive constraints explicit for toolbars, mission cards, grids, and action rows.

## Visual Review Criteria

Audit each screen across these dimensions:

1. Mode integrity
   - Does the UI respect General/Soldier boundaries?
   - Are planning affordances absent from Soldier Mode?

2. Hierarchy
   - Is the main action or status obvious?
   - Are committed, failed, completed, and pending items distinguishable?

3. Token consistency
   - Are colors, spacing, radius, borders, and typography from the system?
   - Are there one-off values that should become tokens or be removed?

4. Interaction states
   - Are hover, focus, active, disabled, loading, empty, and error states handled?

5. Composition
   - Does density match the task?
   - Does the layout guide the eye instead of presenting equal cards everywhere?

6. Content truth
   - Does visible copy match real BunkerMode concepts?
   - Does it avoid motivational fluff and negotiation language?

7. Structure
   - Is layout solved with normal flow, grid, flex, and constraints?
   - Are negative margins, absolute positioning, and calc hacks justified?

## Suggested Local Design Memory Format

If a future task establishes stable patterns, save them in a local project file such as:

`.codex/context/interface-design-system.md`

Suggested sections:

```markdown
# BunkerMode Interface Design System

## Direction
Personality:
Density:
Depth:
Mode treatment:

## Tokens
Spacing:
Radius:
Typography:
Foreground:
Background:
Border:
Semantic:

## Patterns
### Primary Button
### Mission Card
### Soldier Action Row
### General Planning Panel

## Decisions
| Decision | Rationale | Date |
```

Only save patterns that are reused, measurable, and helpful for future work.
