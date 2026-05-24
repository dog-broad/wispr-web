import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about"],
        disallow: ["/s/", "/r", "/pair", "/me", "/login", "/auth"],
      },
    ],
    sitemap: "https://wispr.rushyendra.dev/sitemap.xml",
  };
}
