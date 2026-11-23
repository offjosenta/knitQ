# AGENTS.md

Knit Tracker (KnitQ) — an offline-first PWA row/stitch counter and knitting project organizer for mobile.
All UI must strictly follow the **Apple iOS 27 Liquid Glass** design standard (see `docs/adr/0002-apple-liquid-glass-ui-and-local-backup.md`).

## Project docs

- Spec: `.scratch/knit-tracker/spec.md`
- Tickets: `.scratch/knit-tracker/issues/`
- Domain glossary: `GLOSSARY.md`
- Architecture decisions: `docs/adr/`

## Git commits

All git commit messages must be written in Russian and prefixed with the two-digit ticket number being worked on (e.g. `01: описание изменений`, `02: описание изменений`).

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at the root). See `docs/agents/domain.md`.
