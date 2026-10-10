"""CLI for the manual weekly Pomodoro Bench recommendation run."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

from .recommender import MODEL_VERSION, build_weekly_forecast, stable_run_id


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train and generate a Pomodoro Bench weekly recommendation")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--user-id", help="Firebase Auth uid; reads /syncs/{uid}")
    source.add_argument("--input", type=Path, help="Local backup JSON for an offline dry run")
    parser.add_argument("--project-id", default=os.environ.get("GOOGLE_CLOUD_PROJECT", "pomodoro-bench"))
    parser.add_argument("--timezone", default="Asia/Bangkok")
    parser.add_argument("--horizon-weeks", type=int, default=4, choices=range(2, 9), metavar="2-8")
    parser.add_argument("--publish", action="store_true", help="Write forecast and audit log to Firestore")
    parser.add_argument("--output", type=Path, help="Optional path for the generated JSON")
    return parser.parse_args()


def firestore_document(project_id: str, user_id: str):
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError as error:
        raise RuntimeError("firebase-admin is not installed; run: python -m pip install -r ml/requirements.txt") from error
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.ApplicationDefault(), {"projectId": project_id})
    return firestore.client().collection("syncs").document(user_id), firestore


def read_source(args: argparse.Namespace) -> tuple[list[dict[str, Any]], Any, Any]:
    if args.input:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        sessions = payload if isinstance(payload, list) else payload.get("sessions", [])
        if not isinstance(sessions, list):
            raise ValueError("Input JSON must be a session array or an object containing a sessions array")
        return sessions, None, None
    document, firestore = firestore_document(args.project_id, args.user_id)
    snapshot = document.get()
    if not snapshot.exists:
        raise ValueError(f"No Firestore document found at /syncs/{args.user_id}")
    payload = snapshot.to_dict() or {}
    sessions = payload.get("sessions", [])
    if not isinstance(sessions, list):
        raise ValueError("Firestore sessions field is not an array")
    return sessions, document, firestore


def publish(document: Any, firestore: Any, run_id: str, forecast: dict[str, Any], audit: dict[str, Any]) -> None:
    batch = firestore.client().batch()
    run_ref = document.collection("mlRuns").document(run_id)
    model_ref = document.collection("mlModels").document(MODEL_VERSION)
    batch.set(document, {"mlForecast": {**forecast, "runId": run_id}, "mlForecastUpdatedAt": firestore.SERVER_TIMESTAMP}, merge=True)
    batch.set(run_ref, {"runId": run_id, "status": "published", "forecast": forecast, "audit": audit, "createdAt": firestore.SERVER_TIMESTAMP}, merge=True)
    batch.set(model_ref, {"modelVersion": MODEL_VERSION, "lastRunId": run_id, "champion": audit["champion"], "models": audit["models"], "updatedAt": firestore.SERVER_TIMESTAMP}, merge=True)
    batch.commit()


def main() -> int:
    args = parse_args()
    if args.publish and args.input:
        print("error: --publish requires --user-id so the target is explicit", file=sys.stderr)
        return 2
    try:
        sessions, document, firestore = read_source(args)
        forecast, audit = build_weekly_forecast(sessions, timezone_name=args.timezone, horizon_weeks=args.horizon_weeks)
        identity = args.user_id or "offline"
        run_id = stable_run_id(identity, forecast, sessions)
        result = {"runId": run_id, "forecast": {**forecast, "runId": run_id}, "audit": audit}
        rendered = json.dumps(result, indent=2, ensure_ascii=False)
        if args.output:
            args.output.write_text(rendered + "\n", encoding="utf-8")
        print(rendered)
        if args.publish:
            publish(document, firestore, run_id, forecast, audit)
            print(f"Published /syncs/{args.user_id}/mlForecast (run {run_id})", file=sys.stderr)
        else:
            print("Dry run only; pass --publish to write Firestore.", file=sys.stderr)
        return 0
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
