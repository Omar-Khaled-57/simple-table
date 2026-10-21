import type { TableData } from '../types';

interface PrintTableProps {
  table: TableData;
  tableStyle: 'classic' | 'soft' | 'compact';
}

const getGradeTier = (value: string) => {
  if (value === '#') return 'tier-d';
  const grade = Number.parseFloat(value);
  if (!Number.isFinite(grade)) return '';
  if (grade >= 18) return 'tier-a';
  if (grade >= 14) return 'tier-b';
  if (grade >= 10) return 'tier-c';
  return 'tier-d';
};

export default function PrintTable({ table, tableStyle }: PrintTableProps) {
  const totalColumnWidth = table.columns.reduce((sum, column) => sum + (column.width || 150), 0);

  return (
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
      <tfoot>
        <tr><td colSpan={table.columns.length + 1} className="print-signature">{table.signature || 'عمر'}</td></tr>
      </tfoot>
    </table>
  );
}
