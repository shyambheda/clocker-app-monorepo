# Documentation style

This repository writes its documentation in Simplified Technical English (STE).
STE is the specification ASD-STE100. It makes technical text clear for all readers,
also for readers who do not speak English as a first language.

## Scope

| Text                                       | Language                            |
| ------------------------------------------ | ----------------------------------- |
| All files in `docs/`                       | STE                                 |
| Comments in source code and config files   | STE                                 |
| Commit messages                            | STE                                 |
| Pull request titles and descriptions       | STE                                 |
| `README.md`, `CLAUDE.md`                   | Standard English (short and simple) |
| Code, commands, paths, env variable names  | Not changed (exempt)                |
| Tables of values, error codes, log samples | Exempt                              |

## How strict

Use STE as much as practical. The purpose of STE is clear text. If a rule makes a sentence
less clear, write the clear sentence. Do not use a tool to measure the text. The writer and the
reviewer read the text and make it simple.

## Writing rules

1. Write short sentences.
   - Procedures (instructions): 20 words or fewer.
   - Descriptions: 25 words or fewer.
2. Write one instruction in one sentence.
3. Use the command form for instructions. Example: "Run `pnpm check`."
4. Use the active voice. Example: "The API rejects the request." Do not write "The request is rejected."
5. Use only these verb tenses: simple present, simple past and simple future.
6. Do not use `-ing` words as nouns or adjectives, if possible. Technical names are an exception.
7. Keep the articles (`a`, `an`, `the`) and short words such as `that`. They make the text clear.
8. Do not make a noun cluster of more than three words. Example: write "the size limit of the
   request body", not "request body size limit configuration".
9. Use one word for one meaning. Use the words in the glossary below.
10. Write one topic in one paragraph. A paragraph has six sentences or fewer.
11. Use a vertical list for steps and for complex conditions.
12. Put a warning or a caution before the step that it applies to.
13. Do not use em dashes. Use a colon, a comma or a new sentence.
14. Do not use slang, jokes, idioms or phrasal verbs (such as "kick off", "spin up", "set up" as a verb).

## Words to avoid

| Do not use                 | Use                       |
| -------------------------- | ------------------------- |
| utilize, leverage, harness | use                       |
| in order to                | to                        |
| prior to                   | before                    |
| subsequently               | after, then               |
| commence, kick off         | start                     |
| terminate, kill            | stop                      |
| spin up                    | start                     |
| set up (verb)              | install, configure, make  |
| ensure                     | make sure                 |
| numerous                   | many                      |
| approximately              | about                     |
| via                        | through, with             |
| e.g.                       | for example               |
| i.e.                       | that is                   |
| etc.                       | write the full list       |
| should (for requirements)  | must, or the command form |
| simply, just, easily       | (delete the word)         |

## Glossary

Technical names and technical verbs in this repository. Each word has one meaning.

### Technical names

| Word              | Meaning                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| starter           | This repository. A new product starts from a clone of it                             |
| product           | A SaaS business that starts from a clone of the starter                              |
| platform staff    | People who operate the product. They use the admin app                               |
| customer          | An organization (org) on a paid plan. Its owners, admins and staff use `/portal`     |
| end user          | A member of one or more orgs. End users use `/panel`                                 |
| org               | Organization. The tenant of the product                                              |
| tenant            | One org and all of its data                                                          |
| org role          | The role of a user in one org: `owner`, `admin`, `staff` or `member`                 |
| platform role     | The role of platform staff: `support`, `admin` or `superadmin`                       |
| database role     | A Postgres login role, for example `app_user`                                        |
| API               | The Fastify server in `apps/api`                                                     |
| worker            | The background process in `apps/api/src/worker.ts`                                   |
| job               | One unit of background work that the worker does                                     |
| adapter           | The one module that connects the code to an external service                         |
| branch (Neon)     | A copy of a Neon database. Not a git branch, except where the text says "git branch" |
| migration         | A versioned SQL change to the database schema                                        |
| phase             | One planned unit of work. One git branch and one pull request                        |
| env variable      | Environment variable                                                                 |
| service (Railway) | One deployed process on Railway: `api`, `worker`, `web`, `admin` or `redis`          |
| container, image  | Docker terms                                                                         |
| instant           | One point in time, stored in UTC                                                     |
| zone              | An IANA time zone name, for example `Asia/Kolkata`                                   |
| effective zone    | The zone that a user sees: the user override, else the org zone, else UTC            |
| origin            | The scheme, host and port of a web page, for example `https://app.example.com`       |
| allowlist         | A list of the values that the API accepts. The API rejects all other values          |
| preflight         | The `OPTIONS` request that a browser sends before a cross-origin request             |
| liveness check    | `GET /health/live`: the process runs. It does not check dependencies                 |
| readiness check   | `GET /health/ready`: the process can serve traffic (database and Redis answer)       |
| RLS               | Row Level Security. A Postgres policy that limits the rows that a role can see       |
| owner role        | The database role that owns the schema and runs the migrations                       |
| pooled connection | A connection through the Neon connection pooler (the host contains `-pooler`)        |
| request id        | A UUID that the API gives to each request. It is in the log and in each response     |

### Technical verbs

| Verb      | Meaning                                                        |
| --------- | -------------------------------------------------------------- |
| build     | Compile the code into files that can run                       |
| deploy    | Send a new version to the hosting platform                     |
| migrate   | Apply the migrations to a database                             |
| enqueue   | Add a job to a queue                                           |
| validate  | Compare data with a schema and reject data that is not correct |
| serialize | Change an object into JSON                                     |
| redact    | Replace a secret value with `[REDACTED]` in the log            |
| lint      | Examine code with ESLint                                       |
| commit    | Record a change in git                                         |
| push      | Send git commits to GitHub                                     |
| merge     | Add the changes of one git branch to a different git branch    |
| clone     | Copy a git repository                                          |

Add a word to the glossary when you use a new technical term.

## Commit messages and pull requests

- Use the form `type: text`. Types: `feat`, `fix`, `docs`, `build`, `chore`, `test`, `refactor`.
- Write the text in the command form. Example: `docs: add the adapter guide`.
- Keep the first line to 72 characters or fewer.
- Do not add attribution lines or links to tools.

## Example

Before:

> Only the API and worker talk to the database. Frontends never hold database credentials.

After:

> Only the API and the worker connect to the database. The frontends do not have database credentials.

## Reference

ASD-STE100 is a specification of ASD (the AeroSpace and Defence Industries Association of Europe).
This page is a short summary for this repository. It does not copy the STE dictionary.
Get the full specification from the ASD-STE100 website (asd-ste100.org).
