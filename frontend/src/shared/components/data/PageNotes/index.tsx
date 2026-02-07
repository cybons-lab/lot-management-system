import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { cn } from "@/shared/libs/utils";

interface PageNotesProps {
    /** 現在のメモ内容 */
    value: string;
    /** 保存時のコールバック */
    onSave: (value: string) => void;
    /** 初期状態で展開するかどうか */
    defaultExpanded?: boolean;
    /** ラベル名（デフォルト: "ページ全体のメモ"） */
    label?: string;
    /** プレースホルダー */
    placeholder?: string;
    /** 説明文 */
    description?: string;
    /** 外側のコンテナ用クラス名 */
    className?: string;
}

/**
 * ページレベルのメモを入力・表示する折りたたみ式コンポーネント
 */
export function PageNotes({
    value,
    onSave,
    defaultExpanded = false,
    label = "ページ全体のメモ",
    placeholder = "メモを入力...",
    description,
    className,
}: PageNotesProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [localValue, setLocalValue] = useState(value);

    // 外部からの更新（データロード後など）を同期
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value) {
            onSave(localValue);
        }
    };

    return (
        <div className={cn("border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden", className)}>
            <button
                type="button"
                className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-blue-50/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <StickyNote className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-slate-700">{label}</span>
                {value && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                        入力あり
                    </span>
                )}
                <span className="ml-auto text-slate-400 text-sm">
                    {isExpanded ? "▲" : "▼"}
                </span>
            </button>
            {isExpanded && (
                <div className="px-4 pb-4">
                    <textarea
                        className="w-full min-h-[100px] p-3 border border-blue-200 rounded bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={placeholder}
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        onBlur={handleBlur}
                    />
                    {description && (
                        <p className="mt-2 text-xs text-slate-500">{description}</p>
                    )}
                </div>
            )}
        </div>
    );
}
