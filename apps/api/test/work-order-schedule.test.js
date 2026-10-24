import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterSharedResourceConflicts,
  formatUtcForWorkspace,
  workspaceLocalTimeToUtc,
} from '../src/models/work-order-schedule.model.js';

test('workspace-local appointment time is persisted as the correct UTC instant', () => {
  const instant = workspaceLocalTimeToUtc('2026-01-15T09:30', 'America/Chicago');
  assert.equal(instant.toISOString(), '2026-01-15T15:30:00.000Z');
  assert.equal(formatUtcForWorkspace(instant, 'America/Chicago'), '2026-01-15T09:30');
});

test('nonexistent daylight-saving wall times are rejected', () => {
  assert.throws(
    () => workspaceLocalTimeToUtc('2026-03-08T02:30', 'America/Chicago'),
    { code: 'INVALID_SCHEDULE_TIME' },
  );
});

test('ambiguous fall-back wall times resolve deterministically to the earlier instant', () => {
  const instant = workspaceLocalTimeToUtc('2026-11-01T01:30', 'America/Chicago');
  assert.equal(instant.toISOString(), '2026-11-01T06:30:00.000Z');
});

test('schedule conflicts only include overlapping orders sharing an assigned owner or employee', () => {
  const overlaps = [
    { id: 'shared-worker', number: 2, assignments: [{ employeeId: 'helper-1', ownerUserId: null }] },
    { id: 'other-worker', number: 3, assignments: [{ employeeId: 'helper-2', ownerUserId: null }] },
    { id: 'shared-owner', number: 4, assignments: [{ employeeId: null, ownerUserId: 'owner-1' }] },
  ];
  const conflicts = filterSharedResourceConflicts([
    { employeeId: 'helper-1', ownerUserId: null },
    { employeeId: null, ownerUserId: 'owner-1' },
  ], overlaps);

  assert.deepEqual(conflicts.map(({ id }) => id), ['shared-worker', 'shared-owner']);
  assert.deepEqual(filterSharedResourceConflicts([], overlaps), []);
});
