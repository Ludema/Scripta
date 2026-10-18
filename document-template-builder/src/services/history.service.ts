import { Injectable, computed, signal } from "@angular/core";

import {
    TemplateDocument,
} from '../models/document.model';

@Injectable({
    providedIn: 'root',
})
export class HistoryService {
    private readonly limit = 100;

    private readonly past = signal<TemplateDocument[]>([]);
    private readonly future = signal<TemplateDocument[]>([]);

    readonly canUndo = computed(() => this.past().length > 0)
    readonly canRedo = computed(() => this.future().length > 0)

    record(document: TemplateDocument): void {
        const snapshot = structuredClone(document);
        this.past.update((items) =>
            [...items, snapshot].slice(-this.limit)
        );

        // Una nuova modifica apre un nuovo percorso:
        // le versini successive non sono più ripetibili.
        this.future.set([]);
    }

    undo(current: TemplateDocument): TemplateDocument | null {
        const items = this.past();
        const previous = items[items.length - 1];

        if (!previous) {
            return null;
        }

        this.future.update((future) =>
            [...future, structuredClone(current)].slice(-this.limit)
        );

        this.past.set(items.slice(0, -1));

        return structuredClone(previous);
    }

    redo(current: TemplateDocument): TemplateDocument | null {
        const items = this.future();
        const next = items[items.length - 1];

        if (!next) {
            return null;
        }

        this.past.update((past) =>
            [...past, structuredClone(current)].slice(-this.limit)
        );

        return structuredClone(next);
    }

    clear(): void {
        this.past.set([]);
        this.future.set([]);
    }

}