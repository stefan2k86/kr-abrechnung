# Winziger lokaler Webserver zum Ausprobieren der App ohne Installation.
# Rechtsklick -> "Mit PowerShell ausfuehren"  ODER  in PowerShell:  .\serve.ps1
# Danach im Browser:  http://localhost:8777/
param([int]$Port = 8777)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$mime = @{
  ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8";
  ".mjs"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".json"="application/json; charset=utf-8"; ".webmanifest"="application/manifest+json; charset=utf-8";
  ".svg"="image/svg+xml"; ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg";
  ".pdf"="application/pdf"; ".csv"="text/csv; charset=utf-8"; ".txt"="text/plain; charset=utf-8";
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "KR-Abrechnung laeuft auf  http://localhost:$Port/"
Write-Host "Beenden mit Strg+C"
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq "") { $rel = "index.html" }
      $path = Join-Path $Root $rel
      if (Test-Path $path -PathType Container) { $path = Join-Path $path "index.html" }
      if (Test-Path $path -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($path).ToLower()
        $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $ctx.Response.ContentType = $ct
        $ctx.Response.Headers.Add("Cache-Control","no-store")
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
      } else {
        $ctx.Response.StatusCode = 404
        $b = [System.Text.Encoding]::UTF8.GetBytes("404: $rel")
        $ctx.Response.OutputStream.Write($b,0,$b.Length)
      }
    } catch {
      $ctx.Response.StatusCode = 500
    } finally {
      $ctx.Response.OutputStream.Close()
    }
  }
} finally { $listener.Stop() }
