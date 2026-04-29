import React, { useState, useRef, useCallback, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, ArrowRight, Minus, Upload, X, FileDown, GripVertical, Plus, ListPlus, Trash2, Image as ImageIcon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  ClerkProvider,
  useUser,
  useClerk,
} from '@clerk/react';
import { SignInPage } from '@/pages/SignInPage';
import { UserManagementDialog } from '@/components/UserManagementDialog';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';

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

// ── Clerk setup ──────────────────────────────────────────────────────────────
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#18181b',
    colorForeground: '#18181b',
    colorMutedForeground: '#71717a',
    colorDanger: '#ef4444',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: '#18181b',
    colorNeutral: '#e4e4e7',
    fontFamily: 'Georgia, serif',
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-xl w-[440px] max-w-full overflow-hidden shadow-xl ring-1 ring-black/5',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#18181b] font-normal tracking-wide',
    headerSubtitle: 'text-[#71717a]',
    socialButtonsBlockButtonText: 'text-[#18181b]',
    formFieldLabel: 'text-[#18181b]',
    footerActionLink: 'text-[#18181b] underline-offset-2',
    footerActionText: 'text-[#71717a]',
    dividerText: 'text-[#71717a]',
    identityPreviewEditButton: 'text-[#18181b]',
    formFieldSuccessText: 'text-green-700',
    alertText: 'text-[#18181b]',
    logoBox: 'mb-1',
    logoImage: 'rounded-md',
    socialButtonsBlockButton: 'border border-[#e4e4e7] bg-white hover:bg-[#fafafa]',
    formButtonPrimary: 'bg-[#18181b] hover:bg-[#27272a] text-white',
    formFieldInput: 'bg-white border-[#e4e4e7] text-[#18181b]',
    footerAction: 'bg-[#fafafa]',
    dividerLine: 'bg-[#e4e4e7]',
    alert: 'bg-[#fef2f2] border-[#fecaca]',
    otpCodeFieldInput: 'border-[#e4e4e7]',
    formFieldRow: '',
    main: '',
  },
};

// ─────────────────────────────────────────────────────────────────────────────

function Main({ isManager }: { isManager: boolean }) {
  const { toast } = useToast();
  const { logos, addLogos, removeLogo } = useLogos();
  const { customTexts, addCustomText, removeCustomText } = useCustomTexts();
  const [state, setState] = useState<SignageState>({
    format: 'A4',
    arrow: 'none',
    text: TEXT_OPTIONS[0],
    selectedLogos: [],
    font: 'Arial',
    customArrowDataUrl: null,
    arrowScale: 1,
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const arrowInputRef = useRef<HTMLInputElement>(null);

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
        setState((prev) => ({ ...prev, customArrowDataUrl: e.target!.result as string }));
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
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      
      {/* Controls Panel */}
      <div className="w-full md:w-[400px] border-r bg-card flex flex-col shrink-0 h-[100dvh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Affichages Hôtel</h1>
              <p className="text-sm text-muted-foreground mt-1">Générateur d'affiches directionnelles</p>
            </div>
            <UserWidget isManager={isManager} />
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

            {/* Custom arrow image — manager only */}
            {isManager && (
              <div className="pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => arrowInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {state.customArrowDataUrl ? 'Changer la flèche' : 'Flèche personnalisée…'}
                  </Button>
                  {state.customArrowDataUrl && (
                    <>
                      <img src={state.customArrowDataUrl} className="h-7 w-7 object-contain rounded border" alt="flèche" />
                      <button
                        type="button"
                        onClick={() => setState({ ...state, customArrowDataUrl: null })}
                        className="text-muted-foreground hover:text-destructive"
                        title="Supprimer la flèche personnalisée"
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

            {/* Arrow size slider — only shown when arrow is active */}
            {state.arrow !== 'none' && (
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

          {/* Police — manager only */}
          {isManager && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Police du bandeau</Label>
              <Select
                value={state.font || 'Arial'}
                onValueChange={(v) => setState({ ...state, font: v })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                const disabled = !isSelected && state.selectedLogos.length >= 8;
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
          {isManager && (
            <Button
              onClick={handleBannerExport}
              variant="outline"
              size="sm"
              className="w-full text-xs h-9"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-2" />
              Exporter le bandeau (PNG)
            </Button>
          )}

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

// ── Auth-aware helper components ─────────────────────────────────────────────

function UserWidget({ isManager }: { isManager: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  if (!user) return null;
  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <div className="flex items-center gap-1.5">
        {isManager && <UserManagementDialog />}
        <span className={cn(
          "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
          isManager ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"
        )}>
          {isManager ? 'Manageur' : 'Utilisateur'}
        </span>
      </div>
      <button
        onClick={() => signOut(() => setLocation('/'))}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        title="Se déconnecter"
      >
        <LogOut className="w-3 h-3" />
        Déconnexion
      </button>
    </div>
  );
}

function LandingPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#EAE3D2] px-4 gap-8">
      <div className="text-center space-y-3">
        <img src={`${basePath}/logo.svg`} alt="Hôtel" className="h-16 mx-auto" />
        <h1 className="text-3xl font-light tracking-widest text-zinc-900 uppercase" style={{ fontFamily: 'Georgia, serif' }}>
          Affichages Hôtel
        </h1>
        <p className="text-zinc-600 text-sm tracking-wide">Générateur d'affiches directionnelles</p>
      </div>
      <Button onClick={() => setLocation('/sign-in')} size="lg" className="px-8">
        Se connecter
      </Button>
    </div>
  );
}

function AppShell() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const isManager = user?.publicMetadata?.role === 'manager';
  if (!user) return <Redirect to="/" />;
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Main isManager={isManager} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function HomeRoute() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  if (user) return <Redirect to="/app" />;
  return <LandingPage />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Switch>
        <Route path="/" component={HomeRoute} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/app" component={AppShell} />
        <Route><Redirect to="/" /></Route>
      </Switch>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
