import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useListAllergenItems,
  useCreateAllergenItem,
  useUpdateAllergenItem,
  useDeleteAllergenItem,
  getListAllergenItemsQueryKey,
} from "@workspace/api-client-react";
import type { AllergenItem, AllergenItemInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, Plus, Pencil, Trash2, Search, Check, X } from "lucide-react";
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
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<AllergenItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<AllergenItem | null>(null);

  const { data: items = [], isLoading } = useListAllergenItems(
    { q: search },
    { query: { staleTime: 10000, queryKey: getListAllergenItemsQueryKey({ q: search }) } }
  );

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListAllergenItemsQueryKey({}) });
    qc.invalidateQueries({ queryKey: getListAllergenItemsQueryKey({ q: search }) });
  }, [qc, search]);

  const createMutation = useCreateAllergenItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Ingrédient créé" });
        setCreateOpen(false);
        invalidate();
      },
      onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateAllergenItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Ingrédient mis à jour" });
        setEditItem(null);
        invalidate();
      },
      onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteAllergenItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Ingrédient supprimé" });
        setDeleteItem(null);
        invalidate();
      },
      onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
    },
  });

  const handleCreate = (data: AllergenItemInput) => {
    createMutation.mutate({ data });
  };

  const handleUpdate = (data: AllergenItemInput) => {
    if (!editItem) return;
    updateMutation.mutate({ id: editItem.id, data });
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteMutation.mutate({ id: deleteItem.id });
  };

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un ingrédient..."
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Count */}
        <p className="text-xs text-muted-foreground mb-3" data-testid="text-count">
          {isLoading ? "Chargement..." : `${items.length} ingrédient${items.length !== 1 ? "s" : ""}`}
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
                {items.map((item, idx) => (
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
                {!isLoading && items.length === 0 && (
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
          isSaving={createMutation.isPending}
          title="Nouvel ingrédient"
        />
      )}

      {/* Edit dialog */}
      {editItem && (
        <AllergenEditor
          open={!!editItem}
          onClose={() => setEditItem(null)}
          onSave={handleUpdate}
          isSaving={updateMutation.isPending}
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
              <strong>{deleteItem?.name}</strong> sera définitivement supprimé de la base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
