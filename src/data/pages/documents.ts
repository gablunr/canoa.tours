import type { CollectionEntry } from 'astro:content';
import { estimateReadingMinutes, formatLongDate, toIsoDate } from '../../lib/format';

export type DocumentEntry = CollectionEntry<'legal' | 'help'>;

export const documentHref = (entry: DocumentEntry) => `/${entry.id}`;

export const formatUpdatedDate = (entry: DocumentEntry) => formatLongDate(entry.data.updatedAt);

export const updatedIsoDate = (entry: DocumentEntry) => toIsoDate(entry.data.updatedAt);

export const readingMinutes = (entry: DocumentEntry, composedText = '') => estimateReadingMinutes(`${entry.body ?? ''} ${composedText}`);
