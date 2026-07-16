import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  /** Optional CSS class for the header cell */
  headerClass?: string;
  /** Optional CSS class for each data cell */
  cellClass?: string;
  /** Sortable key (pass to onSort if handled externally) */
  sortKey?: string;
  /** Hide on narrow screens */
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  loading,
  emptyMessage = "无数据",
  className = "",
}: TableProps<T>) {
  if (loading) {
    return <div className="empty-panel">加载中...</div>;
  }

  if (data.length === 0) {
    return <div className="empty-panel">{emptyMessage}</div>;
  }

  return (
    <div className="table-shell">
      <table className={className}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  col.hideOnMobile ? "th--hide-mobile" : "",
                  col.headerClass ?? "",
                ].filter(Boolean).join(" ")}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    col.hideOnMobile ? "td--hide-mobile" : "",
                    col.cellClass ?? "",
                  ].filter(Boolean).join(" ")}
                >
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
