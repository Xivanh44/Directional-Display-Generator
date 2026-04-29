import { useState, FormEvent } from 'react';
import { useSignIn } from '@clerk/react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

export function SignInPage() {
  const { signIn, setActive } = useSignIn();
  const [, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier.trim().toLowerCase(), password }),
      });

      const data = await res.json() as { token?: string; clerkEmail?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Identifiant ou mot de passe incorrect.');
        return;
      }

      if (!data.token) {
        setError("Erreur d'authentification. Veuillez réessayer.");
        return;
      }

      // Try useSignIn hook first; fall back to window.Clerk if not yet loaded
      const clerkSignIn = signIn ?? (window as any).Clerk?.client?.signIn;
      const clerkSetActive = setActive ?? ((window as any).Clerk?.setActive?.bind((window as any).Clerk));

      if (!clerkSignIn) {
        setError('Service non disponible. Veuillez ouvrir la page dans un nouvel onglet.');
        return;
      }

      // Step 1: identify the user so Clerk accepts the ticket strategy
      let attempt = await clerkSignIn.create({ identifier: data.clerkEmail });

      // Step 2: if identifier was accepted, attempt the ticket as first factor
      if (attempt.status === 'needs_first_factor') {
        attempt = await clerkSignIn.attemptFirstFactor({ strategy: 'ticket', ticket: data.token });
      } else if (attempt.status !== 'complete') {
        // Fallback: try direct ticket creation (works on some Clerk configs)
        attempt = await clerkSignIn.create({ strategy: 'ticket', ticket: data.token });
      }

      if (attempt.status === 'complete') {
        await clerkSetActive({ session: attempt.createdSessionId });
        setLocation('/app');
      } else if (attempt.status === 'needs_second_factor') {
        setError('Authentification à deux facteurs non supportée.');
      } else {
        setError(`Connexion incomplète. Veuillez réessayer.`);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { code: string; message: string }[] };
      if (clerkErr?.errors?.[0]) {
        setError(clerkErr.errors[0].message);
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#EAE3D2] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center border-b border-border/40">
            <img
              src={`${basePath}/logo.svg`}
              alt="Hôtel"
              className="h-14 mx-auto mb-4"
            />
            <h1 className="text-xl font-normal tracking-wide text-zinc-900" style={{ fontFamily: 'Georgia, serif' }}>
              Connexion
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Accédez à votre espace</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-sm">Identifiant</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Votre identifiant"
                required
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-white pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connexion…</>
                : 'Se connecter'}
            </Button>
          </form>

          <div className="px-8 pb-6 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Les accès sont créés par le manageur.
            </p>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Ouvrir dans un nouvel onglet ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
