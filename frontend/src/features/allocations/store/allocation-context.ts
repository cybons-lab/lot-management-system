/**
 * Allocation Context - Jotai atoms for allocation state management
 *
 * This module eliminates prop drilling by providing shared atoms
 * that child components can access directly via useAtom hooks.
 *
 * 【設計意図】Jotai Atom 設計の設計判断:
 *
 * 1. なぜ Jotai を採用したのか
 *    理由: 軽量かつ型安全な状態管理ライブラリ
 *    代替案との比較:
 *    - Redux: ボイラープレートが多い、学習コスト高い
 *    - Context API: パフォーマンス問題（全子コンポーネントが再レンダリング）
 *    - Zustand: グローバルストア中心（ローカル状態に不向き）
 *    - Jotai: atomic 設計、最小限の再レンダリング、TypeScript と相性◎
 *    メリット:
 *    - Atom単位で依存関係を管理 → 変更のあるAtomだけ再レンダリング
 *    - 型推論が優れている → IDE補完が効く
 *    - useState と同じ感覚で使える → 学習コスト低い
 *
 * 2. Prop Drilling 問題の解決（L4-5）
 *    理由: 深いコンポーネント階層でのprops渡しを回避
 *    問題:
 *    - AllocationPage → AllocationTable → AllocationRow → LotSelector
 *    → handlers を4階層伝播させる必要がある
 *    → コードが冗長、中間コンポーネントが不要なpropsを持つ
 *    解決:
 *    - Atom で状態を共有 → LotSelector が直接 useAtom(allocationHandlersAtom)
 *    → 中間コンポーネントは無関係
 *    メリット:
 *    - コンポーネントの独立性向上
 *    - リファクタリング時の影響範囲縮小
 *
 * 3. lineStatusesAtom のRecord型設計（L18）
 *    理由: 複数行の状態を効率的に管理
 *    データ構造:
 *    ```typescript
 *    {
 *      123: "editing",  // lineId: 123 → editing状態
 *      456: "clean",    // lineId: 456 → clean状態
 *    }
 *    ```
 *    メリット:
 *    - O(1) で状態取得（lineId で直接アクセス）
 *    - 特定行の状態更新時、他の行に影響なし
 *    代替案:
 *    - Array<{lineId, status}>: find() で O(n) → 遅い
 *
 * 4. Derived Atoms の活用（L67-78）
 *    理由: 算出値をメモ化して再計算コスト削減
 *    例: lineStatusAtom (L67-70)
 *    - 基底Atom: lineStatusesAtom
 *    - 算出ロジック: statuses[lineId] ?? "clean"
 *    メリット:
 *    - lineStatusesAtom が変わった時だけ再計算
 *    - 同じ lineId で複数回呼んでもキャッシュされる
 *    使用例:
 *    ```typescript
 *    const getLineStatus = useAtomValue(lineStatusAtom);
 *    const status = getLineStatus(123);  // キャッシュから取得
 *    ```
 *
 * 5. Write-Only Atoms の設計（L85-100）
 *    理由: 状態更新ロジックを一元管理
 *    setActiveLineIdAtom (L85-87):
 *    - 第1引数: null → 読み取り不可
 *    - 第2引数: setter関数 → activeLineIdAtom を更新
 *    updateLineStatusAtom (L92-100):
 *    - 不変性を保ちつつ更新（{...prev, [lineId]: status}）
 *    メリット:
 *    - 更新ロジックが atom に集約される
 *    - コンポーネント側はシンプルに set() を呼ぶだけ
 *    使用例:
 *    ```typescript
 *    const updateStatus = useSetAtom(updateLineStatusAtom);
 *    updateStatus({ lineId: 123, status: "editing" });
 *    ```
 *
 * 6. allocationHandlersAtom のパターン（L60）
 *    理由: 親コンポーネントで定義したハンドラーを子に共有
 *    フロー:
 *    1. AllocationPage でハンドラー関数を定義
 *    2. useSetAtom(allocationHandlersAtom) で登録
 *    3. LotSelector 等で useAtomValue(allocationHandlersAtom) で取得
 *    メリット:
 *    - ハンドラーを props で渡す必要がない
 *    - 深い階層のコンポーネントも同じハンドラーにアクセス可能
 *    型安全性:
 *    - AllocationHandlers 型で全ハンドラーを定義
 *    → 実装漏れや誤った関数名を防止
 *
 * 7. allocationContextDataAtom の設計（L30-36）
 *    理由: マスタデータのマップを共有
 *    用途:
 *    - productMap: product_id → product_name
 *    - customerMap: customer_id → customer_name
 *    → 表示時に製品名・得意先名をルックアップ
 *    メリット:
 *    - 各コンポーネントで個別にAPIコール不要
 *    - 一度取得したマスタデータを全コンポーネントで再利用
 *
 * 8. currentLineContextAtom の設計（L108-116）
 *    理由: 現在編集中の行のコンテキスト情報を保持
 *    用途:
 *    - ForecastTooltip で計画引当サマリを表示
 *    - customerId, deliveryPlaceId, productId が必要
 *    フロー:
 *    1. LotAllocationPanel で編集開始時にセット
 *    2. AllocationInputSection で tooltip 表示時に参照
 *    メリット:
 *    - コンテキスト情報を明示的に管理
 *    - どの行を編集中かを追跡可能
 *
 * 9. Atomic 設計の原則
 *    理由: 小さな atom を組み合わせて複雑な状態を表現
 *    設計原則:
 *    - 1 atom = 1つの責務
 *    - 相互依存を最小化
 *    - Derived atom で算出値を表現
 *    メリット:
 *    - テストが容易（atom単位でテスト可能）
 *    - デバッグしやすい（どのatomが変わったか追跡）
 *    - パフォーマンス最適化（変更のあるatomのみ再レンダリング）
 *
 * 10. 型定義の分離（AllocationHandlers）（L40-55）
 *     理由: インターフェースで契約を明確化
 *     メリット:
 *     - 実装側（AllocationPage）と消費側（LotSelector）の契約
 *     - JSDoc コメントで各ハンドラーの役割を文書化
 *     - TypeScript が型チェックで実装漏れを検出
 */

import { atom } from "jotai";

import type { CandidateLotItem } from "../api";
import type { LineStatus } from "../types";

// ========== State Atoms ==========

/**
 * Line statuses map (lineId -> status)
 */
export const lineStatusesAtom = atom<Record<number, LineStatus>>({});

/**
 * Active line ID for editing
 */
export const activeLineIdAtom = atom<number | null>(null);

// ========== Context Data Atoms ==========

/**
 * Shared context data (productMap, customerMap)
 */
export const allocationContextDataAtom = atom<{
  productMap: Record<number, string>;
  customerMap: Record<number, string>;
}>({
  productMap: {},
  customerMap: {},
});

// ========== Handler Types ==========

export interface AllocationHandlers {
  /** Get allocations for a specific line */
  getLineAllocations: (lineId: number) => Record<number, number>;
  /** Get candidate lots for a specific line */
  getCandidateLots: (lineId: number) => CandidateLotItem[];
  /** Check if a line is over-allocated */
  isOverAllocated: (lineId: number) => boolean;
  /** Change allocation quantity for a lot */
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  /** Auto-allocate a line using FEFO */
  onAutoAllocate: (lineId: number) => void;
  /** Clear all allocations for a line */
  onClearAllocations: (lineId: number) => void;
  /** Save allocations for a line */
  onSaveAllocations: (lineId: number) => void;
}

/**
 * Handler functions atom - set by provider, consumed by children
 */
export const allocationHandlersAtom = atom<AllocationHandlers | null>(null);

// ========== Derived Atoms ==========

/**
 * Get line status with fallback
 */
export const lineStatusAtom = atom((get) => {
  const statuses = get(lineStatusesAtom);
  return (lineId: number): LineStatus => statuses[lineId] ?? "clean";
});

/**
 * Check if a line is active
 */
export const isLineActiveAtom = atom((get) => {
  const activeId = get(activeLineIdAtom);
  return (lineId: number): boolean => activeId === lineId;
});

// ========== Write Atoms ==========

/**
 * Set active line ID
 */
export const setActiveLineIdAtom = atom(null, (_get, set, lineId: number | null) => {
  set(activeLineIdAtom, lineId);
});

/**
 * Update line status
 */
export const updateLineStatusAtom = atom(
  null,
  (_get, set, update: { lineId: number; status: LineStatus }) => {
    set(lineStatusesAtom, (prev) => ({
      ...prev,
      [update.lineId]: update.status,
    }));
  },
);

// ========== Line Context Atoms (Phase 2) ==========

/**
 * Current line context for ForecastTooltip
 * Set by LotAllocationPanel, consumed by AllocationInputSection
 */
export const currentLineContextAtom = atom<{
  customerId: number | null;
  deliveryPlaceId: number | null;
  productId: number | null;
}>({
  customerId: null,
  deliveryPlaceId: null,
  productId: null,
});
