# AGENTS.md — BunkerMode

---

## 1. Core Principle

BunkerMode is not a task manager. It is a personal execution system.

The core problem it solves: people know what they need to do but fail to execute consistently.
The system resolves this by separating two mental states that must never coexist in the interface:

- General → plans, decides, organizes
- Soldier → executes without renegotiating

Focus: consistency over motivation. Structure over inspiration.

---

## 2. Conceptual Architecture — "The Mountain"

  Dream (summit)
    └── Goals (intermediate stages)
          └── Missions / Habits (daily execution)
                └── Soldier (executor)

Dream
  The user's ultimate objective. One at a time, or very few.
  Everything the system does points here.

Goals
  The route mapped by the General. The system organizes the tree.
  Goals are not created automatically — they come from the user's deliberate decisions.

Missions
  Two types:
  - One-time: executed once, has a deadline.
  - Recurring: reappears at user-defined frequency (e.g. specific days of the week).
    Completing a recurring mission logs that day's execution — it does not close the mission permanently.

Soldier
  The executor. Makes no decisions. Receives the day's list and acts.

---

## 3. Critical Flows (Non-Negotiable)

### Onboarding — Activating the General
- Trigger: first access after installation.
- Flow: Ask for Dream → Ask for main obstacle → Suggest first Goal → Block access until answered.
- State: `user.onboarding_completed = true/false`
- Rule: without completed onboarding, the missions screen is locked. This is not optional.
  A user who reaches the missions screen without this process has only installed another app.

### Closed Loop
1. General creates missions and locks decisions.
2. System prevents the Soldier from editing, deleting, or postponing missions.
3. Soldier executes → status and dates are recorded.
4. Outcome impacts rank and history.
5. History feeds the General's Weekly Review.

The loop only closes when the Soldier's history changes the quality of the General's future decisions.

### Weekly General Review
- Trigger: 7 days since last review, or Sunday at 8:00 PM (user-configurable).
- UI: mandatory modal before unlocking the next week.
- Displays: completion rate, "Committed" failures, logged failure reasons.
- Action: General adjusts missions and goals. Closes the cycle.

---

## 4. Interface — Rules

Soldier mode (main screen)
  Only today's missions and the complete button.
  Zero lateral navigation. Zero editing. Zero access to goals or dream.

General mode
  Explicit access via "Plan" menu.
  Complexity is allowed here — this is the thinking moment.

Strategic view (Dream / Goals / Progress)
  Never accessible in Soldier mode.
  Optional and always separate.

Priority rule
  Execution clarity > conceptual richness.
  When in conflict: simplify.

---

## 5. Data Model — Psychological Tension as Structure

Psychological tension is not a UI feature. It is a consequence of data.
Without proper records, the Review and "Committed" feature lose all function.

Each mission must store:
  created_at       — timestamp
  due_date         — date | null
  completed_at     — timestamp | null
  status           — pending | completed | failed
  is_decided       — bool (marks a "Committed" mission)
  failure_reason   — text | null
                     Required when status = failed AND is_decided = true.
                     The system must demand this before allowing the user to continue.
  user_id          — references the owning user (responsavel_id)

User model:
  Fields: user, email, password
  Do NOT add: username, name, roles

---

## 6. "Committed" Feature — Confrontation, Not Punishment

A mission or habit can be marked as "Committed."
This represents a strong personal declaration — something the user swore to do.

When a "Committed" mission is not completed:
- It does not disappear silently.
- It stays visible and occupies space.
- The system demands a response before the user can continue:
  "You committed to this. What happened?"
- The user must log a reason. Only then does the system proceed.

This is not punishment — it is accountability.
Over time, the log of failure reasons becomes a behavioral mirror.
Failures also impact the progression system: rank loss, history accumulation.

The goal is genuine commitment, not extreme punishment that leads to abandonment.

---

## 7. Stack & Current State

Backend:    Python + FastAPI
Database:   PostgreSQL
Frontend:   JavaScript + React Native (future phase)
Architecture: API → Service → Repository → DB

Current state
  Functional CLI in Python with JSON persistence.
  Five classes: Missao, GerenciadorDeMissoes, RepositorioJSON, InterfaceConsole, Menu.
  Real IDs (not index-based). Core CRUD operations stable.

Evolution path
  Phase 1 — CLI (done)
  Phase 2 — FastAPI + PostgreSQL + Auth + base Mission/User model
  Phase 3 — React Native UI (Soldier mode + basic General mode)
  Phase 4 — Onboarding + Weekly Review + "Committed" feature + history fields
  Phase 5 — Dream/Goals hierarchy + Rank progression + metrics

---

## 8. Scope Lock Rule

No feature from a higher phase may be implemented before the previous phase is stable and tested.
If requested out of order: decline, explain, return to current phase.

---

## 9. Development Rules

Never:
- Break existing routes or contracts
- Duplicate logic or introduce premature abstractions
- Implement future phases without explicit request
- Place business logic in the interface or route layer

Always:
- Keep pytest passing
- Update tests when behavior changes
- Follow the flow: API → Service → Repository → DB
- Apply SRP — one class, one responsibility
- Keep changes minimal and focused

When proposing any change, state:
  1. What problem it solves
  2. Which product principle it applies
  3. What risk it avoids

---

## 10. Final Rule

BunkerMode exists for people who already know what they need to do
and need structure to obey themselves.

The decision criterion for every implementation choice:
Does this strengthen the General → Soldier → Review loop?

If yes: implement.
If no: cut it.
If unclear: simplify and revisit.