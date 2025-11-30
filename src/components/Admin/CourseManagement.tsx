import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Club {
  id: string;
  name: string;
}

interface Hole {
  hole_number: number;
  stroke_index: number;
  par: number;
}

export default function CourseManagement() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [holes, setHoles] = useState<Hole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    if (selectedClub) {
      loadCourseData();
    }
  }, [selectedClub]);

  const loadClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClubs(data || []);

      if (data && data.length > 0) {
        setSelectedClub(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseData = async () => {
    try {
      const { data, error } = await supabase
        .from('course_holes')
        .select('hole_number, stroke_index, par')
        .eq('club_id', selectedClub)
        .order('hole_number');

      if (error) throw error;

      if (data && data.length === 18) {
        setHoles(data);
      } else {
        const defaultHoles: Hole[] = Array.from({ length: 18 }, (_, i) => ({
          hole_number: i + 1,
          stroke_index: i + 1,
          par: i + 1 <= 6 || (i + 1 >= 13 && i + 1 <= 16) ? 4 : i + 1 === 9 || i + 1 === 18 ? 5 : 3,
        }));
        setHoles(defaultHoles);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const validateCourse = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    const strokeIndexes = holes.map(h => h.stroke_index).sort((a, b) => a - b);
    const expectedIndexes = Array.from({ length: 18 }, (_, i) => i + 1);

    const missingIndexes = expectedIndexes.filter(idx => !strokeIndexes.includes(idx));
    const duplicateIndexes = strokeIndexes.filter((idx, i) => strokeIndexes.indexOf(idx) !== i);

    if (missingIndexes.length > 0) {
      errors.push(`Stroke index manquants : ${missingIndexes.join(', ')}`);
    }

    if (duplicateIndexes.length > 0) {
      errors.push(`Stroke index en double : ${[...new Set(duplicateIndexes)].join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const validation = validateCourse();
    if (!validation.valid) {
      setError(validation.errors.join(' • '));
      setSaving(false);
      return;
    }

    try {
      await supabase
        .from('course_holes')
        .delete()
        .eq('club_id', selectedClub);

      const holesData = holes.map(hole => ({
        club_id: selectedClub,
        hole_number: hole.hole_number,
        stroke_index: hole.stroke_index,
        par: hole.par,
      }));

      const { error } = await supabase
        .from('course_holes')
        .insert(holesData);

      if (error) throw error;

      setSuccess('Parcours sauvegardé avec succès !');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateHole = (holeNumber: number, field: 'stroke_index' | 'par', value: number) => {
    setHoles(prev =>
      prev.map(h =>
        h.hole_number === holeNumber ? { ...h, [field]: value } : h
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const totalPar = holes.reduce((sum, hole) => sum + hole.par, 0);
  const strokeIndexes = holes.map(h => h.stroke_index).sort((a, b) => a - b);
  const expectedIndexes = Array.from({ length: 18 }, (_, i) => i + 1);
  const missingIndexes = expectedIndexes.filter(idx => !strokeIndexes.includes(idx));
  const duplicateIndexes = strokeIndexes.filter((idx, i) => strokeIndexes.indexOf(idx) !== i);
  const uniqueDuplicates = [...new Set(duplicateIndexes)];

  const hasValidationErrors = missingIndexes.length > 0 || uniqueDuplicates.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Gestion des Parcours</h2>
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
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Sélectionner un club
          </label>
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            {clubs.map(club => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-600">
            <strong>Stroke Index :</strong> Indique la difficulté du trou (1 = plus difficile, 18 = plus facile).
            Les coups de handicap sont donnés en commençant par le trou avec le stroke index 1.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-900">Trou</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-900">Stroke Index</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-900">Par</th>
              </tr>
            </thead>
            <tbody>
              {holes.map(hole => (
                <tr key={hole.hole_number} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">
                    Trou {hole.hole_number}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={hole.stroke_index}
                      onChange={(e) => updateHole(hole.hole_number, 'stroke_index', parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="3"
                      max="5"
                      value={hole.par}
                      onChange={(e) => updateHole(hole.hole_number, 'par', parseInt(e.target.value) || 4)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg space-y-3">
          <h3 className="font-semibold text-slate-900 mb-3">Validation du parcours</h3>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Total Par du parcours :</span>
            <span className={`text-lg font-bold ${totalPar === 72 ? 'text-emerald-600' : totalPar >= 70 && totalPar <= 73 ? 'text-amber-600' : 'text-red-600'}`}>
              {totalPar}
              {totalPar === 72 ? ' ✓' : totalPar >= 70 && totalPar <= 73 ? ' ⚠️' : ' ✗'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              {missingIndexes.length === 0 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-emerald-700">Tous les stroke index (1-18) sont présents</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">
                    Stroke index manquants : <strong>{missingIndexes.join(', ')}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-start gap-2">
              {uniqueDuplicates.length === 0 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-emerald-700">Aucun stroke index en double</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">
                    Stroke index en double : <strong>{uniqueDuplicates.join(', ')}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving || hasValidationErrors}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer le parcours
              </>
            )}
          </button>
          {hasValidationErrors && (
            <p className="mt-2 text-sm text-red-600">
              Corrigez les erreurs de validation avant d'enregistrer
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
