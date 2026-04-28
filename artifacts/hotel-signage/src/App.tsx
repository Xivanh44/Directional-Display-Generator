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
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Minus, Upload, X, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { useLogos } from "@/hooks/use-logos";
import {
  generatePDF,
  generateAllVariantsPDF,
  SignageState,
  PaperFormat,
  ArrowType,
  TEXT_OPTIONS,
  SignageText,
} from "@/lib/pdf-generator";
import { PDFPreview } from "@/components/PDFPreview";

const queryClient = new QueryClient();

function Main() {
  const { toast } = useToast();
  const { logos, addLogos, removeLogo } = useLogos();
  const [state, setState] = useState<SignageState>({
    format: 'A4',
    arrow: 'none',
    text: TEXT_OPTIONS[0],
    selectedLogos: []
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (prev.selectedLogos.length >= 6) return prev;
      return { ...prev, selectedLogos: [...prev.selectedLogos, id] };
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
            <Select
              value={state.text}
              onValueChange={(v: SignageText) => setState({ ...state, text: v })}
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
              </SelectContent>
            </Select>
          </div>

          {/* Logos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Logos ({state.selectedLogos.length}/6)</Label>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 text-xs">
                <Upload className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={onFileChange} />
            </div>
            
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
        </div>

        <div className="p-6 border-t mt-auto space-y-2">
          <Button onClick={handleExport} size="lg" className="w-full text-base h-14">
            <FileDown className="w-5 h-5 mr-2" />
            Exporter en PDF
          </Button>
          <Button
            onClick={handleExportAllVariants}
            variant="outline"
            size="lg"
            className="w-full text-sm h-11"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exporter les 3 variantes
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 min-h-[50dvh] md:h-[100dvh] overflow-hidden">
        <PDFPreview state={state} allLogos={logos} />
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
