import { Injectable } from '@angular/core';

import {
    TemplateDocument,
} from '../models/document.model';

function isRecord(
    value: unknown
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

function isTemplateDocument(
    value: unknown
): value is TemplateDocument {
    if (!isRecord(value)) {
        return false;
    }

    const settings = value['settings'];
    const blocks = value['blocks'];

    if (
        value['schemaVersion'] !== 1 ||
        typeof value['id'] !== 'string' ||
        typeof value['title'] !== 'string' ||
        !isRecord(settings) ||
        !Array.isArray(blocks)
    ) {
        return false;
    }

    const validSettings =
        ['a4', 'a5'].includes(String(settings['format'])) &&
        ['portrait', 'landscape'].includes(
            String(settings['orientation'])
        ) &&
        typeof settings['marginMm'] === 'number' &&
        Number.isFinite(settings['marginMm']) &&
        settings['marginMm'] >= 0 &&
        settings['marginMm'] <= 50;

    if (!validSettings) {
        return false;
    }

    const ids = new Set<string>();

    return blocks.every((block: unknown) => {
        if (
            !isRecord(block) ||
            typeof block['id'] !== 'string' ||
            block['id'].length === 0 ||
            typeof block['text'] !== 'string'
        ) {
            return false;
        }

        if (ids.has(block['id'])) {
            return false;
        }

        ids.add(block['id']);

        if (block['type'] === 'paragraph') {
            return true;
        }

        if (block['type'] === 'heading') {
            return (
                block['level'] === 1 ||
                block['level'] === 2 ||
                block['level'] === 3
            );
        }

        return false;
    });
}

@Injectable({
    providedIn: 'root',
})
export class PersistenceService {
    private storageKey = '';
    // 'document-template-builder:document:v1';

    existDocument(document: TemplateDocument): boolean {
        this.storageKey = document.title + '_' + document.schemaVersion;

        const isExistJson = localStorage.getItem(this.storageKey);

        return isExistJson !== null;
    }

    save(document: TemplateDocument): void {
        if (!isTemplateDocument(document)) {
            throw new Error(
                'Il documento corrente non ha una struttura valida.'
            );
        }

        document.schemaVersion = document.schemaVersion++;

        const json = JSON.stringify(document);

        localStorage.setItem(this.storageKey, json);
    }

    load(): TemplateDocument | null {
        const json = localStorage.getItem(this.storageKey);

        if (json === null) {
            return null;
        }

        const parsed: unknown = JSON.parse(json);

        if (!isTemplateDocument(parsed)) {
            throw new Error(
                'Il progetto salvato non è valido o usa una versione non supportata.'
            );
        }

        return parsed;
    }
}