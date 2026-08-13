# Product Research

The assignment was compared with established workflow products to identify useful interaction patterns without expanding a small sequence editor into a general automation platform. The notes below are based on official product documentation.

## Workflow products

| Product | Patterns studied | Adopted in this build | Deferred or avoided, and why |
| --- | --- | --- | --- |
| HubSpot | [Enrollment triggers](https://knowledge.hubspot.com/workflows/set-your-workflow-enrollment-triggers), [workflow actions](https://knowledge.hubspot.com/workflows/choose-your-workflow-actions), branches, re-enrollment, activation checks, and workflow history | Enrollment and exit are explicit steps; each card has a concise summary and readiness state; incomplete setup is visible before a sequence is considered ready | Multiple CRM object types, hundreds of actions, deep branching, re-enrollment policies, and live execution history require a backend and would obscure the assignment’s four core node types |
| Customer.io Journeys | [Campaign creation](https://docs.customer.io/journeys/create-a-campaign/), the [workflow builder](https://docs.customer.io/journeys/send/workflows/builder/), messages, delays, goals, exit criteria, and conditional/random branches | A central workflow with adjacent add points, a dedicated configuration panel, an explicit exit condition, local drafts, and a review-before-run preview | Infinite-canvas controls, multiple message channels, random cohorts, live campaign mutation, analytics, and per-message sending modes were outside the MVP and need execution semantics |
| Zapier | Linear trigger/action composition, insertion with plus controls, [Filters versus Paths](https://help.zapier.com/hc/en-us/articles/8496180919949-Filter-and-path-rules-in-Zaps), and [durable delay/queue concepts](https://help.zapier.com/hc/en-us/articles/8496288754829-Add-delays-to-Zap-workflows) | Clear ordered cards, insertion between existing steps, compact summaries, and controls that keep the next action obvious | An integration catalog, field mapping, arbitrary Paths, and general-purpose data transforms would add configuration depth without helping the focused email-sequence task |
| Klaviyo Flows | [Triggers and profile filters](https://help.klaviyo.com/hc/en-us/articles/115002779051), [flow actions and time delays](https://help.klaviyo.com/hc/en-us/articles/115002774932), conditional splits, re-entry, and recipient status | Schedule and timezone configuration, explicit enrollment eligibility, exit behavior, readiness feedback, and an ordered series of messages | Segments, SMS/push channels, send-time optimization, A/B branches, profile-filter re-evaluation, and per-recipient analytics depend on customer data and a delivery backend |

### Resulting product decisions

- Keep the workflow linear and readable. The assignment has a bounded node set, so a vertical ordered list communicates sequence better than a pannable graph.
- Keep configuration beside the workflow on larger screens and move it into a focused panel on mobile.
- Separate applied node data from editor drafts. Reviewers can explore a change without silently altering the sequence.
- Make enrollment, scheduling, exit, and message content first-class rather than hiding them in generic action forms.
- Use one validation model for card status, overall readiness, and preview. “Ready” should mean the same thing everywhere.
- Treat preview and persistence as authoring features only. Real execution, recipient state, events, and retry behavior belong on a backend.

## Firebase Authentication with Google

The integration follows Firebase's official guidance for [setting up a Web app](https://firebase.google.com/docs/web/setup), [authenticating with Google](https://firebase.google.com/docs/auth/web/google-signin), and [observing authentication state](https://firebase.google.com/docs/auth/web/start).

Adopted:

- initialize Firebase only when every required environment value is present;
- open Google's account picker through `GoogleAuthProvider` and `signInWithPopup`;
- use Firebase's browser-local persistence and `onAuthStateChanged` as the session source of truth;
- retain only a sanitized display profile in application state;
- sign out through Firebase and keep local sequence data scoped by Firebase UID;
- provide a clearly labeled assignment-demo route so the prototype remains directly reviewable with or without Firebase configuration.

Deliberately not treated as production authentication:

- A client session alone does not authorize access to a future application backend.
- Application code never manually persists an OAuth credential; Firebase SDK intentionally owns the authenticated session through browser-local persistence. The guest route does not claim to authenticate a user.
- A production service must receive the Firebase ID token over HTTPS and [verify it with the Firebase Admin SDK](https://firebase.google.com/docs/auth/admin/verify-id-tokens) before creating or authorizing a server session.

Redirect sign-in, account linking, organization restrictions, and extra Google API scopes were not needed for this assignment. The app requests identity for entry only; it does not request access to Google APIs.
