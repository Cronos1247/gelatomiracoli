import { parsePreGelTechnicalSheet } from "@/lib/process-ingredient-pdf";

function normalizeWhitespace(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

async function extractPdfTextFromBuffer(data: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
  const pdfDocument = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const textItems = textContent.items
      .map((item) => {
        if (!("str" in item)) {
          return null;
        }

        return {
          text: item.str,
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
        };
      })
      .filter((item): item is { text: string; x: number; y: number } => Boolean(item))
      .sort((left, right) => {
        if (Math.abs(left.y - right.y) > 2) {
          return right.y - left.y;
        }

        return left.x - right.x;
      });

    const lines: string[] = [];
    let currentLine = "";
    let currentY: number | null = null;

    for (const item of textItems) {
      if (currentY === null || Math.abs(item.y - currentY) > 2) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }

        currentLine = item.text;
        currentY = item.y;
        continue;
      }

      currentLine += `${currentLine ? " " : ""}${item.text}`;
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    pages.push(lines.join("\n"));
  }

  return normalizeWhitespace(pages.join("\n"));
}

export async function parseRemoteTechnicalSheet(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136 Safari/537.36",
      Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch PDF (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("pdf") && !url.toLowerCase().includes(".pdf")) {
    throw new Error("Search result did not resolve to a PDF.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const text = await extractPdfTextFromBuffer(bytes);

  return parsePreGelTechnicalSheet(text, decodeURIComponent(url.split("/").pop() ?? "remote-sheet.pdf"));
}
