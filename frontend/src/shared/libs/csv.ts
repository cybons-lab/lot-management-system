// frontend/src/lib/csv.ts

/**
 * テーブル等の配列データをCSVでダウンロード
 * - data: [{colA: 'a', colB: 1}, ...]
 * - filename: "example.csv"
 * 文字コード: UTF-8 (BOM付与)
 *
 * 【設計意図】CSV エクスポート機能の設計判断:
 *
 * 1. UTF-8 BOM (\uFEFF) の付与（L46）
 *    理由: Excel で日本語を正しく表示するため
 *    問題: Excel は UTF-8 ファイルを開く際、BOM がないと文字化け
 *    → \uFEFF（Byte Order Mark）を先頭に付与
 *    対象: 自動車部品商社のユーザーは Excel をメインツールとして使用
 *
 * 2. CSV エスケープ処理（L32-38）
 *    理由: カンマ、改行、ダブルクォートを含むデータを安全に出力
 *    ルール:
 *    - カンマ含む → ダブルクォートで囲む
 *    - 改行含む → ダブルクォートで囲む
 *    - ダブルクォート含む → "" にエスケープ
 *    例:
 *    - 製品名: "ブレーキパッド, 10個入り" → "\"ブレーキパッド, 10個入り\""
 *    - 備考: "\"特注品\"" → "\"\"特注品\"\""
 *
 * 3. null/undefined の扱い（L30-31）
 *    理由: 空セルとして出力（""）
 *    → Excel で空白セルとして表示
 *    代替案: "null" や "undefined" と出力 → ユーザーに混乱を与える
 *
 * 4. Blob + a要素によるダウンロード（L46-56）
 *    理由: ブラウザ標準のダウンロード機能を使用
 *    動作:
 *    - Blob: バイナリデータとしてCSVを生成
 *    - URL.createObjectURL: Blob をダウンロード可能な URL に変換
 *    - a要素: download属性でファイル名を指定してダウンロード
 *    クリーンアップ:
 *    - link.click() 後に a要素を削除 → DOM を汚染しない
 *    - URL.revokeObjectURL() は不要（自動的に解放される）
 *
 * 5. style.visibility = "hidden" の使用（L53）
 *    理由: a要素をDOMに追加する必要があるが、表示したくない
 *    → display: none ではなく visibility: hidden を使用
 *    代替案: display: none → 一部ブラウザで click() が動作しない
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // TypeScript strict mode: Ensure data[0] exists
  const firstRow = data[0];
  if (!firstRow) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(firstRow);
  const csvContent = [
    headers.join(","),
    data
      .map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // 【設計】null/undefined は空文字として出力（Excelで空白セル）
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            // 【設計】カンマ、改行、ダブルクォートを含む場合はエスケープ
            if (
              stringValue.includes(",") ||
              stringValue.includes("\n") ||
              stringValue.includes('"')
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(","),
      )
      .join("\n"),
  ].join("\n");

  // 【設計】UTF-8 BOM (\uFEFF) を付与し、Excel で文字化けを防ぐ
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
