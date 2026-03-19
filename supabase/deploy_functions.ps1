# Deployment script for InstantShop Edge Functions
# Run this from the project root

$PROJECT_REF = "hbsetjwlawuxasjbvpyx"
$functions = Get-ChildItem -Path ./supabase/functions -Directory | Select-Object -ExpandProperty Name

Write-Host "Deploying Edge Functions to project $PROJECT_REF..." -ForegroundColor Cyan

foreach ($fn in $functions) {
    $entrypoint = "./supabase/functions/$fn/index.ts"
    if (Test-Path $entrypoint) {
        Write-Host "Deploying $fn..." -ForegroundColor Yellow
        npx supabase functions deploy $fn --project-ref $PROJECT_REF --no-verify-jwt
    } else {
        Write-Host "Skipping $fn (No index.ts found)" -ForegroundColor Gray
    }
}

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Don't forget to set your Secrets in the Supabase Dashboard!" -ForegroundColor Red
