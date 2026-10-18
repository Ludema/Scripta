export type PageFormat = 'a4' | 'a5';

export type PageOrientation = 'portrait' | 'landscape';

export interface PageSettings {
  format: PageFormat;
  orientation: PageOrientation;
  marginMm: number;
}

export interface ParagraphBlock {
  id: string;
  type: 'paragraph';
  text: string;
}

export type HeadingLevel = 1 | 2 | 3;

export interface HeadingBlock {
  id: string;
  type: 'heading';
  text: string;
  level: HeadingLevel;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string;
  alt: string;
  widthPercent: number;
}

export interface TableColumn {
  id: string;
}

export interface TableRow {
  id: string;
  cells: string[];
}

export interface TableBlock {
  id: string;
  type: 'table';
  headerRow: boolean;
  columns: TableColumn[];
  rows: TableRow[];
}

export interface PageBreakBlock {
  id: string;
  type: 'page-break';
}

// Un blocco può essere un paragrafo oppure un titolo
export type DocumentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | TableBlock
  | PageBreakBlock

export interface TemplateDocument {
  schemaVersion: number;
  id: string;
  title: string;
  settings: PageSettings;
  blocks: DocumentBlock[];
}