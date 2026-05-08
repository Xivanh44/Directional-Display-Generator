import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useIngredients } from "@/contexts/IngredientsContext";
import type { AllergenItem, AllergenItemInput } from "@/lib/ingredient-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Check, X, Download, Upload } from "lucide-react";
import AllergenEditor from "@/components/AllergenEditor";

const ALLERGENS = [
  { key: "lait" as const, label: "Lait" },
  { key: "cereales" as const, label: "Céréales" },
  { key: "fruits_coque" as const, label: "Fruits à coque" },
  { key: "poisson" as const, label: "Poisson" },
  { key: "mollusques" as const, label: "Mollusques" },
  { key: "crustaces" as const, label: "Crustacés" },
  { key: "celeri" as const, label: "Céleri" },
  { key: "oeufs" as const, label: "Œufs" },
  { key: "moutarde" as const, label: "Moutarde" },
  { key: "sesame" as const, label: "Sésame" },
  { key: "soja" as const, label: "Soja" },
  { key: "sulfites" as const, label: "Sulfites" },
  { key: "lupin" as const, label: "Lupin" },
  { key: "arachide" as const, label: "Arachide" },
];

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { items, search, create, update, remove, exportJSON, importJSON } = useIngredients();

  const [searchQuery, setSearchQuery] = useState("");
  const [editItem, setEditItem] = useState<AllergenItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<AllergenItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const displayed = searchQuery.trim() ? search(searchQuery) : items;

  const handleCreate = useCallback(
    (data: AllergenItemInput) => {
      setIsSaving(true);
      try {
        create(data);
        toast({ title: "Ingrédient créé" });
        setCreateOpen(false);
      } catch {
        toast({ title: "Erreur lors de la création", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    },
    [create, toast]
  );

  const handleUpdate = useCallback(
    (data: AllergenItemInput) => {
      if (!editItem) return;
      setIsSaving(true);
      try {
        update(editItem.id, data);
        toast({ title: "Ingrédient mis à jour" });
        setEditItem(null);
      } catch {
        toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    },
    [editItem, update, toast]
  );

  const handleDelete = useCallback(() => {
    if (!deleteItem) return;
    try {
      remove(deleteItem.id);
      toast({ title: "Ingrédient supprimé" });
      setDeleteItem(null);
    } catch {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  }, [deleteItem, remove, toast]);

  const handleExport = useCallback(() => {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `base-ingredients-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Base exportée" });
  }, [exportJSON, toast]);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = ev.target?.result as string;
          importJSON(json);
          toast({ title: "Base importée avec succès" });
        } catch {
          toast({ title: "Fichier invalide", variant: "destructive" });
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [importJSON, toast]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>
        <div>
          <h1 className="text-base font-bold text-foreground">Base d'ingrédients</h1>
          <p className="text-xs text-muted-foreground">Gestion des allergènes par ingrédient</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => importRef.current?.click()}
            data-testid="button-import"
          >
            <Upload className="w-4 h-4 mr-1" />
            Importer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="w-4 h-4 mr-1" />
            Exporter
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            data-testid="button-create"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvel ingrédient
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un ingrédient..."
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Count */}
        <p className="text-xs text-muted-foreground mb-3" data-testid="text-count">
          {displayed.length} ingrédient{displayed.length !== 1 ? "s" : ""}
          {searchQuery.trim() ? ` trouvé${displayed.length !== 1 ? "s" : ""}` : " dans la base"}
        </p>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground border-b border-border">
                    Ingrédient
                  </th>
                  {ALLERGENS.map((a) => (
                    <th
                      key={a.key}
                      className="text-center py-2 px-1 font-semibold text-muted-foreground border-b border-border text-[10px]"
                      title={a.label}
                    >
                      <span className="block truncate max-w-[36px]">{a.label}</span>
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 font-semibold text-muted-foreground border-b border-border">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border last:border-0 ${
                      idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                    } hover:bg-accent/30 transition-colors`}
                    data-testid={`row-item-${item.id}`}
                  >
                    <td className="py-1.5 px-3 font-medium text-foreground">
                      {item.name}
                    </td>
                    {ALLERGENS.map((a) => (
                      <td key={a.key} className="py-1.5 px-1 text-center">
                        {item[a.key] ? (
                          <Check className="w-3 h-3 text-primary mx-auto" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditItem(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:text-destructive"
                          onClick={() => setDeleteItem(item)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td
                      colSpan={ALLERGENS.length + 2}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Aucun ingrédient trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create dialog */}
      {createOpen && (
        <AllergenEditor
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={handleCreate}
          isSaving={isSaving}
          title="Nouvel ingrédient"
        />
      )}

      {/* Edit dialog */}
      {editItem && (
        <AllergenEditor
          open={!!editItem}
          onClose={() => setEditItem(null)}
          onSave={handleUpdate}
          isSaving={isSaving}
          title="Modifier l'ingrédient"
          initialData={editItem}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}>
        <AlertDialogContent data-testid="dialog-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet ingrédient ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteItem?.name}</strong> sera définitivement supprimé de la base locale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
