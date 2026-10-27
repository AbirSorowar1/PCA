import { describe, expect, it } from "vitest";
import { normalizeCountries, normalizeNationalities, optionList } from "./geo";

describe("country normalisation", () => {
  it("merges UK variants", () => expect(normalizeCountries("U.K.")).toEqual(["United Kingdom"]));
  it("drops brackets", () => expect(normalizeCountries("United Kingdom (Birmingham)")).toEqual(["United Kingdom"]));
  it("Morocco with emoji/brackets", () => expect(normalizeCountries("Morocco (Based in Fez)")).toEqual(["Morocco"]));
  it("splits multiple countries", () => expect(normalizeCountries("Qatar / Switzerland")).toEqual(["Qatar", "Switzerland"]));
  it("Toronto, Canada -> Canada", () => expect(normalizeCountries("Toronto, Canada")).toEqual(["Canada"]));
  it("ignores vague regions", () => expect(normalizeCountries("Lebanon / Middle East region")).toEqual(["Lebanon"]));
  it("excludes unknown", () => expect(normalizeCountries("Not publicly verified")).toEqual([]));
  it("Dallas-Austin -> United States", () => expect(normalizeCountries("Dallas-Austin")).toEqual(["United States"]));
});

describe("nationality normalisation", () => {
  it("country name -> demonym", () => expect(normalizeNationalities("Saudi Arabia")).toEqual(["Saudi Arabian"]));
  it("excludes broad labels", () => expect(normalizeNationalities("Arab")).toEqual([]));
  it("splits compounds", () => expect(normalizeNationalities("Turkish-Australian")).toEqual(["Turkish", "Australian"]));
  it("drops heritage words and brackets", () => expect(normalizeNationalities("German (with Turkish heritage)")).toEqual(["German"]));
  it("Iraqi Kurdish -> Iraqi", () => expect(normalizeNationalities("Iraqi Kurdish")).toEqual(["Iraqi"]));
  it("trailing dot", () => expect(normalizeNationalities("British.")).toEqual(["British"]));
});

it("dropdown options are unique, sorted, without Unknown", () => {
  const rows = [{ c: "UK" }, { c: "United Kingdom" }, { c: "" }, { c: "Canada" }];
  expect(optionList(rows, (r) => normalizeCountries(r.c))).toEqual([
    { name: "Canada", value: 1 },
    { name: "United Kingdom", value: 2 },
  ]);
});
