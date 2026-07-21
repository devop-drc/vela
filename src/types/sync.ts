import { AnalysisResult } from './analysis';

// This matches the ProductPayload from the backend function
export interface ProductPayload {
  id?: string;
  name?: string;
  caption?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  category?: string;
  details: { [key: string]: string | string[] | number | undefined };
  business_id: string;
  user_id: string;
  status: string;
  instagram_post_id: string;
  media_url: string;
  thumbnail_url?: string;
  media_type: string;
}

export interface SkippedItem {
  instagram_post_id?: string;
  name: string;
  reason: string;
  thumbnail_url?: string;
}

// This is the new summary structure from the backend
export interface SyncJobSummary {
  /** Marks non-sync jobs (rendered separately in the process widget). */
  job_kind?: 'import' | 'bulk_publish';
  failed?: number;
  created: number;
  updated: number;
  skipped: number;
  cache_hits: number;
  skipped_items: SkippedItem[];
  created_items: ProductPayload[];
  updated_items: ProductPayload[];
  total_ai_tokens_used: { prompt: number; candidates: number };
}

export interface SyncJob {
  id: string;
  user_id: string;
  status: 'starting' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  total: number;
  message: string;
  created_at: string;
  updated_at: string;
  summary?: SyncJobSummary | null;
  // The following fields are deprecated with batch processing but kept for type safety
  thumbnail_url?: string | null;
  current_post_caption?: string | null;
  ai_analysis_message?: string | null;
  analysis_result?: AnalysisResult | null;
}

export interface SyncContextType {
  activeJob: SyncJob | null;
  /** Spreadsheet import running in the background (independent of IG sync). */
  activeImportJob: SyncJob | null;
  /** Bulk Instagram publishing job. */
  bulkJob: SyncJob | null;
  /** Active (or just-finished) Remotion video render jobs. */
  videoJobs: any[];
  isSyncing: boolean;
  dismissJob: () => void;
  dismissImportJob: () => void;
  dismissBulkJob: () => void;
  dismissVideoJob: (id: string) => void;
  startNewSync: (jobId: string) => Promise<void>;
}
