import { useEffect, useState } from "react";

/**
 * 値の変更をデバウンスするフック
 * @param value 監視する値
 * @param delay 遅延時間（ミリ秒）
 * @returns デバウンスされた値
 *
 * 【設計意図】useDebounce の設計判断:
 *
 * 1. なぜデバウンスが必要なのか
 *    理由: 高頻度な状態更新によるパフォーマンス問題の解決
 *    業務シナリオ:
 *    - 製品検索フィールドでユーザーが「ブレーキパッド」と入力
 *    - デバウンスなし: 「ブ」「ブレ」「ブレー」...と各文字でAPI呼び出し → 7回
 *    - デバウンスあり: 入力停止後500ms待ってから1回だけAPI呼び出し → 1回
 *    メリット:
 *    - サーバー負荷削減（不要なAPIリクエスト削減）
 *    - ネットワーク帯域の節約
 *    - UIの反応性向上（過剰なレンダリング防止）
 *
 * 2. setTimeout を使う理由（L13-15）
 *    理由: ブラウザ標準APIで遅延実行
 *    動作:
 *    - 値が変更されるたびに新しいタイマーを設定
 *    - delay ミリ秒後に debouncedValue を更新
 *    - 次の変更が来たら、古いタイマーをクリアして新しいタイマーを設定
 *    → 結果: 連続した変更の「最後の値」のみが反映される
 *
 * 3. useEffect のクリーンアップ関数（L17-19）
 *    理由: メモリリークとバグの防止
 *    クリーンアップが必要な理由:
 *    - ユーザーが高速入力すると、多数のタイマーが生成される
 *    - クリーンアップしないと、古いタイマーが残り続ける
 *    → メモリリーク、意図しない状態更新が発生
 *    動作:
 *    - value が変わる → 前回の useEffect のクリーンアップが実行される
 *    → clearTimeout(timer) で古いタイマーをキャンセル
 *    → 新しいタイマーを設定
 *
 * 4. useState で debouncedValue を管理する理由（L10）
 *    理由: デバウンス前と後の値を別々に管理
 *    状態設計:
 *    - value: 即座に変わる値（ユーザー入力）
 *    - debouncedValue: 遅延して変わる値（API呼び出し用）
 *    → コンポーネントは両方を使い分け可能
 *    例:
 *    ```tsx
 *    const [search, setSearch] = useState("");
 *    const debouncedSearch = useDebounce(search, 500);
 *
 *    // 入力フィールド: 即座に反映
 *    <input value={search} onChange={e => setSearch(e.target.value)} />
 *
 *    // API呼び出し: デバウンス後に実行
 *    useEffect(() => {
 *      fetchProducts(debouncedSearch);
 *    }, [debouncedSearch]);
 *    ```
 *
 * 5. 一般的なdelay値の選択
 *    業務用途別の推奨値:
 *    - 検索フィールド: 300-500ms（ユーザーが入力を一時停止する時間）
 *    - オートコンプリート: 200-300ms（即座にサジェスト表示）
 *    - フィルター変更: 500-1000ms（複数フィルタの同時変更を待つ）
 *    → delay が短すぎる: デバウンス効果が薄い
 *    → delay が長すぎる: ユーザーが「反応が遅い」と感じる
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
