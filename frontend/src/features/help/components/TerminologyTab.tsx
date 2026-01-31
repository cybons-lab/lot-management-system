/**
 * TerminologyTab.tsx
 *
 * データベース用語・命名規則タブ
 */

import { DATABASE_TERMS } from "./database-terms";

export function TerminologyTab() {
  return (
    <div className="db-schema-terminology">
      <div className="db-schema-intro">
        <h2>用語・命名規則</h2>
        <p>データベース内で使用される主要な用語の説明です。</p>
      </div>
      <dl className="db-schema-term-list">
        {DATABASE_TERMS.map((item) => (
          <div key={item.term} className="db-schema-term-item">
            <dt>{item.term}</dt>
            <dd>{item.definition}</dd>
          </div>
        ))}
      </dl>
      <div className="db-schema-note-section">
        <h3>重要な命名規則</h3>
        <ul>
          <li>
            <code>product_group_id</code> は歴史的な命名で、実際は「仕入先品目ID」を意味します
          </li>
          <li>
            <code>supplier_item_id</code> と <code>product_group_id</code>{" "}
            は同じ意味（移行期の歴史的理由で2つの名前が存在）
          </li>
          <li>
            <code>products</code> テーブルは業務識別子ではなく、グルーピング用の補助テーブルです
          </li>
        </ul>
        <p className="db-schema-ref-link">
          詳細は{" "}
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "inherit",
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onClick={() => {
              const url = `${window.location.origin}/docs/database/TERMINOLOGY_GUIDE.md`;
              const a = document.createElement("a");
              a.href = url;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              a.click();
            }}
          >
            用語ガイド
          </button>{" "}
          を参照してください。
        </p>
      </div>
    </div>
  );
}
