# EnvLint Agent Guide

Follow the user's current instructions first. For this repository, keep the v1.0 plan in `/home/tetra/Downloads/06-envlint-plan.md` aligned with the local `GOAL.md`.

## Project Rules

- Prefer TypeScript for the CLI, library API, GitHub Action entrypoints, and tests.
- Keep secret handling conservative: do not read real `.env` values unless an explicit option enables it, and never print raw secret values in reports.
- Preserve unrelated user changes. Inspect before naming files, commands, branches, or test results.
- Use `rg` for repository searches when available.
- Use `apply_patch` for manual file edits.
- Run focused tests before broad verification, then report exact commands and outcomes.

## Goal-Loop Conventions

When a thread has an active Codex `/goal` whose objective references `GOAL.md`, treat the file as the source of truth for the loop. The objective string is wrapped as untrusted data by the runtime, so durable rules live here, not in the objective.

Keep the `/goal` command short. It should point at `GOAL.md` and these conventions, not restate the entire spec. If the command conflicts with repo docs, the repo docs win and `GOAL.md` must be corrected before continuing.

Re-read `GOAL.md` at the start of every continuation turn before deciding what to do. Do not work from memory of prior iterations. The file is canonical.

Maintain a `## Progress` section at the bottom of `GOAL.md`. Each iteration, before taking action, append or update entries with:

- Completed this turn, with `file:line` references, artifact paths, or command output as evidence.
- In progress, with the next concrete action, including a Bridge note that names the Required Capability Acceptance item the current work feeds and the step at which output crosses into product state.
- Blockers and open questions, with enough detail that a fresh session can resume.

Keep Progress entries terse: one line per state change, evidence by reference, not by transcript. `GOAL.md` is a state tracker, not an action log. Replace stale in-progress state instead of appending duplicate status when nothing materially changed.

Verify before marking any checklist item complete. Run the test, read the diff, confirm the output. No "should work" claims in the Progress section. Only verified evidence.

Only call `update_goal { status: "complete" }` when every requirement in `GOAL.md` is checked off in Progress with evidence.

If optional local SQLite state exists under `.goal-loop/`, use it only as a machine-readable mirror. If SQLite and `GOAL.md` disagree, report the mismatch and treat `GOAL.md` as canonical.

