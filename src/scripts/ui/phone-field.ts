import { dialCodes } from '../../data/site/dial-codes';
import { countryOptions } from '../../lib/account/countries';

export interface PhoneFieldHandle {
	value(): string;
	country(): string;
	setCountry(iso2: string): void;
	setNumber(number: string): void;
	number(): string;
	fillPrefixOptions(): void;
}

const fallbackCountry = 'US';

const prefixChoices = countryOptions
	.filter((option) => dialCodes[option.value])
	.map((option) => ({ value: option.value, label: `${option.label} (+${dialCodes[option.value]})` }));

const prefixChoiceFor = (code: string) => prefixChoices.find((choice) => choice.value === code);

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

	let prefixOptionsFilled = false;

	function fillPrefixOptions() {
		if (prefixOptionsFilled) return;
		prefixOptionsFilled = true;
		const selected = prefixSelect.value;
		prefixSelect.replaceChildren(...prefixChoices.map((choice) => new Option(choice.label, choice.value, false, choice.value === selected)));
	}

	function setCountry(iso2: string) {
		const choice = prefixChoiceFor(iso2.trim().toUpperCase());
		if (!choice) return;
		if (!prefixOptionsFilled) prefixSelect.replaceChildren(new Option(choice.label, choice.value, true, true));
		prefixSelect.value = choice.value;
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
		fillPrefixOptions,
	};
}
