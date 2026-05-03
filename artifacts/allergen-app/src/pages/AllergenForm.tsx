import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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

export default function AllergenForm() {
  const [, setLocation] = useLocation();
  const { toast: _toast } = useToast();
  const { login } = useManagerAuth();
  const [eventType, setEventType] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [numRows, setNumRows] = useState(DEFAULT_ROWS);
  const [rows, setRows] = useState<TableRow[]>(() =>
    Array.from({ length: MAX_ROWS }, emptyRow)
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
  };

  const removeRow = () => {
    if (numRows <= MIN_ROWS) return;
    setNumRows((n) => n - 1);
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
      }).toUpperCase();
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar — masquée à l'impression */}
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

      {/* Zone imprimable */}
      <div ref={printRef} className="print-page p-4">

        {/* ── En-tête : ALLERGÈNES + logo ── */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-5xl font-black uppercase tracking-tight" style={{ color: "hsl(var(--primary))", letterSpacing: "-0.02em" }}>
            ALLERGÈNES
          </h1>
          <img
            src={`${import.meta.env.BASE_URL}westotel-logo.png`}
            alt="Westotel"
            className="h-14 object-contain"
            data-testid="img-logo"
          />
        </div>

        {/* ── Sous-en-tête : 3 champs ── */}
        <div className="grid grid-cols-3 border border-primary text-sm mb-2" style={{ borderWidth: "1.5px" }}>
          {/* Champ 1 : type d'événement */}
          <div className="border-r border-primary px-2 py-1" style={{ borderRightWidth: "1.5px" }}>
            <input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="Ex : Dînatoire 16 pièces"
              className="subheader-input w-full bg-transparent font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 text-sm"
              data-testid="input-event-type"
            />
          </div>
          {/* Champ 2 : nom de la salle / événement */}
          <div className="border-r border-primary px-2 py-1 text-center" style={{ borderRightWidth: "1.5px" }}>
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Nom de la salle"
              className="subheader-input w-full bg-transparent font-bold text-foreground outline-none placeholder:text-muted-foreground/50 text-sm text-center uppercase"
              data-testid="input-event-name"
            />
          </div>
          {/* Champ 3 : date */}
          <div className="px-2 py-1 text-right">
            <span className="font-semibold text-foreground text-sm no-print">
              Le{" "}
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="subheader-input bg-transparent font-semibold text-foreground outline-none text-sm"
                data-testid="input-event-date"
              />
            </span>
            <span className="hidden print:block font-semibold text-sm">
              {eventDate ? `Le ${formatDate(eventDate)}` : ""}
            </span>
          </div>
        </div>

        {/* ── Tableau ── */}
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
                {/* En-tête première colonne */}
                <th
                  className="border border-primary text-center font-black align-middle px-1 py-1"
                  style={{
                    backgroundColor: "hsl(var(--primary))",
                    color: "white",
                    fontSize: "9px",
                    lineHeight: 1.25,
                    verticalAlign: "middle",
                  }}
                >
                  ALLERGÈNES À<br />DÉCLARATION<br />OBLIGATOIRE
                </th>
                {/* En-têtes allergènes (texte vertical) */}
                {ALLERGENS.map((a) => (
                  <th
                    key={a.key}
                    className="border border-primary text-center py-0 font-bold"
                    style={{ backgroundColor: "hsl(var(--primary))", padding: 0 }}
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
                        color: "white",
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
                  className="border border-primary no-print"
                  style={{ backgroundColor: "hsl(var(--primary))" }}
                />
              </tr>
            </thead>

            <tbody>
              {rows.slice(0, numRows).map((row, i) => (
                <tr
                  key={i}
                  className="bg-white"
                  data-testid={`row-ingredient-${i}`}
                >
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
                      style={{ fontSize: "11px" }}
                    >
                      {row.allergens[a.key] ? (
                        <span className="font-bold" style={{ color: "hsl(var(--foreground))" }}>X</span>
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

        {/* ── Pied de page ── */}
        <div className="mt-2 space-y-0.5 border-t border-border pt-1" style={{ fontSize: "7px", color: "hsl(var(--muted-foreground))" }}>
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
