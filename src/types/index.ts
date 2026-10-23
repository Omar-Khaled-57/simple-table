export interface TableCell {
  id: string;
  value: string;
  type?: 'text' | 'number' | 'grade' | 'note';
  image?: string;
  tags?: string[];
}

export interface TableRow {
  id: string;
  cells: TableCell[];
}

export interface TableColumn {
  id: string;
  name: string;
  width?: number;
  type?: 'text' | 'number' | 'grade' | 'code';
}

export interface TableData {
  id: string;
  name: string;
  columns: TableColumn[];
  rows: TableRow[];
  signature?: string;
}
