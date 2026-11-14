# Usage metrics and admin dashboard

The private dashboard is at `/admin`. It shows only events actually observed by
this deployment. The database is not pre-filled with sample visitors or demo
numbers; empty metrics remain zero until people use the deployed app.

## Setup

Set these server-side environment variables in Dokploy (or the deployment host):

- `ADMIN_PASSWORD`: a unique password, at least 16 characters.
- `ADMIN_SESSION_SECRET`: a random signing secret, at least 32 characters. Generate
  one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.

The dashboard uses an HTTP-only, same-site admin cookie that expires after eight
hours. After ten incorrect sign-in attempts in a process, sign-in is paused for
five minutes. No default admin password exists. Mount the persistent `/data`
volume described in [comparison storage](comparison-storage.md).
Analytics tables share the same SQLite file as anonymous quiz/comparison records.

For local development, copy `.env.example` to `.env.local` and set both secrets.
In Dokploy, add them as runtime secrets/environment variables; do not put
production credentials into the Docker image or Git.

## Metrics shown

- **Reach:** page views, unique anonymous browsers, new/returning browsers,
  sessions, daily traffic, pages per session, and single-page-session rate.
- **Traffic:** popular pages, referring host names (not full URLs), and direct /
  unknown traffic.
- **Devices:** coarse device type, browser family, and operating system.
- **Quiz funnel:** quiz starts, completed sessions, completion rate, abandoned
  sessions, abandon rate, average completed-quiz duration, average score, average question
  count, total answered questions, era/cassette use, and topic/category use.
- **Question answers:** counts of experienced / not experienced / not applicable
  across completed sessions, and the most frequently asked memories with their
  answer totals. These are daily aggregates, not visitor-level answer histories.
- **Sharing:** result-card download clicks, comparison links shared, comparison links
  opened, comparisons actually viewed after both people have results, observed
  view rate, and average number of overlapping comparable memories.

## Collection and limitations

The app emits same-origin page and interaction events; completed-quiz events and
answer aggregates are recorded server-side from the validated quiz session.
Known crawler / preview user-agent strings are filtered. A first-party random
browser cookie lasts up to one year, and a random session cookie expires after
30 minutes of inactivity. Only SHA-256 hashes of those random cookie values are
stored; no raw IP address, name, raw user-agent, or full referrer URL is saved.
Coarse browser/device/OS labels and the external referrer host may be saved.
Requests with the browser's Do Not Track setting enabled are excluded.

Raw usage events and daily answer aggregates are retained for 90 days; quiz
session answers have their separate 30-day retention. Unique browsers are an
estimate, not verified people: cookie deletion/blocking, multiple browsers or
devices, and sophisticated bots can affect counts. Events are real requests
observed by this app, but client-side activity cannot be cryptographically
proven to have come from a human. The dashboard labels these as observed
browsers rather than claiming an exact human count.
“Returning” is based on first-seen events within the retained 90-day window.
