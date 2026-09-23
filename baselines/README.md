# Stable-state baseline

`caffeine-export-v23.most` preserves the stable type signature exported in commit c1d2a791e03761aa081689a1891d6d09c579001a at src/backend/dist/backend.most. Only line endings are normalized. It is intentionally outside dist and .old so a clean Caffeine import can find it and a build cannot overwrite its baseline.

This keeps the export-to-update compatibility check enabled. It does not establish which version is currently deployed live: verify the real deployed signature before publishing. Never replace this with an empty actor to silence an error, and never update the baseline merely because a build succeeded.
