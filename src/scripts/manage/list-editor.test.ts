import { describe, expect, it } from 'vitest';
import {
	describeItem,
	movedMessage,
	normalizeObjectItems,
	normalizeTextItems,
	padRows,
	removedMessage,
	toRowValues,
} from './list-editor';
import { normalizeWeekdays } from './weekday-picker';

describe('normalizeTextItems', () => {
	it('recorta los textos y quita las filas vacías', () => {
		expect(normalizeTextItems(['  Snorkel ', '', '   ', 'Almuerzo'])).toEqual(['Snorkel', 'Almuerzo']);
	});
});

describe('normalizeObjectItems', () => {
	it('recorta cada campo y quita las filas sin ningún dato', () => {
		const rows = [
			{ time: ' 08:00 ', title: ' Recogida ', text: 'En el hotel ' },
			{ time: '', title: '  ', text: '' },
			{ time: '', title: 'Playa', text: '' },
		];
		expect(normalizeObjectItems(rows)).toEqual([
			{ time: '08:00', title: 'Recogida', text: 'En el hotel' },
			{ time: '', title: 'Playa', text: '' },
		]);
	});
});

describe('toRowValues', () => {
	it('convierte textos y objetos en filas de texto', () => {
		expect(toRowValues(['Toalla', { question: '¿Hay baño?', answer: null, order: 2 }, null])).toEqual([
			{ value: 'Toalla' },
			{ question: '¿Hay baño?', answer: '', order: '2' },
			{},
		]);
	});
});

describe('padRows', () => {
	it('completa hasta el mínimo con filas vacías', () => {
		expect(padRows(['a'], 3, () => '')).toEqual(['a', '', '']);
	});

	it('no quita filas si ya hay más que el mínimo', () => {
		expect(padRows(['a', 'b'], 1, () => '')).toEqual(['a', 'b']);
	});
});

describe('describeItem', () => {
	it('cita el texto del elemento', () => {
		expect(describeItem('  Barra   libre ', 'punto 2')).toBe('«Barra libre»');
	});

	it('usa la posición si el elemento está vacío', () => {
		expect(describeItem('   ', 'punto 2')).toBe('punto 2');
	});

	it('acorta los textos largos', () => {
		const description = describeItem('a'.repeat(90), 'punto 1');
		expect(description.length).toBeLessThanOrEqual(62);
		expect(description.endsWith('…»')).toBe(true);
	});
});

describe('anuncios', () => {
	it('dice la nueva posición y lo que se quita', () => {
		expect(movedMessage(3)).toBe('Movido a la posición 3');
		expect(removedMessage('«Toalla»')).toBe('Quitado «Toalla»');
	});
});

describe('normalizeWeekdays', () => {
	it('deja los días ISO válidos, sin repetir y en orden', () => {
		expect(normalizeWeekdays(['7', '1', 3, '3', '0', '8', 'x'])).toEqual([1, 3, 7]);
	});
});
