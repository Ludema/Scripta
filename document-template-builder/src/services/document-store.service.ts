import { Injectable, computed, inject, signal } from '@angular/core';
import { HistoryService } from './history.service';

import {
  HeadingLevel,
  PageFormat,
  PageOrientation,
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
        block.id === id
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


}