#Requires -RunAsAdministrator

param(
    [string]$SiteName = 'Customer-Control-Panel',
    [string]$AppPoolName = 'Customer-Control-Panel-Pool',
    [string]$TargetRoot = 'C:\inetpub\sites\Customer-Control-Panel',
    [int]$Port = 3090,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

Import-Module WebAdministration

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

Set-Location $PSScriptRoot

if (-not $SkipBuild) {
    Write-Host 'Building customer-control-panel...' -ForegroundColor Cyan
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw 'Build failed.'
    }
} else {
    Write-Host 'Skipping build and using existing dist output...' -ForegroundColor Yellow
}

$distRoot = Join-Path $PSScriptRoot 'dist'
if (-not (Test-Path $distRoot)) {
    throw "Build output not found: $distRoot"
}

if (-not (Test-Path $TargetRoot)) {
    New-Item -ItemType Directory -Path $TargetRoot -Force | Out-Null
}

Write-Host 'Stopping existing IIS site to release file locks...' -ForegroundColor Cyan
Import-Module WebAdministration
Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
Stop-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host 'Syncing dist to IIS target...' -ForegroundColor Cyan
robocopy $distRoot $TargetRoot /MIR /NFL /NDL /NJH /NJS /NP /R:2 /W:2 | Out-Null

$logsPath = Join-Path $TargetRoot 'logs'
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
}

$appJs = @'
const http = require('http');
const fs = require('fs');
const path = require('path');
const host = '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const root = __dirname;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8'
};
function sendFile(res, filePath, statusCode = 200) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(statusCode, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    res.end(content);
  });
}
http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const safePath = decodeURIComponent(requestUrl.pathname);
  let filePath = path.join(root, safePath === '/' ? 'index.html' : safePath.replace(/^\/+/, ''));
  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.access(filePath, fs.constants.F_OK, (fileError) => {
      if (!fileError) {
        sendFile(res, filePath);
        return;
      }
      sendFile(res, path.join(root, 'index.html'));
    });
  });
}).listen(port, host, () => {
  console.log(`Customer control panel IIS host listening on http://${host}:${port}`);
});
'@

$webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" />
    </handlers>
    <httpPlatform processPath="C:\Program Files\nodejs\node.exe"
                  arguments="app.js"
                  startupTimeLimit="20"
                  stdoutLogEnabled="true"
                  stdoutLogFile=".\logs\customer-panel-stdout.log">
      <environmentVariables>
        <environmentVariable name="PORT" value="%HTTP_PLATFORM_PORT%" />
        <environmentVariable name="NODE_ENV" value="production" />
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
"@

Write-Utf8NoBom -Path (Join-Path $TargetRoot 'app.js') -Content $appJs
Write-Utf8NoBom -Path (Join-Path $TargetRoot 'web.config') -Content $webConfig

if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-Item "IIS:\AppPools\$AppPoolName" | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ''
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedPipelineMode -Value 0

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    New-Website -Name $SiteName -Port $Port -PhysicalPath $TargetRoot -ApplicationPool $AppPoolName | Out-Null
} else {
    Stop-Website $SiteName -ErrorAction SilentlyContinue
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $TargetRoot
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
}

Start-WebAppPool $AppPoolName
Start-Website $SiteName
Start-Sleep -Seconds 3

$response = Invoke-WebRequest ("http://localhost:{0}/" -f $Port) -UseBasicParsing
Write-Host ("Deployment complete. {0} is returning {1}." -f $SiteName, $response.StatusCode) -ForegroundColor Green
Write-Host ("URL: http://localhost:{0}/" -f $Port) -ForegroundColor Gray
