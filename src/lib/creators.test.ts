import { describe, expect, it } from "vitest";
import { parseFollowers, normalizePlatform, parseCsv } from "./creators";

describe("sheet parsing", () => {
  it("parses comma follower counts", () => expect(parseFollowers("  13,000 ")).toBe(13000));
  it("treats EU '(K)' column as thousands", () => expect(parseFollowers("70", true)).toBe(70000));
  it("keeps full counts in the (K) column", () => expect(parseFollowers("539000", true)).toBe(539000));
  it("parses M suffix", () => expect(parseFollowers("1.2M")).toBe(1200000));
  it("fixes platform typos", () => expect(normalizePlatform("Instgaram ")).toBe("Instagram"));
  it("handles quoted newlines in csv", () =>
    expect(parseCsv('"a","b\nc"\n"d","e"')).toEqual([["a", "b\nc"], ["d", "e"]]));
});

import { findDuplicates } from "./creators";
describe("duplicates", () => {
  it("counts same profile link with different handle text as one duplicate", () => {
    const r = findDuplicates([
      { name: "A", handle: "@abc", links: "https://www.instagram.com/abc/" },
      { name: "A2", handle: "abc ", links: "https://instagram.com/abc?igsh=1" },
      { name: "B", handle: "@b", links: "" },
    ]);
    expect(r.extra).toBe(1);
    expect(r.unique).toBe(2);
  });
  it("does not merge different Facebook profile.php ids", () => {
    const r = findDuplicates([
      { name: "A", handle: "", links: "https://www.facebook.com/profile.php?id=111" },
      { name: "B", handle: "", links: "https://www.facebook.com/profile.php?id=222" },
    ]);
    expect(r.extra).toBe(0);
  });
});

import { findNameDuplicates as fnd } from "./creators";
import { test as t2, expect as e2 } from "vitest";
t2("duplicate only when name and handle both match", () => {
  const r = fnd([{ name: "Ayesha  Khan", handle: "@ayesha" }, { name: "ayesha khan", handle: "ayesha" }, { name: "Ayesha Khan", handle: "@other" }]);
  e2(r.groups.length).toBe(1);
  e2(r.extra).toBe(1);
});
