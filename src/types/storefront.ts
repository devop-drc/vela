export interface StorefrontAnnouncement {
  id: string;
  message: string;
  icon_name: string; // Lucide icon name (resolved via lib/iconLibrary)
  is_active: boolean;
  display_order: number;
  start_date: string | null; // New: Start date for the announcement
  end_date: string | null;   // New: End date for the announcement
  repeat_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none' | null; // New: Repeat interval
  created_at: string;
  updated_at: string;
}