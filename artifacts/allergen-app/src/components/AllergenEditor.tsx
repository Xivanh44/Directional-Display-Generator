import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { AllergenItem, AllergenItemInput } from "@/lib/ingredient-store";

const ALLERGENS = [
  { key: "lait" as const, label: "Lait et lactose" },
  { key: "cereales" as const, label: "Céréales (contenant du gluten)" },
  { key: "fruits_coque" as const, label: "Fruits à coque" },
  { key: "poisson" as const, label: "Poisson" },
  { key: "mollusques" as const, label: "Mollusques" },
  { key: "crustaces" as const, label: "Crustacés" },
  { key: "celeri" as const, label: "Céleri" },
  { key: "oeufs" as const, label: "Œufs" },
  { key: "moutarde" as const, label: "Moutarde" },
  { key: "sesame" as const, label: "Graine de sésame" },
  { key: "soja" as const, label: "Soja" },
  { key: "sulfites" as const, label: "Anhydride sulfureux / Sulfites" },
  { key: "lupin" as const, label: "Lupin" },
  { key: "arachide" as const, label: "Arachide" },
];

type AllergenKey = (typeof ALLERGENS)[number]["key"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: AllergenItemInput) => void;
  isSaving: boolean;
  title: string;
  initialData?: AllergenItem;
}

export default function AllergenEditor({ open, onClose, onSave, isSaving, title, initialData }: Props) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [flags, setFlags] = useState<Record<AllergenKey, boolean>>(() => ({
    lait: initialData?.lait ?? false,
    cereales: initialData?.cereales ?? false,
    fruits_coque: initialData?.fruits_coque ?? false,
    poisson: initialData?.poisson ?? false,
    mollusques: initialData?.mollusques ?? false,
    crustaces: initialData?.crustaces ?? false,
    celeri: initialData?.celeri ?? false,
    oeufs: initialData?.oeufs ?? false,
    moutarde: initialData?.moutarde ?? false,
    sesame: initialData?.sesame ?? false,
    soja: initialData?.soja ?? false,
    sulfites: initialData?.sulfites ?? false,
    lupin: initialData?.lupin ?? false,
    arachide: initialData?.arachide ?? false,
  }));

  const handleToggle = (key: AllergenKey, checked: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), ...flags });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-editor">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="ingredient-name">Nom de l'ingrédient</Label>
            <Input
              id="ingredient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sauce beurre blanc"
              required
              autoFocus
              data-testid="input-ingredient-name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Allergènes présents</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALLERGENS.map((a) => (
                <div key={a.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`allergen-${a.key}`}
                    checked={flags[a.key]}
                    onCheckedChange={(checked) => handleToggle(a.key, !!checked)}
                    data-testid={`checkbox-${a.key}`}
                  />
                  <label
                    htmlFor={`allergen-${a.key}`}
                    className="text-xs text-foreground cursor-pointer leading-snug"
                  >
                    {a.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-editor-cancel">
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim() || isSaving} data-testid="button-editor-save">
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
