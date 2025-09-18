import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IntegrationContextType {
  runWithIntegrationCheck: (action: () => void) => Promise<void>;
  isPromptOpen: boolean;
  closePrompt: () => void;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export const IntegrationProvider = ({ children }: { children: ReactNode }) => {
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const checkIntegration = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('integrations').select('id').eq('user_id', user.id).eq('provider', 'facebook').maybeSingle();
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