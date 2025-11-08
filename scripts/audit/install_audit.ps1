param(
  [string]$ServiceName = "db-postgres",   # docker compose のサービス名
  [string]$DbName      = "lot_management",
  [string]$DbUser      = "admin",
  [string]$SqlPath     = "scripts/audit/audit_schema.sql",
  [switch]$NoCleanup                       # /tmp のSQLを残したい場合に指定
)

$ErrorActionPreference = "Stop"

Write-Host "== Audit setup start =="

# 1) SQLファイル確認
if (-not (Test-Path $SqlPath)) {
  throw "SQL file not found: $SqlPath"
}

# 2) コンテナにコピー
$dest = "/tmp/audit_schema.sql"
$dockerTarget = "${ServiceName}:$dest"
Write-Host "Copying $SqlPath -> $dockerTarget"
docker compose cp $SqlPath $dockerTarget

# 3) 適用 (ON_ERROR_STOP=1 で途中エラー時に即停止)
Write-Host "Applying audit SQL to $DbName ..."
docker compose exec -T $ServiceName `
  psql -v ON_ERROR_STOP=1 -U $DbUser -d $DbName -f $dest

# 4) 結果のサマリ（トリガ/履歴テーブル数）
Write-Host "`n== Summary =="
docker compose exec -T $ServiceName psql -U $DbUser -d $DbName -c `
"SELECT count(*) AS trigger_count
   FROM pg_trigger t
   JOIN pg_proc p ON t.tgfoid=p.oid
  WHERE NOT t.tgisinternal AND p.proname='audit_write';"

docker compose exec -T $ServiceName psql -U $DbUser -d $DbName -c `
"SELECT count(*) AS history_tables
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname LIKE '%\_history' ESCAPE '\';"

# 5) 後始末
if (-not $NoCleanup) {
  Write-Host "Cleaning up $dest ..."
  docker compose exec -T $ServiceName sh -lc "rm -f $dest"
}

Write-Host "== Audit setup done =="
