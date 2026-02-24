# Google Cloud Service Account Credentials

This directory is for storing your Google Cloud Service Account key file for Gemini Live API authentication.

## Steps to Set Up Credentials

### 1. Create a Service Account in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Select your project
3. Click "Create Service Account"
4. Give it a name (e.g., "gemini-live-bot")
5. Click "Create and Continue"

### 2. Grant Required Permissions

1. For the service account, click on it to open details
2. Go to "Permissions" tab
3. Click "Grant Access"
4. Add the role: **Vertex AI User** (or "Vertex AI Administrator")
5. Click "Save"

### 3. Create and Download JSON Key

1. Go to the "Keys" tab of your service account
2. Click "Add Key" → "Create new key"
3. Select "JSON" format
4. Click "Create"
5. The JSON file will be downloaded to your computer

### 4. Place the Key File in This Directory

1. Rename the downloaded JSON file to: `service-account-key.json`
2. Place it in this directory: `bot_it/credentials/`
3. The final path should be: `bot_it/credentials/service-account-key.json`

### Alternative: Use Environment Variable

If you prefer to keep the key file elsewhere, you can set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable:

**Windows (Command Prompt):**
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=D:\saad\مشاريع تخرج\bot_it\credentials\service-account-key.json
```

**Windows (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="D:\saad\مشاريع تخرج\bot_it\credentials\service-account-key.json"
```

**Linux/Mac:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 5. Update Your .env File

Make sure your `.env` file has the correct `GOOGLE_CLOUD_PROJECT_ID`:

```env
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
```

You can find your Project ID in the [Google Cloud Console](https://console.cloud.google.com/projectselector2/home/dashboard)

## Security Note

⚠️ **IMPORTANT:** Never commit service account key files to version control!

The `.gitignore` file in this directory prevents JSON files from being committed.

## Troubleshooting

If you see the error "Google Cloud credentials not found", check:

1. The file `service-account-key.json` exists in this directory
2. The file is a valid JSON file
3. The service account has the "Vertex AI User" role
4. Your `GOOGLE_CLOUD_PROJECT_ID` in `.env` matches your project
