---
name: phase-done
description: Close the current phase after the owner has confirmed manual testing. Updates roadmap, phase doc, architecture docs, decisions, API docs and changelog, then commits and opens the phase pull request.
---

# Close a phase

Only run this after the owner has explicitly confirmed that manual testing passed for the current phase.
If confirmation is missing or ambiguous, stop and ask.

Write all doc changes, the commit message and the PR title and body in Simplified Technical English
(see `docs/STYLE.md`). Never use em dashes.

1. Identify the phase from the current branch name (`phase-NN-<slug>`) and open `docs/phases/phase-NN-<slug>.md`.
2. In the phase doc:
   - Fill in **Automated verification** with the final results of `pnpm check`, `pnpm build` and Docker checks.
   - Tick every item in **Manual test checklist** that the owner confirmed. Note anything deferred.
   - Fill in **Sign-off** with the confirmation date and status `Done`.
3. `docs/ROADMAP.md`: set the phase status to `Done` and the next phase to `Next`.
4. `docs/architecture/*.md`: update every page affected by this phase (new layers, modules, data model,
   flows, diagrams). Make sure nothing describes the old behavior.
5. `docs/decisions/`: add or update records for significant choices made during the phase, and update the index.
6. `docs/api/`: regenerate the OpenAPI spec if routes changed (from Phase 2), and add or update `.http`
   request files for new endpoints.
7. `docs/CHANGELOG.md`: add a section for the phase with Added / Changed / Security entries.
   Also update `docs/architecture/adapters.md`, `docs/ADOPTING.md` and the glossary in `docs/STYLE.md`
   if the phase changed them.
8. `.env.example`: confirm it matches every variable the code reads.
9. Run `pnpm format`, then `pnpm check` and `pnpm build`. Everything must pass.
10. Check `git config user.email` (the owner's identity, see CLAUDE.md). Commit with a plain message such as
    `docs: close phase NN (<title>)`. Follow the git rules in CLAUDE.md: no attribution trailers, no AI mentions.
11. Push the branch and open a PR into `main` titled `Phase NN: <title>`. The body summarizes what was
    built, links the phase doc, and lists verification results. No AI attribution in title or body.
12. Tell the owner the PR link and what the next phase is.
