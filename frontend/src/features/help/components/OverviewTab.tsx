/**
 * OverviewTab.tsx
 *
 * データベーススキーマ概要タブ
 */

import { DynamicERDiagram } from "./DynamicERDiagram";

export function OverviewTab() {
  return (
    <div className="db-schema-overview">
      <div className="db-schema-intro">
        <h2>データベース構造概要</h2>
        <p>
          このシステムは
          <strong>2つのコード体系</strong>
          で運用されています：
        </p>
        <ul>
          <li>
            <strong>メーカー品番</strong> (supplier_items.maker_part_no) - 在庫実体
          </li>
          <li>
            <strong>得意先品番</strong> (customer_items.customer_part_no) - 注文入力
          </li>
        </ul>
        <p className="db-schema-note">
          社内商品コードは存在しません。productsテーブルは補助的なグルーピング用です。
        </p>
      </div>

      <div className="db-schema-er-diagram">
        <h3>全体ER図</h3>
        <p className="db-schema-er-note">
          下記の図はSQLAlchemyモデルから動的に生成されています。テーブルとリレーションシップを表示しています。
        </p>
        <div className="db-schema-er-container">
          <DynamicERDiagram className="db-schema-er-image" />
        </div>
        <p className="db-schema-er-caption">※ データベース構造が変更されると自動的に更新されます</p>
      </div>
    </div>
  );
}
