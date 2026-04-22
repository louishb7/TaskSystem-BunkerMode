# AGENTS.md — BunkerMode Task System

## Product Vision
BunkerMode is not just a task manager.

It is a system designed to guide the user toward their ultimate goal ("Dream") through structured planning and disciplined execution.

The system operates on two mental roles:
- General → plans, defines strategy, creates missions
- Soldier → executes without questioning

The long-term goal is to build a system that:
- breaks down a "Dream" into actionable layers
- connects long-term goals to daily actions
- enforces discipline through structure and consequences

## Current Objective
Build a functional, simple, and evolvable version of the system.

Focus on:
- working features
- clean flow
- stable backend
- real usability

Avoid premature complexity.

## Core Concept
Dream → Goals → Missions → Actions

The system should evolve to support:
- hierarchical objectives
- long-term planning
- habit enforcement
- progress tracking

## Architecture
- API: FastAPI
- Business logic: services/
- Data access: repositorio_postgres.py
- Models: missao.py, usuario.py

Flow:
API → Service → Repository → Database

## Rules
- Do NOT break existing routes
- Do NOT duplicate logic
- Do NOT introduce unnecessary abstractions
- Keep changes minimal and focused

## User Model
Use only:
- usuario
- email
- senha

Do NOT use:
- username
- nome
- roles

## Missions
- Missions belong to a user (responsavel_id)
- All operations must respect authenticated user
- Missions are the execution layer (Soldier)

## Future Concepts (do not implement yet unless explicitly requested)
- Dream entity
- Goal hierarchy
- Rank / progression system
- "Decided" commitments with consequences
- Habit tracking

## Testing
- All changes must keep pytest passing
- If behavior changes, update tests accordingly

## Style
- Prefer simple, readable code
- Avoid overengineering