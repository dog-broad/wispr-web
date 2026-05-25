import { describe, expect, it } from "vitest";

import { detectUrl } from "./detect";
import { parseOgFromHtml } from "./og";

describe("url-preview/detectUrl", () => {
  it("returns the URL for a bare-URL message", () => {
    const url = detectUrl("https://example.com/page?q=1");
    expect(url).not.toBeNull();
    expect(url?.hostname).toBe("example.com");
  });

  it("tolerates surrounding whitespace", () => {
    expect(detectUrl("  https://example.com  ")?.hostname).toBe("example.com");
  });

  it("rejects URLs with trailing prose", () => {
    expect(detectUrl("https://example.com is a cool site")).toBeNull();
  });

  it("rejects URLs with leading prose", () => {
    expect(detectUrl("check out https://example.com")).toBeNull();
  });

  it("rejects non-http(s) schemes", () => {
    expect(detectUrl("ftp://example.com/file")).toBeNull();
    expect(detectUrl("mailto:user@example.com")).toBeNull();
    expect(detectUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects malformed URLs that pass the regex", () => {
    // The regex permits 'http://' alone but new URL() rejects it.
    expect(detectUrl("http://")).toBeNull();
  });
});

describe("url-preview/parseOgFromHtml", () => {
  const PAGE_URL = new URL("https://example.com/article");

  it("pulls title, description, and image from og:* meta", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="A Title">
        <meta property="og:description" content="A description.">
        <meta property="og:image" content="https://cdn.example.com/img.png">
      </head><body></body></html>
    `;
    const preview = parseOgFromHtml(PAGE_URL, html);
    expect(preview).toEqual({
      hostname: "example.com",
      title: "A Title",
      description: "A description.",
      image: "https://cdn.example.com/img.png",
    });
  });

  it("falls back to twitter:* tags when og:* are absent", () => {
    const html = `
      <html><head>
        <meta name="twitter:title" content="Twitter Title">
        <meta name="twitter:description" content="Twitter description.">
        <meta name="twitter:image" content="https://cdn.example.com/t.png">
      </head></html>
    `;
    const preview = parseOgFromHtml(PAGE_URL, html);
    expect(preview.title).toBe("Twitter Title");
    expect(preview.description).toBe("Twitter description.");
    expect(preview.image).toBe("https://cdn.example.com/t.png");
  });

  it("uses the <title> tag when no meta tags are present", () => {
    const html = `<html><head><title>Plain Title</title></head></html>`;
    const preview = parseOgFromHtml(PAGE_URL, html);
    expect(preview.title).toBe("Plain Title");
    expect(preview.description).toBeUndefined();
    expect(preview.image).toBeUndefined();
  });

  it("resolves relative image URLs against the page URL", () => {
    const html = `<html><head><meta property="og:image" content="/img.png"></head></html>`;
    const preview = parseOgFromHtml(PAGE_URL, html);
    expect(preview.image).toBe("https://example.com/img.png");
  });

  it("returns just the hostname when nothing parses", () => {
    const preview = parseOgFromHtml(PAGE_URL, "<html><body>no meta</body></html>");
    expect(preview).toEqual({ hostname: "example.com" });
  });

  it("handles single-quoted attributes", () => {
    const html = `<html><head><meta property='og:title' content='Quoted Title'/></head></html>`;
    expect(parseOgFromHtml(PAGE_URL, html).title).toBe("Quoted Title");
  });
});
