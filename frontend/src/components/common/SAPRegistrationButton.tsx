import { Send } from "lucide-react";
import { useState } from "react";

import { SAPRegistrationDialog } from "./SAPRegistrationDialog";

import { Badge, Button } from "@/components/ui";
import { useConfirmedOrderLines } from "@/hooks/useConfirmedOrderLines";

export function SAPRegistrationButton() {
    const [isOpen, setIsOpen] = useState(false);
    const { data: confirmedLines = [], isLoading } = useConfirmedOrderLines();

    const count = confirmedLines.length;

    if (isLoading || count === 0) {
        return null;
    }

    return (
        <>
            <Button
                className="fixed right-4 top-20 z-50 gap-2 shadow-lg"
                onClick={() => setIsOpen(true)}
            >
                <Send className="h-4 w-4" />
                SAP受注登録
                <Badge variant="secondary" className="ml-1">
                    {count}
                </Badge>
            </Button>

            <SAPRegistrationDialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                confirmedLines={confirmedLines}
            />
        </>
    );
}
