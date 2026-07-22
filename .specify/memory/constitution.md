<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification)
- Principles added: I. Test-First (NON-NEGOTIABLE), II. SOLID Design, III. Simplicity First (YAGNI), IV. Use What's Already There
- Sections added: Development Workflow, Governance
- Sections omitted: the template's optional third free-form section — not needed for this project, no content deferred
- Templates checked: .specify/templates/plan-template.md (✅ no changes needed — Constitution Check gate is generic, derives from this file at plan time), .specify/templates/spec-template.md (✅ no changes needed — no principle-specific references), .specify/templates/tasks-template.md (✅ no changes needed — test-first ordering already matches Principle I)
- Deferred TODOs: none
-->

# PingPong Constitution

## Core Principles

### I. Test-First (NON-NEGOTIABLE)

Tests are written before implementation code for any new logic — frontend component
behavior, backend endpoints, business logic. A test must exist and fail before the
code that makes it pass is written. Red, then green, then refactor. This is a hard
requirement, not a preference: code without a preceding failing test does not meet
the bar for "done."

Rationale: catching a broken requirement at the test-writing stage is far cheaper
than catching it after the code is built around a misunderstanding.

### II. SOLID Design

Code follows SOLID: a unit has one responsibility, is open to extension without
modifying its existing behavior, honors the substitutability of its abstractions,
exposes narrow rather than sprawling interfaces, and depends on abstractions rather
than concrete details where more than one implementation is plausible. This applies
to both the FastAPI backend and the React frontend.

Rationale: these rules keep code changeable as the app grows, without requiring a
big redesign every time a new feature touches existing code.

### III. Simplicity First (YAGNI)

Always implement the simplest design that satisfies the actual, current
requirement. Do not add abstraction, configuration, or generalization for
requirements that do not exist yet. If a problem has only one concrete instance,
write it as one concrete instance.

Rationale: speculative flexibility is a cost paid today for a benefit that may
never arrive; most of it is deleted or rewritten before it's ever used.

### IV. Use What's Already There

New work reuses the technology already present in the codebase — Vite, React,
TypeScript, and CSS Modules on the frontend; FastAPI and Postgres on the backend;
Docker for running everything — instead of introducing a new library, framework,
or language for a problem the existing stack already solves. Introducing something
new requires the existing stack to be demonstrably unable to solve the problem.

Rationale: every added technology is a new thing every contributor must learn and
every future change must account for; the existing stack was already chosen and
paid for.

### V. Responsive design

All frontend code created must be validated of responsiveness. The application must work for both
desktop and mobile devices. Do not use fixed length and height values unless this is strictly required
to complete the task.

## Development Workflow

1. Write a failing test that expresses the requirement.
2. Write the minimum code to make it pass.
3. Refactor with the test suite green throughout.
4. Run the full test suite before committing — never commit on a red suite.
5. Keep commits small and reviewable: one logical change per commit.
6. Never merge work with failing tests.

## Governance

This constitution supersedes ad-hoc practice for any conflict between the two.
Amending it means editing this file directly and bumping the version per semantic
versioning: MAJOR for removing or redefining a principle, MINOR for adding a
principle or materially expanding guidance, PATCH for wording/clarity fixes.
Every amendment updates "Last Amended" below to the date of the change.

Compliance is self-checked against the four principles above before any work is
considered complete — this is what the Code Review Checklist in `CLAUDE.md` exists
to operationalize day to day; this file states the non-negotiables, `CLAUDE.md`
carries the operational detail.

**Version**: 1.0.0 | **Ratified**: 2026-07-20 | **Last Amended**: 2026-07-20
