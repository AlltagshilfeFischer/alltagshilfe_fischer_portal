import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Hierarchie: globaladmin > geschaeftsfuehrer > admin (Disponent) > mitarbeiter, buchhaltung
export type UserRole = 'globaladmin' | 'geschaeftsfuehrer' | 'admin' | 'buchhaltung' | 'mitarbeiter' | null;

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [mitarbeiterId, setMitarbeiterId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    async function fetchUserRole() {
      if (!user) {
        if (mountedRef.current) {
          setRole(null);
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (!mountedRef.current) return;
        if (rolesError) throw rolesError;

        const roleList = (userRoles || []).map(r => r.role as UserRole);
        setRoles(roleList);

        // Primäre Rolle bestimmen (höchste Berechtigung)
        if (roleList.includes('globaladmin')) {
          setRole('globaladmin');
        } else if (roleList.includes('geschaeftsfuehrer')) {
          setRole('geschaeftsfuehrer');
        } else if (roleList.includes('admin')) {
          setRole('admin');
        } else if (roleList.includes('buchhaltung')) {
          setRole('buchhaltung');
        } else if (roleList.includes('mitarbeiter')) {
          setRole('mitarbeiter');
        } else {
          setRole(null);
        }

        // Mitarbeiter-ID laden: GlobalAdmin ist NICHT buchbar
        // GF und Mitarbeiter können Einsätze haben
        if (roleList.includes('geschaeftsfuehrer') || roleList.includes('mitarbeiter')) {
          const { data: mitarbeiterData } = await supabase
            .from('mitarbeiter')
            .select('id')
            .eq('benutzer_id', user.id)
            .maybeSingle();

          if (mountedRef.current && mitarbeiterData) {
            setMitarbeiterId(mitarbeiterData.id);
          }
        } else {
          if (mountedRef.current) setMitarbeiterId(null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        if (mountedRef.current) {
          setRole(null);
          setRoles([]);
          setMitarbeiterId(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    fetchUserRole();
    
    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  // === ROLLEN-CHECKS ===
  
  // GlobalAdmin (Root): Uneingeschränkte Rechte, fixer User
  const isGlobalAdmin = role === 'globaladmin';
  
  // Geschäftsführer ODER höher
  const isGeschaeftsfuehrer = role === 'globaladmin' || role === 'geschaeftsfuehrer';
  
  // Disponent (admin) oder höher: Einsatzplanung, Kunden/Mitarbeiter
  const isAdmin = role === 'globaladmin' || role === 'geschaeftsfuehrer' || role === 'admin';
  
  // Disponent-spezifisch (nur admin-Rolle, ohne GF/GlobalAdmin)
  const isDisponent = role === 'admin';
  
  // Buchhaltung
  const isBuchhaltung = roles.includes('buchhaltung');
  
  // Rückwärtskompatibilität
  const isManager = isAdmin;
  
  // Kann deaktivieren/soft-delete: GlobalAdmin und GF
  const canDelete = role === 'globaladmin' || role === 'geschaeftsfuehrer';
  
  // Kann User verwalten (erstellen, Rollen vergeben): GlobalAdmin und GF
  const canManageUsers = role === 'globaladmin' || role === 'geschaeftsfuehrer';
  
  // Ist buchbarer Mitarbeiter (GF oder mitarbeiter, NICHT GlobalAdmin/Disponent/Buchhaltung)
  const isEmployee = role === 'mitarbeiter' || role === 'geschaeftsfuehrer';
  
  // Hat Zugriff auf das System
  const isAuthenticated = role !== null;
  
  const hasRole = (checkRole: UserRole) => roles.includes(checkRole);

  // Rollen-Label für UI
  const getRoleLabel = (r: UserRole): string => {
    switch (r) {
      case 'globaladmin': return 'Admin';
      case 'geschaeftsfuehrer': return 'Geschäftsführer';
      case 'admin': return 'Disponent';
      case 'buchhaltung': return 'Buchhaltung';
      case 'mitarbeiter': return 'Mitarbeiter';
      default: return 'Unbekannt';
    }
  };

  // Rollen-Badge-Variante für UI
  const getRoleBadgeVariant = (r: UserRole): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (r) {
      case 'globaladmin': return 'destructive';
      case 'geschaeftsfuehrer': return 'default';
      case 'admin': return 'secondary';
      case 'buchhaltung': return 'outline';
      case 'mitarbeiter': return 'secondary';
      default: return 'outline';
    }
  };

  return { 
    role, 
    roles,
    loading, 
    mitarbeiterId,
    // Helper
    isGlobalAdmin,
    isGeschaeftsfuehrer,
    isAdmin,
    isDisponent,
    isBuchhaltung,
    isManager,
    canDelete,
    canManageUsers,
    isEmployee,
    isAuthenticated,
    hasRole,
    getRoleLabel,
    getRoleBadgeVariant
  };
}
