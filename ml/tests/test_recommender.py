import unittest
from datetime import datetime, timedelta, timezone

from ml.recommender import MODEL_VERSION, build_weekly_forecast, stable_run_id
from ml.weekly_run import publish


class FakeRef:
    def __init__(self, path):
        self.path = path

    def collection(self, name):
        return FakeCollection(f"{self.path}/{name}")


class FakeCollection:
    def __init__(self, path):
        self.path = path

    def document(self, name):
        return FakeRef(f"{self.path}/{name}")


class FakeBatch:
    def __init__(self):
        self.writes = []
        self.committed = False

    def set(self, ref, data, merge=False):
        self.writes.append((ref.path, data, merge))

    def commit(self):
        self.committed = True


class FakeFirestore:
    SERVER_TIMESTAMP = "SERVER_TIMESTAMP"

    def __init__(self):
        self.fake_batch = FakeBatch()

    def client(self):
        return self

    def batch(self):
        return self.fake_batch


class RecommenderTests(unittest.TestCase):
    def sessions(self):
        bangkok = timezone(timedelta(hours=7))
        start = datetime(2026, 6, 1, 9, tzinfo=bangkok)
        rows = []
        for index in range(32):
            timestamp = start + timedelta(days=index * 2, hours=index % 4)
            rows.append({"id": f"s-{index}", "timestamp": int(timestamp.timestamp() * 1000), "minutes": 45 if index % 3 else 50, "category": "Work" if index % 2 else "Learning", "status": "completed" if index % 5 else "skipped", "type": "focus"})
        rows.append({"id": "break", "timestamp": int((start + timedelta(days=63)).timestamp() * 1000), "minutes": 10, "category": "Work", "status": "completed", "type": "break"})
        return rows

    def test_generates_multiweek_forecast_and_model_audit(self):
        rows = self.sessions()
        now = datetime(2026, 8, 10, 8, tzinfo=timezone(timedelta(hours=7)))
        forecast, audit = build_weekly_forecast(rows, now=now)
        self.assertEqual(forecast["status"], "ready")
        self.assertEqual(len(forecast["weeks"]), 4)
        self.assertEqual(forecast["recommendation"]["breakMinutes"], 10)
        self.assertEqual(len(forecast["plan"]["slots"]), 2)
        self.assertEqual(len({slot["category"] for slot in forecast["plan"]["slots"]}), 2)
        self.assertTrue(all(slot["weeklySessions"] >= 1 for slot in forecast["plan"]["slots"]))
        self.assertIn(audit["champion"], audit["models"])
        self.assertGreater(audit["validationFolds"], 1)
        self.assertEqual(set(audit["models"]), {"historical_baseline", "contextual_bayes", "logistic_regression", "gradient_boosted_stumps", "lightgbm", "xgboost"})

    def test_run_id_is_stable_for_the_same_data(self):
        rows = self.sessions()
        now = datetime(2026, 8, 10, 8, tzinfo=timezone(timedelta(hours=7)))
        forecast, _ = build_weekly_forecast(rows, now=now)
        self.assertEqual(stable_run_id("u1", forecast, rows), stable_run_id("u1", forecast, list(reversed(rows))))

    def test_requires_enough_completed_history(self):
        with self.assertRaisesRegex(ValueError, "At least 3"):
            build_weekly_forecast(self.sessions()[:2])

    def test_caps_an_outlier_before_recommending_it(self):
        rows = self.sessions()
        rows.append({**rows[1], "id": "marathon", "minutes": 240})
        now = datetime(2026, 8, 10, 8, tzinfo=timezone(timedelta(hours=7)))
        forecast, _ = build_weekly_forecast(rows, now=now)
        self.assertLessEqual(forecast["recommendation"]["focusMinutes"], 50)
        self.assertEqual(forecast["patterns"]["bestDurationMinutes"], 45)

    def test_publish_writes_forecast_run_and_model_in_one_batch(self):
        firestore = FakeFirestore()
        document = FakeRef("syncs/user-1")
        forecast = {"status": "ready", "modelVersion": MODEL_VERSION}
        audit = {"champion": "lightgbm", "models": {"lightgbm": {"mae": 1.0}}}

        publish(document, firestore, "run-1", forecast, audit)

        self.assertTrue(firestore.fake_batch.committed)
        self.assertEqual([row[0] for row in firestore.fake_batch.writes], [
            "syncs/user-1",
            "syncs/user-1/mlRuns/run-1",
            f"syncs/user-1/mlModels/{MODEL_VERSION}",
        ])
        self.assertTrue(all(row[2] for row in firestore.fake_batch.writes))
        self.assertEqual(firestore.fake_batch.writes[0][1]["mlForecast"]["runId"], "run-1")


if __name__ == "__main__":
    unittest.main()
