import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppearance } from "@/contexts/AppearanceContext";
import { ColorPickerInput } from "./ColorPickerInput";

export const AdvancedPanel = () => {
    const { t } = useTranslation();
    const { settings, updateSetting } = useAppearance();

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pt-8"
        >
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">{t('studio_panels.custom_colors')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ColorPickerInput label={t('studio_panels.color_background')} value={settings['--background']} onChange={(v) => updateSetting('--background', v)} />
                    <ColorPickerInput label={t('studio_panels.color_foreground_text')} value={settings['--foreground']} onChange={(v) => updateSetting('--foreground', v)} />
                    <ColorPickerInput label={t('studio_panels.color_card_background')} value={settings['--card']} onChange={(v) => updateSetting('--card', v)} />
                    <ColorPickerInput label={t('studio_panels.color_primary_button')} value={settings['--primary']} onChange={(v) => updateSetting('--primary', v)} />
                    <ColorPickerInput label={t('studio_panels.color_primary_button_text')} value={settings['--primary-foreground']} onChange={(v) => updateSetting('--primary-foreground', v)} />
                    <ColorPickerInput label={t('studio_panels.color_secondary_background')} value={settings['--secondary']} onChange={(v) => updateSetting('--secondary', v)} />
                    <ColorPickerInput label={t('studio_panels.color_secondary_text')} value={settings['--secondary-foreground']} onChange={(v) => updateSetting('--secondary-foreground', v)} />
                    <ColorPickerInput label={t('studio_panels.color_accent_hover')} value={settings['--accent']} onChange={(v) => updateSetting('--accent', v)} />
                    <ColorPickerInput label={t('studio_panels.color_accent_text')} value={settings['--accent-foreground']} onChange={(v) => updateSetting('--accent-foreground', v)} />
                    <ColorPickerInput label={t('studio_panels.color_borders_inputs')} value={settings['--border']} onChange={(v) => updateSetting('--border', v)} />
                    <ColorPickerInput label={t('studio_panels.color_focus_ring')} value={settings['--ring']} onChange={(v) => updateSetting('--ring', v)} />
                    <ColorPickerInput label={t('studio_panels.color_destructive_error')} value={settings['--destructive']} onChange={(v) => updateSetting('--destructive', v)} />
                    <ColorPickerInput label={t('studio_panels.color_warning')} value={settings['--warning']} onChange={(v) => updateSetting('--warning', v)} />
                    <ColorPickerInput label={t('studio_panels.color_informational')} value={settings['--info']} onChange={(v) => updateSetting('--info', v)} />
                </div>
            </div>
        </motion.div>
    );
};