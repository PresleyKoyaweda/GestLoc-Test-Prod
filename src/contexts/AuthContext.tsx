import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'owner' | 'tenant';
  phone?: string;
  avatar?: string;
  address?: {
    street: string;
    apartment?: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;
  };
  preferences?: {
    language: 'fr' | 'en';
    currency: 'CAD' | 'USD' | 'EUR';
    theme: 'light' | 'dark';
    notifications: boolean;
    aiCommunication?: 'email' | 'sms';
  };
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string, 
    password: string,
    expectedRole: 'owner' | 'tenant'
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'owner' | 'tenant';
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initialisation de l\'authentification...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('⚠️ Erreur session:', error.message);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('👤 Session trouvée pour:', session.user.email);
          await loadUserProfile(session.user.id);
        } else {
          console.log('🔓 Aucune session active');
          if (mounted) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ Erreur initialisation auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadUserProfile = async (userId: string) => {
      try {
        console.log('📋 Chargement du profil pour:', userId);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('❌ Erreur chargement profil:', error.message);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (profile && mounted) {
          console.log('✅ Profil chargé:', { role: profile.role, email: profile.email });
          
          const userData: User = {
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            role: profile.role || 'tenant',
            phone: profile.phone,
            address: profile.address,
            preferences: profile.preferences
          };
          
          setUser(userData);
        }
      } catch (error) {
        console.error('❌ Erreur profil:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initialiser
    initializeAuth();

    // Écouter les changements d'authentification
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log('🔄 Auth state change:', event);

    // ✅ Fix: nettoyer l’URL après signup/login
    if (window.location.hash.includes("access_token")) {
      window.history.replaceState({}, document.title, "/");
    }
    
    if (event === 'SIGNED_IN' && session?.user && mounted) {
      console.log('✅ Connexion détectée pour:', session.user.email);
      setLoading(true);
      await loadUserProfile(session.user.id);
    } else if (event === 'SIGNED_OUT' && mounted) {
      console.log('🔓 Déconnexion détectée');
      setUser(null);
      setLoading(false);
    }
  }
);


    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'owner' | 'tenant';
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('📝 Création de compte:', userData.email, 'rôle:', userData.role);

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role
          }
        }
      });

      if (error) {
        console.error('❌ Erreur signup:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ Utilisateur créé:', data.user.id);
        
        // Attendre que le trigger crée le profil
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Vérifier que le profil a été créé avec le bon rôle
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          console.warn('⚠️ Trigger échoué, création manuelle du profil...');
          
          // Créer le profil manuellement
          const { error: manualError } = await supabase.rpc('ensure_user_profile', {
            user_id_param: data.user.id,
            email_param: userData.email,
            first_name_param: userData.first_name,
            last_name_param: userData.last_name,
            role_param: userData.role
          });

          if (manualError) {
            console.error('❌ Erreur création manuelle:', manualError);
            return { success: false, error: 'Erreur lors de la création du profil' };
          }
        }

        console.log('✅ Profil créé avec rôle:', userData.role);
        return { success: true };
      }

      return { success: false, error: 'Erreur lors de la création du compte' };
    } catch (error) {
      console.error('❌ Erreur générale signup:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la création du compte' 
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
    expectedRole: 'owner' | 'tenant'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('🔐 Connexion pour:', email, 'rôle attendu:', expectedRole);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Erreur connexion:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ Authentification réussie, vérification du profil...');
        
        // Attendre un peu pour que le profil soit disponible
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ Profil introuvable:', profileError?.message);
          return { success: false, error: 'Profil utilisateur introuvable' };
        }

        console.log('📋 Profil trouvé - Rôle:', profile.role, 'Attendu:', expectedRole);
        
        if (profile.role !== expectedRole) {
          console.error('❌ Rôle incorrect:', profile.role, 'vs', expectedRole);
          await supabase.auth.signOut(); // Déconnecter immédiatement
          return {
            success: false,
            error: `Ce compte est enregistré comme ${profile.role === 'owner' ? 'propriétaire' : 'locataire'}, pas comme ${expectedRole === 'owner' ? 'propriétaire' : 'locataire'}.`
          };
        }

        const userData: User = {
          id: data.user.id,
          email: data.user.email!,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          role: profile.role,
          phone: profile.phone,
          address: profile.address,
          preferences: profile.preferences
        };

        console.log('✅ Connexion réussie pour:', userData.role);
        setUser(userData);
        return { success: true };
      }

      return { success: false, error: 'Email ou mot de passe incorrect' };
    } catch (error) {
      console.error('❌ Erreur générale connexion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🔓 Déconnexion...');
      setUser(null);
      await supabase.auth.signOut();
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};