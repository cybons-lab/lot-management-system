# 状態管理ガイドライン（Inventory適用）

**対象**: まずInventory機能に適用し、他機能へ転用可能な形で整備する。  
**目的**: 状態の責務と永続化方針を明確化し、UI/APIの整合性を保つ。

---

## 1. 状態の責務分離

### 1.1 ページレベル（永続化対象）

**定義**: ページ遷移やリロードを跨いでも維持すべき状態。

**例（Inventory）**:
- フィルタ条件
- テーブルのページ設定
- 検索条件（ロット検索）
- ビューモード（items/supplier/warehouse/product/lots）

**実装**: `atomWithStorage` を使用し、`sessionStorage` に保存する。

---

### 1.2 コンポーネントレベル（永続化しない）

**定義**: UI操作に依存し、画面内で完結する短命な状態。

**例（Inventory）**:
- ダイアログの開閉状態
- テーブルの一時的な選択行
- ローカルな入力値（デバウンス前）

**実装**: `useState` を使用する。

---

## 2. 永続化の方針

### 2.1 基本ルール
- **sessionStorage を標準**とする。
- 永続化が不要な状態は `useState` に留める。
- feature単位でキーのプレフィックスを統一する（例: `inv:`）。

### 2.2 例（Inventoryのキー）
- `inv:lotFilters`
- `inv:lotTableSettings`
- `inv:lotSearchState`
- `inv:pageState`

---

## 3. 派生状態（Derived State）

### 3.1 原則
- **派生可能な値はatomで定義**し、フック内で都度計算しない。
- これにより再利用性と一貫性を確保する。
- 詳細な実装パターンは [Jotai Derived Atoms 設計標準](./jotai-derived-atoms.md) を参照。

### 3.2 例
- `inventoryPageQueryParamsAtom`
  - `inventoryPageStateAtom.filters` からAPI用クエリを生成

---

## 4. UI更新と副作用

### 4.1 原則
- レンダリング中に状態更新を行わない。
- デバウンスやAPI同期は `useEffect` で実行する。

### 4.2 例
- ロット検索入力はローカル状態で保持し、デバウンス後に `lotSearchStateAtom` へ反映する。

---

## 5. 運用ルール

1. 新しいページ状態を追加する場合は、まず「永続化が必要か」を判断する。
2. 永続化する場合は、必ず `state.ts` に集約する。
3. 一時的な状態はコンポーネント内に留め、永続化の対象にしない。
4. UIで表示する数値は、必ずバックエンドSSOTの値を使う（再計算しない）。

---

## 6. Inventory適用チェックリスト

- [ ] ページレベル状態は `state.ts` に集約されている
- [ ] 永続化キーが `inv:` で統一されている
- [ ] 派生状態はatomで定義されている
- [ ] レンダリング中の状態更新がない
- [ ] UIの数値はバックエンドのSSOTを参照している

