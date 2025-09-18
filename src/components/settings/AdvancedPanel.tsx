import { motion } from "framer-motion";
import { useAppearance } from "@/contexts/AppearanceContext";
import { ColorPickerInput } from "./ColorPickerInput";

export const AdvancedPanel = () => {
    const { settings, updateSetting } = useAppearance();

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pt-8"
        >
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">Custom Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ColorPickerInput label="Background" value={settings['--background']} onChange={(v) => updateSetting('--background', v)} />
                    <ColorPickerInput label="Foreground / Text" value={settings['--foreground']} onChange={(v) => updateSetting('--foreground', v)} />
                    <ColorPickerInput label="Card Background" value={settings['--card']} onChange={(v) => updateSetting('--card', v)} />
                    <ColorPickerInput label="Primary Button" value={settings['--primary']} onChange={(v) => updateSetting('--primary', v)} />
                    <ColorPickerInput label="Primary Button Text" value={settings['--primary-foreground']} onChange={(v) => updateSetting('--primary-foreground', v)} />
                    <ColorPickerInput label="Secondary Background" value={settings['--secondary']} onChange={(v) => updateSetting('--secondary', v)} />
                    <ColorPickerInput label="Secondary Text" value={settings['--secondary-foreground']} onChange={(v) => updateSetting('--secondary-foreground', v)} />
                    <ColorPickerInput label="Borders" value={settings['--border']} onChange={(v) => updateSetting('--border', v)} />
                    <ColorPickerInput label="Destructive / Error" value={settings['--destructive']} onChange={(v) => updateSetting('--destructive', v)} />
                    <ColorPickerInput label="Warning" value={settings['--warning']} onChange={(v) => updateSetting('--warning', v)} />
                    <ColorPickerInput label="Informational" value={settings['--info']} onChange={(v) => updateSetting('--info', v)} />
                </div>
            </div>
        </motion.div>
    );
};