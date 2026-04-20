import { NextResponse } from "next/server";
import { parseRemoteTechnicalSheet } from "@/lib/process-ingredient-pdf-server";

type SearchMatch = {
  title: string;
  url: string;
};

function decodeDuckDuckGoTarget(url: string) {
  try {
    const parsed = new URL(url, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : url;
  } catch {
    return url;
  }
}

function extractPdfLinks(html: string) {
  const matches = Array.from(
    html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)
  );
  const results: SearchMatch[] = [];

  for (const match of matches) {
    const rawHref = match[1];
    const href = decodeDuckDuckGoTarget(rawHref);
    const title = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (!/^https?:/i.test(href)) {
      continue;
    }

    if (!href.toLowerCase().includes(".pdf")) {
      continue;
    }

    if (results.some((item) => item.url === href)) {
      continue;
    }

    results.push({
      title: title || href.split("/").pop() || "Technical sheet PDF",
      url: href,
    });
  }

  return results.slice(0, 5);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }

  try {
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(
      `${query} technical sheet pdf`
    )}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!searchResponse.ok) {
      throw new Error(`Search provider returned ${searchResponse.status}.`);
    }

    const html = await searchResponse.text();
    const candidates = extractPdfLinks(html);
    const results = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const parsed = await parseRemoteTechnicalSheet(candidate.url);

          return {
            ...candidate,
            parsed,
          };
        } catch {
          return {
            ...candidate,
            parsed: null,
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to search for remote technical sheets.",
      },
      { status: 500 }
    );
  }
}
