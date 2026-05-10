import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Printer, Settings, Plus, Minus, Download } from "lucide-react";
import IngredientAutocomplete from "@/components/IngredientAutocomplete";
import PinDialog from "@/components/PinDialog";
import { useManagerAuth } from "@/lib/manager-auth";
import type { AllergenItem } from "@/lib/ingredient-store";

const MANAGER_PIN = "1234";
const DEFAULT_ROWS = 30;
const MIN_ROWS = 5;
const MAX_ROWS = 50;

// Couleurs principales
const BLUE = "#1f355e";
const BORDER = "#3a5688";

// Dimensions demandées
const SUBHEADER_FONT_SIZE = "14px";
const TABLE_HEADER_HEIGHT = "99px"; // 76px + environ 30%
const MAIN_HEADER_FONT_SIZE = "18px"; // deux fois plus gros que 7px
const ALLERGEN_HEADER_FONT_SIZE = "9pt"; // +50% par rapport à 7.5px

const ALLERGENS = [
  { key: "lait", label: "Lait et lactose" },
  { key: "cereales", label: "Céréales contenant du gluten" },
  { key: "fruits_coque", label: "Fruits à coque" },
  { key: "poisson", label: "Poisson" },
  { key: "mollusques", label: "Mollusques" },
  { key: "crustaces", label: "Crustacés" },
  { key: "celeri", label: "Céleri" },
  { key: "oeufs", label: "Œufs" },
  { key: "moutarde", label: "Moutarde" },
  { key: "sesame", label: "Graines de sésame" },
  { key: "soja", label: "Soja" },
  { key: "sulfites", label: "Anhydride sulfureux et sulfites" },
  { key: "lupin", label: "Lupin" },
  { key: "arachide", label: "Arachide" },
  { key: "aucun", label: "Aucun" },
] as const;

type AllergenKey = (typeof ALLERGENS)[number]["key"];

interface TableRow {
  name: string;
  allergens: Record<AllergenKey, boolean>;
}

function emptyRow(): TableRow {
  return {
    name: "",
    allergens: {
      lait: false,
      cereales: false,
      fruits_coque: false,
      poisson: false,
      mollusques: false,
      crustaces: false,
      celeri: false,
      oeufs: false,
      moutarde: false,
      sesame: false,
      soja: false,
      sulfites: false,
      lupin: false,
      arachide: false,
      aucun: false,
    },
  };
}

function clearRowHeights() {
  (
    document.querySelectorAll(
      "table.allergen-table tbody tr"
    ) as NodeListOf<HTMLTableRowElement>
  ).forEach((tr) => {
    tr.style.height = "";
  });
}

export default function AllergenForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useManagerAuth();

  const [eventType, setEventType] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [numRows, setNumRows] = useState(DEFAULT_ROWS);
  const [rows, setRows] = useState<TableRow[]>(() =>
    Array.from({ length: MAX_ROWS }, emptyRow)
  );
  const [pinOpen, setPinOpen] = useState(false);

  const handleIngredientSelect = useCallback(
    (rowIndex: number, item: AllergenItem | null) => {
      setRows((prev) => {
        const next = [...prev];

        if (!item) {
          next[rowIndex] = {
            ...next[rowIndex],
            allergens: emptyRow().allergens,
          };
        } else {
          const hasAllergen =
            item.lait ||
            item.cereales ||
            item.fruits_coque ||
            item.poisson ||
            item.mollusques ||
            item.crustaces ||
            item.celeri ||
            item.oeufs ||
            item.moutarde ||
            item.sesame ||
            item.soja ||
            item.sulfites ||
            item.lupin ||
            item.arachide;

          next[rowIndex] = {
            name: item.name,
            allergens: {
              lait: item.lait,
              cereales: item.cereales,
              fruits_coque: item.fruits_coque,
              poisson: item.poisson,
              mollusques: item.mollusques,
              crustaces: item.crustaces,
              celeri: item.celeri,
              oeufs: item.oeufs,
              moutarde: item.moutarde,
              sesame: item.sesame,
              soja: item.soja,
              sulfites: item.sulfites,
              lupin: item.lupin,
              arachide: item.arachide,
              aucun: !hasAllergen,
            },
          };
        }

        return next;
      });
    },
    []
  );

  const handleNameChange = useCallback((rowIndex: number, name: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], name };
      return next;
    });
  }, []);

  const clearRow = useCallback((rowIndex: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = emptyRow();
      return next;
    });
  }, []);

  const addRow = () => {
    if (numRows < MAX_ROWS) setNumRows((n) => n + 1);
  };

  const removeRow = () => {
    if (numRows > MIN_ROWS) setNumRows((n) => n - 1);
  };

  // Ajuste automatiquement la hauteur des lignes à l'impression
  useEffect(() => {
    const px = (sel: string) =>
      (document.querySelector(sel) as HTMLElement | null)?.offsetHeight ?? 0;

    const cs = (el: Element | null, p: string) =>
      el
        ? parseFloat(
            (getComputedStyle(el as HTMLElement) as unknown as Record<
              string,
              string
            >)[p] ?? "0"
          )
        : 0;

    const beforePrint = () => {
      const trs = Array.from(
        document.querySelectorAll("table.allergen-table tbody tr")
      ) as HTMLTableRowElement[];

      if (!trs.length) return;

      // Hauteur utile A4 : 297 mm - 2 x 10 mm de marges
      const PAGE_H_PX = Math.round(277 * 3.7795275591);

      const page = document.querySelector(".print-page");
      const header = document.querySelector(".print-header");
      const sub = document.querySelector(".print-subheader");
      const footer = document.querySelector(".print-footer");

      const padV = cs(page, "paddingTop") + cs(page, "paddingBottom");
      const hdrH = px(".print-header") + cs(header, "marginBottom");
      const subH = px(".print-subheader") + cs(sub, "marginBottom");
      const theadH = px("table.allergen-table thead");
      const ftrH = cs(footer, "marginTop") + px(".print-footer");

      const avail = PAGE_H_PX - padV - hdrH - subH - theadH - ftrH;
      const rowH = Math.floor(avail / trs.length);

      trs.forEach((tr) => {
        tr.style.height = `${Math.max(rowH, 10)}px`;
      });
    };

    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", clearRowHeights);

    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", clearRowHeights);
    };
  }, [numRows]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    toast({
      title: "Enregistrer en PDF",
      description:
        "Dans la boîte de dialogue qui s'ouvre, sélectionnez « Enregistrer en PDF » comme destination.",
      duration: 5000,
    });

    setTimeout(() => window.print(), 300);
  };

  const handlePinSuccess = () => {
    login();
    setPinOpen(false);
    setLocation("/admin");
  };

  const hasContent = (row: TableRow) =>
    row.name || Object.values(row.allergens).some(Boolean);

  const formatDate = (d: string) => {
    if (!d) return "";

    try {
      return (
        "Le " +
        new Date(d + "T00:00:00")
          .toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
          .toUpperCase()
      );
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Barre d'outils — masquée à l'impression */}
      <div className="no-print bg-card border-b border-border px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Allergènes Cocktail
          </span>

          <div className="flex items-center gap-1 ml-4">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={removeRow}
              disabled={numRows <= MIN_ROWS}
              title="Supprimer une ligne"
              data-testid="button-remove-row"
            >
              <Minus className="w-3 h-3" />
            </Button>

            <span className="text-xs text-muted-foreground w-16 text-center">
              {numRows} lignes
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={addRow}
              disabled={numRows >= MAX_ROWS}
              title="Ajouter une ligne"
              data-testid="button-add-row"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPinOpen(true)}
            data-testid="button-admin"
          >
            <Settings className="w-4 h-4 mr-1" />
            Base Ingrédients
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            data-testid="button-print"
          >
            <Printer className="w-4 h-4 mr-1" />
            Imprimer
          </Button>

          <Button size="sm" onClick={handleDownloadPDF} data-testid="button-pdf">
            <Download className="w-4 h-4 mr-1" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      {/* Zone imprimable */}
      <div className="print-page p-4">
        {/* Titre principal */}
        <div className="print-header mb-2">
          <h1
            className="font-black uppercase"
            style={{
              color: BLUE,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              fontSize: "3.63rem",
            }}
          >
            ALLERGÈNES
          </h1>
        </div>

        {/* Sous-en-tête : 3 cases */}
        <div
          className="print-subheader print-subheader-grid grid grid-cols-3 mb-5"
          style={{ border: `1px solid ${BORDER}` }}
        >
          {/* Case 1 : type d'événement */}
          <div
            className="px-2 py-1.5 flex items-center justify-center text-center"
            style={{
              borderRight: `1px solid ${BORDER}`,
              minHeight: "34px",
            }}
          >
            <input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="Ex : Dînatoire 16 pièces"
              className="subheader-input w-full bg-transparent font-semibold outline-none placeholder:text-muted-foreground/40"
              style={{
                color: BLUE,
                fontSize: SUBHEADER_FONT_SIZE,
                textAlign: "center",
                lineHeight: 1.1,
              }}
              data-testid="input-event-type"
            />
          </div>

          {/* Case 2 : nom de la salle / événement */}
          <div
            className="px-2 py-1.5 flex items-center justify-center text-center"
            style={{
              borderRight: `1px solid ${BORDER}`,
              minHeight: "34px",
            }}
          >
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Nom du groupe"
              className="subheader-input w-full bg-transparent font-bold outline-none placeholder:text-muted-foreground/40 uppercase"
              style={{
                color: BLUE,
                fontSize: SUBHEADER_FONT_SIZE,
                textAlign: "center",
                lineHeight: 1.1,
              }}
              data-testid="input-event-name"
            />
          </div>

          {/* Case 3 : date */}
          <div
            className="px-2 py-1.5 flex items-center justify-center text-center"
            style={{ minHeight: "34px" }}
          >
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="no-print bg-transparent font-semibold outline-none"
              style={{
                color: BLUE,
                fontSize: SUBHEADER_FONT_SIZE,
                textAlign: "center",
                lineHeight: 1.1,
              }}
              data-testid="input-event-date"
            />

            <span
              data-print-date
              className="hidden print:inline font-semibold"
              style={{
                color: BLUE,
                fontSize: SUBHEADER_FONT_SIZE,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {eventDate ? formatDate(eventDate) : ""}
            </span>
          </div>
        </div>

        {/* Tableau */}
        <div className="allergen-table-wrapper overflow-x-auto">
          <table
            className="w-full border-collapse allergen-table"
            style={{ tableLayout: "fixed", fontSize: "10px" }}
            data-testid="table-allergens"
          >
            <colgroup>
              <col className="col-name" style={{ width: "215px" }} />

              {ALLERGENS.map((a) => (
                <col
                  key={a.key}
                  className="col-allergen"
                  style={{ width: "35px" }}
                />
              ))}

              <col className="no-print" style={{ width: "28px" }} />
            </colgroup>

            <thead>
              <tr style={{ height: TABLE_HEADER_HEIGHT }}>
                {/* En-tête première colonne */}
                <th
                  className="border text-center font-bold align-middle allergen-main-head"
                  style={{
                    backgroundColor: "#dde3ef",
                    color: BLUE,
                    fontSize: MAIN_HEADER_FONT_SIZE,
                    lineHeight: 1.05,
                    padding: "4px 2px",
                    height: TABLE_HEADER_HEIGHT,
                    minHeight: TABLE_HEADER_HEIGHT,
                    verticalAlign: "middle",
                    borderColor: BORDER,
                    fontWeight: 800,
                  }}
                >
                  ALLERGÈNES À<br />
                  DÉCLARATION
                  <br />
                  OBLIGATOIRE
                </th>

                {/* En-têtes colonnes allergènes */}
                {ALLERGENS.map((a, idx) => (
                  <th
                    key={a.key}
                    className="border allergen-vertical-head"
                    style={{
                      backgroundColor: idx % 2 === 0 ? "#dde3ef" : "#ccd4e8",
                      borderColor: BORDER,
                      padding: 0,
                      height: TABLE_HEADER_HEIGHT,
                      minHeight: TABLE_HEADER_HEIGHT,
                    }}
                  >
                    <div
                      className="allergen-header-cell"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        fontSize: "11pt",
                        lineHeight: 1.05,
                        padding: "5px 1px",
                        height: TABLE_HEADER_HEIGHT,
                        minHeight: TABLE_HEADER_HEIGHT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "normal",
                        color: BLUE,
                        textAlign: "center",
                        wordBreak: "break-word",
                        width: "100%",
                        overflow: "hidden",
                        fontWeight: 700,
                      }}
                    >
                      {a.label}
                    </div>
                  </th>
                ))}

                <th
                  className="border no-print"
                  style={{
                    borderColor: BORDER,
                    backgroundColor: "#dde3ef",
                  }}
                />
              </tr>
            </thead>

            <tbody>
              {rows.slice(0, numRows).map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-[#eef0f6]"}
                  data-testid={`row-ingredient-${i}`}
                >
                  <td
                    className="border py-0 px-0"
                    style={{ borderColor: "#8aa0c8" }}
                  >
                    <IngredientAutocomplete
                      value={row.name}
                      onSelect={(item) => handleIngredientSelect(i, item)}
                      onChange={(name) => handleNameChange(i, name)}
                      rowIndex={i}
                    />
                  </td>

                  {ALLERGENS.map((a) => (
                    <td
                      key={a.key}
                      className="border text-center py-0"
                      style={{ borderColor: "#8aa0c8" }}
                    >
                      {row.allergens[a.key] ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: BLUE,
                            fontSize: "10px",
                          }}
                        >
                          X
                        </span>
                      ) : null}
                    </td>
                  ))}

                  <td
                    className="border text-center py-0.5 no-print"
                    style={{ borderColor: "#8aa0c8" }}
                  >
                    {hasContent(row) ? (
                      <button
                        onClick={() => clearRow(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
                        data-testid={`button-clear-${i}`}
                        title="Effacer la ligne"
                      >
                        ×
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pied de page */}
        <div
          className="print-footer mt-2 pt-1 border-t"
          style={{
            borderColor: BORDER,
            fontSize: "6.5px",
            color: "#4a6a9a",
          }}
        >
          <p className="font-semibold">X : Présence de l'allergène</p>
          <p>
            *Anhydride sulfureux et sulfites en concentration supérieure à 10
            mg/kg ou 10 mg/litre exprimés en SO₂.
          </p>
          <p>
            Listing établi à partir des informations communiquées par nos
            fournisseurs et selon nos recettes. Cette information ne tient pas
            compte des contaminations croisées pouvant avoir lieu chez les
            fournisseurs et dans nos établissements.
          </p>
        </div>
      </div>

      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={handlePinSuccess}
        pin={MANAGER_PIN}
      />
    </div>
  );
}
