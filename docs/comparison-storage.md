# Anonymous comparison storage

Comparison links contain a random 128-bit token in the short path `/compare/{id}`.
The server stores only the response values, the asked memory IDs, timestamps, and
a SHA-256 hash of the token in SQLite. It does not store names, contact details,
account IDs, or IP addresses.

Records are available for 30 days. Expired rows are removed on the next
comparison create/read request. The local quiz result remains in browser storage;
it is sent to the server only when the user creates or shares a comparison link.

## Persistent deployment storage

The container uses `/data/comparisons.sqlite`. Mount a persistent volume at
`/data` in Dokploy (or the equivalent location in another container host) so
records survive container replacement. Without a mounted volume, records are
lost when the container is removed. For a non-container deployment, set
`COMPARISON_DB_PATH` to a writable persistent SQLite file path.

The server needs Node.js 22 or newer for the built-in `node:sqlite` module.
