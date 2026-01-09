# Rechartsダッシュボード実装タスク

## ステータス

- **開始日**: 2026-01-09
- **担当**: Claude
- **優先度**: 低（新機能追加）
- **進捗**: 🔵 未着手

---

## 📋 タスク概要

導入済みだが未使用のrechartsライブラリ（v3.5.1）を活用し、ダッシュボードページにグラフ・チャート機能を追加する。

### 背景

**現状:**
- rechartsライブラリがインストール済み（package.json）
- しかし、コードベース全体で**使用実績0件**
- ダッシュボードページは存在するが、グラフ表示なし

**問題:**
- せっかくのライブラリが活用されていない
- ダッシュボードが単なる数値表示のみで視覚性が低い
- 在庫推移や売上分析が困難

### 目的

- rechartsライブラリの活用
- データの可視化による意思決定支援
- ダッシュボードのUX向上
- 在庫・受注・入荷のトレンド把握

---

## 🔍 現状分析

### 既存のダッシュボード構成

| ファイル | 場所 | 機能 |
|---------|------|------|
| `DashboardPage.tsx` | `/features/dashboard/pages/` | ダッシュボードページ本体 |
| `Dashboard.tsx` | `/features/dashboard/components/` | ダッシュボード表示コンポーネント |
| `DashboardStats.tsx` | `/features/dashboard/components/` | 統計情報の表示 |

### 現在表示されている情報（推定）

- 在庫総数
- 受注件数
- 入荷予定件数
- アラート件数

**表示形式:** 数値カード（CardコンポーネントでKPI表示）

### recharts の活用可能性

Rechartsで実装可能なグラフ：

| グラフ種類 | 用途 | 優先度 |
|----------|------|--------|
| **LineChart** | 在庫推移（日次/月次） | 高 |
| **BarChart** | 製品別在庫数、倉庫別在庫数 | 高 |
| **PieChart** | 在庫ステータス内訳（有効/期限切れ/引当済） | 中 |
| **AreaChart** | 入荷・出荷の累積推移 | 中 |
| **ComposedChart** | 在庫と受注の複合表示 | 低 |

---

## 💡 改善案

### 1. ダッシュボードレイアウト

```
┌─────────────────────────────────────────────────────┐
│  Dashboard - 在庫管理ダッシュボード                    │
├─────────────────────────────────────────────────────┤
│  📊 KPI Cards（既存）                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │在庫総数  │ │受注件数  │ │入荷予定  │ │アラート│ │
│  │ 12,450  │ │   45    │ │   18    │ │   3   │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────────────────┤
│  📈 在庫推移グラフ（新規）                            │
│  ┌───────────────────────────────────────────────┐ │
│  │  LineChart: 過去30日間の在庫推移               │ │
│  │  （有効在庫 vs 引当済み在庫）                   │ │
│  └───────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  📊 製品別在庫Top10 (新規) │ 📊 倉庫別在庫 (新規)   │
│  ┌──────────────────────┐ ┌──────────────────────┐│
│  │ BarChart: 製品別     │ │ PieChart: 倉庫別     ││
│  │                      │ │                      ││
│  └──────────────────────┘ └──────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 2. 実装するグラフ（Phase 1: MVP）

#### Graph 1: 在庫推移（LineChart） - 優先度：高

**データソース:** `/api/inventory/history` または既存の stock_history テーブル

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={inventoryTrendData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line
      type="monotone"
      dataKey="available_quantity"
      stroke="#10b981"
      name="有効在庫"
    />
    <Line
      type="monotone"
      dataKey="allocated_quantity"
      stroke="#f59e0b"
      name="引当済"
    />
  </LineChart>
</ResponsiveContainer>
```

**表示データ例:**
```json
[
  { "date": "2024-01-01", "available_quantity": 1500, "allocated_quantity": 300 },
  { "date": "2024-01-02", "available_quantity": 1480, "allocated_quantity": 320 },
  ...
]
```

#### Graph 2: 製品別在庫Top10（BarChart） - 優先度：高

**データソース:** `/api/inventory/by-product?limit=10`

```tsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={topProductsData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="product_name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="total_quantity" fill="#3b82f6" name="在庫数" />
  </BarChart>
</ResponsiveContainer>
```

#### Graph 3: 倉庫別在庫（PieChart） - 優先度：中

**データソース:** `/api/inventory/by-warehouse`

```tsx
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={warehouseData}
      dataKey="total_quantity"
      nameKey="warehouse_name"
      cx="50%"
      cy="50%"
      outerRadius={80}
      fill="#8884d8"
      label
    >
      {warehouseData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

---

## 🎯 実装計画

### Phase 1: MVP実装（2-3日目）

#### Day 1: 基盤整備

- [ ] recharts の動作確認
  - [ ] 簡単なサンプルグラフを作成
  - [ ] スタイリング確認（Tailwind CSS統合）

- [ ] 共通グラフコンポーネント作成
  - [ ] `ChartContainer.tsx` - グラフ用のカード
  - [ ] カラーパレット定義（Tailwind準拠）
  - [ ] レスポンシブ対応の確認

#### Day 2: グラフ実装

- [ ] **在庫推移グラフ（LineChart）**
  - [ ] バックエンドAPIの確認/作成
    - [ ] `GET /api/dashboard/inventory-trend?days=30`
  - [ ] `InventoryTrendChart.tsx` コンポーネント作成
  - [ ] ダッシュボードに統合

- [ ] **製品別在庫Top10（BarChart）**
  - [ ] 既存API活用: `/api/inventory/by-product?limit=10`
  - [ ] `TopProductsChart.tsx` コンポーネント作成
  - [ ] ダッシュボードに統合

#### Day 3: 仕上げ・テスト

- [ ] **倉庫別在庫（PieChart）**
  - [ ] 既存API活用: `/api/inventory/by-warehouse`
  - [ ] `WarehouseDistributionChart.tsx` コンポーネント作成
  - [ ] ダッシュボードに統合

- [ ] レスポンシブ対応
  - [ ] モバイル表示の最適化
  - [ ] グラフサイズ調整

- [ ] ローディング・エラー状態の実装

### Phase 2: 拡張機能（Optional）

- [ ] 期間フィルター（7日/30日/90日）
- [ ] グラフのエクスポート機能（PNG/CSV）
- [ ] アラート閾値の可視化（赤線で表示）
- [ ] アニメーション効果の追加

---

## 📝 実装の詳細仕様

### 共通コンポーネント: ChartContainer

```tsx
/**
 * グラフ表示用のコンテナ
 */
interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: Error | null;
}

export function ChartContainer({
  title,
  description,
  children,
  isLoading = false,
  error = null,
}: ChartContainerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            読み込み中...
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-red-600">
            データの取得に失敗しました
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
```

### グラフコンポーネント例: InventoryTrendChart

```tsx
import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { useInventoryTrend } from "../hooks/useInventoryTrend";
import { ChartContainer } from "./ChartContainer";

import { formatDate } from "@/shared/utils/date";

interface InventoryTrendData {
  date: string;
  available_quantity: number;
  allocated_quantity: number;
}

export function InventoryTrendChart() {
  const { data, isLoading, error } = useInventoryTrend({ days: 30 });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((item) => ({
      date: formatDate(item.date, "MM/dd"),
      available: item.available_quantity,
      allocated: item.allocated_quantity,
    }));
  }, [data]);

  return (
    <ChartContainer
      title="在庫推移"
      description="過去30日間の有効在庫と引当済在庫の推移"
      isLoading={isLoading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="available"
            stroke="#10b981"
            strokeWidth={2}
            name="有効在庫"
            dot={{ fill: "#10b981", r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="allocated"
            stroke="#f59e0b"
            strokeWidth={2}
            name="引当済"
            dot={{ fill: "#f59e0b", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### カラーパレット定義

```typescript
/**
 * グラフ用カラーパレット（Tailwind CSS準拠）
 */
export const CHART_COLORS = {
  primary: "#3b82f6",    // blue-500
  success: "#10b981",    // green-500
  warning: "#f59e0b",    // amber-500
  danger: "#ef4444",     // red-500
  info: "#06b6d4",       // cyan-500
  purple: "#8b5cf6",     // violet-500
  pink: "#ec4899",       // pink-500
  gray: "#6b7280",       // gray-500
};

export const PIE_CHART_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
];
```

---

## 🔌 バックエンドAPI要件

### 新規API: 在庫推移取得

**エンドポイント:** `GET /api/dashboard/inventory-trend`

**クエリパラメータ:**
- `days`: 取得日数（デフォルト30日）

**レスポンス:**
```json
{
  "data": [
    {
      "date": "2024-01-01",
      "available_quantity": 1500,
      "allocated_quantity": 300,
      "expired_quantity": 50
    },
    ...
  ]
}
```

**SQL例:**
```sql
SELECT
  DATE(created_at) as date,
  SUM(CASE WHEN status = 'active' THEN quantity ELSE 0 END) as available_quantity,
  SUM(CASE WHEN status = 'allocated' THEN quantity ELSE 0 END) as allocated_quantity,
  SUM(CASE WHEN status = 'expired' THEN quantity ELSE 0 END) as expired_quantity
FROM stock_history
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;
```

### 既存APIの活用

- `GET /api/inventory/by-product?limit=10` - 製品別在庫Top10
- `GET /api/inventory/by-warehouse` - 倉庫別在庫

---

## ✅ 完了条件

- [ ] 3種類のグラフがダッシュボードに表示
  - [ ] 在庫推移（LineChart）
  - [ ] 製品別在庫Top10（BarChart）
  - [ ] 倉庫別在庫（PieChart）

- [ ] レスポンシブ対応完了

- [ ] ローディング・エラー状態の実装

- [ ] バックエンドAPI実装（inventory-trend）

- [ ] Storybookストーリー作成

---

## 📊 効果測定

### 定量的効果

- **recharts活用**: 0% → 100% （未使用ライブラリの解消）
- **バンドルサイズ**: recharts は既にインストール済みなので増加なし
- **ページロード時間**: グラフ描画による+0.2秒程度（許容範囲）

### 定性的効果

- データの視覚化による意思決定の迅速化
- 在庫トレンドの把握容易化
- ダッシュボードのUX向上
- ビジネスインサイトの発見機会増加

---

## 🔗 関連タスク

- フィルター標準化タスク（進行中）
- 削除ダイアログDRY化タスク（ドキュメント作成済み）
- 日付ユーティリティ統合タスク（ドキュメント作成済み）

---

## 📅 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2026-01-09 | ドキュメント作成 | Claude |
| | | |

---

## 💬 備考・補足

### 技術的な考慮事項

1. **パフォーマンス**
   - 大量データの場合はサーバーサイドで集計
   - クライアント側ではキャッシュ（React Query）
   - グラフの再レンダリング最適化（useMemo）

2. **アクセシビリティ**
   - スクリーンリーダー対応（ARIA属性）
   - キーボードナビゲーション
   - カラーバリアフリー（色以外の区別要素も追加）

3. **データ更新頻度**
   - リアルタイム更新は不要（ダッシュボード訪問時に取得）
   - staleTime: 5分（React Query）

### 将来的な拡張

- **インタラクティブ機能**
  - グラフクリックで詳細ページへ遷移
  - ドリルダウン機能（製品→ロット詳細）

- **追加グラフ**
  - 期限切れ予測（AreaChart）
  - 受注・出荷・在庫の複合グラフ（ComposedChart）
  - ヒートマップ（在庫回転率）

- **エクスポート機能**
  - グラフ画像のダウンロード（PNG）
  - データのCSVエクスポート

- **カスタマイズ**
  - ユーザーごとのダッシュボード設定保存
  - グラフの表示/非表示切り替え
