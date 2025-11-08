param(
  [string]$BaseUrl = "http://localhost:8000",
  [int]$TimeoutSec = 10
)

$ErrorActionPreference = "Stop"

function Get-FirstNonEmpty {
  param([object[]]$Values)
  foreach ($v in $Values) {
    if ($null -ne $v -and "$v" -ne "") { return "$v" }
  }
  return ""
}

# 結果配列（PSCustomObjectで管理）
$Results = @()

function Invoke-Test {
  param(
    [string]$Name,
    [string]$Method = "GET",
    [string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $item = [pscustomobject]@{
    name = $Name
    url  = $Url
    ok   = $false
    ms   = 0
    note = ""
  }
  $Results += $item

  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $params = @{
      Method    = $Method
      Uri       = $Url
      Headers   = $Headers
      TimeoutSec= $TimeoutSec
    }
    if ($Body) {
      $params.ContentType = "application/json"
      $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    $res = Invoke-RestMethod @params
    $sw.Stop()
    $item.ms = $sw.ElapsedMilliseconds

    # エラーフラグ（error/detail が無ければOK扱い）
    $hasError  = $false
    try { if ($null -ne $res.error)  { $hasError = $true } } catch {}
    try { if ($null -ne $res.detail) { $hasError = $true } } catch {}

    $item.ok = ($null -ne $res) -and (-not $hasError)

    # 表示用ノート（title/status/message のうち最初にあるもの）
    $title   = ""; $status  = ""; $message = ""
    try { $title   = $res.title }   catch {}
    try { $status  = $res.status }  catch {}
    try { $message = $res.message } catch {}
    $item.note = Get-FirstNonEmpty -Values @($title, $status, $message)
  }
  catch {
    $sw.Stop()
    $item.ms  = $sw.ElapsedMilliseconds
    $item.ok  = $false
    $item.note = $_.Exception.Message
  }
}

Write-Host "== API Smoke Test start =="
Write-Host "BaseUrl = $BaseUrl`n"

# 1) health
Invoke-Test -Name "health" -Url "$BaseUrl/health"

# 2) version
Invoke-Test -Name "version" -Url "$BaseUrl/version"

# 3) OpenAPI
Invoke-Test -Name "openapi.json" -Url "$BaseUrl/openapi.json"

# 4) masters.warehouses
Invoke-Test -Name "masters.warehouses list" -Url "$BaseUrl/api/masters/warehouses"

# 5) masters.products
Invoke-Test -Name "masters.products list" -Url "$BaseUrl/api/masters/products"

# 6) lots
Invoke-Test -Name "lots list" -Url "$BaseUrl/api/lots"

# 7) orders
Invoke-Test -Name "orders list" -Url "$BaseUrl/api/orders"

# 8) allocations
Invoke-Test -Name "allocations list" -Url "$BaseUrl/api/allocations"

# 9) forecasts
Invoke-Test -Name "forecasts list" -Url "$BaseUrl/api/forecast"

# ---- Summary ----
$okCount = ($Results | Where-Object { $_.ok }).Count
$ngCount = ($Results | Where-Object { -not $_.ok }).Count
$totalMs = ($Results | Select-Object -ExpandProperty ms | Measure-Object -Sum).Sum

Write-Host "`n== Summary =="
$Results | ForEach-Object {
  $status = if ($_.ok) { "OK " } else { "NG " }
  $ms = ("{0,4}" -f $_.ms)
  Write-Host ("[{0}] {1}  {2}ms  -> {3}" -f $status, $_.name, $ms, $_.url)
  if ($_.note) {
    Write-Host ("     note: {0}" -f $_.note)
  }
}

Write-Host ("`nTotal: {0}  OK: {1}  NG: {2}  Time: {3}ms" -f $Results.Count, $okCount, $ngCount, $totalMs)

if ($ngCount -gt 0) {
  Write-Host "== API Smoke Test: FAILED =="
  exit 1
} else {
  Write-Host "== API Smoke Test: PASSED =="
  exit 0
}
