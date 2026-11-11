# Verification record — 11 November 2026

## Completed in this build

- Dependencies installed via npm; reproducible installation instructions use `npm ci` and the included lockfile.
- `npm test`: 7 automated tests passed. They cover all grid pair counts, concealment of hidden cards/solutions, duplicate-card rejection, match scoring, mismatch penalties and delay, all three levels and final score, deadline enforcement, and actual Fish API field parsing.
- Node syntax checks passed for all frontend and backend JavaScript files.
- Retrieved a real response from `https://marcconrad.com/uob/fish/api.php?out=json&base64=yes`; verified the `question`, `fish`, `chest` schema and parsed its base64 image. This is a live external-service check, not a mocked API claim.
- Started the Express server and inspected the desktop sign-in layout in a browser. The setup-required message correctly appears without Firebase settings.
- The API contains a missing-token HTTP 401 guard; HTTP verification remains part of the integration checklist.

## Still required with your Firebase project

No Firebase credentials were provided, so real registration, login, reset emails, Firestore transactions, two-account isolation and full browser gameplay have NOT been verified against a Firebase project. Run these checks after following README.md:

| Test | Expected |
|---|---|
| Register valid user | Authentication UID and player profile created |
| Duplicate email / wrong password | Firebase error shown; no menu access |
| Reset password | Firebase reset email arrives for existing account |
| Sign out, sign in | Correct profile restored |
| Match and mismatch | +10 / −2, mismatches flip back after delay |
| Complete each board | Fish puzzle button appears; no skipping levels |
| Wrong fish answer | Remain on puzzle; same deadline |
| Correct fish answer | Advance; score carried forward |
| Timeout with hidden browser tab | Server rejects late answer; records loss |
| Repeated answer / duplicate begin | No double score, history or deadline reset |
| Win all levels | Win screen, final score, one history entry |
| Explicit exit | Loss recorded; next run starts at level 1 / zero |
| Fish service failure | Retry message; no fake replacement puzzle |
| User B requests user A's run ID | Rejected; user A's private history not exposed |
| Direct Firestore browser read/write | Denied by deployed rules |
| Start in two tabs | Older run ID rejected after new run starts |
| Small phone and keyboard-only navigation | Cards and forms usable; no horizontal clipping |
| Reduced-motion system preference | CSS movement disabled |

## Operational limitations

One active run per UID; no resume UI after refresh. A server restart preserves Firestore data. Closing a tab does not record a loss until an appropriate server request or explicit exit occurs. Scores/history are finalized only once. Per-process rate limiting does not coordinate multiple servers. Firestore writes on every flip increase usage: monitor your project's quotas. Live multiplayer anti-cheat and production load testing are outside this coursework build.
