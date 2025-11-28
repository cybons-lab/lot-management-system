import { Trash2 } from "lucide-react";

import { useAssignmentMutations, useUserAssignments } from "../hooks/useAssignments";

import {
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui";

interface UserSupplierAssignmentListProps {
    userId: number;
}

export function UserSupplierAssignmentList({ userId }: UserSupplierAssignmentListProps) {
    const { data: assignments, isLoading } = useUserAssignments(userId);
    const { deleteAssignment, isDeleting } = useAssignmentMutations();

    const handleDelete = async (assignmentId: number) => {
        if (!confirm("この担当割り当てを削除してもよろしいですか？")) return;
        await deleteAssignment(assignmentId);
    };

    if (isLoading) {
        return <div className="p-4 text-center text-gray-500">読み込み中...</div>;
    }

    if (!assignments || assignments.length === 0) {
        return <div className="p-4 text-center text-gray-500">担当している仕入先はありません</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>仕入先コード</TableHead>
                        <TableHead>仕入先名</TableHead>
                        <TableHead>役割</TableHead>
                        <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                            <TableCell>{assignment.supplier_code}</TableCell>
                            <TableCell>{assignment.supplier_name}</TableCell>
                            <TableCell>
                                {assignment.is_primary ? (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                        主担当
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                        副担当
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(assignment.id)}
                                    disabled={isDeleting}
                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
