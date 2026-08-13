# Workflow Sequence Builder

A focused React application for composing a customer email sequence. It turns the assignment's four required building blocks into a clear authoring flow: add steps, put them in order, configure each one, resolve incomplete work, preview the result in plain language, and save it in the browser.

The source is JavaScript and JSX. There is no TypeScript, custom application backend, or workflow execution service in this submission.

**Live demo:** [dakshyadavdtu.github.io/araliproj](https://dakshyadavdtu.github.io/araliproj/)

## Review in 60 seconds

No Firebase project or Google account is required to review the assignment.

1. Open the live demo and choose **Continue to assignment demo**.
2. Select **Load example** if the editor is empty. A prior guest save may be restored in the same browser instead.
3. Select any step, change a field, and use **Apply changes**.
4. Open **Preview** to read the sequence as a plain-language journey.
5. Save, reload, and confirm that the account-scoped browser draft is restored.

## Screenshots

![Desktop sequence editor showing an ordered workflow and scheduler settings](./screenshots/workflow-editor.png)

*Desktop: the ordered workflow remains visible while the selected scheduler is edited in the right-hand inspector.*

![Sign-in screen with Google authentication and assignment demo access](./screenshots/sign-in.png)

*Entry: Firebase Google sign-in is ready to use when project credentials are supplied, while the clearly labeled demo route keeps the assignment reviewable without credentials.*

![Mobile sequence editor with ordered step controls](./screenshots/mobile-workflow.png)

*Mobile: the same workflow remains usable without horizontal scrolling; reorder and delete controls stay available on every step.*

![Mobile scheduler editor with frequency, time, and timezone fields](./screenshots/mobile-editor.png)

*Mobile: step settings move into a full-width panel with persistent Cancel and Apply actions.*

## Features

- Four purpose-built step types: Scheduler, Enrollment, Exit condition, and Send email.
- Insert controls between steps and at the end of the sequence.
- Button-based reordering and confirmed deletion.
- One Scheduler, Enrollment, and Exit step per sequence, with up to two Email steps.
- Step-specific forms, inline validation, readiness status, and an overall progress summary.
- Local editor drafts: changes affect the workflow only after **Apply changes**.
- A discard warning when moving to another step while edits are unapplied.
- A plain-language preview built from the current workflow data.
- An example sequence for a fast reviewer walkthrough.
- Explicit browser save, dirty-state feedback, `Ctrl/Cmd + S`, and an unsaved-change warning on page exit.
- Schema-versioned `localStorage` persistence with defensive parsing.
- Responsive desktop, tablet, and mobile layouts, including a mobile slide-over editor.
- Keyboard-visible focus styles, semantic form labels, accessible button names, dialog roles, status announcements, Escape handling, and reduced-motion support.
- Firebase Authentication with Google sign-in when configured, plus clearly identified assignment-demo access for reviewers.
- Account-scoped browser storage, with local sequence records keyed by Firebase UID so accounts do not share the app's saved draft.

This prototype configures and previews a sequence; it does not schedule or send real email.

## Stack

- React 19 and React DOM
- Vite 8
- Redux Toolkit and React Redux
- Firebase Authentication
- JavaScript and JSX
- Lucide React icons
- Vitest, jsdom, Testing Library, and `user-event`
- Oxlint
- Plain CSS with responsive media queries

## Run locally

Requirements: Node.js `^20.19.0` or `>=22.12.0` and npm. These are the versions supported by the installed Vite release.

```bash
git clone https://github.com/dakshyadavdtu/araliproj.git
cd araliproj
npm ci
npm run dev
```

Open the local URL printed by Vite. Firebase configuration is optional for assignment review: when it is absent, the entry screen explains that Google sign-in is unavailable and offers **Continue to assignment demo**.

Useful commands:

```bash
npm run dev        # start the development server
npm run build      # create the production bundle in dist/
npm run preview    # serve the production bundle locally
npm test           # run the test suite once
npm run test:watch # run tests in watch mode
npm run lint       # lint src/ and vite.config.js
```

## Firebase Google sign-in

The sign-in flow uses Firebase Authentication's Google provider. The application observes the Firebase session, opens the official Google account picker, keeps the session in browser-local persistence, and signs out through Firebase. To connect your own Firebase project:

1. Create a Firebase project, register a Web app, and copy its Firebase configuration values.
2. In **Authentication → Sign-in method**, enable the **Google** provider.
3. In **Authentication → Settings → Authorized domains**, include `localhost` for local development and `dakshyadavdtu.github.io` for the live GitHub Pages build.
4. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

5. Replace every required placeholder with the matching Web app value:

   ```dotenv
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-web-app-id
   ```

6. Restart the Vite server after changing the environment file.

For the GitHub Pages build, add the same names as GitHub repository **Variables** under **Settings → Secrets and variables → Actions → Variables**. The deployment workflow passes those values only to the Vite build. Firebase Web configuration identifies the Firebase project; it is not a private server secret. Even so, local `.env` files are ignored so environment-specific values do not become repository noise.

When Firebase is not configured, **Continue to assignment demo** opens the complete editor as a guest. It is a review route, not a simulated sign-in. When Firebase is configured, its SDK owns the authenticated session and the app retains only a sanitized display profile in React state. The user's Firebase UID also scopes the local sequence record.

The implementation follows Firebase's official [Web setup guide](https://firebase.google.com/docs/web/setup), [Google sign-in guide](https://firebase.google.com/docs/auth/web/google-signin), and [authentication state guidance](https://firebase.google.com/docs/auth/web/start). A future server must still [verify Firebase ID tokens with the Admin SDK](https://firebase.google.com/docs/auth/admin/verify-id-tokens) before trusting the user for backend data or actions.

## Suggested review flow

1. Open the live demo, or run the app without Firebase values and choose **Continue to assignment demo**.
2. From the empty builder, add a Scheduler and apply its frequency, time, and timezone.
3. Add Enrollment and enter a contact name and valid email address.
4. Add an Exit condition, then add Send email and apply it with the subject or body empty. The card remains **Needs attention** and the editor explains what is missing.
5. Complete the email fields and apply again. The sequence becomes ready once every required step is valid.
6. Use a plus control to inspect the disabled limits, reorder a step with its arrows, and open then cancel the delete confirmation.
7. Rename the sequence and open **Preview** to review the generated narrative.
8. Save with the button or `Ctrl/Cmd + S`, reload the page, and confirm that the saved sequence is restored.

For a shorter tour, **Load example** creates a complete five-step sequence with two emails; it is optional and the editor does not depend on it.

## UI decisions

- **A vertical sequence instead of a graph canvas.** The assignment is an ordered flow with four bounded step types, so a readable list makes order and completion state clearer than pan-and-zoom controls.
- **Configuration stays beside the sequence.** On desktop, selecting a card opens its form in a persistent inspector without hiding the workflow. On smaller screens, the same form becomes a focused, keyboard-managed panel.
- **Adding is contextual.** Plus controls appear between steps and at the end, so a reviewer can insert at the intended position instead of adding and then repairing the order.
- **Drafts are deliberate.** Form typing remains local until **Apply changes**. Leaving a changed draft, signing out, or closing the page prompts before work is lost; stale draft data can never be reported as saved.
- **Readiness is consistent.** Cards, the progress summary, the preview, and save flow all use the same validation model. An incomplete step therefore means the same thing everywhere.
- **The demo is honest.** Google sign-in is a real Firebase integration when configured. Without credentials the product says so and exposes a separate reviewer route rather than pretending authentication succeeded.

## Structure and architecture

The application deliberately keeps a flat `src/` structure because the feature set is small:

```text
src/
├── main.jsx          React root and Redux Provider
├── App.jsx           authentication-to-builder boundary
├── AuthGate.jsx      Firebase session boundary and assignment-demo entry
├── firebase.js       Firebase setup, Google provider, and profile sanitizing
├── Builder.jsx       page orchestration, commands, and transient UI state
├── Workflow.jsx      ordered workflow, cards, and add controls
├── Editor.jsx        local step drafts and type-specific fields
├── Dialogs.jsx       preview, deletion, and discard dialogs
├── store.js          Redux slice, actions, selectors, and store factory
├── workflow.js       data model, rules, validation, summaries, and persistence
├── workflow.test.js  domain, reducer, persistence, and builder tests
├── AuthGate.test.jsx Firebase sign-in, sign-out, and error-state tests
└── styles.css        visual system and responsive behavior
```

`workflow.js` contains framework-independent domain behavior. `store.js` owns committed application state. Components dispatch intent through Redux, while short-lived interface state—open dialogs, the add menu, toast text, and the current editor draft—stays close to the component that uses it.

### Ordered data model

A sequence is an object with stable identity and an ordered `nodes` array:

```js
{
  id,
  name,
  createdAt,
  updatedAt,
  nodes: [
    { id, type: 'scheduler', config: { frequency, time, weekday, timezone } },
    { id, type: 'enrollment', config: { contactName, email } },
    { id, type: 'exit', config: { condition, days } },
    { id, type: 'email', config: { recipient, subject, body } },
  ],
}
```

Array position is the displayed sequence order. This MVP does not model graph edges or branches. Node IDs are unique; limits are enforced both when options are presented and again in the Redux reducer. Readiness requires at least one valid Scheduler, Enrollment, Exit, and Email node.

### Drafts and validation

The selected node is copied into local editor state. Typing updates that copy, not Redux. **Apply changes** validates the draft and dispatches it only when valid; **Cancel** restores the committed node. Selecting or adding another step while a draft is dirty opens a discard confirmation.

Validation is split into two layers:

- Node validation covers required scheduler fields, a weekly weekday, contact name and email format, exit conditions and positive day counts, and email subject/body.
- Sequence validation checks required node types, node limits, duplicate IDs, per-node validity, and the readiness summary.

The same rules drive inline errors, card status, progress, and preview readiness, so those views do not maintain separate definitions of “complete.”

### Browser persistence

Saving writes a versioned record to `localStorage` under an account-scoped key derived from `arali.sequence-builder.v1`. The record contains `version`, `savedAt`, and the sequence snapshot. Loading rejects malformed JSON, unknown schema versions, unsupported node shapes, duplicate IDs, invalid dates, and node-limit violations; the app falls back to a new empty sequence instead of partially hydrating bad data.

Saving is explicit rather than automatic. Redux retains a cloned saved snapshot and derives dirty state by comparing the editable sequence with that snapshot. Guest entry lasts for the browser tab in `sessionStorage`; authenticated session persistence is managed by Firebase. The application never stores a Google credential itself.

## Production backend approach

The UI model is intentionally small, but it maps to a service architecture without treating the browser as an execution engine.

### Definitions and versions

- Store sequence metadata separately from immutable `sequence_versions`. Editing changes a draft; publishing validates it and creates a numbered snapshot in one transaction.
- Keep ordered node definitions on the version, either as validated JSON or normalized rows with an explicit `position`.
- Pin every enrollment to the published version it entered. Later edits create a new version and do not silently change contacts already in flight.
- Use optimistic concurrency (`version` or `updated_at`) on draft updates so one editor cannot unknowingly overwrite another.

### Enrollment and scheduling

- An `enrollments` row would reference the contact and sequence version and track `status`, `current_node`, `next_run_at`, exit reason, and timestamps.
- Enrollment is an explicit command with a caller-supplied idempotency key and a policy for whether a contact may enter once, repeatedly, or only after completing a prior run.
- A scheduler service computes timezone-aware run times and writes due work to a durable queue through a transactional outbox. Workers lease jobs rather than relying on browser timers or a single cron process.
- Before each action, a worker reloads enrollment state and checks exit conditions. This prevents an email queued earlier from sending after a reply or other exit event.

### Events and email delivery

- Normalize inbound events such as `contact.replied`, `email.opened`, and provider delivery callbacks. Deduplicate webhook events by the provider event ID and retain the raw payload for audit with an appropriate retention policy.
- Email execution renders a versioned template against an enrollment/contact snapshot, records an `email_delivery`, and sends through a provider adapter. Store the provider message ID to connect delivery, open, reply, bounce, and complaint events.
- Treat open events cautiously because privacy protections and image blocking make them weaker signals than replies or clicks.

### Idempotency, failures, and retries

- Give each logical node execution a stable unique key such as `(enrollment_id, sequence_version, node_id)`. Re-delivered queue messages must return the existing result instead of sending twice.
- Write state transitions and the next outbox job atomically. Use row locking or compare-and-swap updates so two workers cannot advance the same enrollment.
- Retry transient provider and network failures with bounded exponential backoff and jitter. Do not retry permanent failures such as invalid recipients without a change in data.
- After the retry limit, move work to a dead-letter state, expose the failure at enrollment and node level, alert operators, and allow an audited manual replay using the same idempotency boundary.

### API outline

```text
POST   /auth/session                        verify Firebase ID token; create application session
GET    /sequences                          list definitions
POST   /sequences                          create a draft
GET    /sequences/:id                      fetch draft and published metadata
PATCH  /sequences/:id/draft                update with optimistic version check
POST   /sequences/:id/publish              validate and create immutable version
POST   /sequences/:id/enrollments          enroll a contact idempotently
GET    /sequences/:id/enrollments          inspect active and completed runs
GET    /enrollments/:id                    inspect timeline and current state
POST   /enrollments/:id/cancel              exit an active run
POST   /webhooks/email-provider            ingest signed provider events
POST   /executions/:id/retry               replay an authorized failed execution
```

Mutating endpoints would require an authenticated application session, authorization by workspace, input validation against the node schema, audit logging, and rate limits. Webhooks would use provider signature verification rather than the browser session.

## Testing

The test suite uses Vitest with jsdom and Testing Library. The current 17 tests across two focused files cover:

- required steps, node field rules, summaries, and the generated narrative;
- reducer enforcement of node limits, reordering, deletion selection, and dirty state;
- schema-versioned, account-scoped persistence and safe fallback for malformed or incompatible data;
- guest review entry, loading the example, cancelling drafts, saving, and reloading;
- incomplete-preview guidance, unapplied-draft save protection, and draft safety around deletion;
- configured Firebase Google sign-in, Firebase sign-out, and useful authentication errors.

Run it with `npm test`. `npm run lint` checks the JavaScript/JSX source and Vite configuration, while `npm run build` produces the exact Pages artifact. Every push to `main` repeats all three checks before deployment.

## Assumptions, tradeoffs, and next steps

- An ordered list is clearer for this four-node assignment than an infinite graph canvas, but it cannot express branches or parallel work.
- Arrow controls are predictable and keyboard-accessible; drag-and-drop and undo/redo would improve longer workflows.
- The node catalog, one enrolled contact, plain-text email, and fixed limits keep configuration understandable but are not a general automation platform.
- Explicit local save makes persistence visible, but it has no cross-device sync, collaboration, revision history, or conflict handling.
- The scheduler and email nodes are configuration only. Production needs the versioned backend, event ingestion, durable queue, provider integration, observability, and retry model outlined above.
- Firebase provides a real client authentication session, but this static prototype has no application backend or server authorization. A production service should exchange the Firebase ID token for an HTTP-only application session after Admin SDK verification.
- Useful extensions include branching, delay nodes, reusable templates and variables, contact/segment selection, per-step execution history, import/export, end-to-end tests, and automated accessibility testing.

Product references and the decisions taken from them are documented in [RESEARCH.md](./RESEARCH.md).
