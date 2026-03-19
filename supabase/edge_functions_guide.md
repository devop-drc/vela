# Edge Function Deployment Guide

Since I cannot deploy Edge Functions directly from my environment (as it requires the Supabase CLI and your account credentials), I have prepared a script and a guide for you to do this in one go.

## Required Secrets

Before deploying, you MUST set the following secrets in your Supabase Dashboard (**Settings > Edge Functions > Secrets**):

| Secret Name | Description |
| :--- | :--- |
| `EXCHANGE_RATE_API_KEY` | API key from [ExchangeRate-API](https://www.exchangerate-api.com/) (Required for currency conversion) |
| `GEMINI_API_KEY` | API key from [Google AI Studio](https://aistudio.google.com/) (Required for AI product analysis) |
| `FACEBOOK_APP_ID` | Your Meta App ID (Required for Instagram integration) |
| `FACEBOOK_APP_SECRET` | Your Meta App Secret (Required for Instagram integration) |
| `IG_WEBHOOK_VERIFY_TOKEN` | Any random string you chose for your Instagram Webhook |
| `PERIODIC_SYNC_SECRET` | A secure random string for background sync auth |

## How to Deploy All Functions

### Option 1: Using the Supabase CLI (Recommended)

1.  **Install the CLI** (if you haven't):
    ```powershell
    # Windows (PowerShell)
    npx supabase --version
    ```
2.  **Login**:
    ```powershell
    npx supabase login
    ```
3.  **Link your project**:
    ```powershell
    npx supabase link --project-ref your-project-ref
    ```
4.  **Deploy everything**:
    ```powershell
    npx supabase functions deploy
    ```

### Option 2: Deployment Script

I've created a script to help you deploy all 22 functions. You can run it from your terminal:

[deploy_functions.ps1](file:///c:/Users/bonk/Desktop/Work/InstantShop/supabase/deploy_functions.ps1)

```powershell
./supabase/deploy_functions.ps1
```

> [!IMPORTANT]
> The 404 error you saw for `exchange-rates` is because the function code hasn't been uploaded to your new Supabase instance yet. Running the deployment will fix this.
