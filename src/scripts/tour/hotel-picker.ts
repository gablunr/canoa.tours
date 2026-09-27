import type { PickupOptions } from '../../lib/booking/catalog';
import { formatPrice } from '../../lib/format';
import { setFieldError } from '../ui/form-validation';

export interface PickupZoneOption {
	slug: string;
	name: string;
	fee: number;
}

export interface PickupSelection {
	hotelId?: string;
	hotelName?: string;
	zoneSlug?: string;
	label?: string;
}

export interface HotelPickerHandle {
	setOptions(options: PickupOptions): void;
	setValue(selection: PickupSelection): void;
	value(): PickupSelection;
	zone(): PickupZoneOption | null;
}

interface SearchableHotel {
	id: string;
	name: string;
	zoneSlug?: string;
	searchText: string;
}

type ListOption = { kind: 'hotel'; hotel: SearchableHotel } | { kind: 'missing' };

const maxResults = 8;
const missingHotelLabel = 'Mi hotel no está en la lista';
const unknownZoneLabel = 'No lo sé';

export const normalizeSearchText = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();

const zoneName = (zone: PickupZoneOption) => (/^zona\b/i.test(zone.name) ? zone.name : `Zona ${zone.name}`);
const zoneFeeLabel = (zone: PickupZoneOption) => (zone.fee > 0 ? `${formatPrice(zone.fee)} por persona` : 'sin cargo');

export const pickupZoneLabel = (zone: PickupZoneOption) => `${zoneName(zone)}, ${zoneFeeLabel(zone)}`;

function part<T extends Element>(root: HTMLElement, selector: string): T {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`Falta ${selector} en el buscador de hoteles`);
	return element;
}

export function initHotelPicker(root: HTMLElement, options: { onChange: (selection: PickupSelection) => void }): HotelPickerHandle {
	const input = part<HTMLInputElement>(root, 'input[name="hotelQuery"]');
	const list = part<HTMLUListElement>(root, '[data-hotel-list]');
	const zoneNote = part<HTMLElement>(root, '[data-hotel-zone]');
	const zoneNoteText = part<HTMLElement>(root, '[data-hotel-zone-text]');
	const hotelIdInput = part<HTMLInputElement>(root, 'input[name="hotelId"]');
	const hotelNameInput = part<HTMLInputElement>(root, 'input[name="hotelName"]');
	const zoneField = part<HTMLElement>(root, '[data-zone-field]');
	const zoneSelect = part<HTMLSelectElement>(root, 'select[name="zoneSlug"]');
	const optionTemplate = part<HTMLTemplateElement>(root, '[data-hotel-option-template]');

	let zones: PickupZoneOption[] = [];
	let hotels: SearchableHotel[] = [];
	let hasOptions = false;
	let chosenHotel: SearchableHotel | null = null;
	let pendingZoneSlug = '';
	let listOptions: ListOption[] = [];
	let activeIndex = -1;
	let lastEmitted = '';

	const freeText = () => (chosenHotel ? '' : input.value.trim());
	const isListOpen = () => !list.hidden;
	const findZone = (slug: string | undefined) => (slug ? (zones.find((zone) => zone.slug === slug) ?? null) : null);
	const optionId = (index: number) => `${list.id}-option-${index}`;

	function value(): PickupSelection {
		if (chosenHotel) return { hotelId: chosenHotel.id, label: chosenHotel.name };
		const hotelName = freeText();
		if (!hotelName) return {};
		const zoneSlug = hasOptions ? zoneSelect.value : pendingZoneSlug;
		return zoneSlug ? { hotelName, zoneSlug } : { hotelName };
	}

	function zone(): PickupZoneOption | null {
		if (chosenHotel) return findZone(chosenHotel.zoneSlug);
		if (!freeText() || !hasOptions) return null;
		return findZone(zoneSelect.value);
	}

	const snapshot = () => JSON.stringify([value(), zone()?.slug ?? null]);

	function emitIfChanged() {
		const current = snapshot();
		if (current === lastEmitted) return;
		lastEmitted = current;
		options.onChange(value());
	}

	function syncFields() {
		hotelIdInput.value = chosenHotel?.id ?? '';
		hotelNameInput.value = freeText();

		const chosenZone = chosenHotel ? findZone(chosenHotel.zoneSlug) : null;
		zoneNoteText.textContent = chosenZone ? pickupZoneLabel(chosenZone) : '';
		zoneNote.hidden = !chosenZone;

		zoneField.hidden = Boolean(chosenHotel) || !freeText() || isListOpen();
	}

	function setActive(index: number) {
		activeIndex = index;
		const items = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));
		items.forEach((item, itemIndex) => item.setAttribute('aria-selected', String(itemIndex === index)));
		const activeItem = items[index];
		if (activeItem) {
			input.setAttribute('aria-activedescendant', activeItem.id);
			activeItem.scrollIntoView({ block: 'nearest' });
		} else {
			input.removeAttribute('aria-activedescendant');
		}
	}

	function createOptionElement(option: ListOption, index: number) {
		const item = optionTemplate.content.firstElementChild?.cloneNode(true);
		if (!(item instanceof HTMLLIElement)) throw new Error('La plantilla de hotel tiene que ser un elemento de lista');
		item.id = optionId(index);
		item.dataset.index = String(index);
		const name = item.querySelector('[data-option-name]');
		const zoneLine = item.querySelector('[data-option-zone]');
		if (option.kind === 'hotel') {
			if (name) name.textContent = option.hotel.name;
			const hotelZone = findZone(option.hotel.zoneSlug);
			if (zoneLine) zoneLine.textContent = hotelZone ? zoneName(hotelZone) : '';
		} else {
			item.toggleAttribute('data-missing', true);
			if (name) name.textContent = missingHotelLabel;
		}
		return item;
	}

	function searchHotels(query: string) {
		const words = normalizeSearchText(query).split(/\s+/).filter(Boolean);
		if (words.length === 0) return [];
		return hotels.filter((hotel) => words.every((word) => hotel.searchText.includes(word))).slice(0, maxResults);
	}

	function openList() {
		list.hidden = false;
		input.setAttribute('aria-expanded', 'true');
	}

	function closeList() {
		list.hidden = true;
		input.setAttribute('aria-expanded', 'false');
		setActive(-1);
		syncFields();
	}

	function renderList() {
		const query = input.value.trim();
		if (!hasOptions || !query || chosenHotel) {
			listOptions = [];
			list.replaceChildren();
			closeList();
			return;
		}
		listOptions = [...searchHotels(query).map((hotel): ListOption => ({ kind: 'hotel', hotel })), { kind: 'missing' }];
		list.replaceChildren(...listOptions.map(createOptionElement));
		openList();
		setActive(-1);
		syncFields();
	}

	function chooseHotel(hotel: SearchableHotel) {
		chosenHotel = hotel;
		input.value = hotel.name;
		const hotelField = input.closest<HTMLElement>('[data-field]');
		if (hotelField) setFieldError(hotelField, null);
		closeList();
		emitIfChanged();
	}

	function chooseMissingHotel() {
		chosenHotel = null;
		closeList();
		emitIfChanged();
		if (!zoneField.hidden && !zoneSelect.disabled) zoneSelect.focus();
	}

	function chooseOption(index: number) {
		const option = listOptions[index];
		if (!option) return;
		if (option.kind === 'hotel') chooseHotel(option.hotel);
		else chooseMissingHotel();
	}

	function chooseExactMatch() {
		if (chosenHotel || !hasOptions) return;
		const query = normalizeSearchText(input.value);
		const exactMatch = query ? hotels.find((hotel) => normalizeSearchText(hotel.name) === query) : undefined;
		if (exactMatch) {
			chosenHotel = exactMatch;
			input.value = exactMatch.name;
		}
	}

	function renderZoneSelect() {
		const selectedSlug = zoneSelect.value || pendingZoneSlug;
		const unknownOption = new Option(unknownZoneLabel, '');
		const zoneOptions = zones.map((pickupZone) => new Option(`${pickupZone.name}, ${zoneFeeLabel(pickupZone)}`, pickupZone.slug));
		zoneSelect.replaceChildren(unknownOption, ...zoneOptions);
		zoneSelect.value = findZone(selectedSlug) ? selectedSlug : '';
		zoneSelect.disabled = false;
		pendingZoneSlug = '';
	}

	function setOptions(pickupOptions: PickupOptions) {
		zones = pickupOptions.zones.map(({ slug, name, fee }) => ({ slug, name, fee }));
		hotels = pickupOptions.hotels.map((hotel) => ({ ...hotel, searchText: normalizeSearchText(hotel.name) }));
		hasOptions = true;
		renderZoneSelect();

		if (chosenHotel) {
			const chosenId = chosenHotel.id;
			const knownHotel = hotels.find((hotel) => hotel.id === chosenId);
			if (knownHotel) chosenHotel = knownHotel;
			else chosenHotel = null;
		}

		if (isListOpen()) renderList();
		else syncFields();
		emitIfChanged();
	}

	function setValue(selection: PickupSelection) {
		if (selection.hotelId) {
			const knownHotel = hotels.find((hotel) => hotel.id === selection.hotelId);
			const name = knownHotel?.name ?? selection.label ?? selection.hotelName ?? '';
			chosenHotel = knownHotel ?? { id: selection.hotelId, name, searchText: normalizeSearchText(name) };
			input.value = name;
			if (hasOptions && !knownHotel) chosenHotel = null;
		} else {
			chosenHotel = null;
			input.value = selection.hotelName ?? '';
			const zoneSlug = selection.zoneSlug ?? '';
			if (hasOptions) zoneSelect.value = findZone(zoneSlug) ? zoneSlug : '';
			else pendingZoneSlug = zoneSlug;
		}
		list.replaceChildren();
		listOptions = [];
		closeList();
		lastEmitted = snapshot();
	}

	input.addEventListener('input', () => {
		chosenHotel = null;
		renderList();
		emitIfChanged();
	});

	input.addEventListener('keydown', (event) => {
		const optionCount = listOptions.length;
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				if (!isListOpen()) {
					renderList();
					if (!isListOpen()) return;
				}
				event.preventDefault();
				if (event.altKey) return;
				const step = event.key === 'ArrowDown' ? 1 : -1;
				const nextIndex = activeIndex === -1 ? (step > 0 ? 0 : optionCount - 1) : (activeIndex + step + optionCount) % optionCount;
				setActive(nextIndex);
				return;
			}
			case 'Enter':
				if (!isListOpen()) return;
				event.preventDefault();
				if (activeIndex >= 0) chooseOption(activeIndex);
				else {
					chooseExactMatch();
					closeList();
					emitIfChanged();
				}
				return;
			case 'Escape':
				if (!isListOpen()) return;
				event.preventDefault();
				event.stopPropagation();
				closeList();
				return;
			case 'Tab':
				if (!isListOpen()) return;
				if (activeIndex >= 0 && listOptions[activeIndex]?.kind === 'hotel') chooseOption(activeIndex);
				else closeList();
				return;
		}
	});

	list.addEventListener('pointerdown', (event) => event.preventDefault());

	list.addEventListener('click', (event) => {
		const item = (event.target as Element | null)?.closest<HTMLElement>('[role="option"]');
		if (!item) return;
		chooseOption(Number(item.dataset.index));
		if (document.activeElement !== zoneSelect) input.focus();
	});

	list.addEventListener('pointermove', (event) => {
		const item = (event.target as Element | null)?.closest<HTMLElement>('[role="option"]');
		const index = Number(item?.dataset.index ?? -1);
		if (item && index !== activeIndex) setActive(index);
	});

	input.addEventListener('blur', () => {
		chooseExactMatch();
		if (isListOpen()) closeList();
		else syncFields();
		emitIfChanged();
	});

	zoneSelect.addEventListener('change', emitIfChanged);

	syncFields();
	lastEmitted = snapshot();

	return { setOptions, setValue, value, zone };
}
