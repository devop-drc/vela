import * as LucideIcons from 'lucide-react';

export interface StorefrontAnnouncement {
  id: string;
  message: string;
  icon_name: keyof typeof LucideIcons; // Use keyof typeof LucideIcons for icon_name
  is_active: boolean;
  display_order: number;
  start_date: string | null; // New: Start date for the announcement
  end_date: string | null;   // New: End date for the announcement
  repeat_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null; // New: Repeat interval
  created_at: string;
  updated_at: string;
}