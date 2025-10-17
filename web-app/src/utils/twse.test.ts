import { describe, expect, it } from 'vitest';
import { parseTwseDate } from './twse';

function expectDate(date: Date | null, isoDate: string) {
  expect(date).not.toBeNull();
  const expected = new Date(`${isoDate}T00:00:00+08:00`);
  expect(date?.getTime()).toBe(expected.getTime());
}

describe('parseTwseDate', () => {
  it('parses ROC calendar date strings', () => {
    const date = parseTwseDate('112/11/01');
    expectDate(date, '2023-11-01');
  });

  it('parses ISO-like date strings', () => {
    const date = parseTwseDate('2024-05-31');
    expectDate(date, '2024-05-31');
  });

  it('parses compact numeric date strings', () => {
    const date = parseTwseDate('20240515');
    expectDate(date, '2024-05-15');
  });

  it('parses ROC compact numeric date strings', () => {
    const date = parseTwseDate('1120515');
    expectDate(date, '2023-05-15');
  });

  it('returns null for invalid dates', () => {
    expect(parseTwseDate('invalid')).toBeNull();
    expect(parseTwseDate('')).toBeNull();
    expect(parseTwseDate(undefined)).toBeNull();
  });
});
