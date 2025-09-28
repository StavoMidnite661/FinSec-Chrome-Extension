param(
  [string]$RepoUrl = 'https://github.com/StavoMidnite661/FinSec-Chrome-Extension.git',
  [switch]$Push
)

# 1) create canonical folders
New-Item -ItemType Directory -Path .\src\background -Force | Out-Null
New-Item -ItemType Directory -Path .\src\content -Force | Out-Null
New-Item -ItemType Directory -Path .\src\popup -Force | Out-Null
New-Item -ItemType Directory -Path .\src\icons -Force | Out-Null

# 2) Move from SRC if present
if (Test-Path .\SRC) {
  Get-ChildItem .\SRC -Force | ForEach-Object {
    try {
      $srcItem = $_.FullName
      $dest = Join-Path -Path (Resolve-Path .\src).Path -ChildPath $_.Name
      if (-not (Test-Path $dest)) {
        Move-Item -LiteralPath $srcItem -Destination (Resolve-Path .\src).ProviderPath -Force -ErrorAction Stop
      } else {
        Write-Output "skipping existing destination: $dest"
      }
    } catch {
      Write-Warning "move failed for $($srcItem): $_"
    }
  }
}

# 3) Move common root files (adjust names if different)
$map = @{
  'background.js'    = 'src/background/background.js'
  'service_worker.js' = 'src/background/background.js'
  'content.js'       = 'src/content/content.js'
  'content.css'      = 'src/content/content.css'
  'popup.html'       = 'src/popup/popup.html'
  'popup.js'         = 'src/popup/popup.js'
}
foreach ($k in $map.Keys) {
  if (Test-Path $k) {
    $destDir = Split-Path $map[$k]
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Move-Item -Path $k -Destination $map[$k] -Force
  }
}
if (Test-Path .\icons) {
  Get-ChildItem .\icons -Force | ForEach-Object {
    $dest = ".\src\icons\$($_.Name)"
    if (-not (Test-Path $dest)) {
      Move-Item -LiteralPath $_.FullName -Destination ".\src\icons" -Force -ErrorAction SilentlyContinue
    } else {
      Write-Output "icon exists, skipping: $dest"
    }
  }
}

# 4) Update manifest.json safely
if (Test-Path .\manifest.json) {
  $bak = 'manifest.json.bak'
  Copy-Item -Path manifest.json -Destination $bak -Force
  try {
    $mf = Get-Content manifest.json -Raw | ConvertFrom-Json

    if ($mf.action -eq $null) { $mf | Add-Member -MemberType NoteProperty -Name action -Value @{} }
    $mf.action.default_popup = 'src/popup/popup.html'

    if ($mf.background -eq $null) { $mf | Add-Member -MemberType NoteProperty -Name background -Value @{} }
    $mf.background.service_worker = 'src/background/background.js'

    if ($mf.content_scripts -ne $null -and $mf.content_scripts.Count -ge 1) {
      if ($mf.content_scripts[0].psobject.Properties.Match('js') -eq $null) { $mf.content_scripts[0].js = @() }
      if ($mf.content_scripts[0].psobject.Properties.Match('css') -eq $null) { $mf.content_scripts[0].css = @() }
      $mf.content_scripts[0].js = @('src/content/content.js')
      $mf.content_scripts[0].css = @('src/content/content.css')
    } else {
      $mf.content_scripts = @( @{ matches = @('<all_urls>'); js = @('src/content/content.js'); css = @('src/content/content.css') } )
    }

    if ($mf.oauth2 -eq $null) {
      $mf.oauth2 = @{ client_id='YOUR_CLIENT_ID.apps.googleusercontent.com'; scopes=@('openid','email','profile') }
    }

    $mf | ConvertTo-Json -Depth 20 | Out-File -FilePath manifest.json -Encoding utf8
    Write-Output "manifest.json updated (backup at $bak)."
  } catch {
    Write-Error "Failed to parse/modify manifest.json. Backup saved to $bak. Error: $_"
  }
} else {
  Write-Warning "No manifest.json found in current directory."
}

# 5) Write .gitignore
@"
# Google client secrets and environment
client_secret_*.json
*.secret.json
.env

# Node / build
node_modules/
dist/
build/
.vscode/
.DS_Store
"@ | Out-File -FilePath .gitignore -Encoding utf8

# 6) Git operations
if (-not (Test-Path .git)) { git init | Out-Null }
# Ensure no client_secret files are staged/tracked
git ls-files '*client_secret*' 2>$null | ForEach-Object { git rm --cached --ignore-unmatch $_ } 2>$null

git add .
git commit -m "chore: restructure src, update manifest paths, add .gitignore" --allow-empty -q

# set remote (replace or add)
try {
  $existing = git remote
  if (-not $existing) {
    git remote add origin $RepoUrl
  } else {
    git remote set-url origin $RepoUrl
  }
} catch {
  Write-Warning "Could not set remote: $_"
}

git branch -M main
if ($Push) {
  Write-Output "Attempting to push to origin main..."
  git push -u origin main
} else {
  Write-Output "Local commit created. Re-run with -Push to attempt pushing to origin."
}