import defaultIngredients from "@/data/default-ingredients.json";

export interface AllergenItem {
  id: number;
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
}

export type AllergenItemInput = Omit<AllergenItem, "id">;

const STORAGE_KEY = "allergen-items-v1";
const SEEDED_KEY = "allergen-items-seeded-v1";

function normalize(item: unknown): AllergenItem {
  const i = item as Record<string, unknown>;
  const bool = (v: unknown) => v === true || v === 1 || v === "true";
  return {
    id: Number(i.id),
    name: String(i.name ?? ""),
    lait: bool(i.lait),
    cereales: bool(i.cereales),
    fruits_coque: bool(i.fruits_coque),
    poisson: bool(i.poisson),
    mollusques: bool(i.mollusques),
    crustaces: bool(i.crustaces),
    celeri: bool(i.celeri),
    oeufs: bool(i.oeufs),
    moutarde: bool(i.moutarde),
    sesame: bool(i.sesame),
    soja: bool(i.soja),
    sulfites: bool(i.sulfites),
    lupin: bool(i.lupin),
    arachide: bool(i.arachide),
  };
}

export function loadItems(): AllergenItem[] {
  const seeded = localStorage.getItem(SEEDED_KEY);
  if (!seeded) {
    const items = (defaultIngredients as unknown[]).map(normalize);
    saveItems(items);
    localStorage.setItem(SEEDED_KEY, "1");
    return items;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as unknown[]).map(normalize);
  } catch {
    return [];
  }
}

export function saveItems(items: AllergenItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function searchItems(items: AllergenItem[], q: string): AllergenItem[] {
  if (!q.trim()) return items;
  const lower = q.trim().toLowerCase();
  return items.filter((i) => i.name.toLowerCase().includes(lower));
}

function nextId(items: AllergenItem[]): number {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

export function createItem(
  items: AllergenItem[],
  input: AllergenItemInput
): [AllergenItem[], AllergenItem] {
  const item: AllergenItem = { id: nextId(items), ...input };
  const next = [...items, item].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  saveItems(next);
  return [next, item];
}

export function updateItem(
  items: AllergenItem[],
  id: number,
  input: AllergenItemInput
): AllergenItem[] {
  const next = items
    .map((i) => (i.id === id ? { ...i, ...input } : i))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  saveItems(next);
  return next;
}

export function deleteItem(items: AllergenItem[], id: number): AllergenItem[] {
  const next = items.filter((i) => i.id !== id);
  saveItems(next);
  return next;
}

export function exportItemsJSON(items: AllergenItem[]): string {
  return JSON.stringify(items, null, 2);
}

export function importItemsJSON(json: string): AllergenItem[] {
  const parsed = JSON.parse(json) as unknown[];
  if (!Array.isArray(parsed)) throw new Error("Format invalide : tableau attendu");
  const items = parsed.map(normalize).sort((a, b) =>
    a.name.localeCompare(b.name, "fr")
  );
  saveItems(items);
  localStorage.setItem(SEEDED_KEY, "1");
  return items;
}

export function resetToDefault(): AllergenItem[] {
  const items = (defaultIngredients as unknown[])
    .map(normalize)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  saveItems(items);
  localStorage.setItem(SEEDED_KEY, "1");
  return items;
}
