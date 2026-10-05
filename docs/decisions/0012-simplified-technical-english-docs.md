# 0012: Simplified Technical English for documentation

- Status: Accepted (Phase 1)

## Context

People who start a product from the starter read the docs without help from the author.
Some readers do not speak English as a first language. Long and complex sentences cause errors.

## Decision

Write the docs in Simplified Technical English (ASD-STE100), as much as practical. This applies to
all files in `docs/`, code comments, commit messages and pull request text. `README.md` and
`CLAUDE.md` use standard, simple English. Clarity is more important than strict compliance.
There is no tool that measures the text. [STYLE.md](../STYLE.md) gives the rules and the glossary.

## Consequences

- The docs are shorter and easier to translate.
- Writers must use the words in the glossary and add new technical terms to it.
- Reviewers read for clarity. No automatic check stops a commit.
