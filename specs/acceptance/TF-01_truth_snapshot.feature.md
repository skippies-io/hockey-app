Feature: TF-01 Truth Snapshot standard

  Background:
    Given the Truth Snapshot contract is defined
    And the snapshot validator enforces contract invariants

  Scenario: Validate a correct snapshot passes
    Given a snapshot with required fields and valid references
    And standings are computed from fixtures and results
    When the snapshot is validated
    Then validation passes

  Scenario: Missing required fields fails
    Given a snapshot missing required fields
    When the snapshot is validated
    Then validation fails

  Scenario: Fixture references unknown team fails
    Given a snapshot where a fixture references an unknown team
    When the snapshot is validated
    Then validation fails

  Scenario: Attempting to change immutable fields after LOCKED fails
    Given a snapshot in LOCKED state
    When a change is proposed to team ids, pool membership, or tie-break rules
    Then the change is rejected

  Scenario: Safe deploy gate blocks invalid snapshots
    Given a pull request includes a snapshot validation check
    And the snapshot fails validation
    When the CI pipeline runs
    Then the pull request fails the safe deploy gate

  Notes:
    See the contract definition in ../contracts/Truth_Snapshot_Contract.md
