import { describe, expect, it } from 'vitest';
import { hasPendingChanges, siteStatus } from './site-status';

const buildStartedAt = '2026-09-28T10:00:00.000Z';

describe('siteStatus', () => {
	it('is live when nobody asked for a rebuild', () => {
		expect(siteStatus({ buildStartedAt, latestRequestAt: null, now: new Date('2026-09-28T10:05:00.000Z') })).toBe('live');
	});

	it('is live when the latest request is older than the build', () => {
		expect(siteStatus({ buildStartedAt, latestRequestAt: '2026-09-28T09:58:00.000Z', now: new Date('2026-09-28T10:05:00.000Z') })).toBe('live');
	});

	it('is updating when a newer request is less than ten minutes old', () => {
		expect(siteStatus({ buildStartedAt, latestRequestAt: '2026-09-28T10:02:00.000Z', now: new Date('2026-09-28T10:11:59.000Z') })).toBe('updating');
	});

	it('is stale when a newer request is ten minutes old or more', () => {
		expect(siteStatus({ buildStartedAt, latestRequestAt: '2026-09-28T10:02:00.000Z', now: new Date('2026-09-28T10:12:00.000Z') })).toBe('stale');
	});

	it('ignores an unreadable request date', () => {
		expect(siteStatus({ buildStartedAt, latestRequestAt: 'not a date', now: new Date('2026-09-28T10:05:00.000Z') })).toBe('live');
	});
});

describe('hasPendingChanges', () => {
	it('flags rows changed after the build', () => {
		expect(hasPendingChanges('2026-09-28T10:00:01.000Z', buildStartedAt)).toBe(true);
	});

	it('does not flag rows changed before the build', () => {
		expect(hasPendingChanges('2026-09-28T09:59:59.000Z', buildStartedAt)).toBe(false);
	});

	it('does not flag rows without a change date', () => {
		expect(hasPendingChanges(null, buildStartedAt)).toBe(false);
	});
});
