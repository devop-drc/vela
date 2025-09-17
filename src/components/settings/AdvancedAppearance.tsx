import { motion } from "framer-motion";
import { useAppearance } from "@/contexts/AppearanceContext";
import { ColorInput } from "./ColorInput";

export const AdvancedAppearance = () => {
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
                    <ColorInput label="Background" value={settings['--background']} onChange={(v) => updateSetting('--background', v)} />
                    <ColorInput label="Foreground / Text" value={settings['--foreground']} onChange={(v) => updateSetting('--foreground', v)} />
                    <ColorInput label="Card Background" value={settings['--card']} onChange={(v) => updateSetting('--card', v)} />
                    <ColorInput label="Primary Button" value={settings['--primary']} onChange={(v) => updateSetting('--primary', v)} />
                    <ColorInput label="Primary Button Text" value={settings['--primary-foreground']} onChange={(v) => updateSetting('--primary-foreground', v)} />
                </div>
            </div>
        </motion.div>
    );
};