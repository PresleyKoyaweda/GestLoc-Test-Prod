/*
  # Correction du problème de création de rôle

  1. Corrections
    - Supprimer le trigger défaillant qui force le rôle "owner"
    - Créer une nouvelle fonction qui respecte le rôle sélectionné
    - Permettre création libre de comptes locataires et propriétaires

  2. Sécurité
    - Maintenir RLS sur toutes les tables
    - Pas de création d'abonnement automatique pour les locataires

  3. Fonctionnalités
    - Création de profil respectant le rôle choisi
    - Abonnement gratuit seulement pour les propriétaires
*/

-- Supprimer l'ancien trigger défaillant
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_profile_for_user();

-- Nouvelle fonction qui respecte le rôle sélectionné
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  -- Récupérer le rôle depuis les métadonnées utilisateur
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');
  
  -- Log pour debugging
  RAISE LOG 'Creating profile for user % with role %', NEW.email, user_role;
  
  -- Créer le profil avec le bon rôle
  INSERT INTO profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    user_role
  );
  
  -- Créer un abonnement gratuit SEULEMENT pour les propriétaires
  IF user_role = 'owner' THEN
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'free', 'active');
    RAISE LOG 'Created free subscription for owner %', NEW.email;
  ELSE
    RAISE LOG 'No subscription created for tenant %', NEW.email;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nouveau trigger avec la fonction corrigée
CREATE TRIGGER create_profile_for_new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();

-- Fonction pour créer manuellement un profil si le trigger échoue
CREATE OR REPLACE FUNCTION ensure_user_profile(
  user_id_param uuid,
  email_param text,
  first_name_param text DEFAULT '',
  last_name_param text DEFAULT '',
  role_param text DEFAULT 'tenant'
)
RETURNS uuid AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Vérifier si le profil existe déjà
  SELECT id INTO profile_id
  FROM profiles
  WHERE id = user_id_param;
  
  -- Si le profil n'existe pas, le créer
  IF profile_id IS NULL THEN
    INSERT INTO profiles (id, email, first_name, last_name, role)
    VALUES (user_id_param, email_param, first_name_param, last_name_param, role_param)
    RETURNING id INTO profile_id;
    
    -- Créer abonnement gratuit pour les propriétaires
    IF role_param = 'owner' THEN
      INSERT INTO subscriptions (user_id, plan, status)
      VALUES (user_id_param, 'free', 'active');
    END IF;
    
    RAISE LOG 'Manual profile created for % with role %', email_param, role_param;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;