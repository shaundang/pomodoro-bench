# Weekly recommendation runner

This job runs manually on your computer. The website never runs Python and
does not need a Python server after a forecast has been published.

## Set up once

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r ml\requirements.txt
```

Authenticate Application Default Credentials using the Google account that
has access to the Firebase project:

```powershell
gcloud auth application-default login
```

Alternatively, use a Firebase service account. Keep its JSON file outside
this repository:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'D:\private\pomodoro-bench-admin.json'
```

Find your uid in Firebase Console → Authentication → Users. Do not use an
email address in place of the uid.

## Run

Preview without writing anything:

```powershell
python -m ml.weekly_run --project-id pomodoro-bench --user-id YOUR_FIREBASE_UID
```

Publish after reviewing the JSON output:

```powershell
python -m ml.weekly_run --project-id pomodoro-bench --user-id YOUR_FIREBASE_UID --publish
```

For an offline check using an exported backup:

```powershell
python -m ml.weekly_run --input backup.json --output forecast.json
```

Publishing updates `mlForecast` on `/syncs/{uid}` and writes idempotent audit
documents to `/syncs/{uid}/mlRuns/{runId}` and model metadata to
`/syncs/{uid}/mlModels/weekly-v3`.

The tournament compares a historical baseline, contextual Bayesian smoothing,
logistic regression, small boosted stumps, LightGBM, and XGBoost. LightGBM and
XGBoost run on CPU with two threads; no GPU setup is required.
