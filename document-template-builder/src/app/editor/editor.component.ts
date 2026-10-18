import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';

import { DocumentStore } from '../../services/document-store.service';
import { PersistenceService } from '../../services/persistence.service';
import { ParagraphBlockComponent } from '../blocks/paragraph-block/paragraph-block.component';
import { HeadingBlockComponent } from '../blocks/heading-block/heading-block.component';
import { ImageBlockComponent } from '../blocks/image-block/image-block.component';
import { TableBlockComponent } from '../blocks/table-block/table-block.component';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import {
  DocumentBlock,
} from '../../models/document.model';
import {
  DocumentPreviewComponent,
} from '../preview/document-preview.component';

@Component({
  selector: 'app-root',
  standalone: true,

  imports: [
    ParagraphBlockComponent,
    HeadingBlockComponent,
    ImageBlockComponent,
    TableBlockComponent,
    DocumentPreviewComponent,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkScrollable,
  ],

  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorComponent {
  readonly store = inject(DocumentStore);

  changeFormat(value: string): void {
    if (value === 'a4' || value === 'a5') {
      this.store.setFormat(value);
    }
  }

  changeOrientation(value: string): void {
    if (value === 'portrait' || value === 'landscape') {
      this.store.setOrientation(value);
    }
  }

  changeMargin(input: HTMLInputElement): void {
    if (input.value.trim() === '' || !input.validity.valid) {
      input.value = String(
        this.store.document().settings.marginMm
      );
      return;
    }

    this.store.setMargin(input.valueAsNumber);
  }


  private readonly persistence = inject(PersistenceService);

  readonly statusMessage = signal('');

  saveProject(): void {
    try {

      this.persistence.save(this.store.document());

      this.statusMessage.set(
        'Progetto salvato in questo browser'
      );
    } catch (error) {
      console.error('Salvataggio non riuscito:', error);

      this.statusMessage.set(
        'Salvataggio non riuscito. Controlla la console'
      );
    }
  }

  restoreProject(): void {
    try {
      // Legge e valida prima di modificare il documento corrente.
      const savedDocument = this.persistence.load();

      if (savedDocument === null) {
        this.statusMessage.set(
          'Non è presente un progetto salvato'
        );

        return;
      }

      const confirmed = window.confirm(
        'Ripristinare il progetto salvato? ' +
        'Le modifiche attuali non salvate saranno sostituite. '
      );

      if (!confirmed) {
        return;
      }

      this.store.replaceDocument(savedDocument);

      this.statusMessage.set(
        'Progetto ripristinato'
      );
    } catch (error) {
      console.error('Ripristino non riuscito:', error);

      this.statusMessage.set(
        'Ripristino non riuscito. Il documento corrente non è stato sostituito.'
      );
    }
  }

  changeHeadingLevel(id: string, value: string): void {
    const level = Number(value);

    if (level === 1 || level === 2 || level === 3) {
      this.store.setHeadingLevel(id, level);
    }
  }

  readonly imageLoading = signal(false);

  async uploadImage(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];

    if (!file || this.imageLoading()) {
      return;
    }

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ];

    // Limite iniziale del nostro progetto: 500 KiB per immagine.
    const maxBytes = 500 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.statusMessage.set(
        'Seleziona un’immagine PNG, JPEG o WebP.'
      );
      input.value = '';
      return;
    }

    if (file.size > maxBytes) {
      this.statusMessage.set(
        'Immagine troppo grande: massimo 500 KiB.'
      );
      input.value = '';
      return;
    }

    this.imageLoading.set(true);

    try {
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Risultato di lettura non valido.'));
          }
        };

        reader.onerror = () => {
          reject(reader.error ?? new Error('Lettura non riuscita.'));
        };

        reader.onabort = () => {
          reject(new Error('Lettura annullata.'));
        };

        reader.readAsDataURL(file);
      });

      // Verifica che il browser riesca effettivamente a decodificarla.
      const image = new Image();
      image.src = src;

      await image.decode();

      // Limite progettuale per evitare immagini enormi da renderizzare.
      if (
        image.naturalWidth === 0 ||
        image.naturalHeight === 0 ||
        image.naturalWidth * image.naturalHeight > 16_000_000
      ) {
        throw new Error(
          'Dimensioni non supportate: massimo 16 milioni di pixel.'
        );
      }

      this.store.addImage(src);

      this.statusMessage.set(
        'Immagine aggiunta. Inserisci una descrizione alternativa.'
      );
    } catch (error) {
      console.error('Caricamento immagine non riuscito:', error);

      this.statusMessage.set(
        'Impossibile caricare l’immagine. Verifica formato e dimensioni.'
      );
    } finally {
      this.imageLoading.set(false);
      input.value = '';
    }
  }

  dropBlock(
    event: CdkDragDrop<DocumentBlock[], DocumentBlock[], string>
  ): void {
    if (event.previousContainer !== event.container ||
      !event.isPointerOverContainer
    ) {
      return;
    }

    this.store.reorderBlock(
      event.item.data,
      event.currentIndex
    );
  }

}