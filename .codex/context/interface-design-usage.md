# How to Use Interface Design Context in Codex

This project stores interface-design guidance as local context files, not as an installed plugin.

Use these files manually in prompts when you want Codex to design, audit, or improve UI:

- `.codex/context/interface-design.md`
- `.codex/context/interface-design-usage.md`
- `.codex/prompts/interface-design-audit.md`

## When to Use

Use this context for:

- React screens in `frontend-react/`.
- React Native screens in `mobile/`.
- UI review before or after a visual change.
- Component consistency checks.
- Extracting reusable design patterns from existing screens.
- Reviewing whether a screen respects General/Soldier separation.

Do not use this context for:

- Backend-only changes.
- API contract design.
- Database schema work.
- Marketing pages unless explicitly requested.
- Future-phase features blocked by `AGENTS.md`.

## Recommended Prompt Pattern

Use this structure:

```text
Use BunkerMode AGENTS.md and these local design context files:
- .codex/context/interface-design.md
- .codex/context/interface-design-usage.md

Task:
[describe screen/component/audit]

Constraints:
- Do not change API contracts.
- Do not alter architecture.
- Do not add future-phase features.
- Preserve General/Soldier separation.
- If editing UI, keep scope minimal and run available checks.
```

## Before UI Implementation

Codex should inspect:

1. `AGENTS.md`
2. Relevant React or React Native files
3. Existing component/style patterns
4. Existing data contracts and permission fields
5. The local interface-design context

Then Codex should state:

- What screen or component is being changed.
- Which mode is affected: General, Soldier, or shared.
- What design rule applies.
- Which files will be touched.

## Component Design Checkpoint

Before writing UI code, require this checkpoint:

```text
Intent:
Mode:
Primary user action:
Hierarchy:
Palette:
Depth:
Spacing:
Typography:
Interaction states:
Architecture impact:
```

If any answer is vague, Codex should inspect more code or ask a narrow question.

## Audit Workflow

For a screen audit:

1. Inspect the target files.
2. Identify the screen mode and allowed actions.
3. Check visual hierarchy.
4. Check spacing, radius, color, borders, typography, and component reuse.
5. Check interaction states.
6. Check whether UI copy reinforces execution instead of negotiation.
7. Report findings before suggesting edits.
8. Do not modify files unless the prompt asks for implementation.

## Extracting a Local System

If asked to extract a system from existing code, Codex should scan UI files for:

- Repeated spacing values.
- Repeated radius values.
- Common button dimensions.
- Common card/panel treatment.
- Color tokens and raw color literals.
- Typography levels.
- Depth strategy: borders, shadows, surface shifts.
- Repeated mission, review, or action patterns.

Then propose a `.codex/context/interface-design-system.md` file. Do not create it unless asked.

## How to Suggest Improvements

When suggesting improvements without implementation:

- Lead with risks and mismatches.
- Tie each suggestion to BunkerMode behavior.
- Separate visual polish from product-rule violations.
- Avoid redesigning the architecture.
- Prefer small, testable changes.

Example finding format:

```text
Finding:
Soldier screen exposes a planning affordance in the action bar.

Why it matters:
Soldier Mode must only support execution actions. This creates a negotiation path.

Suggested change:
Remove the edit/schedule action from Soldier view and keep it available only in General Mode.

Files likely affected:
- mobile/src/screens/...
```

## How to Request Implementation

Use a prompt like:

```text
Use .codex/context/interface-design.md.
Improve [screen/component] in [path].
Scope:
- UI only.
- Preserve API contracts.
- No new routes.
- No future-phase features.
- Keep existing component patterns unless there is a clear reason.
Run available frontend checks after.
```

## Limits

- Codex will not auto-load these files unless you reference them.
- This does not install Claude slash commands.
- This does not create a native Codex skill package.
- This does not define final design tokens for the whole app yet.
- Any implementation must still obey `AGENTS.md` and the actual codebase.
