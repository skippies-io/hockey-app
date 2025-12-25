# Contributing

## Truth, Snapshots, and CI

This project treats tournament data as versioned ‘truth snapshots’.
All assumptions about data shape and integrity are defined in contracts (SpecKit),
captured as snapshot fixtures, and validated automatically in CI.
Any change—human or AI-generated—that breaks truth invariants fails validation
and cannot be merged or deployed.
Live data may evolve, but builds and tests always run against known,
validated snapshots to ensure safe deployments and prevent drift.

- If CI fails snapshot validation, the change must be fixed at the truth level, not worked around in code.
