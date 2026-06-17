import { useEffect } from "react";

export interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  noindex?: boolean;
  canonical?: string;
}

const DEFAULT_IMAGE = "https://axiomcv.site/axiom.png";
const SITE_NAME = "AXIOM CV";

export default function Seo({
  title,
  description,
  image,
  url,
  noindex = false,
  canonical,
}: SeoProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const ogImage = image || DEFAULT_IMAGE;
  const fullUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMeta = (
      name: string,
      content: string,
      attribute: "name" | "property" = "name"
    ) => {
      const selector =
        attribute === "name" ? `meta[name="${name}"]` : `meta[property="${name}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (attribute === "name") {
          el.setAttribute("name", name);
        } else {
          el.setAttribute("property", name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Open Graph tags
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description || "", "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:url", fullUrl, "property");
    setMeta("og:type", "website", "property");

    // Twitter Card tags
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description || "");
    setMeta("twitter:image", ogImage);
    setMeta("twitter:card", "summary_large_image");

    // Robots
    setMeta("robots", noindex ? "noindex,nofollow" : "index,follow");

    // Canonical URL
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }
  }, [fullTitle, description, ogImage, fullUrl, noindex, canonical]);

  return null;
}