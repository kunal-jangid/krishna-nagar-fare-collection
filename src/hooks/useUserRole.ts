import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useUserRole = () => {
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userEmail = user.email || null;
        setEmail(userEmail);

        // Fetch role from the user_roles table in Supabase
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('email', userEmail)
          .single();

        if (data && !error) {
          setRole(data.role as 'admin' | 'editor' | 'viewer');
        } else {
          setRole('viewer'); // Default fallback
        }
      }
    };
    fetchRole();
  }, []);

  return { role, email };
};
