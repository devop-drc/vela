import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface IntegrationContextType {
  runWithIntegrationCheck: (action: () => void) => Promise<void>;
  isPromptOpen: boolean;
  closePrompt: () => void;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export const IntegrationProvider = ({ children }: { children: ReactNode }) => {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  // Shared AuthProvider user id instead of a network getUser() on every check.
  const { userId } = useAuth();
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const checkIntegration = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return false;
    const { data } = await supabase.from('integrations').select('id').eq('user_id', uid).in('provider', ['instagram', 'facebook']).limit(1).maybeSingle();
    return !!data;
  }, []);

  const promptForIntegration = () => {
    setIsPromptOpen(true);
  };

  const closePrompt = () => {
    setIsPromptOpen(false);
  };

  const runWithIntegrationCheck = async (action: () => void) => {
    const isConnected = await checkIntegration();
    if (isConnected) {
      action();
    } else {
      promptForIntegration();
    }
  };

  return (
    <IntegrationContext.Provider value={{ runWithIntegrationCheck, isPromptOpen, closePrompt }}>
      {children}
    </IntegrationContext.Provider>
  );
};

export const useIntegration = () => {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  return context;
};