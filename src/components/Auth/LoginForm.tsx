import { useState } from 'react';
import { LogIn, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LoginFormProps {
  onClose?: () => void;
}

export default function LoginForm({ onClose }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message || 'Email ou mot de passe incorrect');
      setLoading(false);
    } else {
      if (onClose) {
        onClose();
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setResetSuccess(true);
    } catch (error: any) {
      setError(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  if (showResetPassword) {
    return (
      <div className={onClose ? "" : "min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-slate-50 flex items-center justify-center p-4"}>
        <div className={onClose ? "w-full" : "w-full max-w-md"}>
          <div className={onClose ? "" : "bg-white rounded-2xl shadow-xl p-8 border border-slate-200"}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Réinitialiser le mot de passe</h1>
              <p className="text-sm text-slate-600 mt-2">
                Entrez votre email pour recevoir un lien
              </p>
            </div>

            {resetSuccess ? (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-900">
                  Un email de réinitialisation a été envoyé à votre adresse.
                  Vérifiez votre boîte de réception.
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-900">{error}</p>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="votre.email@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Mail className="h-5 w-5" />
                        Envoyer le lien
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetSuccess(false);
                  setError('');
                }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={onClose ? "" : "min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-slate-50 flex items-center justify-center p-4"}>
      <div className={onClose ? "w-full" : "w-full max-w-md"}>
        <div className={onClose ? "" : "bg-white rounded-2xl shadow-xl p-8 border border-slate-200"}>
          {!onClose && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <LogIn className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Connexion Capitaine</h1>
              <p className="text-sm text-slate-600 mt-2">
                Championnat Champe 2024-2025
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="votre.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="text-center">
              <button
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
            {!onClose && (
              <>
                <p className="text-sm text-slate-600 text-center mt-4">
                  Première connexion ? Contactez l'administrateur pour créer votre compte.
                </p>
                <div className="mt-4 text-center">
                  <a
                    href="?setup=admin"
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Configuration initiale
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
