/**
 * DatabaseSchemaPage.tsx
 *
 * データベーススキーマドキュメントページ
 * ER図とテーブル定義を表示
 */

import { Database, Table, FileText, Search } from "lucide-react";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";

import { OverviewTab } from "../components/OverviewTab";
import { TablesTab } from "../components/TablesTab";
import { TerminologyTab } from "../components/TerminologyTab";

import "./DatabaseSchemaPage.css";

type TabType = "overview" | "tables" | "terminology";

export function DatabaseSchemaPage() {
  const { tab = "overview" } = useParams<{ tab: TabType }>();
  const [searchTerm, setSearchTerm] = useState("");

  const activeTab = tab as TabType;

  return (
    <div className="db-schema-page">
      <header className="db-schema-header">
        <Database className="db-schema-header-icon" size={32} />
        <div>
          <h1>データベーススキーマ</h1>
          <p>テーブル構造とリレーションシップの確認</p>
        </div>
      </header>

      <div className="db-schema-tabs">
        <Link
          to="/help/database-schema/overview"
          className={`db-schema-tab ${activeTab === "overview" ? "active" : ""}`}
        >
          <Database size={18} />
          全体概要
        </Link>
        <Link
          to="/help/database-schema/tables"
          className={`db-schema-tab ${activeTab === "tables" ? "active" : ""}`}
        >
          <Table size={18} />
          テーブル一覧
        </Link>
        <Link
          to="/help/database-schema/terminology"
          className={`db-schema-tab ${activeTab === "terminology" ? "active" : ""}`}
        >
          <FileText size={18} />
          用語・命名規則
        </Link>
      </div>

      {activeTab === "tables" && (
        <div className="db-schema-search">
          <Search className="db-schema-search-icon" size={18} />
          <input
            type="text"
            placeholder="テーブル名・説明で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="db-schema-search-input"
          />
        </div>
      )}

      <div className="db-schema-content">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "tables" && <TablesTab searchTerm={searchTerm} />}
        {activeTab === "terminology" && <TerminologyTab />}
      </div>
    </div>
  );
}
