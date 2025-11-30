import { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function DatabaseBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [restoreData, setRestoreData] = useState<string>('');

  const tables = [
    'clubs',
    'teams',
    'players',
    'seasons',
    'matches',
    'individual_matches',
    'match_player_selections',
    'captains',
    'admin_users',
    'scratch_notifications'
  ];

  const handleBackup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const backup: any = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {}
      };

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (error) throw new Error(`Erreur lors de la sauvegarde de ${table}: ${error.message}`);
        backup.data[table] = data;
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Sauvegarde créée avec succès !');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreData.trim()) {
      setError('Veuillez coller les données de sauvegarde');
      return;
    }

    if (!confirm('⚠️ ATTENTION : Cette action va ÉCRASER TOUTES les données actuelles. Êtes-vous sûr de vouloir continuer ?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const backup = JSON.parse(restoreData);

      if (!backup.version || !backup.data) {
        throw new Error('Format de sauvegarde invalide');
      }

      for (const table of tables) {
        if (!backup.data[table]) continue;

        await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        const { error } = await supabase
          .from(table)
          .insert(backup.data[table]);

        if (error) throw new Error(`Erreur lors de la restauration de ${table}: ${error.message}`);
      }

      setSuccess('Base de données restaurée avec succès !');
      setRestoreData('');

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Sauvegarde et Restauration</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Créer une sauvegarde
        </h3>
        <p className="text-slate-600 mb-4">
          Télécharge une copie complète de la base de données au format JSON. Conservez ce fichier en lieu sûr.
        </p>
        <button
          onClick={handleBackup}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Télécharger la sauvegarde
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Restaurer une sauvegarde
        </h3>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">⚠️ ATTENTION</p>
              <p>La restauration va ÉCRASER TOUTES les données actuelles de la base. Cette action est irréversible. Créez une sauvegarde avant de continuer.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Charger un fichier de sauvegarde
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ou coller les données JSON
            </label>
            <textarea
              value={restoreData}
              onChange={(e) => setRestoreData(e.target.value)}
              placeholder='{"version": "1.0", "timestamp": "...", "data": {...}}'
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-xs"
            />
          </div>

          <button
            onClick={handleRestore}
            disabled={loading || !restoreData.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Restauration en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Restaurer la base de données
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
