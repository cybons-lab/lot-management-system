/**
 * Assignment types
 */

export interface SupplierAssignment {
    id: number;
    supplier_id: number;
    supplier_code: string;
    supplier_name: string;
    user_id: number;
    username: string;
    display_name: string;
    is_primary: boolean;
    assigned_at: string;
}

export interface SupplierGroup {
    supplier_id: number;
    supplier_code: string;
    supplier_name: string;
    assignments: SupplierAssignment[];
    primaryUser: SupplierAssignment | null;
}
