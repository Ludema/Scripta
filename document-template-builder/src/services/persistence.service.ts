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
            block['id'].length === 0
        ) {
            return false;
        }

        if (ids.has(block['id'])) {
            return false;
        }

        ids.add(block['id']);

        if (block['type'] === 'page-break') {
            return true;
        }

        if (block['type'] === 'paragraph') {
            return typeof block['text'] === 'string';
        }

        if (block['type'] === 'heading') {
            return (
                typeof block['text'] === 'string' &&
                (
                    block['level'] === 1 ||
                    block['level'] === 2 ||
                    block['level'] === 3
                )
            );
        }

        if (block['type'] === 'image') {
            const src = block['src'];
            const width = block['widthPercent'];

            return (
                typeof src === 'string' &&
                src.length <= 700_000 &&
                /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/
                    .test(src) &&
                typeof block['alt'] === 'string' &&
                typeof width === 'number' &&
                Number.isFinite(width) &&
                width >= 10 &&
                width <= 100
            );
        }

        if (block['type'] === 'table') {
            const columns = block['columns'];
            const rows = block['rows'];

            if (
                typeof block['headerRow'] !== 'boolean' ||
                !Array.isArray(columns) ||
                columns.length < 1 ||
                columns.length > 10 ||
                !Array.isArray(rows) ||
                rows.length < 1 ||
                rows.length > 100
            ) {
                return false;
            }

            const columnIds = new Set<string>();

            const validColumns = columns.every((column: unknown) => {
                if (
                    !isRecord(column) ||
                    typeof column['id'] !== 'string' ||
                    column['id'].length === 0 ||
                    columnIds.has(column['id'])
                ) {
                    return false;
                }

                columnIds.add(column['id']);
                return true;
            });

            if (!validColumns) {
                return false;
            }

            const rowIds = new Set<string>();

            return rows.every((row: unknown) => {
                if (
                    !isRecord(row) ||
                    typeof row['id'] !== 'string' ||
                    row['id'].length === 0 ||
                    rowIds.has(row['id']) ||
                    !Array.isArray(row['cells']) ||
                    row['cells'].length !== columns.length
                ) {
                    return false;
                }

                rowIds.add(row['id']);

                return row['cells'].every(
                    (cell: unknown) => typeof cell === 'string'
                );
            });
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