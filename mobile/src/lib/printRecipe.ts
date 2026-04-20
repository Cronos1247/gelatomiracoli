import * as Print from "expo-print";
import type { LabIngredient, LabMetrics } from "../lab/useRecipeLab";
import type { MobileLanguage } from "../i18n";

type PrintRecipeOptions = {
  title: string;
  ingredients: LabIngredient[];
  metrics: LabMetrics;
  batchLiters: number;
  equipmentLabel: string;
  productionDate: Date;
  language: MobileLanguage;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDateLocale(language: MobileLanguage) {
  if (language === "it") {
    return "it-IT";
  }

  if (language === "es") {
    return "es-ES";
  }

  return "en-US";
}

function getDictionary(language: MobileLanguage) {
  if (language === "it") {
    return {
      productionSheet: "Scheda di Produzione",
      productionDate: "Data Produzione",
      equipment: "Attrezzatura",
      batchSize: "Dimensione Lotto",
      ingredients: "Ingredienti",
      grams: "Grammi",
      physics: "Fisica",
      pac: "PAC",
      pod: "POD",
      solids: "Solidi Totali",
      fat: "Grassi",
      sugar: "Zuccheri",
    };
  }

  if (language === "es") {
    return {
      productionSheet: "Hoja de Produccion",
      productionDate: "Fecha de Produccion",
      equipment: "Equipo",
      batchSize: "Tamano del Lote",
      ingredients: "Ingredientes",
      grams: "Gramos",
      physics: "Fisica",
      pac: "PAC",
      pod: "POD",
      solids: "Solidos Totales",
      fat: "Grasa",
      sugar: "Azucar",
    };
  }

  return {
    productionSheet: "Production Sheet",
    productionDate: "Production Date",
    equipment: "Equipment",
    batchSize: "Batch Size",
    ingredients: "Ingredients",
    grams: "Grams",
    physics: "Physics",
    pac: "PAC",
    pod: "POD",
    solids: "Total Solids",
    fat: "Fat",
    sugar: "Sugar",
  };
}

export async function printRecipe(options: PrintRecipeOptions) {
  const dictionary = getDictionary(options.language);
  const formatter = new Intl.DateTimeFormat(getDateLocale(options.language), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const rows = options.ingredients
    .map(
      (ingredient) => `
        <tr>
          <td>${escapeHtml(ingredient.name)}</td>
          <td style="text-align:right;">${ingredient.grams.toFixed(1)}</td>
          <td style="text-align:right;">${ingredient.locked ? "Locked" : ""}</td>
        </tr>
      `
    )
    .join("");

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
          h1 {
            font-size: 26px;
            margin: 0 0 8px;
          }
          .subhead {
            font-size: 14px;
            margin-bottom: 24px;
            color: #333333;
          }
          .grid {
            display: table;
            width: 100%;
            margin-bottom: 24px;
          }
          .cell {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 16px;
          }
          .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #666666;
            margin-bottom: 6px;
          }
          .value {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            padding: 10px 0;
            border-bottom: 1px solid #d8d8d8;
            font-size: 14px;
          }
          th {
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #555555;
          }
          .metrics {
            margin-top: 24px;
            display: table;
            width: 100%;
          }
          .metric {
            display: table-cell;
            width: 20%;
            padding-right: 12px;
          }
          .metric .value {
            font-size: 20px;
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(options.title)}</h1>
        <div class="subhead">${dictionary.productionSheet}</div>

        <div class="grid">
          <div class="cell">
            <div class="label">${dictionary.productionDate}</div>
            <div class="value">${formatter.format(options.productionDate)}</div>

            <div class="label">${dictionary.equipment}</div>
            <div class="value">${escapeHtml(options.equipmentLabel)}</div>
          </div>

          <div class="cell">
            <div class="label">${dictionary.batchSize}</div>
            <div class="value">${options.batchLiters.toFixed(1)} L</div>
          </div>
        </div>

        <div class="label">${dictionary.ingredients}</div>
        <table>
          <thead>
            <tr>
              <th>${dictionary.ingredients}</th>
              <th style="text-align:right;">${dictionary.grams}</th>
              <th style="text-align:right;">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="label" style="margin-top:24px;">${dictionary.physics}</div>
        <div class="metrics">
          <div class="metric">
            <div class="label">${dictionary.pac}</div>
            <div class="value">${options.metrics.pac.toFixed(0)}</div>
          </div>
          <div class="metric">
            <div class="label">${dictionary.pod}</div>
            <div class="value">${options.metrics.pod.toFixed(1)}</div>
          </div>
          <div class="metric">
            <div class="label">${dictionary.solids}</div>
            <div class="value">${options.metrics.solids.toFixed(1)}%</div>
          </div>
          <div class="metric">
            <div class="label">${dictionary.fat}</div>
            <div class="value">${options.metrics.fat.toFixed(1)}%</div>
          </div>
          <div class="metric">
            <div class="label">${dictionary.sugar}</div>
            <div class="value">${options.metrics.sugar.toFixed(1)}%</div>
          </div>
        </div>
      </body>
    </html>
  `;

  await Print.printAsync({
    html,
    orientation: Print.Orientation.portrait,
  });
}
