import { getCollection, type CollectionEntry } from 'astro:content';
import { estimateReadingMinutes, formatLongDate, toIsoDate } from '../lib/format';

export type LegalDocument = CollectionEntry<'legal'>;

export const getLegalDocuments = () => getCollection('legal');

export const legalHref = (legalDocument: LegalDocument) => `/${legalDocument.id}`;

export const formatUpdatedDate = (legalDocument: LegalDocument) => formatLongDate(legalDocument.data.updatedAt);

export const updatedIsoDate = (legalDocument: LegalDocument) => toIsoDate(legalDocument.data.updatedAt);

export const readingMinutes = (legalDocument: LegalDocument) => estimateReadingMinutes(legalDocument.body);
