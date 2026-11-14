# Anonymous comparison storage

Each completed quiz is stored as its own immutable session in SQLite. The session
contains the response values, asked memory IDs, selected era/category, timestamps,
and a SHA-256 hash of its random 128-bit ID. Comparison links use that session ID
in the short path `/compare/{id}`. No names, contact details, account IDs, or IP
addresses are stored in the quiz-session record.

Each session is available for 30 days; completing another quiz creates another
row and does not overwrite older sessions. Expired rows are removed on the next
quiz-session or comparison create/read request. A local history is also kept in
browser storage.

## Persistent deployment storage

The container uses `/data/comparisons.sqlite`. Mount a persistent volume at
`/data` in Dokploy (or the equivalent location in another container host) so
records survive container replacement. Without a mounted volume, records are
lost when the container is removed. For a non-container deployment, set
`COMPARISON_DB_PATH` to a writable persistent SQLite file path.

The server needs Node.js 22 or newer for the built-in `node:sqlite` module.
