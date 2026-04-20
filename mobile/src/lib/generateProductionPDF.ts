import * as Print from "expo-print";
import type { DisplayCaseRecord, EquipmentUnitRecord } from "./equipmentSettings";

type ProductionIngredient = {
  name: string;
  grams: number;
};

type GenerateProductionPDFOptions = {
  recipeName: string;
  createdAt: Date;
  ingredients: ProductionIngredient[];
  specs: {
    pac: number;
    pod: number;
    fat: number;
    solids: number;
  };
  equipment: EquipmentUnitRecord | null;
  displayCase: DisplayCaseRecord | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function generateProductionPDF(options: GenerateProductionPDFOptions) {
  const rows = options.ingredients
    .map(
      (ingredient) => `
        <tr>
          <td>${escapeHtml(ingredient.name)}</td>
          <td class="grams">${ingredient.grams.toFixed(1)} g</td>
        </tr>
      `
    )
    .join("");

  const equipmentLabel = options.equipment
    ? `${options.equipment.brand} ${options.equipment.model}`
    : "Default Batch Freezer";
  const caseLabel = options.displayCase?.name ?? "No case assigned";
  const tempLabel =
    typeof options.displayCase?.target_temp_c === "number"
      ? `${options.displayCase.target_temp_c.toFixed(1)}°C`
      : "--";

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #ffffff;
            color: #111111;
            margin: 32px;
          }
          .eyebrow {
            font-size: 12px;
            letter-spacing: 2px;
            color: #666666;
            margin-bottom: 8px;
          }
          h1 {
            margin: 0 0 6px;
            font-size: 28px;
          }
          .meta {
            font-size: 13px;
            color: #444444;
            margin-bottom: 24px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            padding: 12px 0;
            border-bottom: 1px solid #e2e2e2;
            font-size: 14px;
          }
          th {
            text-align: left;
            font-size: 11px;
            letter-spacing: 1.2px;
            color: #666666;
          }
          .grams {
            text-align: right;
            font-size: 18px;
            font-weight: 700;
          }
          .section-title {
            margin-top: 26px;
            font-size: 11px;
            letter-spacing: 1.8px;
            color: #666666;
          }
          .spec-grid {
            display: table;
            width: 100%;
            margin-top: 10px;
          }
          .spec {
            display: table-cell;
            width: 25%;
            padding-right: 16px;
          }
          .spec-label {
            font-size: 11px;
            letter-spacing: 1.2px;
            color: #666666;
            margin-bottom: 4px;
          }
          .spec-value {
            font-size: 20px;
            font-weight: 700;
          }
          .hardware {
            margin-top: 10px;
            font-size: 14px;
            line-height: 1.8;
          }
        </style>
      </head>
      <body>
        <div class="eyebrow">MIRACOLI PRODUCTION SHEET</div>
        <h1>${escapeHtml(options.recipeName)}</h1>
        <div class="meta">${options.createdAt.toLocaleDateString()} | ${options.createdAt.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}</div>

        <div class="section-title">SECTION 1: THE MIX</div>
        <table>
          <thead>
            <tr>
              <th>Ingredient Name</th>
              <th style="text-align:right;">Scaled Weight</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="section-title">SECTION 2: THE SPECS</div>
        <div class="spec-grid">
          <div class="spec">
            <div class="spec-label">PAC</div>
            <div class="spec-value">${options.specs.pac.toFixed(0)}</div>
          </div>
          <div class="spec">
            <div class="spec-label">POD</div>
            <div class="spec-value">${options.specs.pod.toFixed(1)}</div>
          </div>
          <div class="spec">
            <div class="spec-label">FAT %</div>
            <div class="spec-value">${options.specs.fat.toFixed(1)}%</div>
          </div>
          <div class="spec">
            <div class="spec-label">SOLIDS</div>
            <div class="spec-value">${options.specs.solids.toFixed(1)}%</div>
          </div>
        </div>

        <div class="section-title">SECTION 3: HARDWARE</div>
        <div class="hardware">
          <div>Machine: ${escapeHtml(equipmentLabel)}</div>
          <div>Display In: ${escapeHtml(caseLabel)}</div>
          <div>Set Temp: ${escapeHtml(tempLabel)}</div>
        </div>
      </body>
    </html>
  `;

  await Print.printAsync({
    html,
    orientation: Print.Orientation.portrait,
  });
}
