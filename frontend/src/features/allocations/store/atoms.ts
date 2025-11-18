/**
 * Jotai atoms for lot allocation page state management
 */

import { atom } from "jotai";

/**
 * 選択中の受注ID
 */
export const selectedOrderIdAtom = atom<number | null>(null);

/**
 * 選択中の受注明細ID
 */
export const selectedLineIdAtom = atom<number | null>(null);
