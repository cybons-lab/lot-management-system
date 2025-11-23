# TODO: 将来の改善項目

## UIアニメーション改善 (優先度: 中)

### 問題
- チェック済み明細への移動時、要素が「突如消えたように見える」
- 現在は`framer-motion`のlayoutアニメーションを削除してパフォーマンスを優先

### 解決案
1. **軽量アニメーションの追加**
   - CSS transform + transitionでソート時のアニメーションを追加
   - `will-change: transform`でGPUアクセラレーションを活用
   
2. **FLIP (First, Last, Invert, Play) テクニック**
   - チェック前後の位置を記録
   - transformで自然な移動アニメーションを実現
   - layoutアニメーションより軽量

3. **段階的な導入**
   - まず数十件のデータで動作確認
   - パフォーマンスを測定しながら調整

### 参考実装
```tsx
// 例: CSS transitionベース
const [isAnimating, setIsAnimating] = useState(false);

// チェック時
const handleCheck = (id: number) => {
  setIsAnimating(true);
  setSelectedLineIds(prev => {
    // ... チェック処理
  });
  setTimeout(() => setIsAnimating(false), 300);
};

// スタイル
<div 
  className={cn(
    "transition-all duration-300",
    isAnimating && "transform"
  )}
  style={{
    transform: isMoving ? `translateY(${offset}px)` : undefined
  }}
>
```

### 実装時期
- 仮想スクロール導入後
- 100件以上のデータでのパフォーマンステスト後

---

## データベースビュー導入 (優先度: 高)

### 目的
- アプリケーション層でのJOIN処理を削減
- クエリパフォーマンスの改善

### 計画
- `v_order_line_details`ビューの作成
- `OrderService._populate_additional_info`の簡素化

**詳細は別途 implementation_plan.md を参照**

---

## 仮想スクロール導入 (優先度: 中)

### 目的
- 100件以上の受注明細でのスクロールパフォーマンス改善

### 計画
- `@tanstack/react-virtual`の導入
- 既存フィルタリング・ソート機能との統合

---

最終更新: 2025-11-24
