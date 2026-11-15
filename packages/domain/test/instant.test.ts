import { describe, expect, it } from "vitest";
import { INSTANT_CATALOG, INSTANT_CAPABILITIES, findPrices, findResults, findText, findUrls, median, pickToolSlug } from "../src";

describe("instant catalog", () => {
  it("covers every toolkit the capabilities rely on", () => {
    const slugs = new Set(INSTANT_CATALOG.map((t) => t.slug));
    for (const c of Object.values(INSTANT_CAPABILITIES)) for (const x of c.candidates) expect(slugs.has(x.toolkit), x.toolkit).toBe(true);
    expect(INSTANT_CATALOG.find((t) => t.slug === "gemini")?.active).toBe(true);
  });

  it("picks tool slugs from discovered lists", () => {
    expect(pickToolSlug("TAVILY_SEARCH", ["search"], ["TAVILY_SEARCH", "TAVILY_EXTRACT"])).toBe("TAVILY_SEARCH");
    expect(pickToolSlug("GEMINI_GENERATE_CONTENT", ["generate", "content"], ["GEMINI_LIST_MODELS", "GEMINI_GENERATE_CONTENT_V2"])).toBe("GEMINI_GENERATE_CONTENT_V2");
    expect(pickToolSlug("X", ["search"], [])).toBeNull();
    expect(pickToolSlug("X", ["search"], ["FOO_BAR"])).toBeNull();
  });
});

describe("response parsing", () => {
  it("extracts search results, prices, urls and text from varied shapes", () => {
    const tavily = { data: { results: [{ title: "Planner A", url: "https://a.example/p", content: "Great for students" }] } };
    expect(findResults(tavily)).toEqual([{ title: "Planner A", url: "https://a.example/p", snippet: "Great for students" }]);
    const shopping = { shopping_results: [{ title: "x", link: "https://s.example", extracted_price: 7.5 }, { price: "€12,00" }] };
    expect(findPrices(shopping)).toEqual([750, 1200]);
    expect(median([750, 1200, 900])).toBe(900);
    expect(findUrls({ images: [{ url: "https://img.example/1.png" }] })).toEqual(["https://img.example/1.png"]);
    expect(findText({ candidates: [{ content: { parts: [{ text: "Hello there, a longer answer" }] } }], model: "gemini" })).toBe("Hello there, a longer answer");
  });
});
