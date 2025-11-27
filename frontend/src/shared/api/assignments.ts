// User-Supplier Assignment API functions
import type { components } from '../types/openapi';

import { apiClient } from './client';

type UserSupplierAssignmentCreate = components['schemas']['UserSupplierAssignmentCreate'];
type UserSupplierAssignmentUpdate = components['schemas']['UserSupplierAssignmentUpdate'];
type UserSupplierAssignmentResponse = components['schemas']['UserSupplierAssignmentResponse'];

/**
 * ユーザーの担当仕入先一覧を取得
 */
export async function getUserSuppliers(userId: number): Promise<UserSupplierAssignmentResponse[]> {
    const response = await apiClient.GET('/api/assignments/user/{user_id}/suppliers', {
        params: { path: { user_id: userId } },
    });
    if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch user suppliers');
    }
    return response.data;
}

/**
 * 仕入先の担当者一覧を取得
 */
export async function getSupplierUsers(supplierId: number): Promise<UserSupplierAssignmentResponse[]> {
    const response = await apiClient.GET('/api/assignments/supplier/{supplier_id}/users', {
        params: { path: { supplier_id: supplierId } },
    });
    if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch supplier users');
    }
    return response.data;
}

/**
 * 担当割り当てを作成
 */
export async function createAssignment(
    data: UserSupplierAssignmentCreate
): Promise<UserSupplierAssignmentResponse> {
    const response = await apiClient.POST('/api/assignments/', { body: data });
    if (response.error) {
        throw new Error(response.error.detail || 'Failed to create assignment');
    }
    return response.data;
}

/**
 * 担当割り当てを更新
 */
export async function updateAssignment(
    assignmentId: number,
    data: UserSupplierAssignmentUpdate
): Promise<UserSupplierAssignmentResponse> {
    const response = await apiClient.PUT('/api/assignments/{assignment_id}', {
        params: { path: { assignment_id: assignmentId } },
        body: data,
    });
    if (response.error) {
        throw new Error(response.error.detail || 'Failed to update assignment');
    }
    return response.data;
}

/**
 * 担当割り当てを削除
 */
export async function deleteAssignment(assignmentId: number): Promise<void> {
    const response = await apiClient.DELETE('/api/assignments/{assignment_id}', {
        params: { path: { assignment_id: assignmentId } },
    });
    if (response.error) {
        throw new Error(response.error.detail || 'Failed to delete assignment');
    }
}

/**
 * 仕入先の主担当者を設定
 */
export async function setPrimaryUser(
    supplierId: number,
    userId: number
): Promise<UserSupplierAssignmentResponse> {
    const response = await apiClient.POST(
        '/api/assignments/supplier/{supplier_id}/set-primary/{user_id}',
        {
            params: { path: { supplier_id: supplierId, user_id: userId } },
        }
    );
    if (response.error) {
        throw new Error(response.error.detail || 'Failed to set primary user');
    }
    return response.data;
}
