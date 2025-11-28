# UI改善課題

## 予測詳細ページ

### 1. 倉庫表示が「不明」になる問題 ✅ 解決済

**原因**: 
- `/api/lots` エンドポイントが `v_lots_with_master` ビューを使用
- このビューに `warehouse_code` / `warehouse_name` フィールドが欠落
- フロントエンドのフォールバック値「不明」が表示された

**修正内容**:
- `v_lots_with_master` ビューに `warehouses` テーブルをJOIN
- `warehouse_code` と `warehouse_name` フィールドを追加

**修正ファイル**: `backend/sql/views/create_views.sql`

---

### 2. SAP受注登録UIが過剰に目立つ 🟡 中

**現状の問題**:
- 「🔥 SAP受注登録」セクションが「📋 関連受注」より目立ちすぎる
- モックボタンが大きく表示され、本来の業務フローの重要度と不釣り合い

**業務要件**:
- 受注確定 → SAP登録は **ボタン1つの手軽な処理**
- 単体登録か複数登録かの違いしかない

**提案されたUI**:
- SAP未登録ラベル（バッジ）
- SAP登録ボタン（通常サイズ）
- チェックボックス経由でまとめて登録

**改善案**:
```
関連受注 (1)
┌─────────────────────────────────────┐
│ □ ORD-00000023  【未登録】          │
│   数量: 1,580 KG | 期日: 2025/12/13  │
│                    [SAP登録] ボタン  │
└─────────────────────────────────────┘

または、まとめて操作:
[選択した受注をSAPへ登録] ボタン
```

**場所**: `frontend/src/features/forecasts/components/ForecastDetailCard/SAPIntegrationSection.tsx`

---

## 対応優先度

1. 🔴 倉庫表示バグ修正（データが正しく表示されない）
2. 🟡 SAP登録UI簡素化（UX改善）

## 関連ファイル

- `frontend/src/features/forecasts/pages/ForecastDetailPage.tsx`
- `frontend/src/features/forecasts/components/ForecastDetailCard/`
- `backend/app/api/routes/forecasts/forecasts_router.py`
