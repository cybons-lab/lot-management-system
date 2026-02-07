import { Database, AlertCircle, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { SchemaCheckResult, SchemaEntityStatus, SchemaCheckIssue } from "../../types";

import { Button } from "@/components/ui/base/button";

interface DiagnosticsSectionProps {
  viewCheckStatus: "idle" | "checking" | "ok" | "error";
  isFixing: boolean;
  viewDetails: {
    columns: string[];
    related_tables: Record<string, { exists: boolean; record_count?: number; columns?: string[] }>;
  } | null;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
  schemaCheckStatus: "idle" | "checking" | "ok" | "warning" | "error";
  schemaCheckResult: SchemaCheckResult | null;
  onCheckView: () => void;
  onFixView: () => void;
  onShowViewDetails: () => void;
  onSchemaCheck: () => void;
}

export function DiagnosticsSection({
  viewCheckStatus,
  isFixing,
  viewDetails,
  showDetails,
  setShowDetails,
  schemaCheckStatus,
  schemaCheckResult,
  onCheckView,
  onFixView,
  onShowViewDetails,
  onSchemaCheck,
}: DiagnosticsSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* View Diagnostics */}
      <div className="border-t pt-6">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium">ビュー定義診断（Phase1対応）</h4>
              <p className="text-sm text-muted-foreground mt-1">
                v_lot_receipt_stock ビューに supplier_item_id 列が存在するかチェックします。
                本番環境で在庫ページがエラーになる場合に使用してください。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCheckView}
                disabled={viewCheckStatus === "checking"}
              >
                {viewCheckStatus === "checking" ? "チェック中..." : "ビューをチェック"}
              </Button>
              {viewCheckStatus === "error" && (
                <>
                  <Button variant="default" size="sm" onClick={onFixView} disabled={isFixing}>
                    {isFixing ? "修正中..." : "ビューを修正"}
                  </Button>
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>修正が必要です</span>
                  </div>
                </>
              )}
              {viewCheckStatus === "ok" && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>正常です</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={onShowViewDetails}>
                詳細を表示
              </Button>
            </div>

            {/* 詳細情報モーダル */}
            {showDetails && viewDetails && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">ビュー詳細情報</h3>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 列情報 */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-2">
                      ビュー列情報 ({viewDetails.columns.length}列)
                    </h4>
                    <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 max-h-60 overflow-auto">
                      <ul className="text-sm space-y-1 font-mono">
                        {viewDetails.columns.map((col, idx) => (
                          <li
                            key={idx}
                            className={col === "supplier_item_id" ? "text-green-600 font-bold" : ""}
                          >
                            {idx + 1}. {col}
                            {col === "supplier_item_id" && " ✓ (重要)"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 関連テーブル情報 */}
                  <div>
                    <h4 className="font-medium mb-2">関連テーブル情報</h4>
                    <div className="space-y-3">
                      {Object.entries(viewDetails.related_tables).map(([table, info]) => (
                        <div key={table} className="bg-gray-100 dark:bg-gray-900 rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono font-semibold">{table}</span>
                            {info.exists ? (
                              <span className="text-green-600 text-sm">
                                ✓ 存在 ({info.record_count} レコード)
                              </span>
                            ) : (
                              <span className="text-red-600 text-sm">✗ 存在しません</span>
                            )}
                          </div>
                          {info.exists && info.columns && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                              列: {info.columns.slice(0, 5).join(", ")}
                              {info.columns.length > 5 && ` ...他${info.columns.length - 5}列`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 text-right">
                    <Button onClick={() => setShowDetails(false)}>閉じる</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schema Integrity Check */}
      <div className="border-t pt-6">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-purple-500 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium">スキーマ整合性チェック（包括診断）</h4>
              <p className="text-sm text-muted-foreground mt-1">
                開発環境と本番環境のスキーマ差分を検出します。
                主要テーブル・ビューの存在確認、必須カラム（supplier_item_id等）のチェックを実施。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSchemaCheck}
                disabled={schemaCheckStatus === "checking"}
              >
                {schemaCheckStatus === "checking" ? "チェック中..." : "スキーマをチェック"}
              </Button>
              {schemaCheckStatus === "error" && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>エラーが検出されました</span>
                </div>
              )}
              {schemaCheckStatus === "warning" && (
                <div className="flex items-center gap-1 text-yellow-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>警告があります</span>
                </div>
              )}
              {schemaCheckStatus === "ok" && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>正常です</span>
                </div>
              )}
            </div>

            {/* スキーマチェック結果 */}
            {schemaCheckResult && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
                {/* 問題一覧 */}
                {schemaCheckResult.issues.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2 text-sm">検出された問題:</h5>
                    <div className="space-y-2">
                      {schemaCheckResult.issues.map((issue: SchemaCheckIssue, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded text-sm ${
                            issue.severity === "error"
                              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                              : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {issue.severity === "error" ? (
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-medium">{issue.type}</div>
                              <div className="mt-1">{issue.message}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* テーブル状況 */}
                <div>
                  <h5 className="font-medium mb-2 text-sm">テーブル状況:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(schemaCheckResult.tables).map(
                      ([table, info]: [string, SchemaEntityStatus]) => (
                        <div
                          key={table}
                          className={`p-2 rounded text-xs font-mono ${
                            info.status === "ok"
                              ? "bg-green-50 dark:bg-green-900/20"
                              : "bg-red-50 dark:bg-red-900/20"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{table}</span>
                            {info.status === "ok" ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-600" />
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* ビュー状況 */}
                <div>
                  <h5 className="font-medium mb-2 text-sm">ビュー状況:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(schemaCheckResult.views).map(
                      ([view, info]: [string, SchemaEntityStatus]) => (
                        <div
                          key={view}
                          className={`p-2 rounded text-xs font-mono ${
                            info.status === "ok"
                              ? "bg-green-50 dark:bg-green-900/20"
                              : "bg-red-50 dark:bg-red-900/20"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{view}</span>
                            {info.status === "ok" ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-600" />
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Integrity Check (Maintenance) */}
      <div className="border-t pt-6">
        <div className="flex items-start gap-3">
          <Wrench className="h-5 w-5 text-orange-500 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium">データ整合性チェック・修正（パッチ適用）</h4>
              <p className="text-sm text-muted-foreground mt-1">
                各テーブルの NOT NULL
                違反をスキャンし、定義済みルールに基づいて一括修正（パッチ適用）を行います。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/data-maintenance")}
              >
                詳細・修正ページへ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
