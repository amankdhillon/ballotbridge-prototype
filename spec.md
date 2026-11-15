# BallotBridge Round 1 Prototype: Spec

## Core social interaction
A verified contributor writes a plain-language explanation of a proposition. Another participant reviews it against the official text, and a third adds a source. Anyone can ask public or anonymous questions beneath it.

## Roles (one pool of participants)
- **Visitor** (joins with a nickname only): browses measures, reads reviewed explanations and sources, asks questions.
- **Contributor and reviewer** (verified participants): write explanations, review others' explanations, and add sources. Roles alternate. Nobody reviews their own explanation.
- **Facilitator**: shares the verification code, edits the Measures sheet, and writes the placeholder AI summaries (Wizard of Oz).

## Screens (mapped to the wireframes)
| Screen | Wireframe | Purpose |
|---|---|---|
| Welcome | 1.1 | Nickname and icon. Optional facilitator code makes the user verified. |
| Account setup | 1.2 | State, district, topics of interest. |
| Directory | 1.3 | Propositions, search, Statewide / Local toggle. |
| Proposition overview | 1.4 | AI summary (placeholder), official text, community explanations, citations, questions. |
| Add contribution | 1.5 | Explanation or question, category, reading level, text, optional source. |
| Review (modal) | Sketch 3 | Official text vs. explanation, checklist, note. |
| Add source (modal) | Sketch 2 | Claim, link, source type, "opens without login" confirmation. |

## Rules enforced on the server
1. Only verified users can post explanations. Explanations cannot be anonymous.
2. Unlock rule: a user can post a new explanation only after reviewing at least as many explanations as they have written. The first one is free.
3. No self-review. One review per user per explanation.
4. All review checklist items must be checked.
5. An explanation becomes "Reviewed" after the configured number of reviews (default 1).
6. Sources must be https links and include a claim.
7. Questions can be posted by anyone, anonymously or not.

## Data (Google Sheet tabs)
- **Users**: id, nickname, icon, state, district, topics, verified, createdAt
- **Measures**: id, shortTitle, title, scope (Statewide / Local), district, officialText, aiSummary, funders, status
- **Posts**: id, type (explanation / question), measureId, category, readingLevel, body, authorId (blank if anonymous), anonymous, status, createdAt
- **Sources**: id, measureId, claim, url, sourceType, submittedBy, status, createdAt
- **Reviews**: id, postId, reviewerId, checks, note, createdAt

## Timing
Synchronous-feeling: the overview page refreshes community and citation lists every 5 seconds, so a teammate's post appears without a manual reload.

## Out of scope for Round 1
- Real login or passwords (identity is a nickname plus an optional facilitator code)
- Email verification and reputation scores
- Real AI summaries (facilitator writes them)
- File attachments (links only)
- Campaign-finance lookups (funders are entered by hand)
- Random reviewer assignment (facilitator assigns in person)
- Mobile apps, notifications, and history or back-button support

## Success signals to watch
- Did testers find an explanation and understand the measure without leaving the page?
- Did anyone notice the "Reviewed" status and say why it mattered?
- Did the unlock message make sense, or did people think the app was broken?
- Did anyone post a question with no matching explanation? Did they check for duplicates first?
