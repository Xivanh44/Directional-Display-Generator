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

// A4 @ 96 dpi — zones utiles après marges @page (10 mm haut/bas, 12 mm côtés)
const A4_H_PX  = 1123;
const A4_W_PX  = 794;
const MARGIN_H = Math.round(10 * 3.7795); // ≈ 38 px
const MARGIN_V = Math.round(12 * 3.7795); // ≈ 45 px
const INNER_W  = A4_W_PX - MARGIN_V * 2;  // ≈ 704 px
const INNER_H  = A4_H_PX - MARGIN_H * 2;  // ≈ 1047 px

// Couleur principale
const BLUE   = "#1f355e";
const BORDER = "#3a5688";

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

function clearRowHeights() {
  (document.querySelectorAll("table.allergen-table tbody tr") as NodeListOf<HTMLTableRowElement>)
    .forEach((tr) => { tr.style.height = ""; });
}

/** Répartit la hauteur des lignes tbody pour remplir exactement innerH pixels. */
function applyRowHeightsPx(innerH: number) {
  const table = document.querySelector("table.allergen-table") as HTMLTableElement | null;
  if (!table) return;
  const trs = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
  if (!trs.length) return;
  const theadH  = (table.querySelector("thead")?.getBoundingClientRect().height) ?? 0;
  const footerH = (document.querySelector(".print-footer") as HTMLElement | null)?.getBoundingClientRect().height ?? 0;
  const headerH = (document.querySelector(".print-header") as HTMLElement | null)?.getBoundingClientRect().height ?? 0;
  const subH    = (document.querySelector(".print-subheader") as HTMLElement | null)?.getBoundingClientRect().height ?? 0;
  const PAD = 16; // padding .print-page (top + bottom) en px
  const avail = innerH - headerH - subH - theadH - footerH - PAD * 2 - 8;
  const rowH  = Math.floor(avail / trs.length);
  trs.forEach((tr) => { tr.style.height = `${Math.max(rowH, 6)}px`; });
}

export default function AllergenForm() {
  const [, setLocation] = useLocation();
  const { toast }    = useToast();
  const { login }    = useManagerAuth();
  const [eventType,  setEventType]  = useState("");
  const [eventName,  setEventName]  = useState("");
  const [eventDate,  setEventDate]  = useState("");
  const [numRows,    setNumRows]    = useState(DEFAULT_ROWS);
  const [rows,       setRows]       = useState<TableRow[]>(() => Array.from({ length: MAX_ROWS }, emptyRow));
  const [pinOpen,    setPinOpen]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleIngredientSelect = useCallback((rowIndex: number, item: AllergenItem | null) => {
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
            lait: item.lait, cereales: item.cereales, fruits_coque: item.fruits_coque,
            poisson: item.poisson, mollusques: item.mollusques, crustaces: item.crustaces,
            celeri: item.celeri, oeufs: item.oeufs, moutarde: item.moutarde,
            sesame: item.sesame, soja: item.soja, sulfites: item.sulfites,
            lupin: item.lupin, arachide: item.arachide, aucun: !hasAllergen,
          },
        };
      }
      return next;
    });
  }, []);

  const handleNameChange = useCallback((rowIndex: number, name: string) => {
    setRows((prev) => { const n = [...prev]; n[rowIndex] = { ...n[rowIndex], name }; return n; });
  }, []);

  const clearRow = useCallback((rowIndex: number) => {
    setRows((prev) => { const n = [...prev]; n[rowIndex] = emptyRow(); return n; });
  }, []);

  const addRow    = () => { if (numRows < MAX_ROWS) setNumRows((n) => n + 1); };
  const removeRow = () => { if (numRows > MIN_ROWS) setNumRows((n) => n - 1); };

  // Ajustement des hauteurs de lignes pour l'impression navigateur
  useEffect(() => {
    const MM_TO_PX  = 3.7795275591;
    const PAGE_H_MM = 277;  // 297 mm − 10 mm × 2 de marges @page
    const FIXED_MM  = 55;   // titre + sous-en-tête + thead + pied + padding
    const rowH_px   = (mm: number) => Math.floor(mm * MM_TO_PX);

    const beforePrint = () => {
      const table = document.querySelector("table.allergen-table") as HTMLTableElement | null;
      if (!table) return;
      const trs = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
      if (!trs.length) return;
      const h = rowH_px((PAGE_H_MM - FIXED_MM) / trs.length);
      trs.forEach((tr) => { tr.style.height = `${h}px`; });
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint",  clearRowHeights);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint",  clearRowHeights);
    };
  }, [numRows]);

  const handlePrint = () => window.print();

  /** Génère un PDF A4 téléchargeable. */
  const handleDownloadPDF = async () => {
    const el = printRef.current;
    if (!el || pdfLoading) return;
    setPdfLoading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // 1. Supprimer le focus (évite les effets de sélection)
      (document.activeElement as HTMLElement | null)?.blur();

      // 2. Masquer .no-print
      const noPrint = el.querySelectorAll<HTMLElement>(".no-print");
      noPrint.forEach((e) => { e.style.display = "none"; });

      // 3. Afficher la date formatée, cacher l'input date
      const dateSpan  = el.querySelector<HTMLElement>("[data-print-date]");
      const dateInput = el.querySelector<HTMLInputElement>("input[type='date']");
      if (dateSpan)  dateSpan.style.display  = "inline";
      if (dateInput) dateInput.style.display = "none";

      // 4. Effacer tous les placeholders (évite les "points parasites")
      const allInputs = Array.from(el.querySelectorAll<HTMLInputElement>("input"));
      const savedPH   = allInputs.map((inp) => inp.placeholder);
      allInputs.forEach((inp) => { inp.placeholder = ""; });

      // 5. Appliquer les dimensions A4 sur le conteneur
      const prevStyle = el.getAttribute("style") ?? "";
      Object.assign(el.style, {
        width:        `${INNER_W}px`,
        height:       `${INNER_H}px`,
        padding:      "8px",
        border:       `1px solid ${BORDER}`,
        display:      "flex",
        flexDirection:"column",
        boxSizing:    "border-box",
        background:   "white",
        overflow:     "hidden",
      });

      // 6. Répartir les hauteurs de lignes
      applyRowHeightsPx(INNER_H);
      await new Promise((r) => setTimeout(r, 160));

      // 7. Capturer
      const canvas = await html2canvas(el, {
        scale:        2,
        useCORS:      true,
        backgroundColor: "#ffffff",
        width:        INNER_W,
        height:       INNER_H,
        windowWidth:  INNER_W,
        windowHeight: INNER_H,
      });

      // 8. Restaurer tout
      el.setAttribute("style", prevStyle);
      clearRowHeights();
      noPrint.forEach((e) => { e.style.display = ""; });
      if (dateSpan)  dateSpan.style.display  = "";
      if (dateInput) dateInput.style.display = "";
      allInputs.forEach((inp, i) => { inp.placeholder = savedPH[i]; });

      // 9. Créer et télécharger le PDF
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 12, 10, 186, 277);
      pdf.save("allergenes.pdf");

    } catch (err) {
      console.error(err);
      toast({ title: "Erreur PDF", description: "Impossible de générer le PDF.", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePinSuccess = () => { login(); setPinOpen(false); setLocation("/admin"); };
  const hasContent = (row: TableRow) => row.name || Object.values(row.allergens).some(Boolean);

  const formatDate = (d: string) => {
    if (!d) return "";
    try {
      return "Le " + new Date(d + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit", month: "long", year: "numeric",
      }).toUpperCase();
    } catch { return d; }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Barre d'outils (masquée à l'impression) ── */}
      <div className="no-print bg-card border-b border-border px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Allergènes Cocktail</span>
          <div className="flex items-center gap-1 ml-4">
            <Button variant="outline" size="icon" className="h-7 w-7"
              onClick={removeRow} disabled={numRows <= MIN_ROWS}
              title="Supprimer une ligne" data-testid="button-remove-row">
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground w-16 text-center">{numRows} lignes</span>
            <Button variant="outline" size="icon" className="h-7 w-7"
              onClick={addRow} disabled={numRows >= MAX_ROWS}
              title="Ajouter une ligne" data-testid="button-add-row">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPinOpen(true)} data-testid="button-admin">
            <Settings className="w-4 h-4 mr-1" /> Base Ingrédients
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
            <Printer className="w-4 h-4 mr-1" /> Imprimer
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} disabled={pdfLoading} data-testid="button-pdf">
            <Download className="w-4 h-4 mr-1" />
            {pdfLoading ? "Génération…" : "Télécharger PDF"}
          </Button>
        </div>
      </div>

      {/* ── Zone imprimable ── */}
      <div ref={printRef} className="print-page p-4">

        {/* Titre principal */}
        <div className="print-header mb-2">
          <h1 className="font-black uppercase"
            style={{ color: BLUE, letterSpacing: "-0.01em", lineHeight: 1, fontSize: "2.5rem" }}>
            ALLERGÈNES
          </h1>
        </div>

        {/* Sous-en-tête : 3 cases */}
        <div className="print-subheader print-subheader-grid grid grid-cols-3 mb-3"
          style={{ border: `1px solid ${BORDER}` }}>

          {/* Case 1 : type d'événement */}
          <div className="px-2 py-1.5" style={{ borderRight: `1px solid ${BORDER}` }}>
            <input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="Ex : Dînatoire 16 pièces"
              className="subheader-input w-full bg-transparent font-semibold outline-none
                         placeholder:text-muted-foreground/40 text-sm"
              style={{ color: BLUE }}
              data-testid="input-event-type"
            />
          </div>

          {/* Case 2 : nom de la salle / événement */}
          <div className="px-2 py-1.5 text-center" style={{ borderRight: `1px solid ${BORDER}` }}>
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Nom de la salle"
              className="subheader-input w-full bg-transparent font-bold outline-none
                         placeholder:text-muted-foreground/40 text-sm text-center uppercase"
              style={{ color: BLUE }}
              data-testid="input-event-name"
            />
          </div>

          {/* Case 3 : date */}
          <div className="px-2 py-1.5 text-right">
            {/* Sélecteur de date — visible uniquement à l'écran */}
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="no-print bg-transparent font-semibold outline-none text-sm"
              style={{ color: BLUE }}
              data-testid="input-event-date"
            />
            {/* Texte formaté — visible uniquement à l'impression / PDF */}
            <span
              data-print-date
              className="hidden print:inline font-semibold text-sm"
              style={{ color: BLUE }}
            >
              {eventDate ? formatDate(eventDate) : ""}
            </span>
          </div>
        </div>

        {/* ── Tableau ── */}
        <div className="allergen-table-wrapper overflow-x-auto">
          <table
            className="w-full border-collapse allergen-table"
            style={{ tableLayout: "fixed", fontSize: "10px" }}
            data-testid="table-allergens"
          >
            <colgroup>
              <col className="col-name"    style={{ width: "178px" }} />
              {ALLERGENS.map((a) => (
                <col key={a.key} className="col-allergen" style={{ width: "42px" }} />
              ))}
              <col className="no-print"   style={{ width: "28px" }} />
            </colgroup>

            <thead>
              <tr>
                {/* En-tête première colonne */}
                <th className="border text-center font-bold align-middle"
                  style={{
                    backgroundColor: "#dde3ef",
                    color:           BLUE,
                    fontSize:        "7px",
                    lineHeight:      1.35,
                    padding:         "3px 2px",
                    verticalAlign:   "middle",
                    borderColor:     BORDER,
                  }}>
                  ALLERGÈNES À<br />DÉCLARATION<br />OBLIGATOIRE
                </th>

                {/* En-têtes colonnes allergènes */}
                {ALLERGENS.map((a, idx) => (
                  <th key={a.key} className="border"
                    style={{
                      backgroundColor: idx % 2 === 0 ? "#dde3ef" : "#ccd4e8",
                      borderColor:     BORDER,
                      padding:         0,
                    }}>
                    <div className="allergen-header-cell"
                      style={{
                        writingMode:    "vertical-rl",
                        transform:      "rotate(180deg)",
                        fontSize:       "7.5px",
                        lineHeight:     1.2,
                        padding:        "4px 1px",
                        height:         "76px",
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        whiteSpace:     "normal",
                        color:          BLUE,
                        textAlign:      "center",
                        wordBreak:      "break-word",
                        width:          "100%",
                        overflow:       "hidden",
                        fontWeight:     "600",
                      }}>
                      {a.label}
                    </div>
                  </th>
                ))}

                <th className="border no-print"
                  style={{ borderColor: BORDER, backgroundColor: "#dde3ef" }} />
              </tr>
            </thead>

            <tbody>
              {rows.slice(0, numRows).map((row, i) => (
                <tr key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-[#eef0f6]"}
                  data-testid={`row-ingredient-${i}`}>

                  <td className="border py-0 px-0" style={{ borderColor: "#8aa0c8" }}>
                    <IngredientAutocomplete
                      value={row.name}
                      onSelect={(item) => handleIngredientSelect(i, item)}
                      onChange={(name) => handleNameChange(i, name)}
                      rowIndex={i}
                    />
                  </td>

                  {ALLERGENS.map((a) => (
                    <td key={a.key}
                      className="border text-center py-0"
                      style={{ borderColor: "#8aa0c8" }}>
                      {row.allergens[a.key]
                        ? <span style={{ fontWeight: 700, color: BLUE, fontSize: "10px" }}>X</span>
                        : null}
                    </td>
                  ))}

                  <td className="border text-center py-0.5 no-print" style={{ borderColor: "#8aa0c8" }}>
                    {hasContent(row) ? (
                      <button onClick={() => clearRow(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
                        data-testid={`button-clear-${i}`} title="Effacer la ligne">
                        ×
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pied de page ── */}
        <div className="print-footer mt-2 pt-1 border-t"
          style={{ borderColor: BORDER, fontSize: "6.5px", color: "#4a6a9a" }}>
          <p className="font-semibold">X : Présence de l'allergène</p>
          <p>*Anhydride sulfureux et sulfites en concentration supérieure à 10 mg/kg ou 10 mg/litre exprimés en SO₂.</p>
          <p>Listing établi à partir des informations communiquées par nos fournisseurs et selon nos recettes.
             Cette information ne tient pas compte des contaminations croisées pouvant avoir lieu chez les fournisseurs et dans nos établissements.</p>
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
