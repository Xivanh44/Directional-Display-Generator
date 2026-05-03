import xlsx from "xlsx";
import * as path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = path.resolve(__dirname, "../../attached_assets/UMR_18_PCE_30_04_2026_1777811140213.xlsx");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const client = new pg.Client({ connectionString: DATABASE_URL });

type AllergenRow = {
  name: string;
  lait: boolean;
  cereales: boolean;
  fruits_coque: boolean;
  poisson: boolean;
  mollusques: boolean;
  crustaces: boolean;
  celeri: boolean;
  oeufs: boolean;
  moutarde: boolean;
  sesame: boolean;
  soja: boolean;
  sulfites: boolean;
  lupin: boolean;
  arachide: boolean;
};

function parseAllergenSheet(): AllergenRow[] {
  const workbook = xlsx.readFile(XLSX_PATH);
  const sheet2Name = workbook.SheetNames[1];
  const sheet = workbook.Sheets[sheet2Name];

  const rows: AllergenRow[] = [];
  const range = xlsx.utils.decode_range(sheet["!ref"] ?? "A1:Q1");

  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const getCell = (col: number): string => {
      const addr = xlsx.utils.encode_cell({ r, c: col });
      const cell = sheet[addr];
      return cell ? String(cell.v ?? "").trim() : "";
    };

    const name = getCell(1); // Column B (0-indexed: 1)
    if (!name) continue;

    const isX = (col: number) => getCell(col).toUpperCase() === "X";

    // Columns C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16
    rows.push({
      name,
      lait: isX(2),       // C - Lait et lactose
      cereales: isX(3),   // D - Céréales
      fruits_coque: isX(4), // E - Fruits à coque
      poisson: isX(5),    // F - Poisson
      mollusques: isX(6), // G - Mollusques
      crustaces: isX(7),  // H - Crustacés
      celeri: isX(8),     // I - Céleri
      oeufs: isX(9),      // J - Œufs
      moutarde: isX(10),  // K - Moutarde
      sesame: isX(11),    // L - Graine de sésame
      soja: isX(12),      // M - Soja
      sulfites: isX(13),  // N - Anhydride sulfureux / Sulfites
      lupin: isX(14),     // O - Lupin
      arachide: isX(15),  // P - Arachide
    });
  }

  return rows;
}

async function main() {
  await client.connect();
  console.log("Connected to database");

  const existing = await client.query("SELECT COUNT(*) FROM allergen_items");
  if (parseInt(existing.rows[0].count) > 0) {
    console.log(`Allergen items already seeded (${existing.rows[0].count} items). Skipping.`);
    await client.end();
    return;
  }

  const rows = parseAllergenSheet();
  console.log(`Parsed ${rows.length} items from Excel sheet`);

  let inserted = 0;
  for (const row of rows) {
    await client.query(
      `INSERT INTO allergen_items
        (name, lait, cereales, fruits_coque, poisson, mollusques, crustaces, celeri, oeufs, moutarde, sesame, soja, sulfites, lupin, arachide)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT DO NOTHING`,
      [
        row.name,
        row.lait, row.cereales, row.fruits_coque, row.poisson,
        row.mollusques, row.crustaces, row.celeri, row.oeufs,
        row.moutarde, row.sesame, row.soja, row.sulfites,
        row.lupin, row.arachide,
      ]
    );
    inserted++;
  }

  console.log(`Inserted ${inserted} allergen items`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
