import type { TableData } from '../types';
import { getGradeTier } from '../utils/grades';

interface PrintTableProps {
  table: TableData;
  tableStyle: 'classic' | 'soft' | 'compact';
}

export default function PrintTable({ table, tableStyle }: PrintTableProps) {
  const totalColumnWidth = table.columns.reduce((sum, column) => sum + (column.width || 150), 0);

  return (
    <>
    <div className="print-table-frame">
    <table className={`print-grade-table ${tableStyle}`}>
      <colgroup>
        <col style={{ width: '7%' }} />
        {table.columns.map(column => (
          <col key={column.id} style={{ width: `${((column.width || 150) / totalColumnWidth) * 93}%` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          {table.columns.map(column => <th key={column.id}>{column.name}</th>)}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={row.id}>
            <td className="print-row-index">{rowIndex + 1}</td>
            {row.cells.map((cell, cellIndex) => {
              const column = table.columns[cellIndex];
              if (column?.type === 'grade') {
                const tier = getGradeTier(cell.value);
                return (
                  <td className="print-grade-cell" key={cell.id}>
                    {cell.value && <span className={`print-grade-pill ${tier}`}>{cell.value}</span>}
                  </td>
                );
              }

              return (
                <td key={cell.id}>
                  <div className={`print-name-cell${cell.image ? ' has-print-image' : ''}`}>
                    <span className="print-cell-value">{cell.value}</span>
                    {cell.image && <img src={cell.image} alt="" className="print-student-image" />}
                    {cell.tags?.length ? (
                      <span className="print-tag-list">
                        {cell.tags.map((tag, index) => <span className="print-student-tag" key={`${cell.id}-tag-${index}`}>{tag}</span>)}
                      </span>
                    ) : null}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
    <div className="print-signature">{table.signature || 'عمر'}</div>
    </>
  );
}
