import React from "react";

const DataTable = ({
  columns,
  rows,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "Adjust the active filters to see more results.",
  page = 1,
  totalPages = 1,
  onPageChange,
}) => {
  if (loading) {
    return (
      <div className="fiori-loading-card">
        <div>
          <strong>Loading table data</strong>
          <p>Preparing the latest records for this view.</p>
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="admin-empty-state">
        <div>
          <strong>{emptyTitle}</strong>
          <p>{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fiori-table-shell">
        <table className="fiori-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || row._id || `row-${index}`}>
                {columns.map((column) => (
                  <td key={`${row.id || row._id || index}-${column.key}`}>
                    {column.render ? column.render(row) : row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPageChange ? (
        <div className="fiori-table-pagination">
          <button className="fiori-button secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span>
            Page {page} of {Math.max(totalPages, 1)}
          </span>
          <button className="fiori-button secondary" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </div>
      ) : null}
    </>
  );
};

export default DataTable;
