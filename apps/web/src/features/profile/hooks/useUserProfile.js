import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../../shared/config/firebase';
import { EXAM_BLUEPRINTS } from '@unjbg-pre/shared';

const WHATSAPP_PREMIUM = 'https://wa.me/519XXXXXXXXX?text=Hola,%20deseo%20activar%20mi%20cuenta%20Premium%20en%20UNJBG%20Prep';

const isE2EMockEnabled = () => typeof window !== 'undefined' && !!window.__TEST_E2E__;

export function useUserProfile(user) {
  const [profile, setProfile] = useState(null);
  const [careerOptions, setCareerOptions] = useState([]);
  const [scoreStats, setScoreStats] = useState({
    isPremium: false,
    racha_actual: 0,
    nivel: 'Novato',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const channelOptions = useMemo(() => {
    const keys = Object.keys(EXAM_BLUEPRINTS?.cepu || {});
    return keys.map((key) => ({
      value: key,
      label: key.replace('canal', 'Canal '),
    }));
  }, []);

  const loadProfile = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);

    if (isE2EMockEnabled()) {
      const mockProfile = window.__TEST_PROFILE__ || {
        displayName: user.displayName || 'Test User',
        email: user.email || 'test@example.com',
        photoURL: '',
        carrera_objetivo: '',
        canal_objetivo: '',
        colegio_tipo: '',
        distrito: '',
      };

      const mockCareers = Array.isArray(window.__TEST_CAREERS__) ? window.__TEST_CAREERS__ : [];
      const mockScore = window.__TEST_SCORE__ || {};

      window.__TEST_PROFILE__ = { ...mockProfile };

      setCareerOptions(mockCareers);
      setScoreStats({
        isPremium: !!mockScore.isPremium,
        racha_actual: mockScore.racha_actual || 0,
        nivel: mockScore.nivel || 'Novato',
      });
      setProfile({ ...mockProfile });
      setLoading(false);
      return;
    }

    try {
      const [userSnap, scoreSnap, careersSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDoc(doc(db, 'user_scores', user.uid)),
        getDocs(collection(db, 'carreras_stats')),
      ]);

      const userData = userSnap.exists() ? userSnap.data() : {};
      const scoreData = scoreSnap.exists() ? scoreSnap.data() : {};

      const careers = careersSnap.docs.map((c) => ({
        id: c.id,
        nombre: c.data()?.nombre || c.data()?.carrera || c.id,
      }));

      setCareerOptions(careers);
      setScoreStats({
        isPremium: !!scoreData.isPremium,
        racha_actual: scoreData.racha_actual || 0,
        nivel: scoreData.nivel || 'Novato',
      });

      setProfile({
        displayName: userData.displayName || user.displayName || '',
        email: userData.email || user.email || '',
        photoURL: userData.photoURL || user.photoURL || '',
        carrera_objetivo: userData.carrera_objetivo || '',
        canal_objetivo: userData.canal_objetivo || '',
        colegio_tipo: userData.colegio_tipo || '',
        distrito: userData.distrito || '',
      });
    } catch (loadError) {
      console.error('Error cargando perfil:', loadError);
      setError('No se pudo cargar tu perfil. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.displayName, user?.email, user?.photoURL]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(async (changes) => {
    if (!user?.uid) return;
    setSaving(true);
    setError(null);

    if (isE2EMockEnabled()) {
      const nextProfile = { ...(window.__TEST_PROFILE__ || {}), ...changes };
      window.__TEST_PROFILE__ = nextProfile;
      setProfile(nextProfile);
      setSaving(false);
      return { success: true };
    }

    try {
      const fn = httpsCallable(getFunctions(), 'updateUserProfile');
      await fn(changes);
      setProfile((prev) => ({ ...prev, ...changes }));
      return { success: true };
    } catch (saveError) {
      console.error('Error guardando perfil:', saveError);
      const message = saveError?.message || 'No se pudo guardar los cambios.';
      setError(message);
      return { success: false, message };
    } finally {
      setSaving(false);
    }
  }, [user?.uid]);

  return {
    profile,
    scoreStats,
    careerOptions,
    channelOptions,
    loading,
    saving,
    error,
    saveProfile,
    reloadProfile: loadProfile,
    whatsappUrl: WHATSAPP_PREMIUM,
  };
}
