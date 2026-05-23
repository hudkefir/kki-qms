# CI/CD Setup — KKI QMS

## How It Works
- Push to `main` → GitHub Actions builds and deploys to Cloud Run automatically
- No more manual `gcloud run deploy` commands

## Setup Steps (one-time)

### 1. Re-auth gcloud (Hudson or Jarvis)
```bash
gcloud auth login
```

### 2. Create a service account for GitHub Actions
```bash
# Create the service account
gcloud iam service-accounts create github-deploy \
  --display-name="GitHub Actions Deploy" \
  --project=kki-production-dashboard

# Grant Cloud Run deployer role
gcloud projects add-iam-policy-binding kki-production-dashboard \
  --member="serviceAccount:github-deploy@kki-production-dashboard.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Cloud Build role (needed for --source deploys)
gcloud projects add-iam-policy-binding kki-production-dashboard \
  --member="serviceAccount:github-deploy@kki-production-dashboard.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# Grant Storage admin (for uploading build artifacts)
gcloud projects add-iam-policy-binding kki-production-dashboard \
  --member="serviceAccount:github-deploy@kki-production-dashboard.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Grant Service Account User (to act as the Cloud Run service account)
gcloud projects add-iam-policy-binding kki-production-dashboard \
  --member="serviceAccount:github-deploy@kki-production-dashboard.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download the key
gcloud iam service-accounts keys create /tmp/gcp-sa-key.json \
  --iam-account=github-deploy@kki-production-dashboard.iam.gserviceaccount.com
```

### 3. Add the key to GitHub Secrets
```bash
# Using GitHub CLI
gh secret set GCP_SA_KEY < /tmp/gcp-sa-key.json

# Then delete the local key file
rm /tmp/gcp-sa-key.json
```

### 4. Test
```bash
git push origin main
```
Check: https://github.com/hudkefir/kki-qms/actions

## What Triggers a Deploy
- Any push to `main` branch
- This includes merges from PRs

## Rollback
```bash
# List recent revisions
gcloud run revisions list --service=kki-qms --region=us-east1 --project=kki-production-dashboard

# Route traffic to a previous revision
gcloud run services update-traffic kki-qms \
  --to-revisions=REVISION_NAME=100 \
  --region=us-east1 \
  --project=kki-production-dashboard
```
