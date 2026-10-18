import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';

import { DocumentStore } from '../../services/document-store.service';
import { PersistenceService } from '../../services/persistence.service';

@Component({
  selector: 'app-root',
  standalone: true,
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

      if (this.persistence.existDocument(this.store.document())) {
        this.statusMessage.set(
          'Esiste già un progetto con questo nome'
        );
        return;
      }

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

}