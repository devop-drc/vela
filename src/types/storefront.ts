import * as LucideIcons from 'lucide-react';

export interface StorefrontAnnouncement {
  id: string;
  message: string;
  icon_name: keyof typeof LucideIcons; // Use keyof typeof LucideIcons for icon_name
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}