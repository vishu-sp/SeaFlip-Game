# Code map and design notes

## Request flow

Browser events → frontend controller → HTTPS/JSON API with Bearer ID token → token verification → game engine → Firestore repository.

The backend independently calls Marc Conrad's Fish API. The puzzle image goes to the browser, but the numeric solution stays in the private active-run document. The browser never receives the hidden deck. Every card reveal is a server request. This costs more database operations and adds latency, but prevents simple score and deck manipulation in developer tools.

## Four assessment themes

| Theme | Concrete code to inspect | Design decision and tradeoff |
|---|---|---|
| Low coupling and high cohesion | `engine.js`, `fish.js`, `repository.js`, `auth.js`, `api.js` | Each module has one responsibility. Engine tests require no DOM, Express or Firestore. The route layer composes modules. The repository does know run fields and the UI does know response fields: interfaces still create deliberate coupling. |
| Event-driven programming | Form `submit`, button `click`, `screenchange`, `onAuthStateChanged`, image `load` and countdown callbacks | Events trigger operations instead of a blocking loop. A busy guard prevents repeated actions; a generation counter ignores stale game responses. The server independently validates deadlines, because background tabs can throttle timers. |
| Interoperability | `fish.js`, `api.js`, `repository.js` | HTTP transports JSON between independently implemented systems; the adapter translates `question` and `fish` into internal image/solution fields. A timeout and schema validation handle failures. Base64 avoids mixed-content image links but makes responses larger. SDKs abstract Firebase protocols at the cost of vendor dependence. |
| Virtual identity | `auth.js`, token middleware in `server.js`, UID paths in `repository.js` | Firebase authenticates credentials. The backend verifies signed ID tokens and uses their UID, never a user-supplied UID. Authorization decides which records the UID can access. Names are display labels, not identity. Firebase session persistence stores SDK session data; the app does not hash passwords or invent session cookies. |

## Authentication vs authorization

Authentication answers who the player is. `verifyIdToken(token, true)` checks the Firebase token, including revocation checks. Authorization associates every run/history operation with `req.user.uid`. Deny-all Firestore browser rules are an additional boundary; Admin SDK bypasses rules, so server ownership checks are essential. A stolen bearer token can be used until it expires or is revoked; HTTPS is required outside localhost. Email/password sign-in does not prove real-world identity, and this app does not require email verification.

## Persistence

- `players/{uid}`: display name, high score, total score, games played, highest completed level.
- `players/{uid}/private/active`: one current run, private deck, selection, matched positions, phase, solution, timestamps.
- `players/{uid}/history/{runID}`: finished result, level, score, finish time.
- `leaderboard/{uid}`: display name and high score only.

Transactions update run, statistics, history and leaderboard atomically. A `recorded` flag makes finalization idempotent. The server rejects stale run IDs after a replacement. A new run replaces an unfinished run; closing the browser does not automatically record abandonment. Explicitly use End dive to record a loss. Refresh returns to the menu; persistent history survives, but the current UI does not offer resume.

## State transitions

`cards → ready → loaded → fish → cards (next level) / won / lost`

`loaded` allows image decoding before starting the deadline. This improves fairness on slow connections, but a motivated user can inspect the image in developer tools before calling `begin`; this is an acknowledged coursework-level limitation. A stricter competitive implementation would start the deadline when the puzzle is issued, accepting image-load delay as part of the time limit.

## Alternatives to consider yourself

Compare a direct-browser Fish API call with the server adapter; client-side score calculation with server-authoritative rules; a large combined file with this modular structure; session cookies with Firebase bearer tokens; and password login with a federated identity provider. Base your own discussion on your understanding and measurements. This is technical documentation, not a submission video script.
