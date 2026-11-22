import { expect, test } from "vitest";
import { directionsUrl, mapEmbedUrl } from "@/lib/maps";

const loc = { lat: 40.9734694, lng: -5.6493969 };

test("embed URL points at the coordinates", () => {
  const url = mapEmbedUrl(loc);
  expect(url).toContain("q=40.9734694,-5.6493969");
  expect(url).toContain("output=embed");
  expect(url.startsWith("https://www.google.com/maps")).toBe(true);
});

test("directions URL targets the salon", () => {
  expect(directionsUrl(loc)).toBe("https://www.google.com/maps/dir/?api=1&destination=40.9734694,-5.6493969");
});
