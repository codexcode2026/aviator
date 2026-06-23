# Allow friends on the same Wi‑Fi to open the Aviator dev app (port 5173 only).
# Run once in PowerShell as Administrator.

$ruleName = "Aviator Dev (Vite 5173)"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall rule already exists: $ruleName"
} else {
  New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 `
    -Profile Private,Domain | Out-Null
  Write-Host "Added firewall rule: $ruleName (TCP 5173)"
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host ""
Write-Host "Share this link with friends on the same network:"
Write-Host "  http://${ip}:5173/"
Write-Host ""
