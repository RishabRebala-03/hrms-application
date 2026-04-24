from __future__ import annotations

import csv
import io
import math
from datetime import datetime, timedelta
from typing import Any

from bson import ObjectId
from flask import Response


def safe_int(value: Any, default: int, minimum: int | None = None, maximum: int | None = None) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default

    if minimum is not None:
        parsed = max(minimum, parsed)
    if maximum is not None:
        parsed = min(maximum, parsed)
    return parsed


def parse_iso_date(value: str | None, end_of_day: bool = False) -> datetime | None:
    if not value:
        return None

    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
        if end_of_day:
            return parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
        return parsed
    except ValueError:
        return None


def resolve_date_range(date_preset: str | None, start_date: str | None, end_date: str | None) -> tuple[datetime | None, datetime | None]:
    now = datetime.utcnow()

    if date_preset == "last_month":
        return now - timedelta(days=30), now
    if date_preset == "last_3_months":
        return now - timedelta(days=90), now
    if date_preset == "last_year":
        return now - timedelta(days=365), now

    return parse_iso_date(start_date), parse_iso_date(end_date, end_of_day=True)


def build_datetime_range_query(field_name: str, start_dt: datetime | None, end_dt: datetime | None) -> dict[str, Any]:
    query: dict[str, Any] = {}

    if start_dt is not None:
        query["$gte"] = start_dt
    if end_dt is not None:
        query["$lte"] = end_dt

    if not query:
        return {}

    return {field_name: query}


def build_string_date_range_query(field_name: str, start_dt: datetime | None, end_dt: datetime | None) -> dict[str, Any]:
    query: dict[str, Any] = {}

    if start_dt is not None:
        query["$gte"] = start_dt.strftime("%Y-%m-%d")
    if end_dt is not None:
        query["$lte"] = end_dt.strftime("%Y-%m-%d")

    if not query:
        return {}

    return {field_name: query}


def serialize_document(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize_document(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_document(item) for key, item in value.items()}
    return value


def paginate(cursor, page: int, page_size: int) -> tuple[list[dict[str, Any]], int, int]:
    total = cursor.collection.count_documents(cursor._Cursor__spec)  # type: ignore[attr-defined]
    total_pages = max(1, math.ceil(total / page_size)) if page_size else 1
    items = list(cursor.skip((page - 1) * page_size).limit(page_size))
    return items, total, total_pages


def csv_response(filename: str, headers: list[str], rows: list[list[Any]]) -> Response:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def excel_response(filename: str, headers: list[str], rows: list[list[Any]], sheet_name: str = "Report") -> Response:
    table_rows = []
    table_rows.append("<tr>" + "".join(f"<th>{escape_html(str(header))}</th>" for header in headers) + "</tr>")
    for row in rows:
        table_rows.append("<tr>" + "".join(f"<td>{escape_html('' if cell is None else str(cell))}</td>" for cell in row) + "</tr>")

    body = f"""
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1" data-sheet-name="{escape_html(sheet_name)}">
          {''.join(table_rows)}
        </table>
      </body>
    </html>
    """

    return Response(
        body,
        mimetype="application/vnd.ms-excel",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def escape_html(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )
