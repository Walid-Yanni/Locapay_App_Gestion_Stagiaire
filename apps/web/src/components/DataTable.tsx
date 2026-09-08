import type React from "react";

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Aucune donnée disponible",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-responsive">
      <table>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)}>
              {columns.map((col, index) => (
                <td key={index} className={col.className} data-label={col.header}>
                  {col.render
                    ? col.render(item)
                    : typeof col.accessor === "function"
                      ? col.accessor(item)
                      : col.accessor
                        ? (item[col.accessor] as unknown as React.ReactNode)
                        : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
