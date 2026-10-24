import { AppError } from '../errors/app-error.js';

function getZonedParts(instant, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(instant)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]));
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function matchesWallTime(parts, desired) {
  return parts.year === desired.year
    && parts.month === desired.month
    && parts.day === desired.day
    && parts.hour === desired.hour
    && parts.minute === desired.minute
    && parts.second === 0;
}

export function workspaceLocalTimeToUtc(startAtLocal, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(startAtLocal);
  if (!match) throw new AppError('INVALID_SCHEDULE_TIME', 'Enter a valid date and time.', 400);
  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: 0,
  };
  const naiveUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute);
  const check = new Date(naiveUtc);
  if (check.getUTCFullYear() !== desired.year || check.getUTCMonth() + 1 !== desired.month
    || check.getUTCDate() !== desired.day || desired.hour > 23 || desired.minute > 59) {
    throw new AppError('INVALID_SCHEDULE_TIME', 'Enter a valid date and time.', 400);
  }

  let offsets;
  try {
    offsets = new Set();
    for (let offsetHours = -36; offsetHours <= 36; offsetHours += 6) {
      const sample = naiveUtc + offsetHours * 60 * 60 * 1000;
      const zoned = getZonedParts(new Date(sample), timeZone);
      const zonedAsUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
      offsets.add(zonedAsUtc - sample);
    }
  } catch {
    throw new AppError('INVALID_WORKSPACE_TIME_ZONE', 'The workspace time zone is invalid.', 400);
  }

  const possibleInstants = [...offsets]
    .map((offset) => new Date(naiveUtc - offset))
    .filter((instant) => matchesWallTime(getZonedParts(instant, timeZone), desired))
    .sort((left, right) => left.getTime() - right.getTime());

  if (!possibleInstants.length) {
    throw new AppError('INVALID_SCHEDULE_TIME', 'That local time does not exist because of a daylight-saving time change.', 400);
  }

  // During the fall-back hour, choose the earlier occurrence deterministically.
  return possibleInstants[0];
}

export function formatUtcForWorkspace(instant, timeZone) {
  const parts = getZonedParts(new Date(instant), timeZone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

function resourceKey(assignment) {
  if (assignment.ownerUserId) return `owner:${assignment.ownerUserId}`;
  if (assignment.employeeId) return `employee:${assignment.employeeId}`;
  return null;
}

export function filterSharedResourceConflicts(currentAssignments, overlappingWorkOrders) {
  const resources = new Set(currentAssignments.map(resourceKey).filter(Boolean));
  if (!resources.size) return [];
  return overlappingWorkOrders
    .filter((workOrder) => workOrder.assignments.some((assignment) => {
      const key = resourceKey(assignment);
      return key && resources.has(key);
    }))
    .map(({ assignments, ...workOrder }) => workOrder);
}
