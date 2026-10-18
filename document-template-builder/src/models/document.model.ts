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

// Un blocco può essere un paragrafo oppure un titolo
export type DocumentBlock =
  | ParagraphBlock
  | HeadingBlock

export interface TemplateDocument {
  schemaVersion: number;
  id: string;
  title: string;
  settings: PageSettings;
  blocks: DocumentBlock[];
}