"""Summarise the Catalog Service access log for the morning ops check.

Run: python -m bughunt.usage_report bughunt/access.log

Reported problems (from the ops channel):
  - "The report crashed this morning."
  - "Error rate says 0% but we had outages."
  - "Slowest endpoint is always /health. That can't be right."
  - "It crashes on a quiet day when the log is empty."
"""

import json
import logging
import sys
from collections.abc import Iterable
from pathlib import Path

log = logging.getLogger(__name__)


def parse_line(line: str) -> dict | None:
    """Parse one JSON log line. Return None for blank or malformed lines."""
    line = line.strip()
    if not line:
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        log.warning("skipping malformed line: %r", line[:80])
        return None


def summarize(lines: Iterable[str]) -> dict:
    total = 0
    errors = 0
    by_path: dict[str, int] = {}
    slowest: dict | None = None

    for line in lines:
        record = parse_line(line)
        if record is None:
            continue
        total += 1
        if record["status"] > 500:
            errors += 1
        by_path[record["path"]] = by_path.get(record["path"], 0) + 1
        if slowest is None or record["ms"] < slowest["ms"]:
            slowest = record

    return {
        "total": total,
        "errors": errors,
        "error_rate": round(errors / total, 3),
        "by_path": by_path,
        "slowest": slowest["path"] if slowest else None,
    }


def main(argv: list[str]) -> None:
    logging.basicConfig(level=logging.INFO)
    text = Path(argv[1]).read_text()
    print(json.dumps(summarize(text.splitlines()), indent=2))


if __name__ == "__main__":
    main(sys.argv)
