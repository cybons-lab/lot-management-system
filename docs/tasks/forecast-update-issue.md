# フォーキャスト編集後の計画引当サマリ・関連受注の更新問題

## 問題の概要
フォーキャスト編集（数量の追加・更新・削除）後、以下のコンポーネントが即時更新されない：
- 計画引当サマリ（Planning Allocation Panel）
- 関連受注セクション（Related Orders）

## 実施した修正
### 1. `query-keys.ts`
- `getForecastQueryKeys()` に `planningAllocationSummary` を追加

### 2. `ForecastDetailCard.tsx`
- 自動引当mutation後に `forecasts` クエリも無効化

### 3. `RelatedOrdersSection.tsx`
- 自動引当mutation後に `forecasts` クエリも無効化

## 現状の問題
修正後も画面が更新されない。

## 想定される原因

### 1. バックエンドのデータ構造
`related_orders` は `ForecastGroup` の一部としてバックエンドから返される。
フォーキャスト編集時にバックエンド側で `related_orders` を再計算していない可能性がある。

**検証方法:**
```bash
# フォーキャスト編集APIを実行
curl -X PUT http://localhost:8000/api/forecasts/{id} -d '{"forecast_quantity": 20}'

# フォーキャスト一覧を取得して related_orders が更新されているか確認
curl http://localhost:8000/api/forecasts
```

### 2. フロントエンドのクエリキー不一致
`useForecasts()` のクエリキーが `[...forecastKeys.list(), params]` であり、
パラメータを含むためキャッシュが細分化されている可能性。

**現在のクエリキー構造:**
```typescript
// frontend/src/features/forecasts/hooks/index.ts
export const useForecasts = (params?: ForecastListParams) => {
  return useQuery({
    queryKey: [...forecastKeys.list(), params],  // paramsが含まれる
    queryFn: () => getForecasts(params),
    staleTime: 1000 * 60 * 5,
  });
};
```

**無効化時:**
```typescript
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.forecasts });
// これは ["forecasts"] のみを無効化
// しかし実際のキーは ["forecasts", "list", { customer_id: 1, ... }]
```

### 3. TanStack Query の部分一致無効化
`invalidateQueries({ queryKey: ["forecasts"] })` は、
前方一致で無効化されるが、staleTime や gcTime の設定により即座に再取得されない可能性。

## 解決策の候補

### 案1: 無効化方法の変更（推奨）
```typescript
// より広範な無効化
queryClient.invalidateQueries({
  queryKey: ["forecasts"],
  exact: false,  // 前方一致で無効化
  refetchType: 'active'  // アクティブなクエリのみ再取得
});
```

### 案2: クエリキー設計の見直し
```typescript
// paramsを分離
queryKey: ["forecasts", "list", params]
// ではなく
queryKey: ["forecasts", "list"]
// とし、params はqueryFn内で使用
```

### 案3: 楽観的更新の実装
```typescript
onMutate: async (newForecast) => {
  await queryClient.cancelQueries({ queryKey: ["forecasts"] });
  const previousData = queryClient.getQueryData(["forecasts", "list", params]);

  // 楽観的にデータを更新
  queryClient.setQueryData(["forecasts", "list", params], (old) => {
    // related_orders も含めて更新
    return updateForecastGroup(old, newForecast);
  });

  return { previousData };
}
```

### 案4: バックエンド側で related_orders を常に再計算
フォーキャスト更新時に、該当グループの `related_orders` を再計算してレスポンスに含める。

## 次のステップ

### 優先度: 低
この問題は、手動リフレッシュで回避可能であり、UX上の影響は限定的。
以下の順で対応を検討：

1. **バックエンド調査** (30分)
   - フォーキャスト更新API後に `related_orders` が再計算されているか確認
   - ログやレスポンスを確認

2. **無効化方法の改善** (15分)
   - `exact: false`, `refetchType: 'active'` を追加

3. **楽観的更新の実装** (1-2時間)
   - より確実だが、実装コストが高い

## 関連ファイル
- `frontend/src/features/forecasts/components/ForecastDetailCard/ForecastDetailCard.tsx`
- `frontend/src/features/forecasts/components/ForecastDetailCard/RelatedOrdersSection.tsx`
- `frontend/src/features/forecasts/components/ForecastDetailCard/PlanningAllocationPanel.tsx`
- `frontend/src/features/forecasts/hooks/index.ts`
- `frontend/src/shared/constants/query-keys.ts`
- `backend/app/application/services/forecasts/forecast_service.py` (related_orders の計算ロジック)

## 作成日
2025-12-09

## ステータス
保留 - 優先度低（手動リフレッシュで回避可能）
