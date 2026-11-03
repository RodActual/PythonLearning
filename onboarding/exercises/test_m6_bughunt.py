"""Module 6 checks. Run: pytest exercises/test_m6_bughunt.py

Fix bughunt/usage_report.py until these pass. Don't edit this file or access.log.
"""

import logging
from pathlib import Path

from bughunt.usage_report import summarize

LOG = Path(__file__).parent.parent / "bughunt" / "access.log"


def test_sample_log():
    assert summarize(LOG.read_text().splitlines()) == {
        "total": 7,
        "errors": 2,
        "error_rate": 0.286,
        "by_path": {"/health": 2, "/items": 2, "/search": 2, "/items/7": 1},
        "slowest": "/items",
    }


def test_record_without_duration_is_counted_but_never_slowest():
    lines = ['{"path": "/a", "status": 200}', '{"path": "/b", "status": 200, "ms": 5}']
    result = summarize(lines)
    assert result["total"] == 2
    assert result["slowest"] == "/b"


def test_empty_log():
    assert summarize([]) == {"total": 0, "errors": 0, "error_rate": 0.0, "by_path": {}, "slowest": None}


def test_malformed_lines_are_logged(caplog):
    with caplog.at_level(logging.WARNING):
        summarize(["oops"])
    assert "skipping malformed line" in caplog.text
