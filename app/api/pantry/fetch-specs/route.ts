import { NextResponse } from "next/server";
import { parseNutritionLabelText } from "@/lib/nutrition-proxy";
import { parseRemoteTechnicalSheet } from "@/lib/process-ingredient-pdf-server";
import type { FetchedIngredientSpecs } from "@/lib/fetch-ingredient-specs";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();
}

function inferAverage(productName: string): FetchedIngredientSpecs {
  const normalized = normalize(productName);

  if (/vanilla|custard|crema/.test(normalized)) {
    return {
      sourceUrl: null,
      sourceType: "category_average",
      estimated: true,
      disclaimer: "Estimated Balance - No Tech Sheet Found. Applied Generic Vanilla Paste average.",
      extracted: {
        name: productName,
        fat_pct: 6,
        sugar_pct: 52,
        total_solids_pct: 74,
        solids_non_fat_pct: 2,
        other_solids_pct: 14,
        pac_value: 88,
        pod_value: 72,
        dosage_guideline: 70,
        is_cold_process: true,
        category: "Flavor Paste",
      },
    };
  }

  if (/pistach|hazelnut|nocciol|mandorl|nut/.test(normalized)) {
    return {
      sourceUrl: null,
      sourceType: "category_average",
      estimated: true,
      disclaimer: "Estimated Balance - No Tech Sheet Found. Applied Generic Nut Paste average.",
      extracted: {
        name: productName,
        fat_pct: 45,
        sugar_pct: 5,
        total_solids_pct: 98,
        solids_non_fat_pct: 0,
        other_solids_pct: 48,
        pac_value: 55,
        pod_value: 42,
        dosage_guideline: 100,
        is_cold_process: true,
        category: "Flavor Paste",
      },
    };
  }

  return {
    sourceUrl: null,
    sourceType: "category_average",
    estimated: true,
    disclaimer: "Estimated Balance - No Tech Sheet Found.",
    extracted: {
      name: productName,
      fat_pct: 0,
      sugar_pct: 50,
      total_solids_pct: 70,
      solids_non_fat_pct: 0,
      other_solids_pct: 20,
      pac_value: 80,
      pod_value: 70,
      dosage_guideline: 80,
      is_cold_process: true,
      category: "Flavor Paste",
    },
  };
}

async function searchLinks(productName: string) {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(
    `${productName} official manufacturer technical sheet nutrition`
  )}`;
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const matches = Array.from(html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>/gi));

  return matches
    .map((match) => {
      try {
        const url = new URL(match[1], "https://duckduckgo.com");
        const uddg = url.searchParams.get("uddg");
        return uddg ? decodeURIComponent(uddg) : match[1];
      } catch {
        return match[1];
      }
    })
    .filter((url) => /^https?:/i.test(url))
    .filter((url, index, list) => list.indexOf(url) === index)
    .slice(0, 6);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productName = searchParams.get("product")?.trim();

  if (!productName) {
    return NextResponse.json({ error: "Missing product name." }, { status: 400 });
  }

  try {
    const urls = await searchLinks(productName);

    for (const url of urls) {
      try {
        if (url.toLowerCase().includes(".pdf")) {
          const parsed = await parseRemoteTechnicalSheet(url);
          return NextResponse.json({
            result: {
              sourceUrl: url,
              sourceType: "pdf",
              estimated: false,
              disclaimer: null,
              extracted: {
                name: parsed.extracted.name,
                fat_pct: parsed.extracted.fat_pct,
                sugar_pct: parsed.extracted.sugar_pct,
                total_solids_pct: parsed.extracted.total_solids_pct,
                solids_non_fat_pct: parsed.extracted.msnf_pct,
                other_solids_pct: Math.max(
                  parsed.extracted.total_solids_pct -
                    parsed.extracted.fat_pct -
                    parsed.extracted.sugar_pct -
                    parsed.extracted.msnf_pct,
                  0
                ),
                pac_value: parsed.extracted.pac_value,
                pod_value: parsed.extracted.pod_value,
                dosage_guideline: parsed.extracted.dosage_guideline,
                is_cold_process: parsed.extracted.is_cold_process,
                category:
                  parsed.extracted.category === "Chocolate" ||
                  parsed.extracted.category === "Nut" ||
                  parsed.extracted.category === "Other"
                    ? parsed.extracted.category
                    : "Flavor Paste",
              },
            } satisfies FetchedIngredientSpecs,
          });
        }

        const page = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136 Safari/537.36",
          },
          cache: "no-store",
        });

        if (!page.ok) {
          continue;
        }

        const html = await page.text();
        const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const nutrition = parseNutritionLabelText(text);

        if (nutrition.fat > 0 || nutrition.carbohydrates > 0 || nutrition.protein > 0) {
          return NextResponse.json({
            result: {
              sourceUrl: url,
              sourceType: "html",
              estimated: false,
              disclaimer: "Scraped from manufacturer/distributor HTML. Review before committing.",
              extracted: {
                name: productName,
                fat_pct: nutrition.fat,
                sugar_pct: nutrition.carbohydrates,
                total_solids_pct: nutrition.totalSolids,
                solids_non_fat_pct: nutrition.protein,
                other_solids_pct: Math.max(
                  nutrition.totalSolids - nutrition.fat - nutrition.carbohydrates - nutrition.protein,
                  0
                ),
                pac_value: nutrition.carbohydrates,
                pod_value: nutrition.sugars,
                dosage_guideline: null,
                is_cold_process: true,
                category: /chocolate|cocoa/.test(normalize(productName)) ? "Chocolate" : "Flavor Paste",
              },
            } satisfies FetchedIngredientSpecs,
          });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ result: inferAverage(productName) });
  } catch {
    return NextResponse.json({ result: inferAverage(productName) });
  }
}
