import { actions, isInputError, type ActionError } from 'astro:actions';
import { countryOptions } from '../../lib/account/countries';
import { bookingErrorMessage } from '../../lib/booking/errors';
import { quoteBooking, type PaymentOption, type Quote } from '../../lib/booking/pricing';
import { localToday, monthBounds, monthOf, shiftMonth } from '../../lib/calendar';
import { formatPrice } from '../../lib/format';
import { clearErrorOnInput, setFieldError, validateFields } from '../ui/form-validation';
import { initPhoneField } from '../ui/phone-field';
import { readUtm } from '../ui/utm';
import { createQuoteClient, renderSummary, selectionKey, type BookingSelection, type QuoteOutcome } from './booking-quote';
import { loadStripeClient, mountPayment, paymentFailedMessage, paymentUnavailableMessage, type MountedPayment } from './booking-payment';
import { initDatePicker, type CalendarDay } from './date-picker';
import { initHotelPicker } from './hotel-picker';

const dateFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const listFormatter = new Intl.ListFormat('es', { type: 'conjunction' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const formatTourDate = (date: string) => capitalize(dateFormatter.format(new Date(`${date}T12:00:00Z`)).replace(',', ''));
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const readCount = (input: HTMLInputElement | null) => {
	const value = Math.floor(Number(input?.value));
	return Number.isFinite(value) && value > 0 ? value : 0;
};

const messagesOf = (codes: string[]) => new Set(codes.map(bookingErrorMessage));
const dateErrorMessages = messagesOf(['not_enough_seats', 'day_closed', 'no_departure_on_date', 'booking_window_closed', 'schedule_not_available']);
const groupErrorMessages = messagesOf(['group_too_large']);
const hotelErrorMessages = new Set([...messagesOf(['hotel_not_available', 'pickup_zone_not_served']), 'Indica tu hotel o el lugar donde te recogemos.']);
const couponErrorMessages = messagesOf(['coupon_not_valid', 'coupon_exhausted']);

const stepOneFieldNames = new Set(['tourDate', 'adults', 'children', 'infants', 'hotelId', 'hotelName', 'zoneSlug']);
const hotelFieldNames = new Set(['hotelId', 'hotelName', 'zoneSlug']);

const payingPeopleMessage = 'Añade al menos un adulto o un niño.';
const continueLabel = 'Continuar al pago';
const continueBusyLabel = 'Preparando el pago…';
const confirmBusyLabel = 'Procesando el pago…';
const connectionMessage = 'No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.';

export function initTourBooking(form: HTMLFormElement) {
	const data = form.dataset;
	const productKey = data.productKey ?? '';
	const perGroup = data.pricingMode === 'per_group';
	const adultPrice = Number(data.adultPrice);
	const childPrice = data.childPrice ? Number(data.childPrice) : null;
	const depositValue = Number(data.depositValue);
	const insurancePrice = Number(data.insurancePrice);

	const stepOne = form.querySelector<HTMLElement>('[data-step-panel="1"]');
	const stepTwo = form.querySelector<HTMLElement>('[data-step-panel="2"]');
	const stepThree = form.querySelector<HTMLElement>('[data-step-panel="3"]');
	const paymentContainer = form.querySelector<HTMLElement>('[data-payment-element]');
	const dateRoot = form.querySelector<HTMLElement>('[data-date-picker]');
	const hotelRoot = form.querySelector<HTMLElement>('[data-hotel-picker]');
	const phoneRoot = form.querySelector<HTMLElement>('[data-phone-field]');
	if (!stepOne || !stepTwo || !stepThree || !paymentContainer || !dateRoot || !hotelRoot || !phoneRoot) return;

	const unavailable = form.querySelector<HTMLElement>('[data-booking-unavailable]');
	const summaries = Array.from(form.querySelectorAll<HTMLElement>('[data-booking-summary]'));
	const continueButton = form.querySelector<HTMLButtonElement>('[data-continue-payment]');
	const paymentChoice = form.querySelector<HTMLElement>('[data-payment-choice]');
	const paymentOptionInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="paymentOption"]'));
	const depositDetail = form.querySelector<HTMLElement>('[data-payment-detail="deposit"]');
	const fullDetail = form.querySelector<HTMLElement>('[data-payment-detail="full"]');
	const savedCardNotice = form.querySelector<HTMLElement>('[data-saved-card-notice]');
	const paymentIntro = form.querySelector<HTMLElement>('[data-payment-intro]');
	const paymentLoading = form.querySelector<HTMLElement>('[data-payment-loading]');
	const paymentError = form.querySelector<HTMLElement>('[data-payment-error]');
	const confirmButton = form.querySelector<HTMLButtonElement>('[data-confirm-payment]');
	const errorMessage = form.querySelector<HTMLElement>('[data-booking-error]');
	const selectionDate = form.querySelector<HTMLElement>('[data-selection-date]');
	const selectionDetail = form.querySelector<HTMLElement>('[data-selection-detail]');
	const couponField = form.querySelector<HTMLElement>('[data-coupon-field]');
	const couponApplied = form.querySelector<HTMLElement>('[data-coupon-applied]');
	const couponCodeLabel = form.querySelector<HTMLElement>('[data-coupon-code]');
	const couponApply = form.querySelector<HTMLButtonElement>('[data-coupon-apply]');
	const couponRemove = form.querySelector<HTMLButtonElement>('[data-coupon-remove]');
	const dateTrigger = dateRoot.querySelector<HTMLElement>('[data-date-trigger]') ?? dateRoot.querySelector<HTMLElement>('button');

	const control = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
	const adultsInput = control('adults');
	const childrenInput = control('children');
	const infantsInput = control('infants');
	const insuranceInput = control('insurance');
	const leadNameInput = control('leadName');
	const emailInput = control('email');
	const couponInput = control('couponCode');
	const countrySelect = form.elements.namedItem('country') as HTMLSelectElement | null;

	function fillCountryOptions() {
		if (!countrySelect || countrySelect.options.length > 1) return;
		countrySelect.append(...countryOptions.map((option) => new Option(option.label, option.value)));
	}

	const fieldOf = (element: Element | null) => element?.closest<HTMLElement>('[data-field]') ?? null;
	const hotelField = () => fieldOf(hotelRoot.querySelector('[name="hotelQuery"]')) ?? hotelRoot;
	const focusField = (field: HTMLElement) =>
		field.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea, button')?.focus();

	const minMonth = monthOf(localToday());
	const maxMonth = shiftMonth(minMonth, 11);
	const months = new Map<string, Promise<CalendarDay[]>>();
	const quotes = createQuoteClient();

	let ready = false;
	let loaded = false;
	let step: 1 | 2 | 3 = 1;
	let submitting = false;
	let lastKey: string | null = null;
	let currentQuote: Quote | null = null;
	let quotePending = false;
	let payment: MountedPayment | null = null;
	let paymentTicket = 0;
	let paymentAmount = 0;
	let canConfirm = false;
	let confirming = false;
	let quoteProblem: HTMLElement | null = null;
	let appliedCoupon: { code: string; discount: number } | null = null;

	const observer = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) load();
	}, { rootMargin: '600px' });

	function showUnavailable() {
		quotes.cancel();
		teardownPayment();
		stepOne!.hidden = true;
		stepTwo!.hidden = true;
		stepThree!.hidden = true;
		if (unavailable) unavailable.hidden = false;
	}

	function showError(message: string | null) {
		if (!errorMessage) return;
		errorMessage.textContent = message ?? '';
		errorMessage.hidden = !message;
	}

	async function fetchDays(from: string, to: string): Promise<CalendarDay[]> {
		const { data: result, error } = await actions.bookings.availability({ productKey, from, to });
		if (error) {
			if (error.code === 'NOT_FOUND') showUnavailable();
			throw error;
		}
		return result.days;
	}

	function remember(month: string, days: Promise<CalendarDay[]>) {
		const monthDays = days.then((list) => list.filter((day) => monthOf(day.date) === month));
		months.set(month, monthDays);
		monthDays.catch(() => {
			if (months.get(month) === monthDays) months.delete(month);
		});
		return monthDays;
	}

	function daysOf(month: string) {
		const { first, last } = monthBounds(month);
		return months.get(month) ?? remember(month, fetchDays(first, last));
	}

	function loadMonth(month: string) {
		load();
		const days = daysOf(month);
		const following = shiftMonth(month, 1);
		if (following <= maxMonth) daysOf(following).catch(() => undefined);
		return days;
	}

	function forgetMonth(month: string) {
		months.delete(month);
		datePicker.invalidate(month);
	}

	function load() {
		if (loaded) return;
		loaded = true;
		observer.disconnect();

		const nextMonth = shiftMonth(minMonth, 1);
		const range = fetchDays(monthBounds(minMonth).first, monthBounds(nextMonth).last);
		remember(minMonth, range);
		remember(nextMonth, range);

		actions.bookings
			.pickupOptions({ productKey })
			.then(({ data: options, error }) => {
				if (options) {
					hotelPicker.setOptions(options);
					lastKey = null;
					update();
				} else if (error?.code === 'NOT_FOUND') {
					showUnavailable();
				}
			})
			.catch(() => undefined);
	}

	const datePicker = initDatePicker(dateRoot, {
		minMonth,
		maxMonth,
		loadMonth,
		onChange: () => {
			setFieldError(dateRoot, null);
			update();
		},
	});
	const hotelPicker = initHotelPicker(hotelRoot, { onChange: () => update() });
	const phoneField = initPhoneField(phoneRoot, { countrySelect: countrySelect ?? undefined });

	function selection(couponCode = appliedCoupon?.code): BookingSelection {
		const hotel = hotelPicker.value();
		return {
			productKey,
			tourDate: datePicker.value() ?? '',
			adults: readCount(adultsInput),
			children: readCount(childrenInput),
			infants: readCount(infantsInput),
			hotelId: hotel.hotelId || undefined,
			hotelName: hotel.hotelName?.trim() || undefined,
			zoneSlug: hotel.zoneSlug || undefined,
			insurance: insuranceInput?.checked ?? false,
			couponCode: couponCode || undefined,
		};
	}

	function localQuote(current: BookingSelection) {
		return quoteBooking({
			pricingMode: perGroup ? 'per_group' : 'per_person',
			adultPrice,
			childPrice,
			adults: current.adults,
			children: current.children,
			infants: current.infants,
			depositType: 'fixed',
			depositValue,
			pickupFeePerPerson: hotelPicker.zone()?.fee ?? null,
			insurance: current.insurance,
			insurancePricePerPerson: insurancePrice,
			coupon: appliedCoupon ? { type: 'fixed', value: appliedCoupon.discount } : null,
		});
	}

	function paymentOptionFor(quote: Quote): PaymentOption {
		if (quote.balanceAmount <= 0) return 'full';
		return paymentOptionInputs.find((input) => input.checked)?.value === 'full' ? 'full' : 'deposit';
	}

	const payableQuote = (quote: Quote, option: PaymentOption): Quote =>
		option === 'full' ? { ...quote, depositAmount: quote.total, balanceAmount: 0 } : quote;

	function render(quote: Quote, pending: boolean) {
		currentQuote = quote;
		quotePending = pending;
		const option = paymentOptionFor(quote);
		const hotel = hotelPicker.value();
		const context = { hasPickup: Boolean(hotel.hotelId || hotel.hotelName), couponCode: appliedCoupon?.code ?? null };
		for (const summary of summaries) renderSummary(summary, payableQuote(quote, option), context, pending);
		if (paymentChoice) paymentChoice.hidden = quote.balanceAmount <= 0;
		if (depositDetail) depositDetail.textContent = `${formatPrice(quote.depositAmount)} ahora y ${formatPrice(quote.balanceAmount)} el día de la excursión`;
		if (fullDetail) fullDetail.textContent = formatPrice(quote.total);
		if (savedCardNotice) savedCardNotice.hidden = option !== 'deposit';
	}

	function settle() {
		quotePending = false;
		for (const summary of summaries) {
			summary.removeAttribute('data-pending');
			summary.setAttribute('aria-busy', 'false');
		}
	}

	function problemFieldFor(message: string) {
		if (dateErrorMessages.has(message)) return dateRoot;
		if (groupErrorMessages.has(message)) return fieldOf(adultsInput);
		if (hotelErrorMessages.has(message)) return hotelField();
		if (couponErrorMessages.has(message)) return couponField;
		return null;
	}

	function clearQuoteProblem() {
		if (quoteProblem) setFieldError(quoteProblem, null);
		quoteProblem = null;
	}

	function showCouponState() {
		if (couponField) couponField.hidden = appliedCoupon !== null;
		if (couponApplied) couponApplied.hidden = appliedCoupon === null;
		if (couponCodeLabel) couponCodeLabel.textContent = appliedCoupon?.code ?? '';
	}

	function dropCoupon(message: string) {
		appliedCoupon = null;
		showCouponState();
		if (couponField) setFieldError(couponField, message);
		lastKey = null;
		update();
	}

	function applyOutcome(outcome: QuoteOutcome | null, requested: BookingSelection) {
		if (!outcome) return;
		clearQuoteProblem();

		if (outcome.kind === 'quote') {
			const { quote } = outcome;
			if (requested.couponCode && appliedCoupon && quote.coupon && !quote.coupon.valid) {
				dropCoupon(quote.coupon.message ?? bookingErrorMessage('coupon_not_valid'));
				return;
			}
			if (appliedCoupon && quote.coupon?.valid) appliedCoupon.discount = quote.discountTotal;
			render(quote, false);
			return;
		}

		if (outcome.kind === 'error') {
			if (outcome.code === 'NOT_FOUND') {
				showUnavailable();
				return;
			}
			const field = problemFieldFor(outcome.message);
			if (field && field !== couponField) {
				setFieldError(field, outcome.message);
				quoteProblem = field;
			}
		}
		lastKey = null;
		settle();
	}

	function update() {
		if (!ready) return;
		const current = selection();
		const quotable = Boolean(current.tourDate) && current.adults + current.children > 0;
		const key = quotable ? selectionKey(current) : null;
		if (key && key === lastKey) return;
		lastKey = key;
		render(localQuote(current), quotable);
		if (!quotable) {
			quotes.cancel();
			return;
		}
		quotes.request(current).then((outcome) => applyOutcome(outcome, current));
	}

	function renderSelectionLine() {
		const current = selection();
		const people = [
			current.adults > 0 ? (perGroup ? plural(current.adults, 'persona', 'personas') : plural(current.adults, 'adulto', 'adultos')) : null,
			current.children > 0 ? plural(current.children, 'niño', 'niños') : null,
			current.infants > 0 ? plural(current.infants, 'bebé', 'bebés') : null,
		].filter((part) => part !== null);
		const hotel = hotelPicker.value();
		if (selectionDate) selectionDate.textContent = current.tourDate ? formatTourDate(current.tourDate) : '';
		if (selectionDetail) selectionDetail.textContent = [listFormatter.format(people), hotel.label ?? hotel.hotelName ?? ''].filter(Boolean).join(', ');
	}

	function showStep(next: 1 | 2 | 3, moveFocus = true) {
		step = next;
		stepOne!.hidden = next !== 1;
		stepTwo!.hidden = next !== 2;
		stepThree!.hidden = next !== 3;
		if (next !== 3) teardownPayment();
		if (next === 2) {
			phoneField.fillPrefixOptions();
			fillCountryOptions();
			renderSelectionLine();
			void loadStripeClient();
		}
		if (!moveFocus) return;

		const title = [stepOne, stepTwo, stepThree][next - 1]!.querySelector<HTMLElement>('h3');
		if (!title) return;
		title.focus({ preventScroll: true });
		const bounds = title.getBoundingClientRect();
		if (bounds.top < 96 || bounds.bottom > window.innerHeight) title.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function backToField(field: HTMLElement, message: string) {
		if (stepOne!.contains(field)) showStep(1, false);
		setFieldError(field, message);
		if (field === dateRoot) dateTrigger?.focus();
		else focusField(field);
	}

	function continueToDetails() {
		const fieldsValid = validateFields(stepOne!);
		const current = selection();
		const hasDate = Boolean(current.tourDate);
		const hasPayingPeople = current.adults + current.children > 0;

		if (!hasDate) setFieldError(dateRoot!, dateRoot!.dataset.requiredMessage ?? 'Elige una fecha.');
		if (!hasPayingPeople) {
			const adultsField = fieldOf(adultsInput);
			if (adultsField) setFieldError(adultsField, payingPeopleMessage);
		}

		if (!hasDate) {
			dateTrigger?.focus();
			return;
		}
		if (!fieldsValid || !hasPayingPeople) return;
		if (quoteProblem) {
			if (quoteProblem === dateRoot) dateTrigger?.focus();
			else focusField(quoteProblem);
			return;
		}

		showStep(2);
	}

	function setContinueBusy(busy: boolean) {
		if (!continueButton) return;
		continueButton.disabled = busy;
		continueButton.setAttribute('aria-busy', String(busy));
		continueButton.textContent = busy ? continueBusyLabel : continueLabel;
	}

	function showPaymentError(message: string | null) {
		if (!paymentError) return;
		paymentError.textContent = message ?? '';
		paymentError.hidden = !message;
	}

	function syncConfirmButton() {
		if (!confirmButton) return;
		confirmButton.disabled = confirming || !canConfirm;
		confirmButton.setAttribute('aria-busy', String(confirming));
		confirmButton.textContent = confirming ? confirmBusyLabel : `Pagar ${formatPrice(paymentAmount)}`;
	}

	function teardownPayment() {
		paymentTicket++;
		payment?.destroy();
		payment = null;
		canConfirm = false;
		confirming = false;
		showPaymentError(null);
		syncConfirmButton();
	}

	async function startPaymentElement(clientSecret: string) {
		teardownPayment();
		const ticket = paymentTicket;
		const isCurrent = () => ticket === paymentTicket;
		if (paymentLoading) paymentLoading.hidden = false;

		let mounted: MountedPayment | null = null;
		try {
			mounted = await mountPayment(paymentContainer!, clientSecret, {
				onReady: () => {
					if (isCurrent() && paymentLoading) paymentLoading.hidden = true;
				},
				onCanConfirmChange: (ready) => {
					if (!isCurrent()) return;
					canConfirm = ready;
					syncConfirmButton();
				},
				onLoadError: (message) => {
					if (!isCurrent()) return;
					if (paymentLoading) paymentLoading.hidden = true;
					showPaymentError(message);
				},
			});
		} catch {
			mounted = null;
		}

		if (!isCurrent()) {
			mounted?.destroy();
			return;
		}
		if (!mounted) {
			if (paymentLoading) paymentLoading.hidden = true;
			showPaymentError(paymentUnavailableMessage);
			return;
		}
		payment = mounted;
	}

	function openPayment(amount: number, clientSecret: string, option: PaymentOption) {
		paymentAmount = amount;
		const balance = option === 'deposit' ? (currentQuote?.balanceAmount ?? 0) : 0;
		if (paymentIntro) {
			paymentIntro.textContent =
				balance > 0
					? `Vas a pagar ${formatPrice(amount)} y el resto, ${formatPrice(balance)}, el día de la excursión.`
					: `Vas a pagar ${formatPrice(amount)}.`;
		}
		showStep(3);
		void startPaymentElement(clientSecret);
	}

	async function confirmPayment() {
		if (!payment || confirming || !canConfirm) return;
		const ticket = paymentTicket;
		confirming = true;
		showPaymentError(null);
		syncConfirmButton();

		let message: string | null;
		try {
			message = await payment.confirm(emailInput?.value.trim() ?? '');
		} catch {
			message = paymentFailedMessage;
		}

		if (ticket !== paymentTicket || !message) return;
		confirming = false;
		syncConfirmButton();
		showPaymentError(message);
	}

	function fieldForName(name: string) {
		if (name === 'tourDate') return dateRoot;
		if (hotelFieldNames.has(name)) return hotelField();
		if (name === 'phone') return phoneRoot;
		const element = form.elements.namedItem(name);
		return element instanceof Element ? fieldOf(element) : null;
	}

	function handleCreateError(error: ActionError) {
		if (isInputError(error)) {
			const invalid = Object.keys(error.fields)
				.map((name) => ({ name, field: fieldForName(name) }))
				.filter((entry): entry is { name: string; field: HTMLElement } => entry.field !== null);
			for (const { field } of invalid) {
				setFieldError(field, field.dataset.invalidMessage ?? field.dataset.requiredMessage ?? 'Revisa este dato.');
			}
			const first = invalid.find((entry) => stepOneFieldNames.has(entry.name)) ?? invalid[0];
			if (!first) {
				showError(error.message);
				return;
			}
			if (stepOneFieldNames.has(first.name)) showStep(1, false);
			if (first.field === dateRoot) dateTrigger?.focus();
			else focusField(first.field);
			return;
		}

		if (error.code === 'NOT_FOUND') {
			showUnavailable();
			return;
		}

		const field = problemFieldFor(error.message);
		if (field === couponField) {
			dropCoupon(error.message);
			couponInput?.focus();
			return;
		}
		if (error.code === 'CONFLICT' || field === dateRoot) {
			const date = datePicker.value();
			if (date) forgetMonth(monthOf(date));
			backToField(dateRoot!, error.message);
			return;
		}
		if (field) {
			backToField(field, error.message);
			return;
		}
		showError(error.message);
	}

	async function continueToPayment() {
		if (submitting) return;
		showError(null);
		if (!validateFields(stepTwo!)) return;

		submitting = true;
		setContinueBusy(true);
		const option = currentQuote ? paymentOptionFor(currentQuote) : 'deposit';

		let result: Awaited<ReturnType<typeof actions.bookings.create>> | null = null;
		try {
			result = await actions.bookings.create({
				...selection(),
				paymentOption: option,
				leadName: leadNameInput?.value.trim() ?? '',
				email: emailInput?.value.trim() ?? '',
				phone: phoneField.value(),
				country: countrySelect?.value || undefined,
				acceptTerms: true,
				utm: readUtm(),
			});
		} catch {
			result = null;
		}

		submitting = false;
		setContinueBusy(false);
		if (result?.data) {
			openPayment(result.data.amount, result.data.clientSecret, option);
			return;
		}
		if (result?.error) handleCreateError(result.error);
		else showError(connectionMessage);
	}

	async function applyCoupon() {
		if (!couponField || !couponInput) return;
		const code = couponInput.value.trim();
		if (!code) {
			setFieldError(couponField, 'Escribe el código del cupón.');
			couponInput.focus();
			return;
		}
		const current = selection(code);
		if (!current.tourDate) {
			setFieldError(couponField, 'Elige antes la fecha de la excursión.');
			return;
		}

		couponApply?.setAttribute('aria-busy', 'true');
		if (couponApply) couponApply.disabled = true;
		const outcome = await quotes.request(current, true);
		couponApply?.setAttribute('aria-busy', 'false');
		if (couponApply) couponApply.disabled = false;
		if (!outcome) return;

		if (outcome.kind === 'quote') {
			const { quote } = outcome;
			if (quote.coupon?.valid) {
				appliedCoupon = { code: quote.coupon.code, discount: quote.discountTotal };
				couponInput.value = '';
				setFieldError(couponField, null);
				showCouponState();
				lastKey = selectionKey(current);
				render(quote, false);
				couponRemove?.focus();
				return;
			}
			setFieldError(couponField, quote.coupon?.message ?? bookingErrorMessage('coupon_not_valid'));
			lastKey = selectionKey(selection());
			render(quote, false);
			return;
		}

		if (outcome.kind === 'error' && outcome.code === 'NOT_FOUND') {
			showUnavailable();
			return;
		}
		setFieldError(couponField, outcome.kind === 'error' ? outcome.message : 'No pudimos comprobar el cupón. Inténtalo de nuevo.');
		lastKey = null;
		update();
	}

	const stepButtons = Array.from(form.querySelectorAll<HTMLButtonElement>('[data-step]'));

	function syncSteppers() {
		for (const button of stepButtons) {
			const input = form.elements.namedItem(button.dataset.target ?? '') as HTMLInputElement | null;
			if (!input) continue;
			const value = Number(input.value);
			const direction = Number(button.dataset.step);
			button.disabled = direction < 0 ? value <= Number(input.min) : value >= Number(input.max);
		}
	}

	for (const button of stepButtons) {
		button.addEventListener('click', () => {
			const input = form.elements.namedItem(button.dataset.target ?? '') as HTMLInputElement | null;
			if (!input) return;
			const next = Math.min(Math.max((Math.floor(Number(input.value)) || 0) + Number(button.dataset.step), Number(input.min)), Number(input.max));
			input.value = String(next);
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
	}

	clearErrorOnInput(form);
	form.addEventListener('input', update);
	form.addEventListener('change', update);
	form.addEventListener('input', syncSteppers);
	form.addEventListener('focusin', load, { once: true });
	form.addEventListener('pointerenter', load, { once: true });
	observer.observe(form);

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		if (step === 1) continueToDetails();
		else if (step === 2) void continueToPayment();
		else void confirmPayment();
	});

	for (const button of form.querySelectorAll<HTMLButtonElement>('[data-step-back]')) {
		button.addEventListener('click', () => showStep(1));
	}

	form.querySelector<HTMLButtonElement>('[data-payment-back]')?.addEventListener('click', () => {
		if (!confirming) showStep(2);
	});

	for (const input of paymentOptionInputs) {
		input.addEventListener('change', () => {
			if (currentQuote) render(currentQuote, quotePending);
		});
	}

	couponApply?.addEventListener('click', () => void applyCoupon());
	couponInput?.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		void applyCoupon();
	});
	couponRemove?.addEventListener('click', () => {
		appliedCoupon = null;
		showCouponState();
		update();
		couponInput?.focus();
	});

	window.addEventListener('pageshow', (event) => {
		if (!event.persisted) return;
		submitting = false;
		setContinueBusy(false);
		if (step === 3) showStep(2, false);
	});

	ready = true;
	syncSteppers();
	update();
}

export function initBookingBar(bar: HTMLElement) {
	const photo = document.querySelector('[data-tour-photo]');
	const targets = [document.getElementById('reservar'), document.querySelector('footer')].filter((target) => target !== null);
	const visible = new Map<Element, boolean>();
	let photoPassed = false;

	const update = () => {
		const show = photoPassed && !Array.from(visible.values()).some(Boolean);
		bar.toggleAttribute('data-visible', show);
		bar.inert = !show;
	};

	const blockers = new IntersectionObserver((entries) => {
		for (const entry of entries) visible.set(entry.target, entry.isIntersecting);
		update();
	});
	targets.forEach((target) => blockers.observe(target));

	if (photo) {
		new IntersectionObserver(([entry]) => {
			photoPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
			update();
		}).observe(photo);
	}
}

export function initStickyCard(card: HTMLElement) {
	const top = 96;
	const bottom = 24;

	const update = () => {
		const overflow = card.offsetHeight + top + bottom - window.innerHeight;
		card.style.top = overflow > 0 ? `${top - overflow}px` : '';
	};

	new ResizeObserver(update).observe(card);
	window.addEventListener('resize', update, { passive: true });
	update();
}
