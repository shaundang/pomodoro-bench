"""Small, dependency-free ML models and forecast generation.

The dataset is intentionally expected to be small. These models train on CPU,
keep time order intact during evaluation, and always include a simple baseline.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone as fixed_timezone, tzinfo
from hashlib import sha256
from math import cos, exp, log, pi, sin
from statistics import median, pstdev
from typing import Any, Iterable
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


MODEL_VERSION = "weekly-v3"
MIN_TOURNAMENT_ROWS = 12
MIN_RECOMMENDED_MINUTES = 15
MAX_RECOMMENDED_MINUTES = 90


def _clamp(value: float, low: float = 0.02, high: float = 0.98) -> float:
    return max(low, min(high, value))


def _sigmoid(value: float) -> float:
    value = max(-30.0, min(30.0, value))
    return 1.0 / (1.0 + exp(-value))


def _round_five(value: float) -> int:
    return max(5, int(round(value / 5.0) * 5))


@dataclass(frozen=True)
class Session:
    timestamp: datetime
    minutes: int
    category: str
    completed: int
    kind: str

    @property
    def hour(self) -> int:
        return self.timestamp.hour

    @property
    def weekday(self) -> int:
        return (self.timestamp.weekday() + 1) % 7


def resolve_timezone(name: str) -> tzinfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError as error:
        if name == "Asia/Bangkok":
            return fixed_timezone(timedelta(hours=7), name)
        raise ValueError(f"Unknown timezone {name!r}; install the tzdata package") from error


def _parse_timestamp(value: Any, timezone: tzinfo) -> datetime | None:
    try:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(float(value) / 1000.0, timezone)
        if isinstance(value, str):
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone)
            return parsed.astimezone(timezone)
        if isinstance(value, datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone)
            return value.astimezone(timezone)
    except (OverflowError, TypeError, ValueError):
        return None
    return None


def normalize_sessions(rows: Iterable[dict[str, Any]], timezone_name: str) -> list[Session]:
    timezone = resolve_timezone(timezone_name)
    normalized: list[Session] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        timestamp = _parse_timestamp(row.get("timestamp"), timezone)
        try:
            minutes = int(round(float(row.get("minutes", 0))))
        except (TypeError, ValueError):
            continue
        if timestamp is None or not 1 <= minutes <= 720:
            continue
        kind = str(row.get("type") or "focus").strip().lower()
        status = str(row.get("status") or "completed").strip().lower()
        normalized.append(Session(
            timestamp=timestamp,
            minutes=minutes,
            category=str(row.get("category") or "Uncategorized").strip()[:80] or "Uncategorized",
            completed=1 if status == "completed" else 0,
            kind=kind,
        ))
    return sorted(normalized, key=lambda item: item.timestamp)


class HistoricalBaseline:
    name = "historical_baseline"

    def fit(self, rows: list[Session]) -> "HistoricalBaseline":
        successes = sum(row.completed for row in rows)
        self.probability = (successes + 2.0) / (len(rows) + 4.0)
        return self

    def predict_one(self, row: Session) -> float:
        return self.probability


class ContextualBayes:
    name = "contextual_bayes"

    @staticmethod
    def key(row: Session) -> tuple[int, int, int, str]:
        return row.weekday, row.hour // 3, int(round(row.minutes / 10.0) * 10), row.category.lower()

    def fit(self, rows: list[Session]) -> "ContextualBayes":
        self.global_probability = HistoricalBaseline().fit(rows).probability
        self.groups: dict[tuple[int, int, int, str], tuple[int, int]] = {}
        for row in rows:
            successes, count = self.groups.get(self.key(row), (0, 0))
            self.groups[self.key(row)] = successes + row.completed, count + 1
        return self

    def predict_one(self, row: Session) -> float:
        successes, count = self.groups.get(self.key(row), (0, 0))
        strength = 5.0
        return _clamp((successes + strength * self.global_probability) / (count + strength))


class FeatureEncoder:
    def fit(self, rows: list[Session]) -> "FeatureEncoder":
        counts: dict[str, int] = {}
        for row in rows:
            counts[row.category] = counts.get(row.category, 0) + 1
        self.categories = [name for name, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:6]]
        return self

    def transform(self, row: Session) -> list[float]:
        hour_angle = row.hour / 24.0 * 2.0 * pi
        day_angle = row.weekday / 7.0 * 2.0 * pi
        values = [1.0, (row.minutes - 35.0) / 30.0, sin(hour_angle), cos(hour_angle), sin(day_angle), cos(day_angle)]
        values.extend(1.0 if row.category == category else 0.0 for category in self.categories)
        return values


class LogisticRegression:
    name = "logistic_regression"

    def fit(self, rows: list[Session]) -> "LogisticRegression":
        self.encoder = FeatureEncoder().fit(rows)
        matrix = [self.encoder.transform(row) for row in rows]
        self.weights = [0.0] * len(matrix[0])
        rate = 0.08
        regularization = 0.02
        for _ in range(450):
            gradient = [0.0] * len(self.weights)
            for features, row in zip(matrix, rows):
                prediction = _sigmoid(sum(weight * value for weight, value in zip(self.weights, features)))
                error = prediction - row.completed
                for index, value in enumerate(features):
                    gradient[index] += error * value
            for index in range(len(self.weights)):
                penalty = 0.0 if index == 0 else regularization * self.weights[index]
                self.weights[index] -= rate * (gradient[index] / len(rows) + penalty)
        return self

    def predict_one(self, row: Session) -> float:
        features = self.encoder.transform(row)
        return _clamp(_sigmoid(sum(weight * value for weight, value in zip(self.weights, features))))


class GradientBoostedStumps:
    name = "gradient_boosted_stumps"

    def fit(self, rows: list[Session]) -> "GradientBoostedStumps":
        self.encoder = FeatureEncoder().fit(rows)
        matrix = [self.encoder.transform(row)[1:] for row in rows]
        self.base = HistoricalBaseline().fit(rows).probability
        predictions = [self.base] * len(rows)
        self.stumps: list[tuple[int, float, float, float]] = []
        learning_rate = 0.16
        for _ in range(28):
            residuals = [row.completed - prediction for row, prediction in zip(rows, predictions)]
            best: tuple[float, int, float, float, float] | None = None
            for feature_index in range(len(matrix[0])):
                values = sorted(set(vector[feature_index] for vector in matrix))
                if len(values) > 12:
                    values = [values[int((len(values) - 1) * q / 10)] for q in range(1, 10)]
                thresholds = values[:-1] or values
                for threshold in thresholds:
                    left = [residual for vector, residual in zip(matrix, residuals) if vector[feature_index] <= threshold]
                    right = [residual for vector, residual in zip(matrix, residuals) if vector[feature_index] > threshold]
                    if not left or not right:
                        continue
                    left_value = sum(left) / len(left)
                    right_value = sum(right) / len(right)
                    loss = sum((residual - (left_value if vector[feature_index] <= threshold else right_value)) ** 2 for vector, residual in zip(matrix, residuals))
                    if best is None or loss < best[0]:
                        best = loss, feature_index, threshold, left_value, right_value
            if best is None:
                break
            _, feature_index, threshold, left_value, right_value = best
            left_value *= learning_rate
            right_value *= learning_rate
            self.stumps.append((feature_index, threshold, left_value, right_value))
            predictions = [_clamp(prediction + (left_value if vector[feature_index] <= threshold else right_value)) for prediction, vector in zip(predictions, matrix)]
        return self

    def predict_one(self, row: Session) -> float:
        features = self.encoder.transform(row)[1:]
        prediction = self.base
        for feature_index, threshold, left_value, right_value in self.stumps:
            prediction += left_value if features[feature_index] <= threshold else right_value
        return _clamp(prediction)


class LightGBMClassifier:
    name = "lightgbm"

    def fit(self, rows: list[Session]) -> "LightGBMClassifier":
        from lightgbm import LGBMClassifier

        self.encoder = FeatureEncoder().fit(rows)
        matrix = [self.encoder.transform(row) for row in rows]
        self.model = LGBMClassifier(
            objective="binary",
            n_estimators=80,
            learning_rate=0.05,
            num_leaves=15,
            max_depth=4,
            min_child_samples=max(5, min(20, len(rows) // 10)),
            subsample=0.85,
            colsample_bytree=0.9,
            reg_lambda=2.0,
            n_jobs=2,
            random_state=42,
            verbosity=-1,
        )
        self.model.fit(matrix, [row.completed for row in rows])
        return self

    def predict_one(self, row: Session) -> float:
        return _clamp(float(self.model.predict_proba([self.encoder.transform(row)])[0][1]))


class XGBoostClassifier:
    name = "xgboost"

    def fit(self, rows: list[Session]) -> "XGBoostClassifier":
        from xgboost import XGBClassifier

        self.encoder = FeatureEncoder().fit(rows)
        matrix = [self.encoder.transform(row) for row in rows]
        self.model = XGBClassifier(
            objective="binary:logistic",
            eval_metric="logloss",
            n_estimators=80,
            learning_rate=0.05,
            max_depth=3,
            min_child_weight=3,
            subsample=0.85,
            colsample_bytree=0.9,
            reg_lambda=2.0,
            tree_method="hist",
            n_jobs=2,
            random_state=42,
            verbosity=0,
        )
        self.model.fit(matrix, [row.completed for row in rows])
        return self

    def predict_one(self, row: Session) -> float:
        return _clamp(float(self.model.predict_proba([self.encoder.transform(row)])[0][1]))


def _metrics(labels: list[int], probabilities: list[float]) -> dict[str, float]:
    count = len(labels)
    brier = sum((probability - label) ** 2 for label, probability in zip(labels, probabilities)) / count
    log_loss = -sum(label * log(_clamp(probability, 1e-7, 1 - 1e-7)) + (1 - label) * log(_clamp(1 - probability, 1e-7, 1 - 1e-7)) for label, probability in zip(labels, probabilities)) / count
    bins: dict[int, list[tuple[int, float]]] = {}
    for label, probability in zip(labels, probabilities):
        bins.setdefault(min(4, int(probability * 5)), []).append((label, probability))
    calibration = sum(len(items) / count * abs(sum(label for label, _ in items) / len(items) - sum(probability for _, probability in items) / len(items)) for items in bins.values())
    return {"brier": round(brier, 6), "logLoss": round(log_loss, 6), "calibrationError": round(calibration, 6)}


def run_tournament(rows: list[Session]) -> tuple[Any, dict[str, Any]]:
    model_types = [HistoricalBaseline, ContextualBayes, LogisticRegression, GradientBoostedStumps, LightGBMClassifier, XGBoostClassifier]
    can_compare = len(rows) >= MIN_TOURNAMENT_ROWS and sum(row.completed for row in rows) >= 3 and sum(not row.completed for row in rows) >= 3
    splits: list[tuple[list[Session], list[Session]]] = []
    if can_compare:
        fold_size = max(3, min(12, len(rows) // 8))
        fold_count = min(4, max(1, (len(rows) - 8) // fold_size))
        first_test = len(rows) - fold_count * fold_size
        for fold in range(fold_count):
            start = first_test + fold * fold_size
            train = rows[:start]
            test = rows[start:start + fold_size]
            if train and test and any(row.completed for row in train) and any(not row.completed for row in train):
                splits.append((train, test))
        can_compare = bool(splits)

    results: dict[str, dict[str, Any]] = {}
    for model_type in model_types:
        if not can_compare and model_type not in (HistoricalBaseline, ContextualBayes):
            results[model_type.name] = {"status": "skipped", "reason": "insufficient_time_ordered_labels"}
            continue
        try:
            if splits:
                labels: list[int] = []
                probabilities: list[float] = []
                for train, test in splits:
                    model = model_type().fit(train)
                    labels.extend(row.completed for row in test)
                    probabilities.extend(model.predict_one(row) for row in test)
                results[model_type.name] = {"status": "evaluated", **_metrics(labels, probabilities)}
            else:
                model_type().fit(rows)
                results[model_type.name] = {"status": "fallback", "reason": "insufficient_time_ordered_labels"}
        except Exception as error:
            if model_type not in (LightGBMClassifier, XGBoostClassifier):
                raise
            results[model_type.name] = {"status": "unavailable", "reason": type(error).__name__}

    champion_name = HistoricalBaseline.name
    if splits:
        evaluated = {name: result for name, result in results.items() if result.get("status") == "evaluated"}
        best_name = min(evaluated, key=lambda name: (evaluated[name]["brier"], evaluated[name]["logLoss"]))
        baseline = evaluated[HistoricalBaseline.name]
        best = evaluated[best_name]
        if best_name != HistoricalBaseline.name and best["brier"] <= baseline["brier"] - 0.01 and best["logLoss"] <= baseline["logLoss"] * 1.05:
            champion_name = best_name

    champion_type = next(model_type for model_type in model_types if model_type.name == champion_name)
    champion = champion_type().fit(rows)
    return champion, {
        "champion": champion_name,
        "modelVersion": MODEL_VERSION,
        "trainRows": len(splits[0][0]) if splits else len(rows),
        "testRows": sum(len(test) for _, test in splits),
        "validationFolds": len(splits),
        "models": results,
    }


def _week_start(value: datetime) -> datetime:
    start = value.replace(hour=0, minute=0, second=0, microsecond=0)
    return start - timedelta(days=start.weekday())


def _next_slot(now: datetime, weekday: int, hour: int) -> datetime:
    python_weekday = (weekday + 6) % 7
    days = (python_weekday - now.weekday()) % 7
    candidate = (now + timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=7)
    return candidate


def build_weekly_forecast(raw_sessions: Iterable[dict[str, Any]], *, timezone_name: str = "Asia/Bangkok", now: datetime | None = None, horizon_weeks: int = 4) -> tuple[dict[str, Any], dict[str, Any]]:
    timezone = resolve_timezone(timezone_name)
    now = (now or datetime.now(timezone)).astimezone(timezone)
    sessions = normalize_sessions(raw_sessions, timezone_name)
    focus = [row for row in sessions if row.kind != "break"]
    completed = [row for row in focus if row.completed]
    if len(completed) < 3:
        raise ValueError("At least 3 completed focus sessions are required")

    champion, tournament = run_tournament(focus)
    break_rows = [row.minutes for row in sessions if row.kind == "break" and row.completed]
    break_minutes = _round_five(median(break_rows)) if break_rows else 5
    sustainable_minutes = max(
        MIN_RECOMMENDED_MINUTES,
        min(MAX_RECOMMENDED_MINUTES, _round_five(median(row.minutes for row in completed))),
    )
    groups: dict[tuple[int, int, str, int], list[Session]] = {}
    for row in focus:
        # Very long logged sessions are useful evidence, but should not become
        # an unsafe next-session instruction merely because expected minutes
        # grows with duration.
        duration = max(MIN_RECOMMENDED_MINUTES, min(MAX_RECOMMENDED_MINUTES, _round_five(row.minutes)))
        groups.setdefault((row.weekday, row.hour, row.category, duration), []).append(row)
    candidates: list[dict[str, Any]] = []
    for (weekday, hour, category, duration), group in groups.items():
        representative = Session(_next_slot(now, weekday, hour), duration, category, 1, "focus")
        probability = champion.predict_one(representative)
        distance = abs(duration - sustainable_minutes) / max(15.0, sustainable_minutes)
        sustainability = exp(-1.5 * distance)
        support = 0.9 + min(0.1, log(1 + len(group)) * 0.05)
        score = probability * sustainability * support
        candidates.append({"day": weekday, "hour": hour, "category": category, "focusMinutes": duration, "completionProbability": round(probability, 4), "score": round(score, 4), "support": len(group)})
    candidates.sort(key=lambda item: (-item["score"], -item["support"], item["day"], item["hour"]))
    best = candidates[0]
    next_at = _next_slot(now, best["day"], best["hour"])
    expected_minutes = _round_five(best["focusMinutes"] * best["completionProbability"])

    current_week = _week_start(now)
    observed: list[int] = []
    observed_counts: list[int] = []
    for offset in range(4, 0, -1):
        start = current_week - timedelta(weeks=offset)
        end = start + timedelta(weeks=1)
        rows = [row for row in completed if start <= row.timestamp < end]
        observed.append(sum(row.minutes for row in rows))
        observed_counts.append(len(rows))
    nonzero = [value for value in observed if value > 0]
    base_minutes = sum(nonzero) / len(nonzero) if nonzero else sum(row.minutes for row in completed) / max(1, len(completed))
    active_week_count = sum(1 for value in observed_counts if value > 0)
    base_sessions = sum(observed_counts) / max(1, active_week_count) if any(observed_counts) else 1
    slope = (observed[-1] - observed[0]) / 3.0 if len(nonzero) >= 2 else 0.0
    slope = max(-base_minutes * 0.15, min(base_minutes * 0.15, slope))
    uncertainty = max(base_minutes * 0.15, pstdev(nonzero) if len(nonzero) > 1 else base_minutes * 0.2)
    weeks = []
    for offset in range(horizon_weeks):
        week_minutes = _round_five(max(5.0, base_minutes + slope * (offset + 1) * 0.5))
        week_sessions = max(1, int(round(base_sessions * week_minutes / max(5.0, base_minutes))))
        start = current_week + timedelta(weeks=offset + 1)
        weeks.append({"weekStart": start.date().isoformat(), "label": start.strftime("%b %d").replace(" 0", " "), "focusMinutes": week_minutes, "sessions": week_sessions, "lowMinutes": _round_five(max(5.0, week_minutes - uncertainty)), "highMinutes": _round_five(week_minutes + uncertainty)})

    by_day: dict[int, int] = {}
    by_hour: dict[int, int] = {}
    for row in completed:
        by_day[row.weekday] = by_day.get(row.weekday, 0) + row.minutes
        by_hour[row.hour] = by_hour.get(row.hour, 0) + row.minutes
    weekly_target = weeks[0]["focusMinutes"]
    weekly_sessions = weeks[0]["sessions"]
    recent_completed = [row for row in completed if row.timestamp >= current_week - timedelta(weeks=8)] or completed
    category_counts: dict[str, int] = {}
    category_minutes: dict[str, int] = {}
    for row in recent_completed:
        category_counts[row.category] = category_counts.get(row.category, 0) + 1
        category_minutes[row.category] = category_minutes.get(row.category, 0) + row.minutes
    best_candidate_by_category: dict[str, dict[str, Any]] = {}
    for candidate in candidates:
        best_candidate_by_category.setdefault(candidate["category"], candidate)
    top_categories = sorted(category_minutes, key=lambda name: (-category_minutes[name], name))[:3]
    total_category_sessions = sum(category_counts.values())
    total_category_minutes = sum(category_minutes.values())
    category_slots = []
    for category in top_categories:
        candidate = best_candidate_by_category[category]
        category_slots.append({
            **{key: candidate[key] for key in ("category", "day", "hour", "focusMinutes", "completionProbability")},
            "weeklySessions": max(1, int(round(weekly_sessions * category_counts[category] / total_category_sessions))),
            "weeklyFocusMinutes": _round_five(weekly_target * category_minutes[category] / total_category_minutes),
        })
    forecast = {
        "schemaVersion": 1,
        "status": "ready",
        "source": "weekly-python",
        "modelVersion": MODEL_VERSION,
        "generatedAt": now.isoformat(),
        "dataCutoff": max(row.timestamp for row in sessions).isoformat(),
        "timezone": timezone_name,
        "horizonWeeks": horizon_weeks,
        "recommendation": {**{key: best[key] for key in ("day", "hour", "category", "focusMinutes", "completionProbability")}, "breakMinutes": break_minutes, "expectedFocusMinutes": expected_minutes, "nextAt": next_at.isoformat()},
        "plan": {"focusMinutes": weekly_target, "sessions": weekly_sessions, "slots": category_slots},
        "weeks": weeks,
        "patterns": {"bestHour": max(by_hour, key=by_hour.get), "bestDay": max(by_day, key=by_day.get), "bestDurationMinutes": sustainable_minutes, "bestBreakMinutes": break_minutes, "weeklySessions": weekly_sessions, "completionRate": round(sum(row.completed for row in focus) / len(focus), 4)},
    }
    audit = {**tournament, "sessionRows": len(sessions), "focusRows": len(focus), "completedRows": len(completed), "candidateCount": len(candidates), "sustainableMinutes": sustainable_minutes}
    return forecast, audit


def stable_run_id(user_id: str, forecast: dict[str, Any], raw_sessions: Iterable[dict[str, Any]]) -> str:
    session_ids = sorted(str(row.get("id", "")) for row in raw_sessions if isinstance(row, dict))
    payload = "|".join([user_id, forecast["dataCutoff"], MODEL_VERSION, *session_ids])
    digest = sha256(payload.encode("utf-8")).hexdigest()[:16]
    return forecast["generatedAt"][:10].replace("-", "") + "-" + digest
