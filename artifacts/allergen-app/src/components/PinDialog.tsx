import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pin: string;
}

export default function PinDialog({ open, onClose, onSuccess, pin }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === pin) {
      setValue("");
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setValue("");
    }
  };

  const handleClose = () => {
    setValue("");
    setError(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-xs" data-testid="dialog-pin">
        <DialogHeader>
          <DialogTitle>Accès Responsable</DialogTitle>
          <DialogDescription>
            Saisissez le code PIN pour accéder à la base d'ingrédients.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="pin-input">Code PIN</Label>
            <Input
              id="pin-input"
              type="password"
              inputMode="numeric"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(false); }}
              placeholder="••••"
              maxLength={10}
              autoFocus
              data-testid="input-pin"
            />
            {error && (
              <p className="text-destructive text-xs" data-testid="text-pin-error">
                Code incorrect. Veuillez réessayer.
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose} data-testid="button-pin-cancel">
              Annuler
            </Button>
            <Button type="submit" disabled={!value} data-testid="button-pin-submit">
              Valider
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
