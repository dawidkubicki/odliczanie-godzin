import { describe, expect, it } from "vitest";
import {
  DAY_FORMS,
  formatDate,
  formatNumber,
  HOUR_FORMS,
  MINUTE_FORMS,
  parseDecimal,
  plural,
} from "./format";

describe("parseDecimal", () => {
  it.each([
    ["4,3745", 4.3745],
    ["4.3745", 4.3745],
    ["1 234,5", 1234.5],
    ["1 234,5", 1234.5],
    [" 2 ", 2],
    ["-1,5", -1.5],
    ["0", 0],
  ])("parses %j -> %d", (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "1,2,3", "1.2.3", "4,37a", "-", ","])("rejects %j", (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});

describe("plural (Polish)", () => {
  it.each([
    [1, "dzień"],
    [2, "dni"],
    [5, "dni"],
    [12, "dni"],
    [22, "dni"],
    [112, "dni"],
  ])("days %d -> %s", (n, form) => {
    expect(plural(n, DAY_FORMS)).toBe(form);
  });

  it.each([
    [0, "godzin"],
    [1, "godzina"],
    [2, "godziny"],
    [4, "godziny"],
    [5, "godzin"],
    [12, "godzin"],
    [13, "godzin"],
    [22, "godziny"],
    [112, "godzin"],
  ])("hours %d -> %s", (n, form) => {
    expect(plural(n, HOUR_FORMS)).toBe(form);
  });

  it.each([
    [1, "minuta"],
    [2, "minuty"],
    [5, "minut"],
    [12, "minut"],
    [22, "minuty"],
    [112, "minut"],
  ])("minutes %d -> %s", (n, form) => {
    expect(plural(n, MINUTE_FORMS)).toBe(form);
  });
});

describe("formatNumber", () => {
  it("uses a comma as the decimal separator", () => {
    expect(formatNumber(15.4715277)).toBe("15,47153");
    expect(formatNumber(4.3745)).toBe("4,3745");
    expect(formatNumber(0.5)).toBe("0,5");
  });

  it("respects min/max fraction digits", () => {
    expect(formatNumber(2, 2, 2)).toBe("2,00");
    expect(formatNumber(1.23456, 2)).toBe("1,23");
  });

  it("groups thousands with a space-like separator", () => {
    const out = formatNumber(1234567.5);
    expect(out.replace(/[\s  ]/g, " ")).toBe("1 234 567,5");
  });
});

describe("formatDate", () => {
  it("formats ISO dates as DD.MM.YYYY", () => {
    expect(formatDate("2026-09-04")).toBe("04.09.2026");
  });
});
