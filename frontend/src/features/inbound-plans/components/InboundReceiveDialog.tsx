// Inbound plan receive dialog component
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { components } from '@/shared/types/openapi';

type InboundPlan = components['schemas']['InboundPlanResponse'];
type ExpectedLot = components['schemas']['ExpectedLotResponse'];

// ロット番号入力スキーマ
const lotNumberSchema = z.object({
    lot_number: z.string().min(1, 'ロット番号を入力してください'),
});

type LotNumberFormData = z.infer<typeof lotNumberSchema>;

// 入庫確定リクエストスキーマ
const receiveFormSchema = z.object({
    lots: z.array(
        z.object({
            expected_lot_id: z.number(),
            lot_number: z.string().min(1),
        })
    ),
});

type ReceiveFormData = z.infer<typeof receiveFormSchema>;

interface InboundReceiveDialogProps {
    inboundPlan: InboundPlan;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onReceive: (data: ReceiveFormData) => Promise<void>;
}

export function InboundReceiveDialog({
    inboundPlan,
    open,
    onOpenChange,
    onReceive,
}: InboundReceiveDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 各expected_lotごとのロット番号フォーム
    const lotForms = inboundPlan.lines?.flatMap((line) =>
        line.expected_lots?.map((lot) => ({
            expected_lot_id: lot.id,
            product_name: line.product_name,
            planned_quantity: lot.planned_quantity,
            unit: line.unit,
        }))
    ) || [];

    // ロット番号の状態管理
    const [lotNumbers, setLotNumbers] = useState<Record<number, string>>({});

    const handleLotNumberChange = (expectedLotId: number, value: string) => {
        setLotNumbers((prev) => ({
            ...prev,
            [expectedLotId]: value,
        }));
    };

    const handleSubmit = async () => {
        // バリデーション
        const lots = lotForms.map((lot) => ({
            expected_lot_id: lot.expected_lot_id,
            lot_number: lotNumbers[lot.expected_lot_id] || '',
        }));

        // 空のロット番号チェック
        const emptyLots = lots.filter((lot) => !lot.lot_number);
        if (emptyLots.length > 0) {
            // エラー表示（TODO: より良いエラー表示）
            alert('全てのロット番号を入力してください');
            return;
        }

        setIsSubmitting(true);
        try {
            await onReceive({ lots });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to receive inbound plan:', error);
            // エラーハンドリング（TODO: トースト表示）
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>入庫確定 - {inboundPlan.plan_number}</DialogTitle>
                    <DialogDescription>
                        各ロットのロット番号を入力してください。本番環境では必須です。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {lotForms.map((lot, index) => (
                        <div key={lot.expected_lot_id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium">{lot.product_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        数量: {lot.planned_quantity} {lot.unit}
                                    </p>
                                </div>
                                <span className="text-sm text-muted-foreground">#{index + 1}</span>
                            </div>

                            <div>
                                <label className="text-sm font-medium">
                                    ロット番号 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="ロット番号を入力"
                                    value={lotNumbers[lot.expected_lot_id] || ''}
                                    onChange={(e) => handleLotNumberChange(lot.expected_lot_id, e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        入庫確定
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
