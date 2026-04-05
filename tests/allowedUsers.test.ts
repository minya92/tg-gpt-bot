import { describe, expect, it } from 'vitest';
import { isAllowedUser, parseAllowedUserIds } from '../src/utils/allowedUsers';

describe('parseAllowedUserIds', () => {
  it('parses valid ids and ignores invalid values', () => {
    const ids = parseAllowedUserIds('123, 456, abc, -1, 456');

    expect([...ids].sort((a, b) => a - b)).toEqual([123, 456]);
  });

  it('returns empty set for empty input', () => {
    expect(parseAllowedUserIds('')).toEqual(new Set<number>());
    expect(parseAllowedUserIds(undefined)).toEqual(new Set<number>());
  });

  it('checks whitelist membership', () => {
    const ids = new Set<number>([100]);

    expect(isAllowedUser(ids, 100)).toBe(true);
    expect(isAllowedUser(ids, 101)).toBe(false);
    expect(isAllowedUser(ids, undefined)).toBe(false);
  });
});
