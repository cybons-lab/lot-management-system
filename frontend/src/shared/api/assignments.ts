// User-Supplier Assignment API functions
import { fetchApi } from '@/shared/libs/http';
import type { components } from '../types/openapi';

type UserSupplierAssignmentCreate = components['schemas']['UserSupplierAssignmentCreate'];
type UserSupplierAssignmentUpdate = components['schemas']['UserSupplierAssignmentUpdate'];
type UserSupplierAssignmentResponse = components['schemas']['UserSupplierAssignmentResponse'];

/**
 * ユーザーの担当仕入先一覧を取得
 */
export async function getUserSuppliers(userId: number): Promise<UserSupplierAssignmentResponse[]> {
    return fetchApi.get<UserSupplierAssignmentResponse[]>(`/assignments/user/${userId}/suppliers`);
}

/**
 * 仕入先の担当者一覧を取得
 */
export async function getSupplierUsers(supplierId: number): Promise<UserSupplierAssignmentResponse[]> {
    return fetchApi.get<UserSupplierAssignmentResponse[]>(`/assignments/supplier/${supplierId}/users`);
}

/**
 * 担当割り当てを作成
 */
export async function createAssignment(
    data: UserSupplierAssignmentCreate
): Promise<UserSupplierAssignmentResponse> {
    return fetchApi.post<UserSupplierAssignmentResponse>('/assignments/', data);
}

/**
 * 担当割り当てを更新
 */
export async function updateAssignment(
    assignmentId: number,
    data: UserSupplierAssignmentUpdate
): Promise<UserSupplierAssignmentResponse> {
    return fetchApi.put<UserSupplierAssignmentResponse>(`/assignments/${assignmentId}`, data);
}

/**
 * 担当割り当てを削除
 */
export async function deleteAssignment(assignmentId: number): Promise<void> {
    return fetchApi.delete(`/assignments/${assignmentId}`);
}

/**
 * 仕入先の主担当者を設定
 */
export async function setPrimaryUser(
    supplierId: number,
    userId: number
): Promise<UserSupplierAssignmentResponse> {
    return fetchApi.post<UserSupplierAssignmentResponse>(
        `/assignments/supplier/${supplierId}/set-primary/${userId}`
    );
}
