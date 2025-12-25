# Journey: TF-01 Truth Snapshot (Admin)

**Related**: [Contract](../../contracts/Truth_Snapshot_Contract.md), [Acceptance](../../acceptance/TF-01_truth_snapshot.feature.md)

---

## Job-to-be-done

As an admin or release owner, I need a frozen, versioned snapshot of tournament truth so that deployments and tests are safe, reproducible, and protected from AI or data drift.

---

## Why

- **Safe deployments**: releases only ship when snapshots validate and match invariants.
- **Reproducible testing**: known truth can be replayed across environments and time.
- **Drift prevention**: live data changes or AI edits cannot silently rewrite history.

---

## Success Signals

- Snapshots validate consistently in CI before merge.
- A locked snapshot can be replayed without changes in outcomes.
- Consumers can identify exactly which source and schema version a snapshot came from.

---

## Non-goals

- Building or running any runtime snapshot generation code.
- Defining UI or admin workflows for editing truth.
- Real-time sync logic or live feed integration details.
