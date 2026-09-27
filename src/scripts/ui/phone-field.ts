import { dialCodes } from '../../data/site/dial-codes';

export interface PhoneFieldHandle {
	value(): string;
	country(): string;
	setCountry(iso2: string): void;
	setNumber(number: string): void;
	number(): string;
}

const fallbackCountry = 'US';

function part<T extends Element>(root: HTMLElement, selector: string): T {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`Falta ${selector} en el campo de teléfono`);
	return element;
}

function regionFromBrowser() {
	const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
	for (const language of languages) {
		try {
			const region = new Intl.Locale(language).region;
			if (region && dialCodes[region]) return region;
		} catch {
			continue;
		}
	}
	return fallbackCountry;
}

export function initPhoneField(root: HTMLElement, options: { countrySelect?: HTMLSelectElement | null } = {}): PhoneFieldHandle {
	const prefixSelect = part<HTMLSelectElement>(root, '[data-phone-prefix]');
	const prefixLabel = part<HTMLElement>(root, '[data-prefix-label]');
	const numberInput = part<HTMLInputElement>(root, '[data-phone-number]');
	const valueInput = part<HTMLInputElement>(root, 'input[type="hidden"]');
	const countrySelect = options.countrySelect ?? null;

	const hasOption = (select: HTMLSelectElement, value: string) => Array.from(select.options).some((option) => option.value === value);

	const number = () => numberInput.value.trim().replace(/\s+/g, ' ');

	function value() {
		const typedNumber = number();
		if (!typedNumber) return '';
		if (typedNumber.startsWith('+')) return typedNumber;
		return `+${dialCodes[prefixSelect.value] ?? ''} ${typedNumber}`;
	}

	function sync() {
		prefixLabel.textContent = `+${dialCodes[prefixSelect.value] ?? ''}`;
		valueInput.value = value();
	}

	function setCountry(iso2: string) {
		const code = iso2.trim().toUpperCase();
		if (!dialCodes[code] || !hasOption(prefixSelect, code)) return;
		prefixSelect.value = code;
		sync();
	}

	function setNumber(nextNumber: string) {
		numberInput.value = nextNumber;
		sync();
	}

	numberInput.addEventListener('input', sync);

	prefixSelect.addEventListener('change', () => {
		sync();
		if (!countrySelect || countrySelect.value || !hasOption(countrySelect, prefixSelect.value)) return;
		countrySelect.value = prefixSelect.value;
		countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
	});

	countrySelect?.addEventListener('change', () => {
		if (!number() && countrySelect.value) setCountry(countrySelect.value);
	});

	setCountry(countrySelect?.value || regionFromBrowser());
	sync();

	return {
		value,
		country: () => prefixSelect.value,
		setCountry,
		setNumber,
		number,
	};
}
