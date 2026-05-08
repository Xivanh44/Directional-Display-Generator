import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Printer, Settings, Plus, Minus, Download } from "lucide-react";
import IngredientAutocomplete from "@/components/IngredientAutocomplete";
import PinDialog from "@/components/PinDialog";
import { useManagerAuth } from "@/lib/manager-auth";
import type { AllergenItem } from "@workspace/api-client-react";

const MANAGER_PIN = "1234";
const DEFAULT_ROWS = 30;
const MIN_ROWS = 5;
const MAX_ROWS = 50;

// A4 à 96 dpi
const A4_W_PX = 794;
const A4_H_PX = 1123;
// Marges @page (10mm haut/bas, 12mm côtés) en px
const MARGIN_H_PX = Math.round(10 * 3.7795);
const MARGIN_V_PX = Math.round(12 * 3.7795);
// Zone utile à l'intérieur des marges
const INNER_W_PX = A4_W_PX - MARGIN_V_PX * 2;
const INNER_H_PX = A4_H_PX - MARGIN_H_PX * 2;

const ALLERGENS = [
  { key: "lait",         label: "Lait et lactose" },
  { key: "cereales",     label: "Céréales contenant du gluten" },
  { key: "fruits_coque", label: "Fruits à coque" },
  { key: "poisson",      label: "Poisson" },
  { key: "mollusques",   label: "Mollusques" },
  { key: "crustaces",    label: "Crustacés" },
  { key: "celeri",       label: "Céleri" },
  { key: "oeufs",        label: "Œufs" },
  { key: "moutarde",     label: "Moutarde" },
  { key: "sesame",       label: "Graines de sésame" },
  { key: "soja",         label: "Soja" },
  { key: "sulfites",     label: "Anhydride sulfureux et sulfites" },
  { key: "lupin",        label: "Lupin" },
  { key: "arachide",     label: "Arachide" },
  { key: "aucun",        label: "Aucun" },
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
      lait: false, cereales: false, fruits_coque: false, poisson: false,
      mollusques: false, crustaces: false, celeri: false, oeufs: false,
      moutarde: false, sesame: false, soja: false, sulfites: false,
      lupin: false, arachide: false, aucun: false,
    },
  };
}

/** Calcule et applique la hauteur uniforme des lignes tbody pour tenir sur une page. */
function applyRowHeights(innerHPx: number) {
  const table = document.querySelector("table.allergen-table") as HTMLTableElement | null;
  if (!table) return;
  const trs = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
  if (trs.length === 0) return;

  const thead = table.querySelector("thead");
  const theadH = thead ? thead.getBoundingClientRect().height : 0;
  const footer = document.querySelector(".print-footer") as HTMLElement | null;
  const footerH = footer ? footer.getBoundingClientRect().height : 0;
  const header = document.querySelector(".print-header") as HTMLElement | null;
  const headerH = header ? header.getBoundingClientRect().height : 0;
  const subheader = document.querySelector(".print-subheader") as HTMLElement | null;
  const subH = subheader ? subheader.getBoundingClientRect().height : 0;

  // padding .print-page (6pt top+bottom ≈ 16px each side)
  const PAD = 16;
  const avail = innerHPx - headerH - subH - theadH - footerH - PAD * 2 - 12;
  const rowH = Math.floor(avail / trs.length);
  trs.forEach((tr) => { tr.style.height = `${Math.max(rowH, 8)}px`; });
}

function clearRowHeights() {
  const trs = document.querySelectorAll(
    "table.allergen-table tbody tr"
  ) as NodeListOf<HTMLTableRowElement>;
  trs.forEach((tr) => { tr.style.height = ""; });
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleIngredientSelect = useCallback(
    (rowIndex: number, item: AllergenItem | null) => {
      setRows((prev) => {
        const next = [...prev];
        if (!item) {
          next[rowIndex] = { ...next[rowIndex], allergens: emptyRow().allergens };
        } else {
          const hasAllergen =
            item.lait || item.cereales || item.fruits_coque || item.poisson ||
            item.mollusques || item.crustaces || item.celeri || item.oeufs ||
            item.moutarde || item.sesame || item.soja || item.sulfites ||
            item.lupin || item.arachide;
          next[rowIndex] = {
            name: item.name,
            allergens: {
              lait: item.lait, cereales: item.cereales,
              fruits_coque: item.fruits_coque, poisson: item.poisson,
              mollusques: item.mollusques, crustaces: item.crustaces,
              celeri: item.celeri, oeufs: item.oeufs,
              moutarde: item.moutarde, sesame: item.sesame,
              soja: item.soja, sulfites: item.sulfites,
              lupin: item.lupin, arachide: item.arachide,
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

  const addRow = () => { if (numRows < MAX_ROWS) setNumRows((n) => n + 1); };
  const removeRow = () => { if (numRows > MIN_ROWS) setNumRows((n) => n - 1); };

  // Hook impression navigateur
  useEffect(() => {
    const MM_TO_PX = 3.7795275591;
    const PAGE_H_MM = 277; // 297 - 10 - 10
    const FIXED_MM = 52;
    const availMM = PAGE_H_MM - FIXED_MM;

    const handleBeforePrint = () => {
      const table = document.querySelector("table.allergen-table") as HTMLTableElement | null;
      if (!table) return;
      const trs = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
      if (trs.length === 0) return;
      const rowH = Math.floor((availMM / trs.length) * MM_TO_PX);
      trs.forEach((tr) => { tr.style.height = `${rowH}px`; });
    };
    const handleAfterPrint = () => clearRowHeights();

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint",  handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint",  handleAfterPrint);
    };
  }, [numRows]);

  const handlePrint = () => { window.print(); };

  /** Génère un PDF A4 directement téléchargeable */
  const handleDownloadPDF = async () => {
    const el = printRef.current;
    if (!el) return;
    setPdfLoading(true);

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // 1. Masquer les éléments no-print
      const noPrintEls = el.querySelectorAll<HTMLElement>(".no-print");
      noPrintEls.forEach((e) => { e.style.display = "none"; });

      // 2. Forcer les dimensions A4 sur le conteneur
      const prevStyle = el.getAttribute("style") ?? "";
      el.style.cssText = [
        prevStyle,
        `width:${INNER_W_PX}px !important`,
        `height:${INNER_H_PX}px !important`,
        `padding:8px !important`,
        `border:1px solid #8890aa !important`,
        `display:flex !important`,
        `flex-direction:column !important`,
        `box-sizing:border-box !important`,
        `background:white !important`,
      ].join(";");

      // 3. Ajuster hauteur des lignes
      applyRowHeights(INNER_H_PX);

      // Petit délai pour laisser le layout se stabiliser
      await new Promise((r) => setTimeout(r, 120));

      // 4. Capturer
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: INNER_W_PX,
        height: INNER_H_PX,
        windowWidth: INNER_W_PX,
        windowHeight: INNER_H_PX,
      });

      // 5. Restaurer
      el.setAttribute("style", prevStyle);
      clearRowHeights();
      noPrintEls.forEach((e) => { e.style.display = ""; });

      // 6. Créer le PDF A4 et télécharger
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgData = canvas.toDataURL("image/jpeg", 0.97);
      // Centrer le contenu dans les marges
      pdf.addImage(imgData, "JPEG", 12, 10, 186, 277);
      pdf.save("allergenes.pdf");
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur PDF", description: "Impossible de générer le PDF.", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
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
      return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit", month: "long", year: "numeric",
      }).toUpperCase();
    } catch { return d; }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Toolbar — masquée à l'impression */}
      <div className="no-print bg-card border-b border-border px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Allergènes Cocktail</span>
          <div className="flex items-center gap-1 ml-4">
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              onClick={removeRow} disabled={numRows <= MIN_ROWS}
              title="Supprimer une ligne" data-testid="button-remove-row"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground w-16 text-center">
              {numRows} lignes
            </span>
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              onClick={addRow} disabled={numRows >= MAX_ROWS}
              title="Ajouter une ligne" data-testid="button-add-row"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setPinOpen(true)} data-testid="button-admin"
          >
            <Settings className="w-4 h-4 mr-1" />
            Base Ingrédients
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={handlePrint} data-testid="button-print"
          >
            <Printer className="w-4 h-4 mr-1" />
            Imprimer
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            data-testid="button-pdf"
          >
            <Download className="w-4 h-4 mr-1" />
            {pdfLoading ? "Génération…" : "Télécharger PDF"}
          </Button>
        </div>
      </div>

      {/* ── Zone imprimable ── */}
      <div ref={printRef} className="print-page p-4">

        {/* En-tête */}
        <div className="print-header mb-1">
          <h1
            className="font-black uppercase"
            style={{ color: "#4a4e6a", letterSpacing: "-0.01em", lineHeight: 1, fontSize: "2.5rem" }}
          >
            ALLERGÈNES
          </h1>
          <p className="print-subtitle text-xs mt-0.5" style={{ color: "#7076a0" }}>
            Allergènes à déclaration obligatoire — Règlement UE 1169/2011
          </p>
        </div>

        {/* Sous-en-tête : 3 champs */}
        <div
          className="print-subheader print-subheader-grid grid grid-cols-3 mb-3"
          style={{ border: "1px solid #9096b0" }}
        >
          <div className="px-2 py-1" style={{ borderRight: "1px solid #9096b0" }}>
            <div className="subheader-label text-[9px] uppercase tracking-wide mb-0.5" style={{ color: "#7076a0" }}>Type d'événement</div>
            <input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="Ex : Dînatoire 16 pièces"
              className="subheader-input w-full bg-transparent font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 text-sm"
              data-testid="input-event-type"
            />
          </div>
          <div className="px-2 py-1 text-center" style={{ borderRight: "1px solid #9096b0" }}>
            <div className="subheader-label text-[9px] uppercase tracking-wide mb-0.5" style={{ color: "#7076a0" }}>Salle / Événement</div>
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Nom de la salle"
              className="subheader-input w-full bg-transparent font-bold text-foreground outline-none placeholder:text-muted-foreground/50 text-sm text-center uppercase"
              data-testid="input-event-name"
            />
          </div>
          <div className="px-2 py-1 text-right">
            <div className="subheader-label text-[9px] uppercase tracking-wide mb-0.5" style={{ color: "#7076a0" }}>Date</div>
            <span className="font-semibold text-foreground text-sm no-print">
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="subheader-input bg-transparent font-semibold text-foreground outline-none text-sm"
                data-testid="input-event-date"
              />
            </span>
            <span className="hidden print:block font-semibold text-sm">
              {eventDate ? formatDate(eventDate) : ""}
            </span>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto allergen-table-wrapper">
          <table
            className="w-full border-collapse allergen-table"
            style={{ tableLayout: "fixed", fontSize: "10px" }}
            data-testid="table-allergens"
          >
            <colgroup>
              <col className="col-name" style={{ width: "180px" }} />
              {ALLERGENS.map((a) => (
                <col key={a.key} className="col-allergen" style={{ width: "44px" }} />
              ))}
              <col style={{ width: "28px" }} className="no-print" />
            </colgroup>

            <thead>
              <tr>
                <th
                  className="border text-center font-bold align-middle px-1 py-1"
                  style={{
                    backgroundColor: "#e4e6ef",
                    color: "#2e3148",
                    fontSize: "7.5px",
                    lineHeight: 1.3,
                    verticalAlign: "middle",
                    borderColor: "#9096b0",
                  }}
                >
                  ALLERGÈNES À<br />DÉCLARATION<br />OBLIGATOIRE
                </th>
                {ALLERGENS.map((a, idx) => (
                  <th
                    key={a.key}
                    className="border text-center py-0 font-semibold"
                    style={{
                      backgroundColor: idx % 2 === 0 ? "#d8dae6" : "#e4e6ef",
                      borderColor: "#9096b0",
                      padding: 0,
                    }}
                  >
                    <div
                      className="allergen-header-cell"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        fontSize: "8px",
                        lineHeight: 1.15,
                        padding: "4px 2px",
                        height: "76px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "normal",
                        color: "#2e3148",
                        textAlign: "center",
                        wordBreak: "break-word",
                        width: "100%",
                      }}
                    >
                      {a.label}
                    </div>
                  </th>
                ))}
                <th
                  className="border no-print"
                  style={{ backgroundColor: "#e4e6ef", borderColor: "#9096b0" }}
                />
              </tr>
            </thead>

            <tbody>
              {rows.slice(0, numRows).map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-[#f1f2f6]"}
                  data-testid={`row-ingredient-${i}`}
                >
                  <td className="border py-0 px-0" style={{ borderColor: "#b8bcd0" }}>
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
                      className="border text-center font-bold py-0.5"
                      style={{ fontSize: "11px", borderColor: "#b8bcd0" }}
                    >
                      {row.allergens[a.key] ? (
                        <span className="font-bold" style={{ color: "#2e3148" }}>✕</span>
                      ) : null}
                    </td>
                  ))}
                  <td className="border text-center py-0.5 no-print" style={{ borderColor: "#b8bcd0" }}>
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
          style={{ fontSize: "6.5px", color: "#606478", borderColor: "#9096b0" }}
        >
          <p className="font-semibold">✕ : Présence de l'allergène</p>
          <p>
            *Anhydride sulfureux et sulfites en concentration supérieure à 10 mg/kg ou 10 mg/litre exprimés en SO₂.
          </p>
          <p>
            Listing établi à partir des informations communiquées par nos fournisseurs et selon nos recettes.
            Cette information ne tient pas compte des contaminations croisées pouvant avoir lieu chez les fournisseurs et dans nos établissements.
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
