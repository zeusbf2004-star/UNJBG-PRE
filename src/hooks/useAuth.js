import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, syncUserProfile } from '../config/firebase';

/**
 * Hook para gestionar el estado de autenticación de Firebase.
 * Proporciona el usuario actual, el estado de carga y métodos de logout.
 */
export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Soporte para pruebas E2E: inyectar usuario mock si existe en window
        if (window.__TEST_USER__) {
            setUser(window.__TEST_USER__);
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Sincronizar perfil con Firestore al iniciar sesión
                try {
                    await syncUserProfile(currentUser);
                } catch (error) {
                    console.error("Error sincronizando perfil:", error);
                }
            }
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    return {
        user,
        loading,
        logout,
        isAuthenticated: !!user
    };
}
