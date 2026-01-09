# 削除ダイアログコンポーネントDRY化タスク

## ステータス

- **開始日**: 2026-01-09
- **担当**: Claude
- **優先度**: 中
- **進捗**: 🔵 未着手

---

## 📋 タスク概要

4種類の削除ダイアログコンポーネントを1つの基底コンポーネントに統合し、DRY原則に従った実装に改善する。

### 背景

現在、削除ダイアログが4種類存在し、実装が重複している：

1. **SoftDeleteDialog** - 論理削除（単一）
2. **PermanentDeleteDialog** - 物理削除（単一）
3. **BulkSoftDeleteDialog** - 論理削除（一括）
4. **BulkPermanentDeleteDialog** - 物理削除（一括）

これらは以下の問題を抱えている：

- 同じUI構造の重複実装（約70%のコードが重複）
- 修正時に4箇所を更新する必要がある
- テストコードも4倍（各ファイルに対応する.test.tsx）
- 新しい削除タイプ追加時の工数増

### 目的

- コード重複の削減（推定 -200行）
- 保守性の向上（修正箇所の一元化）
- テストコードの簡素化
- 新機能追加の容易化

---

## 🔍 現状分析

### 既存の4種類の削除ダイアログ

| ファイル | 用途 | 行数（推定） | 特徴 |
|---------|------|------------|------|
| `SoftDeleteDialog.tsx` | 論理削除（単一） | ~80行 | 復元可能な削除 |
| `PermanentDeleteDialog.tsx` | 物理削除（単一） | ~80行 | 完全削除・警告強調 |
| `BulkSoftDeleteDialog.tsx` | 論理削除（一括） | ~90行 | 複数選択対応 |
| `BulkPermanentDeleteDialog.tsx` | 物理削除（一括） | ~90行 | 複数選択・警告強調 |

**場所:** `/frontend/src/components/common/`

### 重複している実装要素

#### 1. ダイアログUI構造（100%重複）

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>タイトル</DialogTitle>
      <DialogDescription>説明</DialogDescription>
    </DialogHeader>
    {/* 中身 */}
    <DialogFooter>
      <Button onClick={onCancel}>キャンセル</Button>
      <Button variant="destructive" onClick={onConfirm}>削除</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 2. 警告メッセージの色分け（90%重複）

- SoftDelete: 黄色背景（bg-yellow-50, border-yellow-300）
- PermanentDelete: 赤背景（bg-red-50, border-red-300）

#### 3. 一括削除時の選択件数表示（100%重複）

```tsx
<div className="text-sm text-gray-600">
  {selectedCount}件のアイテムを削除しますか？
</div>
```

#### 4. テストコード構造（100%重複）

各.test.tsxで同じテストパターンを実装：
- ダイアログ開閉テスト
- 確認ボタンクリックテスト
- キャンセルボタンテスト
- 無効状態のテスト

---

## 💡 改善案

### 1. 統合された DeleteDialog コンポーネント

単一の基底コンポーネントで全ての削除パターンをカバー：

```tsx
<DeleteDialog
  open={open}
  onOpenChange={onOpenChange}
  onConfirm={handleDelete}
  type="soft" | "permanent"  // 論理/物理削除の切り替え
  bulk={false}               // 一括削除モード
  selectedCount={0}          // 一括時の選択件数
  itemName="ユーザー"        // 削除対象の名前
  customMessage="..."        // オプションのカスタムメッセージ
  isPending={isDeleting}     // 削除処理中フラグ
/>
```

### 2. Props 定義

```typescript
interface DeleteDialogProps {
  /** ダイアログ開閉状態 */
  open: boolean;

  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;

  /** 削除確認ハンドラ */
  onConfirm: () => void | Promise<void>;

  /** 削除タイプ（論理削除 or 物理削除） */
  type: "soft" | "permanent";

  /** 一括削除モード */
  bulk?: boolean;

  /** 一括削除時の選択件数 */
  selectedCount?: number;

  /** 削除対象アイテムの名前（例: "ユーザー", "製品"） */
  itemName?: string;

  /** カスタム警告メッセージ（省略時はデフォルト） */
  customMessage?: string;

  /** 削除処理中フラグ */
  isPending?: boolean;

  /** カスタム確認ボタンテキスト */
  confirmText?: string;

  /** カスタムキャンセルボタンテキスト */
  cancelText?: string;
}
```

### 3. 内部ロジック

#### タイプ別のスタイリング

```tsx
const alertStyles = {
  soft: {
    container: "bg-yellow-50 border-yellow-300",
    text: "text-yellow-800",
    icon: "⚠️",
  },
  permanent: {
    container: "bg-red-50 border-red-300",
    text: "text-red-800",
    icon: "🗑️",
  },
};
```

#### メッセージ生成

```tsx
function getDefaultMessage(type: "soft" | "permanent", bulk: boolean, itemName: string): string {
  if (type === "soft") {
    return bulk
      ? `${itemName}を論理削除します。後で復元できます。`
      : `この${itemName}を論理削除しますか？後で復元できます。`;
  } else {
    return bulk
      ? `⚠️ ${itemName}を完全に削除します。この操作は取り消せません。`
      : `⚠️ この${itemName}を完全に削除しますか？この操作は取り消せません。`;
  }
}
```

---

## 🎯 実装計画

### Phase 1: 基底コンポーネント作成（0.5日目）

- [ ] `DeleteDialog` コンポーネント作成
  - [ ] Props定義
  - [ ] タイプ別スタイリング実装
  - [ ] メッセージ生成ロジック
  - [ ] 一括/単一モード切り替え

- [ ] ストーリーブック作成
  - [ ] Soft Delete - 単一
  - [ ] Soft Delete - 一括
  - [ ] Permanent Delete - 単一
  - [ ] Permanent Delete - 一括

### Phase 2: 既存コンポーネントの移行（0.5日目）

**段階的リファクタリング:**

1. **ラッパーコンポーネント作成（後方互換性維持）**

```tsx
// SoftDeleteDialog.tsx (新バージョン)
export function SoftDeleteDialog(props: OldSoftDeleteDialogProps) {
  return (
    <DeleteDialog
      {...props}
      type="soft"
      bulk={false}
    />
  );
}
```

2. **既存の使用箇所を確認**

```bash
# 使用箇所の検索
grep -r "SoftDeleteDialog" frontend/src/features/
grep -r "PermanentDeleteDialog" frontend/src/features/
```

3. **段階的に置き換え**

- 優先度の低いページから順に新コンポーネントへ移行
- 各移行後にテスト実行

### Phase 3: テストコード統合（0.5日目）

- [ ] `DeleteDialog.test.tsx` 作成
  - [ ] 全パターンのテスト（soft/permanent × 単一/一括）
  - [ ] スナップショットテスト
  - [ ] アクセシビリティテスト

- [ ] 既存テストコードの削除確認

### Phase 4: クリーンアップ（0.5日目）

- [ ] 旧4種類のコンポーネント削除
  - [ ] SoftDeleteDialog.tsx（旧版）
  - [ ] PermanentDeleteDialog.tsx（旧版）
  - [ ] BulkSoftDeleteDialog.tsx
  - [ ] BulkPermanentDeleteDialog.tsx

- [ ] 対応するテストファイル削除

- [ ] ドキュメント更新

---

## 📝 実装の詳細仕様

### DeleteDialog コンポーネント実装例

```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { AlertTriangle, Trash2 } from "lucide-react";

export interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  type: "soft" | "permanent";
  bulk?: boolean;
  selectedCount?: number;
  itemName?: string;
  customMessage?: string;
  isPending?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  type,
  bulk = false,
  selectedCount = 1,
  itemName = "アイテム",
  customMessage,
  isPending = false,
  confirmText,
  cancelText = "キャンセル",
}: DeleteDialogProps) {
  const isSoft = type === "soft";

  // スタイル
  const alertClass = isSoft
    ? "border-yellow-300 bg-yellow-50 text-yellow-800"
    : "border-red-300 bg-red-50 text-red-800";

  const Icon = isSoft ? AlertTriangle : Trash2;

  // メッセージ
  const defaultMessage = isSoft
    ? bulk
      ? `${selectedCount}件の${itemName}を論理削除します。後で復元できます。`
      : `この${itemName}を論理削除しますか？後で復元できます。`
    : bulk
      ? `⚠️ ${selectedCount}件の${itemName}を完全に削除します。この操作は取り消せません。`
      : `⚠️ この${itemName}を完全に削除しますか？この操作は取り消せません。`;

  const message = customMessage || defaultMessage;

  // 確認ボタンテキスト
  const defaultConfirmText = isSoft ? "削除する" : "完全に削除する";
  const buttonText = confirmText || defaultConfirmText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSoft ? "削除確認" : "完全削除の確認"}
          </DialogTitle>
          <DialogDescription>
            {bulk && (
              <div className="mb-2 text-sm">
                {selectedCount}件の{itemName}が選択されています。
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className={`flex items-start gap-3 rounded-lg border p-4 ${alertClass}`}>
          <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{message}</p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "削除中..." : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 使用例

```tsx
// 論理削除（単一）
<DeleteDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={handleSoftDelete}
  type="soft"
  itemName="ユーザー"
/>

// 物理削除（一括）
<DeleteDialog
  open={isBulkDeleteOpen}
  onOpenChange={setIsBulkDeleteOpen}
  onConfirm={handleBulkPermanentDelete}
  type="permanent"
  bulk
  selectedCount={selectedIds.length}
  itemName="製品"
  isPending={deleteMutation.isPending}
/>
```

---

## ✅ 完了条件

- [ ] DeleteDialog コンポーネントが4パターン全てをカバー
- [ ] 旧4種類のコンポーネント削除済み
- [ ] 全ての使用箇所が新コンポーネントに移行
- [ ] テストが全て成功（カバレッジ80%以上）
- [ ] Storybookストーリー作成済み
- [ ] ドキュメント更新済み

---

## 📊 効果測定

### 定量的効果

- **コード行数削減**: 推定 **-200行** （340行 → 140行）
  - 旧4ファイル: 80+80+90+90 = 340行
  - 新1ファイル: 140行

- **ファイル数削減**: **-7ファイル**
  - コンポーネント: 4 → 1 (-3)
  - テストファイル: 4 → 1 (-3)
  - 削減合計: -7ファイル（削除のみ、追加1）

- **テストコード削減**: 推定 **-150行**

### 定性的効果

- 新しい削除タイプ追加時の工数削減（1ファイル修正で完結）
- バグ修正時の修正箇所が1箇所に集約
- コードレビューの負担軽減

---

## 🔗 関連タスク

- フィルター標準化タスク（進行中）
- 日付ユーティリティ統合タスク（未着手）

---

## 📅 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2026-01-09 | ドキュメント作成 | Claude |
| | | |

---

## 💬 備考・補足

### マイグレーション戦略

1. **後方互換性を維持した段階的移行**
   - 旧コンポーネントをラッパーとして残す
   - 各ページを順次移行
   - 全移行完了後に旧コンポーネント削除

2. **リスク軽減**
   - 1ページずつ移行して動作確認
   - リグレッションテスト実行
   - 問題があれば即座にロールバック可能

### 将来的な拡張

- 削除理由の入力機能（オプション）
- 削除履歴の表示
- アンドゥ機能（論理削除限定）
