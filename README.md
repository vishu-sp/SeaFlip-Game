# SeafoodFlip Challenge — beginner setup

This extends your uploaded SeaFlip Quest frontend with a Node.js backend, Firebase Authentication and Cloud Firestore. Frontend and backend are separate folders. The language is **JavaScript**, not Java: this matches your existing code and proposal. This is a downloadable local project; no hosted site or Firebase project has been created for you.

## 1. Install the tools

1. Install Node.js 22 or newer from https://nodejs.org/ and VS Code from https://code.visualstudio.com/.
2. Extract this ZIP. In VS Code choose **File → Open Folder** and select the `seafoodflip` folder containing `package.json`.
3. Open **Terminal → New Terminal**. Run `node --version` and `npm --version` to confirm installation.
4. Run `npm ci`. This installs dependencies from the included lockfile. Do not upload `node_modules` to GitHub.

## 2. Create Firebase resources

1. Open https://console.firebase.google.com/ and create a project (for example `seafoodflip-challenge`). Analytics is optional.
2. In Project settings → General, add a Web app using the `</>` icon. Register it and copy its Firebase configuration values.
3. In Build → Authentication → Sign-in method, enable **Email/Password**. The game uses an email and password to sign in, plus a public player name.
4. In Authentication settings → Authorized domains, add `localhost` if it is missing. Add your deployed domain later if you host this project.
5. In Build → Firestore Database, create a **Cloud Firestore Standard database**, choose a suitable region and select Production mode. Use the `(default)` database.
6. Open the Firestore **Rules** tab, replace the rules with the contents of `firestore.rules` in this project, and click **Publish**. All direct browser access is denied. The Node backend uses the Admin SDK and performs its own identity checks.
7. In Project settings → Service accounts → Firebase Admin SDK, generate a private key. Create a folder called `credentials` beside `package.json`, and save the key as `credentials/service-account.json`. This file is private: do not put it in `frontend`, upload it to GitHub or send it in chat.

No collections need to be created manually. The backend creates them as you play. Never put passwords in Firestore.

## 3. Configure this project

1. Copy `.env.example` to a new file named `.env` beside `package.json`. On Windows, make sure its name is not `.env.txt`.
2. Fill in the values from your Web app configuration:

```dotenv
PORT=3000
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json
FIREBASE_PROJECT_ID=your-real-project-id
FIREBASE_API_KEY=your-real-web-api-key
FIREBASE_AUTH_DOMAIN=your-real-project-id.firebaseapp.com
FIREBASE_APP_ID=your-real-app-id
```

The Web API key identifies your Firebase project and is sent to the browser; it is not the Admin SDK private key. The service-account JSON remains on the backend only. Authentication, server ownership checks and access rules protect the data.

## 4. Start the game

In the VS Code terminal, from the folder containing `package.json`, run:

```sh
npm start
```

Open **http://localhost:3000**. Do not double-click `index.html` or use VS Code Live Server: the frontend needs the Node API on the same origin.

Choose **Create account**, enter your player name, email and an 8-character-or-longer password, then start an adventure. Existing browser-only accounts from the old ZIP are not migrated; register a new Firebase account. The Firebase session lasts for the current browser session. Password reset is available on the sign-in screen.

To stop the server, press Ctrl+C. Restart it after editing `.env`.

## 5. Verify Firebase is connected

1. Register a test account. Check Firebase Authentication → Users for the new UID.
2. Start a game. In Firestore check `players/{UID}` and `players/{UID}/private/active`.
3. Match the first board, load the Fish API puzzle, solve it and move to Level 2.
4. Finish, time out or explicitly end the dive. Check `players/{UID}/history/{runID}` and `leaderboard/{UID}`.
5. Sign out, then sign in again: your saved profile, history and high score should remain.
6. Register a second account to check that histories are separate and the leaderboard is shared. Only player names and scores are returned by the leaderboard, not emails or UIDs.

## 6. Game rules and proposal decisions

| Level | Reef | Grid | Pairs | Fish puzzle time |
|---|---|---|---|---|
| 1 | Coral Cove | 3 × 3 | 4 | 60 seconds |
| 2 | Pearl Lagoon | 4 × 4 | 8 | 45 seconds |
| 3 | Midnight Reef | 5 × 5 | 12 | 30 seconds |

A correct pair gives +10; a mismatch gives −2. Scores may be negative. Every new adventure begins at Level 1 with zero points. Finish all three levels to win. A timeout or explicit exit records a loss. The free centre wave makes the odd grids possible and gives no points.

Your proposal's table says 20 seconds for Hard, while its game flow and uploaded code say 30. This version preserves 30. To change it, edit the third `time` value in `backend/src/engine.js` and update the instructions text in `frontend/index.html`.

The live API returns `question`, `fish` and `chest`. We use `fish` as the answer, following Marc Conrad's example. No locally generated fallback puzzle is counted as a real API result. Service failures show a Retry action and preserve the run. The timer starts after image decoding and the server's `/begin` response. Repeated `/begin` requests do not reset it.

## 7. What each folder does

| File / folder | Responsibility |
|---|---|
| `frontend/index.html` | Login, menu, game, instructions, profile, leaderboard and history |
| `frontend/style.css` | Responsive ocean theme, layered vectors, 3D CSS card flips and animation |
| `frontend/js/auth.js` | Firebase email/password login, registration, logout, password reset |
| `frontend/js/api.js` | HTTP requests with Firebase ID tokens |
| `frontend/js/game.js` | Game screen events, image loading, visual countdown |
| `frontend/js/ui.js` | Screen switching, safe text rendering and cards |
| `frontend/js/art.js` | Your existing seafood SVG illustrations |
| `backend/src/server.js` | Express routes, authentication and request limits |
| `backend/src/engine.js` | Pure game rules, shuffle, scoring and level transitions |
| `backend/src/fish.js` | External Fish API adapter and response validation |
| `backend/src/repository.js` | Firestore reads, transactions, histories and statistics |
| `backend/test/engine.test.js` | Automated rule and API-parser tests |
| `docs/ARCHITECTURE.md` | Four-theme code map and design tradeoffs |
| `docs/TESTING.md` | Checks performed and your integration checklist |
| `docs/ATTRIBUTION.md` | Acknowledgements and source references |

These are SVG illustrations with layered lighting/shadows and CSS 3D transforms, not downloadable 3D mesh models. Your existing artwork is retained. The Figma link could not be accessed, so exact wireframe fidelity has not been verified.

## 8. Troubleshooting

- **Setup needed:** complete `.env`, then restart Node.
- **Invalid API key / auth configuration:** use values from the same Firebase project as the service-account key. Enable Email/Password.
- **Server connection failed:** inspect the terminal. Check the credential file path, Firestore database creation and project ID.
- **Permission denied in Firestore:** the browser should not write to Firestore directly. Check that the service account has the required Firestore access in your project.
- **Fish API unavailable:** retry. The service can be slow or unavailable. You need internet access; the backend's request times out after 12 seconds.
- **Email already in use:** sign in or request a password-reset email.
- **Too many requests:** wait one minute before retrying.
- **Port in use:** change `PORT` in `.env`, restart, and open that port.
- **A game was replaced:** only one active game is supported per account; another tab may have started a new run.

## 9. Tests, GitHub and submission

Run `npm test`. See `docs/TESTING.md` for the manual Firebase checks still needed.

Before committing, check `git status` and ensure `.env`, credentials and `node_modules` are excluded. Include `package-lock.json`. Make small commits as you understand and modify each part, and keep genuine evidence of your own work and tutor feedback.

Your supplied brief is for **CIS045-3 Distributed Service Architectures**. It allows acknowledged AI-generated code but not an AI-generated video. This package includes a technical code map, not a video script. Prepare your own explanation and recording, use your own voice, acknowledge assistance and follow the tutor's instructions. The brief requires a maximum 10-minute video, full source, and evidence of presenting your work in Week 8 or earlier.

## 10. Before publishing online

This package is designed to run locally for your coursework. A static host alone cannot run the backend. Use a Node-compatible server with HTTPS, environment secrets and the correct Firebase authorized domain. Review service-account permissions, Firebase quotas, cleanup of abandoned active runs and request limits for your hosting environment. In-memory rate limits are suitable for one Node process, not a distributed deployment. Automated play cannot be completely prevented: hiding answers and validating scores protects against simple client edits, not bots or users inspecting a loaded image before starting its timer.
