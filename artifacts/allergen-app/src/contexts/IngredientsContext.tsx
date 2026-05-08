import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  loadItems,
  createItem,
  updateItem,
  deleteItem,
  exportItemsJSON,
  importItemsJSON,
  resetToDefault,
  searchItems,
  type AllergenItem,
  type AllergenItemInput,
} from "@/lib/ingredient-store";

interface IngredientsContextValue {
  items: AllergenItem[];
  search: (q: string) => AllergenItem[];
  create: (input: AllergenItemInput) => AllergenItem;
  update: (id: number, input: AllergenItemInput) => void;
  remove: (id: number) => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  resetDefault: () => void;
}

const IngredientsContext = createContext<IngredientsContextValue | null>(null);

export function IngredientsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AllergenItem[]>(() => loadItems());

  const search = useCallback(
    (q: string) => searchItems(items, q),
    [items]
  );

  const create = useCallback((input: AllergenItemInput): AllergenItem => {
    let created!: AllergenItem;
    setItems((prev) => {
      const [next, item] = createItem(prev, input);
      created = item;
      return next;
    });
    return created;
  }, []);

  const update = useCallback((id: number, input: AllergenItemInput) => {
    setItems((prev) => updateItem(prev, id, input));
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => deleteItem(prev, id));
  }, []);

  const exportJSON = useCallback(() => exportItemsJSON(items), [items]);

  const importJSON = useCallback((json: string) => {
    setItems(importItemsJSON(json));
  }, []);

  const resetDefault = useCallback(() => {
    setItems(resetToDefault());
  }, []);

  const value = useMemo<IngredientsContextValue>(
    () => ({ items, search, create, update, remove, exportJSON, importJSON, resetDefault }),
    [items, search, create, update, remove, exportJSON, importJSON, resetDefault]
  );

  return (
    <IngredientsContext.Provider value={value}>
      {children}
    </IngredientsContext.Provider>
  );
}

export function useIngredients(): IngredientsContextValue {
  const ctx = useContext(IngredientsContext);
  if (!ctx) throw new Error("useIngredients must be used inside IngredientsProvider");
  return ctx;
}
