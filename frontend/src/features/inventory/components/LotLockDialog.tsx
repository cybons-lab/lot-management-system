/**
 * LotLockDialog.tsx
 *
 * ロットロック確認ダイアログ
 */

import { useState } from "react";
import { Button, Label, Textarea } from "@/components/ui";
import { FormDialog } from "@/shared/components/form";

interface LotLockDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    isSubmitting: boolean;
    lotNumber?: string;
}

export function LotLockDialog({
    open,
    onClose,
    onConfirm,
    isSubmitting,
    lotNumber,
}: LotLockDialogProps) {
    const [reason, setReason] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onConfirm(reason);
    };

    return (
        <FormDialog
            open={open}
            onClose={onClose}
            title="ロットのロック"
            description={`ロット ${lotNumber} をロックします。ロックされたロットは引当対象から除外されます。`}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="lock_reason">ロック理由 *</Label>
                    <Textarea
                        id="lock_reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="例: 品質調査のため一時保留"
                        required
                        className="min-h-[100px]"
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        キャンセル
                    </Button>
                    <Button type="submit" variant="destructive" disabled={isSubmitting || !reason.trim()}>
                        {isSubmitting ? "ロック中..." : "ロックする"}
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}
