import { useContext } from 'react';
import { SyncContext } from '@/contexts/syncContext';

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
