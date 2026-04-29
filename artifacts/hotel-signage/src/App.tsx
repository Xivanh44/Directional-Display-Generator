import React, { useState, useRef, useCallback, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Minus, Upload, X, FileDown, GripVertical, Plus, ListPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useLogos } from "@/hooks/use-logos";
import { useCustomTexts } from "@/hooks/use-custom-texts";
import {
  generatePDF,
  generateAllVariantsPDF,
  generateBulkPDF,
  SignageState,
  PaperFormat,
  ArrowType,
  TEXT_OPTIONS,
  SignageText,
} from "@/lib/pdf-generator";
import { PDFPreview } from "@/components/PDFPreview";

interface QueueItem {
  id: string;
  item: SignageState;
  quantity: number;
}

const ARROW_LABEL: Record<ArrowType, string> = {
  left: 'Gauche',
  none: 'Sans flèche',
  right: 'Droite',
};

const queryClient = new QueryClient();

function Main() {
  const { toast } = useToast();
  const { logos, addLogos, removeLogo } = useLogos();
  const { customTexts, addCustomText, removeCustomText } = useCustomTexts();
  const [state, setState] = useState<SignageState>({
    format: 'A4',
    arrow: 'none',
    text: TEXT_OPTIONS[0],
    selectedLogos: []
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const a4Items = queue.filter(q => q.item.format === 'A4');
  const a3Items = queue.filter(q => q.item.format === 'A3');
  const a4Pages = a4Items.reduce((s, i) => s + i.quantity, 0);
  const a3Pages = a3Items.reduce((s, i) => s + i.quantity, 0);

  const addToQueue = () => {
    setQueue(q => [
      ...q,
      {
        id: crypto.randomUUID(),
        item: { ...state, selectedLogos: [...state.selectedLogos] },
        quantity: 1,
      },
    ]);
    toast({
      title: "Affichage ajouté",
      description: `${state.format} — ${state.text} — ${ARROW_LABEL[state.arrow]}`,
    });
  };

  const setQuantity = (id: string, qty: number) => {
    if (qty < 1 || qty > 99) return;
    setQueue(q => q.map(i => (i.id === id ? { ...i, quantity: qty } : i)));
  };

  const removeFromQueue = (id: string) => {
    setQueue(q => q.filter(i => i.id !== id));
  };

  const loadFromQueue = (id: string) => {
    const target = queue.find(q => q.id === id);
    if (target) {
      setState({ ...target.item, selectedLogos: [...target.item.selectedLogos] });
    }
  };

  const handleBulkExport = async (format: PaperFormat) => {
    const items = queue.filter(q => q.item.format === format);
    if (items.length === 0) return;
    const expanded = items.flatMap(q =>
      Array.from({ length: q.quantity }, () => q.item)
    );
    try {
      await generateBulkPDF(expanded, format, logos);
      toast({
        title: "Export réussi",
        description: `PDF ${format} — ${expanded.length} affichage(s) téléchargé.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de la génération du PDF.",
      });
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const id = crypto.randomUUID();
        addLogos({ [id]: e.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(handleFile);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) handleFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addLogos]);

  const handleExport = async () => {
    try {
      await generatePDF(state, logos);
      toast({
        title: "Export réussi",
        description: "Votre affiche a été téléchargée.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de la génération du PDF.",
      });
    }
  };

  const handleExportAllVariants = async () => {
    try {
      await generateAllVariantsPDF(state, logos);
      toast({
        title: "Export réussi",
        description: "PDF des 3 variantes (gauche, sans flèche, droite) téléchargé.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de la génération du PDF.",
      });
    }
  };

  const toggleLogo = (id: string) => {
    setState(prev => {
      if (prev.selectedLogos.includes(id)) {
        return { ...prev, selectedLogos: prev.selectedLogos.filter(l => l !== id) };
      }
      if (prev.selectedLogos.length >= 8) return prev;
      return { ...prev, selectedLogos: [...prev.selectedLogos, id] };
    });
  };

  const reorderLogos = (fromIndex: number, toIndex: number) => {
    setState(prev => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.selectedLogos.length ||
        toIndex >= prev.selectedLogos.length
      ) {
        return prev;
      }
      const next = [...prev.selectedLogos];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...prev, selectedLogos: next };
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      
      {/* Controls Panel */}
      <div className="w-full md:w-[400px] border-r bg-card flex flex-col shrink-0 h-[100dvh] overflow-y-auto">
        <div className="p-6 border-b">
          <h1 className="text-xl font-semibold tracking-tight">Affichages Hôtel</h1>
          <p className="text-sm text-muted-foreground mt-1">Générateur d'affiches directionnelles</p>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format (Paysage)</Label>
            <RadioGroup 
              value={state.format} 
              onValueChange={(v: PaperFormat) => setState({ ...state, format: v })}
              className="grid grid-cols-2 gap-2"
            >
              <div>
                <RadioGroupItem value="A4" id="a4" className="peer sr-only" />
                <Label
                  htmlFor="a4"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                >
                  <span className="font-semibold">A4</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="A3" id="a3" className="peer sr-only" />
                <Label
                  htmlFor="a3"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                >
                  <span className="font-semibold">A3</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Direction */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Type d'affiche</Label>
            <RadioGroup 
              value={state.arrow} 
              onValueChange={(v: ArrowType) => setState({ ...state, arrow: v })}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem value="left" id="left" className="peer sr-only" />
                <Label
                  htmlFor="left"
                  className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-transparent py-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-xs font-medium">Gauche</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="none" id="none" className="peer sr-only" />
                <Label
                  htmlFor="none"
                  className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-transparent py-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                >
                  <Minus className="w-5 h-5" />
                  <span className="text-xs font-medium">Sans</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="right" id="right" className="peer sr-only" />
                <Label
                  htmlFor="right"
                  className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-transparent py-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span className="text-xs font-medium">Droite</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Texte */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Texte du bandeau</Label>
            {(() => {
              const isDefault = TEXT_OPTIONS.includes(state.text as SignageText);
              const isSavedCustom = !isDefault && customTexts.includes(state.text);
              const isEditing = !isDefault && !isSavedCustom;
              const trimmed = state.text.trim();
              const canSave =
                isEditing &&
                trimmed.length > 0 &&
                !TEXT_OPTIONS.includes(trimmed as SignageText) &&
                !customTexts.includes(trimmed);

              const selectValue = isEditing ? '__custom__' : state.text;

              return (
                <>
                  <Select
                    value={selectValue}
                    onValueChange={(v) => {
                      if (v === '__custom__') {
                        setState({ ...state, text: '' });
                      } else {
                        setState({ ...state, text: v });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Choisir un texte" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEXT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                      {customTexts.length > 0 && (
                        <div className="my-1 h-px bg-border mx-2" />
                      )}
                      {customTexts.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                      <div className="my-1 h-px bg-border mx-2" />
                      <SelectItem value="__custom__">Texte personnalisé…</SelectItem>
                    </SelectContent>
                  </Select>

                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        value={state.text}
                        onChange={(e) => setState({ ...state, text: e.target.value })}
                        placeholder="Saisissez votre texte"
                        maxLength={60}
                        className="bg-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canSave}
                        onClick={() => {
                          addCustomText(trimmed);
                          setState({ ...state, text: trimmed });
                          toast({
                            title: "Texte enregistré",
                            description: `« ${trimmed} » est maintenant disponible dans la liste.`,
                          });
                        }}
                        className="h-9 text-xs whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Enregistrer
                      </Button>
                    </div>
                  )}

                  {customTexts.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[11px] text-muted-foreground">
                        Mes textes enregistrés
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {customTexts.map((t) => (
                          <span
                            key={t}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px]",
                              state.text === t && "border-primary bg-primary/5"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setState({ ...state, text: t })}
                              className="truncate max-w-[140px]"
                              title="Utiliser ce texte"
                            >
                              {t}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                removeCustomText(t);
                                if (state.text === t) {
                                  setState({ ...state, text: TEXT_OPTIONS[0] });
                                }
                              }}
                              className="text-muted-foreground hover:text-destructive"
                              title="Supprimer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Logos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Logos ({state.selectedLogos.length}/8)</Label>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 text-xs">
                <Upload className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={onFileChange} />
            </div>

            {state.selectedLogos.length >= 2 && (
              <SelectedLogosReorder
                selectedLogos={state.selectedLogos}
                logos={logos}
                onReorder={reorderLogos}
              />
            )}

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(logos).map(([id, src]) => {
                const isSelected = state.selectedLogos.includes(id);
                const disabled = !isSelected && state.selectedLogos.length >= 6;
                return (
                  <div key={id} className="relative group aspect-square rounded-md border bg-white p-2">
                    <button 
                      onClick={() => removeLogo(id)}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <label className={cn("w-full h-full cursor-pointer flex flex-col items-center justify-center", disabled && "opacity-50 cursor-not-allowed")}>
                      <Checkbox 
                        checked={isSelected}
                        disabled={disabled}
                        onCheckedChange={() => toggleLogo(id)}
                        className="absolute top-2 left-2"
                      />
                      <img src={src} alt="logo" className="w-full h-full object-contain max-h-[80%]" />
                    </label>
                  </div>
                );
              })}
              {Object.keys(logos).length === 0 && (
                <div className="col-span-3 py-8 text-center border-2 border-dashed rounded-md text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted" />
                  Glissez-déposez des images<br/>ou collez (Ctrl+V)
                </div>
              )}
            </div>
          </div>

          {/* Compilation queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">
                Liste de compilation ({queue.length})
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addToQueue}
                  disabled={state.selectedLogos.length === 0}
                  className="h-8 text-xs"
                >
                  <ListPlus className="w-4 h-4 mr-2" />
                  Ajouter cet affichage
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Vider toute la liste de compilation ?"
                      )
                    ) {
                      setQueue([]);
                    }
                  }}
                  disabled={queue.length === 0}
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  title="Vider la liste"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Vider
                </Button>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="py-6 text-center border-2 border-dashed rounded-md text-xs text-muted-foreground">
                Configurez un affichage puis cliquez sur "Ajouter cet affichage"
                pour le mettre dans la liste, et compilez ensuite tous les A4
                ou A3 en un seul PDF.
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((q) => (
                  <QueueRow
                    key={q.id}
                    queueItem={q}
                    onLoad={() => loadFromQueue(q.id)}
                    onRemove={() => removeFromQueue(q.id)}
                    onQuantity={(n) => setQuantity(q.id, n)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t mt-auto space-y-2">
          <Button onClick={handleExport} size="lg" className="w-full text-base h-12">
            <FileDown className="w-5 h-5 mr-2" />
            Exporter cet affichage
          </Button>
          <Button
            onClick={handleExportAllVariants}
            variant="outline"
            size="sm"
            className="w-full text-xs h-9"
          >
            <FileDown className="w-3.5 h-3.5 mr-2" />
            Exporter les 3 variantes
          </Button>

          {(a4Pages > 0 || a3Pages > 0) && (
            <div className="pt-2 mt-2 border-t space-y-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Compilation de la liste
              </p>
              <Button
                onClick={() => handleBulkExport('A4')}
                disabled={a4Pages === 0}
                size="lg"
                className="w-full text-sm h-11"
                variant={a4Pages > 0 ? 'default' : 'secondary'}
              >
                <FileDown className="w-4 h-4 mr-2" />
                PDF A4 — {a4Pages} affichage{a4Pages > 1 ? 's' : ''}
              </Button>
              <Button
                onClick={() => handleBulkExport('A3')}
                disabled={a3Pages === 0}
                size="lg"
                className="w-full text-sm h-11"
                variant={a3Pages > 0 ? 'default' : 'secondary'}
              >
                <FileDown className="w-4 h-4 mr-2" />
                PDF A3 — {a3Pages} affichage{a3Pages > 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 min-h-[50dvh] md:h-[100dvh] overflow-hidden">
        <PDFPreview state={state} allLogos={logos} />
      </div>

    </div>
  );
}

function QueueRow({
  queueItem,
  onLoad,
  onRemove,
  onQuantity,
}: {
  queueItem: QueueItem;
  onLoad: () => void;
  onRemove: () => void;
  onQuantity: (n: number) => void;
}) {
  const { item, quantity } = queueItem;
  const ArrowIcon =
    item.arrow === 'left' ? ArrowLeft : item.arrow === 'right' ? ArrowRight : Minus;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-white p-2">
      <button
        onClick={onLoad}
        className="flex-1 min-w-0 text-left flex items-center gap-2 hover:bg-muted/40 rounded p-1 -m-1"
        title="Cliquer pour recharger dans l'éditeur"
      >
        <span
          className={cn(
            "shrink-0 inline-flex items-center justify-center text-[10px] font-bold rounded px-1.5 py-0.5",
            item.format === 'A4'
              ? "bg-blue-100 text-blue-800"
              : "bg-amber-100 text-amber-800"
          )}
        >
          {item.format}
        </span>
        <ArrowIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium truncate">{item.text}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          · {item.selectedLogos.length} logo{item.selectedLogos.length > 1 ? 's' : ''}
        </span>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon"
          variant="outline"
          className="h-6 w-6"
          onClick={() => onQuantity(quantity - 1)}
          disabled={quantity <= 1}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="text-xs font-semibold w-5 text-center tabular-nums">
          {quantity}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-6 w-6"
          onClick={() => onQuantity(quantity + 1)}
          disabled={quantity >= 99}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onRemove}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function SelectedLogosReorder({
  selectedLogos,
  logos,
  onReorder,
}: {
  selectedLogos: string[];
  logos: Record<string, string>;
  onReorder: (from: number, to: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-1 mb-2 text-[11px] text-muted-foreground">
        <GripVertical className="w-3 h-3" />
        <span>Glissez pour réorganiser</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedLogos.map((id, idx) => {
          const src = logos[id];
          if (!src) return null;
          const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;
          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => {
                setDragIndex(idx);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overIndex !== idx) setOverIndex(idx);
              }}
              onDragLeave={() => {
                if (overIndex === idx) setOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) onReorder(dragIndex, idx);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                "relative w-14 h-14 rounded-md border bg-white p-1 cursor-grab active:cursor-grabbing transition-all",
                dragIndex === idx && "opacity-40",
                isOver && "ring-2 ring-primary ring-offset-1"
              )}
              title={`Position ${idx + 1}`}
            >
              <img src={src} alt="" className="w-full h-full object-contain" />
              <span className="absolute -top-1.5 -left-1.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                {idx + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Main />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
