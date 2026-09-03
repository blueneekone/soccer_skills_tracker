$prs = @(497, 496, 494, 493, 492)
while ($prs.Length -gt 0) {
    $pending = @()
    foreach ($pr in $prs) {
        Write-Host "Checking PR $pr..."
        $status = gh pr checks $pr 2>&1
        if ($status -match "pending" -or $status -match "in_progress") {
            $pending += $pr
            Write-Host "PR $pr is still pending."
        } elseif ($LASTEXITCODE -eq 0 -or $status -match "pass") {
            Write-Host "PR $pr checks passed! Merging..."
            gh pr merge $pr --merge --delete-branch
        } else {
            Write-Host "PR $pr failed checks or could not be merged."
        }
    }
    $prs = $pending
    if ($prs.Length -gt 0) { Start-Sleep -Seconds 30 }
}
Write-Host "All PRs processed!"
