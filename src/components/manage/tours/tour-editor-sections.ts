import type { TourEditorSectionId } from '../../../lib/tours/tour-schema';

export interface TourEditorSection {
	id: TourEditorSectionId;
	label: string;
}

export const tourEditorSections: TourEditorSection[] = [
	{ id: 'basics', label: 'Lo básico' },
	{ id: 'photos', label: 'Fotos' },
	{ id: 'price', label: 'Precio' },
	{ id: 'schedule', label: 'Horario' },
	{ id: 'pickup', label: 'Recogida' },
	{ id: 'includes', label: 'Qué incluye' },
	{ id: 'bring', label: 'Qué llevar' },
	{ id: 'itinerary', label: 'Itinerario' },
	{ id: 'requirements', label: 'Requisitos' },
	{ id: 'faqs', label: 'Preguntas' },
	{ id: 'destination-page', label: 'Página del destino' },
];

export const sectionAnchor = (id: TourEditorSectionId) => `section-${id}`;

export const sidebarAnchor = 'tour-settings';

export const tourStatusLabels = { draft: 'Borrador', active: 'A la venta', archived: 'Archivada' } as const;
