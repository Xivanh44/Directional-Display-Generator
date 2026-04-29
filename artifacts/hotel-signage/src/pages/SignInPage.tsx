import { useState, FormEvent } from 'react';
import { useSignIn } from '@clerk/react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

export function SignInPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: identifier.trim(), password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        setLocation('/app');
      } else {
        setError('Connexion incomplète. Veuillez réessayer.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      if (clerkErr?.errors?.[0]?.message) {
        const msg = clerkErr.errors[0].message.toLowerCase();
        if (msg.includes('identifier') || msg.includes('password') || msg.includes('invalid')) {
          setError('Identifiant ou mot de passe incorrect.');
        } else {
          setError(clerkErr.errors[0].message);
        }
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
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
          {/* Header */}
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

          {/* Form */}
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

            <Button type="submit" className="w-full" size="lg" disabled={loading || !isLoaded}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-muted-foreground">
              Les accès sont créés par le manageur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
