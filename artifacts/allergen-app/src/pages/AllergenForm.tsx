import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Printer, Settings, Plus, Minus } from "lucide-react";
import IngredientAutocomplete from "@/components/IngredientAutocomplete";
import PinDialog from "@/components/PinDialog";
import { useManagerAuth } from "@/lib/manager-auth";
import type { AllergenItem } from "@workspace/api-client-react";

const MANAGER_PIN = "1234";
const DEFAULT_ROWS = 18;
const MIN_ROWS = 5;
const MAX_ROWS = 50;

const ALLERGENS = [
  { key: "lait", label: "Lait et lactose" },
  { key: "cereales", label: "Céréales (gluten)" },
  { key: "fruits_coque", label: "Fruits à coque" },
  { key: "poisson", label: "Poisson" },
  { key: "mollusques", label: "Mollusques" },
  { key: "crustaces", label: "Crustacés" },
  { key: "celeri", label: "Céleri" },
  { key: "oeufs", label: "Œufs" },
  { key: "moutarde", label: "Moutarde" },
  { key: "sesame", label: "Sésame" },
  { key: "soja", label: "Soja" },
  { key: "sulfites", label: "Sulfites*" },
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

export default function AllergenForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useManagerAuth();
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [numRows, setNumRows] = useState(DEFAULT_ROWS);
  const [rows, setRows] = useState<TableRow[]>(() =>
    Array.from({ length: DEFAULT_ROWS }, emptyRow)
  );
  const [pinOpen, setPinOpen] = useState(false);
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
    if (numRows >= MAX_ROWS) return;
    setNumRows((n) => n + 1);
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = () => {
    if (numRows <= MIN_ROWS) return;
    setNumRows((n) => n - 1);
    setRows((prev) => prev.slice(0, -1));
  };

  const handlePrint = () => {
    window.print();
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
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar - hidden on print */}
      <div className="no-print bg-card border-b border-border px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Allergènes Cocktail</span>
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
          <Button size="sm" onClick={handlePrint} data-testid="button-print">
            <Printer className="w-4 h-4 mr-1" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Main printable area */}
      <div ref={printRef} className="print-page p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold uppercase tracking-wide text-foreground">
              ALLERGÈNES À DÉCLARATION OBLIGATOIRE
            </h1>
            {/* Event info - screen */}
            <div className="mt-2 flex items-center justify-center gap-6 no-print">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Événement :
                </label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Nom de l'événement"
                  className="w-48 h-7 text-sm"
                  data-testid="input-event-name"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Date :</label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-36 h-7 text-sm"
                  data-testid="input-event-date"
                />
              </div>
            </div>
            {/* Print-only event info */}
            <div className="hidden print:block mt-1 text-sm">
              {eventName && <span className="mr-4">Événement : {eventName}</span>}
              {eventDate && <span>Date : {formatDate(eventDate)}</span>}
            </div>
          </div>
          <img
            src={`${import.meta.env.BASE_URL}westotel-logo.png`}
            alt="Westotel Nantes Atlantique"
            className="h-16 object-contain ml-4 flex-shrink-0"
            data-testid="img-logo"
          />
        </div>

        {/* Allergen Table */}
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-xs"
            style={{ tableLayout: "fixed" }}
            data-testid="table-allergens"
          >
            <colgroup>
              <col style={{ width: "28px" }} />
              <col style={{ width: "200px" }} />
              {ALLERGENS.map((a) => (
                <col key={a.key} style={{ width: "46px" }} />
              ))}
              <col style={{ width: "28px" }} className="no-print" />
            </colgroup>
            <thead>
              <tr>
                <th className="border border-border bg-primary text-primary-foreground text-center py-1 text-[9px] font-bold align-bottom pb-2">
                  N°
                </th>
                <th className="border border-border bg-primary text-primary-foreground text-center py-1 text-[9px] font-bold align-bottom pb-2">
                  Désignation de la pièce cocktail
                </th>
                {ALLERGENS.map((a) => (
                  <th
                    key={a.key}
                    className="border border-border bg-primary text-primary-foreground text-center py-0 font-bold"
                  >
                    <div
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        fontSize: "8px",
                        lineHeight: 1.1,
                        padding: "4px 2px",
                        height: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",
                        color: "white",
                      }}
                    >
                      {a.label}
                    </div>
                  </th>
                ))}
                <th className="border border-border bg-primary text-primary-foreground text-center text-[8px] no-print" />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, numRows).map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}
                  data-testid={`row-ingredient-${i}`}
                >
                  <td className="border border-border text-center font-medium text-muted-foreground py-0.5 text-xs">
                    {i + 1}
                  </td>
                  <td className="border border-border py-0 px-0">
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
                      className="border border-border text-center font-bold py-0.5"
                    >
                      {row.allergens[a.key] ? (
                        <span className="text-destructive font-bold text-sm">x</span>
                      ) : null}
                    </td>
                  ))}
                  <td className="border border-border text-center py-0.5 no-print">
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

        {/* Footer */}
        <div className="mt-3 space-y-0.5 text-[8.5px] text-muted-foreground border-t border-border pt-2">
          <p className="font-semibold">Légende x : Présence</p>
          <p>
            *Anhydride sulfureux et sulfites en concentration de plus de 10mg/kg
            ou 10mg/litres exprimés en SO₂.
          </p>
          <p>
            Listing établi à partir des informations communiquées par nos
            fournisseurs et selon nos recettes, cette information ne tient pas
            compte des contaminations croisées pouvant avoir lieu chez les
            fournisseurs et dans nos restaurants.
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
