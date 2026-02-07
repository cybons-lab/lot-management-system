import { LucideIcon } from "lucide-react";
import { SystemSettingItem } from "../SystemSettingItem";
import { SETTING_CONFIGS } from "../../constants/settings";
import type { SystemSetting } from "../../types";
import { ReactNode } from "react";

interface SettingSectionProps {
    title: string;
    icon: LucideIcon;
    iconColor?: string;
    settings: SystemSetting[];
    isSaving: string | null;
    onUpdate: (key: string, value: string) => void;
    children?: ReactNode;
}

export function SettingSection({
    title,
    icon: Icon,
    iconColor = "text-primary",
    settings,
    isSaving,
    onUpdate,
    children,
}: SettingSectionProps) {
    return (
        <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-6">
                <Icon className={`h-5 w-5 ${iconColor}`} />
                <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <div className="space-y-6">
                {settings.map((setting) => (
                    <SystemSettingItem
                        key={setting.config_key}
                        setting={setting}
                        config={SETTING_CONFIGS[setting.config_key]}
                        isSaving={isSaving === setting.config_key}
                        onUpdate={onUpdate}
                    />
                ))}
                {settings.length === 0 && !children && (
                    <p className="text-muted-foreground text-sm">設定項目がありません</p>
                )}
                {children}
            </div>
        </div>
    );
}
