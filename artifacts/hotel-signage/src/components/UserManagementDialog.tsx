import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { Users, Plus, Trash2, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

interface UserEntry {
  id: string;
  username: string | null;
  role: string;
  createdAt: number;
}

export function UserManagementDialog() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'utilisateur' | 'manager'>('utilisateur');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur');
      setUsers(await res.json());
    } catch (e: any) {
      setError(e.message ?? 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchUsers();
  }, [open]);

  const handleCreate = async () => {
    setCreateError('');
    if (!username.trim()) { setCreateError("L'identifiant est requis"); return; }
    if (password.length < 8) { setCreateError('Le mot de passe doit faire au moins 8 caractères'); return; }
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/admin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      setUsername('');
      setPassword('');
      setRole('utilisateur');
      await fetchUsers();
    } catch (e: any) {
      setCreateError(e.message ?? 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Erreur');
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const roleLabel = (r: string) =>
    r === 'manager' ? 'Manageur' : 'Utilisateur';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Utilisateurs
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Gestion des utilisateurs</DialogTitle>
        </DialogHeader>

        {/* Create form */}
        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Créer un compte
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="new-username" className="text-sm">Identifiant</Label>
            <Input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: jdupont"
              maxLength={30}
              className="bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-sm">Mot de passe</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 caractères"
                className="bg-white pr-10"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
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

          <div className="space-y-1.5">
            <Label className="text-sm">Rôle</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utilisateur">Utilisateur</SelectItem>
                <SelectItem value="manager">Manageur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {createError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
              {createError}
            </p>
          )}

          <Button
            onClick={handleCreate}
            disabled={creating}
            size="sm"
            className="w-full gap-1.5"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {creating ? 'Création…' : 'Créer le compte'}
          </Button>
        </div>

        {/* User list */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Comptes existants
          </p>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !loading && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
              {error}
            </p>
          )}

          {!loading && users.length === 0 && !error && (
            <p className="text-xs text-muted-foreground py-4 text-center">Aucun utilisateur trouvé</p>
          )}

          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-2 rounded-md border bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.username ?? '—'}</p>
                  <p className="text-[11px] text-muted-foreground">{roleLabel(u.role)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  className={cn(
                    'text-muted-foreground hover:text-destructive shrink-0 transition-colors',
                    deletingId === u.id && 'opacity-50 pointer-events-none'
                  )}
                  title="Supprimer"
                >
                  {deletingId === u.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
