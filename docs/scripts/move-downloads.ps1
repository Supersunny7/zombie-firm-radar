# Moves the 31 manual downloads from your Downloads folder into tools/cache/manual/<name>/<name>.<ext>
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File .\move-downloads.ps1
$dl = Join-Path $HOME "Downloads"
$dest = Join-Path (Get-Location) "tools\cache\manual"
$freesound = @{
  "160421" = "freesound-bigkahuna360-electrical-shock-zap"
  "437345" = "freesound-giddster-crows-cawing"
  "558413" = "freesound-guyburns-digging-with-shovel"
  "223815" = "freesound-indieground-pas-zombie-route"
  "136542" = "freesound-joelaudio-electric-zap-001"
  "274767" = "freesound-launemax-open-close-iron-gate"
  "638914" = "freesound-lennartgreen-low-rumble-loopable"
  "814056" = "freesound-qubodup-vibrating-jumpscare"
  "534998" = "freesound-sidequesting-steady-heart-rate-monitor-loop"
  "536527" = "freesound-smice-6-hum-loop"
  "210793" = "freesound-thegreatperson-heart-rate-cardiac-arrest-flatline"
  "486599" = "freesound-tomhannen-howling-wind-tower"
  "435296" = "freesound-zazz-cloth-rustle-8"
  "551437" = "freesound-zhro-heartbeat-loopable"
}
$moved = 0; $missing = @()
foreach ($id in $freesound.Keys) {
  $name = $freesound[$id]
  $f = Get-ChildItem $dl -File | Where-Object { $_.Name -like "$($id)__*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($f) {
    $dir = Join-Path $dest $name; New-Item -ItemType Directory -Force $dir | Out-Null
    Move-Item $f.FullName (Join-Path $dir ($name + $f.Extension)) -Force; $moved++
  } else { $missing += $name }
}
Get-ChildItem $dl -File -Filter "sketchfab-*.zip" | ForEach-Object {
  $name = $_.BaseName -replace ' \(\d+\)$',''
  $dir = Join-Path $dest $name; New-Item -ItemType Directory -Force $dir | Out-Null
  Move-Item $_.FullName (Join-Path $dir ($name + ".zip")) -Force; $moved++
}
Write-Host "Moved $moved files."
if ($missing.Count) { Write-Host "Missing Freesound files:"; $missing | ForEach-Object { Write-Host "  $_" } }
$expected = 31
$have = (Get-ChildItem $dest -Recurse -File | Where-Object { $_.Name -ne "README.md" }).Count
Write-Host "Files now in tools/cache/manual: $have of $expected"
