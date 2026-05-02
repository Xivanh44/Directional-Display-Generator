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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Minus, Upload, X, FileDown, GripVertical, Plus, ListPlus, Trash2, Image as ImageIcon, Settings2 } from "lucide-react";
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
import { renderBannerToCanvas, downloadCanvasAsPng } from "@/lib/banner-canvas";
import { PDFPreview } from "@/components/PDFPreview";

const FONT_OPTIONS = [
  { label: 'Arial (défaut)', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Impact', value: 'Impact' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Cinzel', value: 'Cinzel' },
  { label: 'Cormorant Garamond', value: 'Cormorant Garamond' },
];

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

const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

// ── Manager PIN dialog ────────────────────────────────────────────────────────
const MANAGER_PIN = '1234';

function ManagerPinDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === MANAGER_PIN) {
      setPin('');
      setError('');
      onSuccess();
    } else {
      setError('Code incorrect');
      setPin('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPin(''); setError(''); onClose(); } }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Mode Manager</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="pin" className="text-sm">Code d'accès</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              placeholder="••••"
              autoFocus
              autoComplete="off"
              className="text-center tracking-widest text-lg"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => { setPin(''); setError(''); onClose(); }}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={pin.length === 0}>
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Manager toggle widget ─────────────────────────────────────────────────────
function ManagerToggle({
  isManager,
  onRequestManager,
  onExitManager,
}: {
  isManager: boolean;
  onRequestManager: () => void;
  onExitManager: () => void;
}) {
  if (isManager) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
          Manageur
        </span>
        <button
          onClick={onExitManager}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Quitter ce mode
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onRequestManager}
      title="Mode Manager"
      className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
    >
      <Settings2 className="w-3.5 h-3.5" />
      Manager
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Main() {
  const { toast } = useToast();
  const { logos, addLogos, removeLogo, clearLogos } = useLogos();
  const { customTexts, addCustomText, removeCustomText } = useCustomTexts();
  const [isManager, setIsManager] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const [state, setState] = useState<SignageState>({
    format: 'A4',
    arrow: 'none',
    text: TEXT_OPTIONS[0],
    selectedLogos: [],
    font: 'Arial',
    customArrowDataUrl: null,
    customArrowChar: null,
    customBannerDataUrl: null,
    arrowScale: 1,
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const arrowInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Load manager settings from server on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setState((prev) => ({
          ...prev,
          font: data.font ?? prev.font,
          arrowScale: data.arrowScale ?? prev.arrowScale,
          customArrowChar: data.customArrowChar ?? null,
          customArrowDataUrl: data.customArrowDataUrl ?? null,
          customBannerDataUrl: data.customBannerDataUrl ?? null,
        }));
      })
      .catch(() => { /* silently ignore if API unreachable */ });
  }, []);

  const saveManagerSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          font: state.font,
          arrowScale: state.arrowScale,
          customArrowChar: state.customArrowChar,
          customArrowDataUrl: state.customArrowDataUrl,
          customBannerDataUrl: state.customBannerDataUrl,
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      toast({ title: "Réglages enregistrés", description: "Ces paramètres sont maintenant les valeurs par défaut pour tous les appareils." });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer les réglages.", variant: "destructive" });
    } finally {
      setIsSavingSettings(false);
    }
  };

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
      const bannerDataUrls = await Promise.all(
        expanded.map((item) => renderBannerToCanvas(item).then((c) => c.toDataURL('image/png')))
      );
      await generateBulkPDF(expanded, format, logos, bannerDataUrls);
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
      const canvas = await renderBannerToCanvas(state);
      const bannerDataUrl = canvas.toDataURL('image/png');
      await generatePDF(state, logos, bannerDataUrl);
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
      const variants: ArrowType[] = ['left', 'none', 'right'];
      const bannerDataUrls = await Promise.all(
        variants.map((arrow) => renderBannerToCanvas({ ...state, arrow }).then((c) => c.toDataURL('image/png')))
      );
      await generateAllVariantsPDF(state, logos, bannerDataUrls);
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

  const handleBannerExport = async () => {
    try {
      const canvas = await renderBannerToCanvas(state);
      const slug = state.text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'bandeau';
      downloadCanvasAsPng(canvas, `bandeau-${state.format.toLowerCase()}-${state.arrow}-${slug}.png`);
      toast({ title: "Bandeau exporté", description: "Image PNG téléchargée." });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'exporter le bandeau." });
    }
  };

  const handleArrowFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setState((prev) => ({ ...prev, customArrowDataUrl: e.target!.result as string, customArrowChar: null }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setState((prev) => ({ ...prev, customBannerDataUrl: e.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
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
    <>
      <ManagerPinDialog
        open={pinDialogOpen}
        onClose={() => setPinDialogOpen(false)}
        onSuccess={() => {
          setIsManager(true);
          setPinDialogOpen(false);
          toast({ title: "Mode Manager activé" });
        }}
      />

      <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
        {/* Controls Panel */}
        <div className="w-full md:w-[400px] border-r bg-card flex flex-col shrink-0 h-[100dvh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Affichages Hôtel</h1>
                <p className="text-sm text-muted-foreground mt-1">Générateur d'affiches directionnelles</p>
              </div>
              <ManagerToggle
                isManager={isManager}
                onRequestManager={() => setPinDialogOpen(true)}
                onExitManager={() => {
                  setIsManager(false);
                  toast({ title: "Mode Manager désactivé" });
                }}
              />
            </div>
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

              {/* Custom arrow — manager only */}
              {isManager && (
                <div className="pt-1 space-y-2">
                  {/* Character input */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground shrink-0">Caractère</Label>
                    <Input
                      value={state.customArrowChar ?? ''}
                      onChange={(e) => {
                        const val = [...e.target.value].slice(-1).join(''); // keep last char (supports emoji)
                        setState((prev) => ({
                          ...prev,
                          customArrowChar: val || null,
                          customArrowDataUrl: val ? null : prev.customArrowDataUrl,
                        }));
                      }}
                      placeholder="ex: ➤ ★ ●"
                      className="bg-white h-8 text-center text-lg w-24"
                      maxLength={4}
                    />
                    {state.customArrowChar && (
                      <button
                        type="button"
                        onClick={() => setState({ ...state, customArrowChar: null })}
                        className="text-muted-foreground hover:text-destructive"
                        title="Effacer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Image upload */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => arrowInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {state.customArrowDataUrl ? 'Changer l\'image' : 'Image de flèche…'}
                    </Button>
                    {state.customArrowDataUrl && (
                      <>
                        <img src={state.customArrowDataUrl} className="h-7 w-7 object-contain rounded border" alt="flèche" />
                        <button
                          type="button"
                          onClick={() => setState({ ...state, customArrowDataUrl: null })}
                          className="text-muted-foreground hover:text-destructive"
                          title="Supprimer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={arrowInputRef}
                    onChange={(e) => { if (e.target.files?.[0]) handleArrowFile(e.target.files[0]); }}
                  />
                </div>
              )}

              {/* Arrow size slider — manager only */}
              {isManager && state.arrow !== 'none' && (
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Taille de la flèche</Label>
                    <span className="text-xs font-medium tabular-nums">
                      {Math.round((state.arrowScale ?? 1) * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={140}
                    step={5}
                    value={Math.round((state.arrowScale ?? 1) * 100)}
                    onChange={(e) =>
                      setState({ ...state, arrowScale: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-primary h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>40 %</span>
                    <span>100 %</span>
                    <span>140 %</span>
                  </div>
                </div>
              )}
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
                                "group flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5 border cursor-pointer transition-colors",
                                state.text === t
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:bg-accent"
                              )}
                              onClick={() => setState({ ...state, text: t })}
                            >
                              {t}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCustomText(t);
                                  if (state.text === t) setState({ ...state, text: TEXT_OPTIONS[0] });
                                }}
                                className={cn(
                                  "opacity-0 group-hover:opacity-100 transition-opacity ml-0.5",
                                  state.text === t ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive"
                                )}
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

            {/* Police — manager only */}
            {isManager && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Police</Label>
                <Select
                  value={state.font}
                  onValueChange={(v) => setState({ ...state, font: v })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bandeau personnalisé — manager only */}
            {isManager && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bandeau</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {state.customBannerDataUrl ? 'Changer le bandeau' : 'Importer un bandeau…'}
                  </Button>
                  {state.customBannerDataUrl && (
                    <>
                      <img
                        src={state.customBannerDataUrl}
                        className="h-8 rounded border object-cover"
                        style={{ maxWidth: '120px' }}
                        alt="bandeau"
                      />
                      <button
                        type="button"
                        onClick={() => setState({ ...state, customBannerDataUrl: null })}
                        className="text-muted-foreground hover:text-destructive"
                        title="Supprimer le bandeau personnalisé"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  L'image remplace le fond beige. Le texte et la flèche restent superposés.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={bannerInputRef}
                  onChange={(e) => { if (e.target.files?.[0]) handleBannerFile(e.target.files[0]); }}
                />
              </div>
            )}

            {/* Save manager settings — manager only */}
            {isManager && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isSavingSettings}
                onClick={saveManagerSettings}
              >
                {isSavingSettings ? 'Enregistrement…' : 'Enregistrer les réglages par défaut'}
              </Button>
            )}

            {/* Logos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">
                  Logos ({state.selectedLogos.length}/8)
                </Label>
                <div className="flex items-center gap-1.5">
                  {Object.keys(logos).length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        clearLogos();
                        setState(prev => ({ ...prev, selectedLogos: [] }));
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Vider
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Ajouter
                  </Button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={onFileChange}
                />
              </div>
              {Object.keys(logos).length === 0 ? (
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    Array.from(e.dataTransfer.files).forEach(handleFile);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Glisser-déposer, coller ou cliquer pour ajouter des logos</p>
                </div>
              ) : (
                <div
                  className="grid grid-cols-4 gap-2"
                  onDrop={(e) => {
                    e.preventDefault();
                    Array.from(e.dataTransfer.files).forEach(handleFile);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {Object.entries(logos).map(([id, src]) => {
                    const idx = state.selectedLogos.indexOf(id);
                    const selected = idx !== -1;
                    return (
                      <div
                        key={id}
                        className={cn(
                          "relative aspect-square rounded-md border-2 overflow-hidden cursor-pointer transition-all group",
                          selected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-transparent hover:border-muted-foreground/40"
                        )}
                        onClick={() => toggleLogo(id)}
                      >
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-contain p-1.5"
                        />
                        {selected && (
                          <span className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {idx + 1}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLogo(id);
                            setState(prev => ({
                              ...prev,
                              selectedLogos: prev.selectedLogos.filter(l => l !== id),
                            }));
                          }}
                          className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground"
                          title="Supprimer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {state.selectedLogos.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Ordre d'affichage</p>
                  <div className="space-y-1">
                    {state.selectedLogos.map((id, idx) => {
                      const src = logos[id];
                      if (!src) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 bg-accent/50 rounded px-2 py-1"
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = Number(e.dataTransfer.getData('text/plain'));
                            reorderLogos(from, idx);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab" />
                          <img src={src} alt="" className="h-6 w-6 object-contain" />
                          <span className="text-xs text-muted-foreground flex-1 truncate">Logo {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => toggleLogo(id)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Retirer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export actions */}
          <div className="p-6 border-t space-y-2.5">
            <Button
              className="w-full"
              onClick={handleExport}
              disabled={!state.text.trim()}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>

            {/* PNG export — manager only */}
            {isManager && (
              <Button
                variant="outline"
                className="w-full text-xs h-8"
                onClick={handleBannerExport}
                disabled={!state.text.trim()}
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                Exporter le bandeau (PNG)
              </Button>
            )}

            {/* Queue */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Compilation ({queue.length})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={addToQueue}
                  disabled={!state.text.trim()}
                  title="Ajouter à la compilation"
                >
                  <ListPlus className="w-3.5 h-3.5 mr-1" />
                  Ajouter
                </Button>
              </div>

              {queue.length > 0 && (
                <ScrollArea className="h-52 rounded border border-border/40 bg-background/40">
                  <div className="space-y-1 p-2">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 bg-accent/40 rounded px-2 py-1.5 text-xs"
                      >
                        <button
                          type="button"
                          className="flex-1 text-left min-w-0 hover:underline"
                          onClick={() => loadFromQueue(item.id)}
                          title="Charger cet affichage"
                        >
                          <div className="font-medium truncate">
                            {item.item.format} · {item.item.text} · {ARROW_LABEL[item.item.arrow]}
                          </div>
                          {item.item.selectedLogos.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {item.item.selectedLogos.map((id) =>
                                logos[id] ? (
                                  <img
                                    key={id}
                                    src={logos[id]}
                                    alt=""
                                    className="h-6 w-6 object-contain rounded border bg-white"
                                  />
                                ) : null
                              )}
                            </div>
                          )}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-background border text-muted-foreground hover:text-foreground"
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-5 text-center tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-background border text-muted-foreground hover:text-foreground"
                            onClick={() => setQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromQueue(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {(a4Pages > 0 || a3Pages > 0) && (
                <div className="flex gap-2 pt-1">
                  {a4Pages > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleBulkExport('A4')}
                    >
                      <FileDown className="w-3.5 h-3.5 mr-1" />
                      A4 ({a4Pages}p)
                    </Button>
                  )}
                  {a3Pages > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleBulkExport('A3')}
                    >
                      <FileDown className="w-3.5 h-3.5 mr-1" />
                      A3 ({a3Pages}p)
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-muted/30">
          <PDFPreview state={state} allLogos={logos} />
        </div>
      </div>
    </>
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
