# Specs

## How we work with truth

This project treats tournament data as versioned ‘truth snapshots’.
All assumptions about data shape and integrity are defined in contracts (SpecKit),
captured as snapshot fixtures, and validated automatically in CI.
Any change—human or AI-generated—that breaks truth invariants fails validation
and cannot be merged or deployed.
Live data may evolve, but builds and tests always run against known,
validated snapshots to ensure safe deployments and prevent drift.

## Overview

- [Hockey App V2 Overview](001-hockey-v2-overview/spec.md)

## Experiments

- [EXP-02 Team Profile Refresh](experiments/EXP-02-team-profile-refresh.md)
- [EXP-03 Fixture Card Consistency](experiments/EXP-03-fixture-card-consistency.md)

## Contracts

- [Truth Snapshot Contract](contracts/Truth_Snapshot_Contract.md)

## Acceptance

- [TF-01 Truth Snapshot](acceptance/TF-01_truth_snapshot.feature.md)

## Journeys

- [TF-01 Truth Snapshot (Admin)](journeys/admin/TF-01_truth_snapshot.md)

## Fixtures

_TBD (added in next step)_

## AI Working Agreements

_TBD (added later)_
