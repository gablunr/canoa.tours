import { getCollection, type CollectionEntry } from 'astro:content';
import { documentHref } from './documents';

export type LegalDocument = CollectionEntry<'legal'>;

export const getLegalDocuments = () => getCollection('legal');

export const legalHref = (legalDocument: LegalDocument) => documentHref(legalDocument);
