# BunkerMode Interface Design Audit Prompt

Use this prompt when asking Codex to review a UI screen or component.

```text
Read AGENTS.md first.

Use these local context files:
- .codex/context/interface-design.md
- .codex/context/interface-design-usage.md

Audit the following UI target:
[path or screen name]

Goal:
Review the interface for BunkerMode product fit, visual consistency, and General/Soldier separation.

Do not modify files unless I explicitly ask for implementation.

Audit criteria:
1. Mode integrity
   - Identify whether the screen is General, Soldier, or shared.
   - Flag planning/editing/navigation affordances that appear in Soldier Mode.
   - Flag execution actions that are hidden or diluted.

2. BunkerMode behavior fit
   - Check whether the UI reinforces execution, accountability, and reduced negotiation.
   - Check whether committed missions, failure reasons, history, and review states are visually clear when present.
   - Flag motivational fluff, decorative tension, or punitive visuals.

3. Visual hierarchy
   - Identify the primary action and primary status.
   - Check whether the layout guides attention to the next decision or execution step.
   - Flag equal-weight cards, unclear focal points, and noisy secondary actions.

4. Design system consistency
   - Check spacing scale, radius, typography, borders, depth, colors, and tokens.
   - Flag raw values or one-off styles that drift from local patterns.
   - Check whether colors carry meaning rather than decoration.

5. React/component quality
   - Check reuse of existing components and local conventions.
   - Flag unnecessary abstractions or architecture changes.
   - Flag layout hacks such as unjustified absolute positioning, negative margins, and brittle calc values.

6. Interaction states
   - Check default, hover, active, focus, disabled, loading, empty, and error states where relevant.
   - Check touch ergonomics for mobile targets when auditing React Native.

7. Accessibility and responsiveness
   - Check readable contrast, keyboard/focus behavior, target size, overflow, and small-screen layout.
   - Flag text overlap, unstable dimensions, and clipped controls.

Response format:
1. What we are doing
2. Why it is necessary
3. Implementation plan, only if changes are recommended
4. Direct explanation
5. Files affected
6. How to test
7. Suggested commit message

Findings format:
- Severity: critical/high/medium/low
- File/line reference when possible
- Problem
- Why it matters for BunkerMode
- Suggested change

Remember:
- Do not implement onboarding, Weekly Review, Dream/Goals, Rank, or Metrics unless explicitly requested and allowed by AGENTS.md.
- Do not change API contracts.
- Frontend must not become source of truth.
- After any future mutation implementation, reload from API.
```
