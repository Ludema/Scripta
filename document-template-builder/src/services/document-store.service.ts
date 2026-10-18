import { Injectable, computed, inject, signal } from '@angular/core';
import { HistoryService } from './history.service';

import {
  HeadingLevel,
  PageFormat,
  PageOrientation,
  TableBlock,
  TemplateDocument,
} from '../models/document.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentStore {

  private readonly history = inject(HistoryService);

  readonly canUndo = this.history.canUndo;
  readonly canRedo = this.history.canRedo;

  // Blank document
  private readonly state = signal<TemplateDocument>({
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: 'Nuovo documento',

    settings: {
      format: 'a4',
      orientation: 'portrait',
      marginMm: 10,
    },

    blocks: [
      {
        id: 'paragraph-1',
        type: 'paragraph',
        text: 'Inizia a scriviere qui',
      },
    ],
  });

  readonly document = this.state.asReadonly();

  readonly pageSize = computed(() => {
    const settings = this.state().settings;

    const dimensions = settings.format === 'a4'
      ? { width: 210, height: 297 }
      : { width: 148, height: 210 };

    return settings.orientation === 'portrait'
      ? dimensions
      : {
        width: dimensions.height,
        height: dimensions.width,
      };
  });

  setTitle(title: string): void {
    this.commit((document) => ({
      ...document,
      title,
    }));
  }

  setFormat(format: PageFormat): void {
    this.commit((document) => ({
      ...document,
      settings: {
        ...document.settings,
        format,
      },
    }));
  }

  setOrientation(orientation: PageOrientation): void {
    this.commit((document) => ({
      ...document,
      settings: {
        ...document.settings,
        orientation,
      },
    }));
  }

  setMargin(marginMm: number): void {
    if (
      !Number.isFinite(marginMm) ||
      marginMm < 0 ||
      marginMm > 50
    ) {
      return;
    }

    this.commit((document) => ({
      ...document,
      settings: {
        ...document.settings,
        marginMm,
      },
    }));
  }

  updateParagraph(id: string, text: string): void {
    this.updateBlockText(id, text);
  }

  replaceDocument(document: TemplateDocument): void {
    this.state.set(structuredClone(document));
    this.history.clear();
  }

  private commit(
    change: (current: TemplateDocument) => TemplateDocument
  ): void {
    const current = this.state();
    const next = change(current);

    // Non registra operazioni che lasciano invariati i dati.
    if (JSON.stringify(current) === JSON.stringify(next)) {
      return;
    }

    this.history.record(current);
    this.state.set(next);
  }

  undo(): void {
    const previous = this.history.undo(this.state());

    if (previous !== null) {
      this.state.set(previous);
    }
  }

  redo(): void {
    const next = this.history.redo(this.state());

    if (next !== null) {
      this.state.set(next);
    }
  }

  addParagraph(): void {
    const id = crypto.randomUUID();

    this.commit((document) => ({
      ...document,
      blocks: [
        ...document.blocks,
        {
          id,
          type: 'paragraph',
          text: '',
        },
      ],
    }));
  }

  removeParagraph(id: string): void {
    this.commit((document) => ({
      ...document,

      blocks: document.blocks.filter(
        (block) => block.id !== id
      ),
    }));
  }

  moveParagraph(id: string, direction: -1 | 1): void {
    this.commit((document) => {
      const index = document.blocks.findIndex(
        (block) => block.id === id
      );

      const targetIndex = index + direction;

      if (
        index === -1 ||
        targetIndex < 0 ||
        targetIndex >= document.blocks.length
      ) {
        return document;
      }

      const blocks = [...document.blocks];

      const [block] = blocks.splice(index, 1);

      if (!block) {
        return document;
      }

      blocks.splice(targetIndex, 0, block);

      return {
        ...document,
        blocks,
      };

    })
  }

  addHeading(): void {
    const id = crypto.randomUUID();

    this.commit((document) => ({
      ...document,

      blocks: [
        ...document.blocks,
        {
          id,
          type: 'heading',
          text: 'Nuovo titolo',
          level: 1,
        },
      ],
    }));
  }


  updateBlockText(id: string, text: string): void {
    this.commit((document) => ({
      ...document,

      blocks: document.blocks.map((block) =>
        block.id === id &&
          (block.type === 'paragraph' || block.type === 'heading')
          ? { ...block, text }
          : block
      ),
    }));
  }

  setHeadingLevel(id: string, level: HeadingLevel): void {
    this.commit((document) => ({
      ...document,

      blocks: document.blocks.map((block) =>
        block.id === id && block.type === 'heading'
          ? { ...block, level }
          : block
      ),
    }));
  }

  addImage(src: string): void {
    this.commit((document) => ({
      ...document,

      blocks: [
        ...document.blocks,
        {
          id: crypto.randomUUID(),
          type: 'image',
          src,
          alt: '',
          widthPercent: 100,
        },
      ],
    }));
  }

  updateImageAlt(id: string, alt: string): void {
    this.commit((document) => ({
      ...document,

      blocks: document.blocks.map((block) =>
        block.id === id && block.type === 'image'
          ? { ...block, alt }
          : block
      ),
    }));
  }

  setImageWidth(id: string, widthPercent: number): void {
    if (
      !Number.isFinite(widthPercent) ||
      widthPercent < 10 ||
      widthPercent > 100
    ) {
      return;
    }

    this.commit((document) => ({
      ...document,

      blocks: document.blocks.map((block) =>
        block.id === id && block.type === 'image'
          ? { ...block, widthPercent }
          : block
      ),
    }));
  }

  addTable(): void {
    this.commit((document) => ({
      ...document,

      blocks: [
        ...document.blocks,
        {
          id: crypto.randomUUID(),
          type: 'table',
          headerRow: true,

          columns: [
            { id: crypto.randomUUID() },
            { id: crypto.randomUUID() },
          ],

          rows: [
            {
              id: crypto.randomUUID(),
              cells: ['Descrizione', 'Quantità'],
            },
            {
              id: crypto.randomUUID(),
              cells: ['', ''],
            },
          ],
        },
      ],
    }));
  }

  private updateTable(
    id: string,
    change: (table: TableBlock) => TableBlock
  ): void {
    this.commit((document) => ({
      ...document,

      blocks: document.blocks.map((block) =>
        block.id === id && block.type === 'table'
          ? change(block)
          : block
      ),
    }));
  }

  updateTableCell(
    tableId: string,
    rowId: string,
    columnIndex: number,
    text: string
  ): void {
    this.updateTable(tableId, (table) => {
      if (
        !Number.isInteger(columnIndex) ||
        columnIndex < 0 ||
        columnIndex >= table.columns.length
      ) {
        return table;
      }

      return {
        ...table,

        rows: table.rows.map((row) =>
          row.id === rowId
            ? {
              ...row,
              cells: row.cells.map((cell, index) =>
                index === columnIndex ? text : cell
              ),
            }
            : row
        ),
      };
    });
  }

  addTableRow(id: string): void {
    this.updateTable(id, (table) => {
      if (table.rows.length >= 100) {
        return table;
      }

      return {
        ...table,

        rows: [
          ...table.rows,
          {
            id: crypto.randomUUID(),
            cells: table.columns.map(() => ''),
          },
        ],
      };
    });
  }

  removeTableRow(id: string, rowId: string): void {
    this.updateTable(id, (table) => {
      if (table.rows.length <= 1) {
        return table;
      }

      return {
        ...table,
        rows: table.rows.filter((row) => row.id !== rowId),
      };
    });
  }

  addTableColumn(id: string): void {
    this.updateTable(id, (table) => {
      if (table.columns.length >= 10) {
        return table;
      }

      return {
        ...table,

        columns: [
          ...table.columns,
          { id: crypto.randomUUID() },
        ],

        rows: table.rows.map((row) => ({
          ...row,
          cells: [...row.cells, ''],
        })),
      };
    });
  }

  removeTableColumn(id: string, columnIndex: number): void {
    this.updateTable(id, (table) => {
      if (
        table.columns.length <= 1 ||
        !Number.isInteger(columnIndex) ||
        columnIndex < 0 ||
        columnIndex >= table.columns.length
      ) {
        return table;
      }

      return {
        ...table,

        columns: table.columns.filter(
          (_, index) => index !== columnIndex
        ),

        rows: table.rows.map((row) => ({
          ...row,
          cells: row.cells.filter(
            (_, index) => index !== columnIndex
          ),
        })),
      };
    });
  }

  setTableHeader(id: string, headerRow: boolean): void {
    this.updateTable(id, (table) => ({
      ...table,
      headerRow,
    }));
  }


  reorderBlock(id: string, targetIndex: number): void {
    this.commit((document) => {
      const sourceIndex = document.blocks.findIndex(
        (block) => block.id === id
      );

      if (
        sourceIndex === -1 ||
        !Number.isInteger(targetIndex) ||
        targetIndex < 0 ||
        targetIndex >= document.blocks.length ||
        sourceIndex === targetIndex
      ) {
        return document;
      }

      const blocks = [...document.blocks];
      const [block] = blocks.splice(sourceIndex, 1);

      if (!block) {
        return document;
      }

      blocks.splice(targetIndex, 0, block);

      return {
        ...document,
        blocks,
      };
    });
  }

addPageBreak(): void {
  this.commit((document) => ({
    ...document,

    blocks: [
      ...document.blocks,
      {
        id: crypto.randomUUID(),
        type: 'page-break',
      },
    ],
  }));

  console.log(
    'Ordine dei blocchi:',
    this.document().blocks.map((block) => ({
      id: block.id,
      type: block.type,
    }))
  );
}
}