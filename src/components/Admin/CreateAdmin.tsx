import { useState } from 'react';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CreateAdmin() {
  const [email, setEmail] = useState('admin@champes2025');
  const [password, setPassword] = useState('Champes2025');
  const [firstName, setFirstName] = useState('Admin');
  const [lastName, setLastName] = useState('Champe');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: adminError } = await supabase.from('admin_users').insert({
          user_id: authData.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
        });

        if (adminError) throw adminError;

        await supabase.auth.signOut();

        setMessage({
          type: 'success',
          text: 'Compte administrateur créé avec succès ! Connectez-vous maintenant.',
        });

        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error creating admin:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la création du compte',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <Shield className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Créer le compte Admin</h1>
            <p className="text-sm text-slate-600 mt-2">
              Configuration initiale du système
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-emerald-900' : 'text-red-900'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Pourra être modifié après la création
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Création...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Créer le compte administrateur
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-600 text-center">
              Ce formulaire est accessible uniquement lors de la première configuration.
              Après création, accédez au système avec vos identifiants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
