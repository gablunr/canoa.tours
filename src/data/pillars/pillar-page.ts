import { formatPrice } from '../../lib/format';
import type { Faq } from '../booking/faq';
import { isGuidePublished } from '../guides/guide-content';
import { guideCountLabel, guideHref, guides as allGuides, siloGuides, type Guide } from '../guides/guides';
import { pickupZonesLink } from '../site/navigation';
import { routes } from '../site/routes';
import { departurePorts } from '../tours/departure-ports';
import { destinationHref, findDestination, type Destination } from '../tours/destinations';
import {
	childPriceLabel,
	destinationTourDetails,
	destinationToursTitle,
	durationCategoryLabels,
	durationLabel,
	includedPickupZoneName,
	minAgeLabel,
	pickupIncluded,
	priceLabel,
	pickupZones,
	scheduleLabel,
	scheduleWhen,
	tourCountText,
	tourDetailsHref,
	tourNotes,
	weatherFaq,
	weekdays,
	type DurationCategory,
	type TourDetails,
} from '../tours/tours';
import { crossSiloLinks, pillarContents } from './index';
import type { PillarContent, PillarKeyFact, PillarNavLink } from './types';

export interface ComparisonRow {
	details: TourDetails;
	href: string;
	title: string;
	price: string;
	priceUnit: string;
	childPrice?: string;
	duration: string;
	days: string;
	includes: string;
	bestFor: string;
	notes: string[];
}

export interface PillarPage {
	destination: Destination;
	content: PillarContent;
	href: string;
	heading: string;
	answer: string;
	keyFacts: PillarKeyFact[];
	tours: TourDetails[];
	rows: ComparisonRow[];
	tableNote?: string;
	toursTitle: string;
	guides: Guide[];
	guidesTitle: string;
	faqs: Faq[];
	faqTitle: string;
	navLinks: PillarNavLink[];
	updatedAt: Date;
}

const answerMaxLength = 180;

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

const titles = (tours: TourDetails[]) => listFormat.format(tours.map((details) => details.title));

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const isPlace = (destination: Destination) => destination.kind === 'place';

export const orderedTours = (destination: Destination) =>
	destinationTourDetails(destination).toSorted(
		(a, b) =>
			Number(a.pricePer === 'group') - Number(b.pricePer === 'group') || a.price - b.price || a.durationHours - b.durationHours,
	);

const departureDays = (tours: TourDetails[]) => weekdays.filter((day) => tours.some((details) => details.days.includes(day)));

function sharedCategory(tours: TourDetails[]): DurationCategory | undefined {
	const [first] = tours;
	return first && tours.every((details) => details.durationCategory === first.durationCategory) ? first.durationCategory : undefined;
}

const lowestOf = (values: number[]) => (values.length > 0 ? Math.min(...values) : 0);

const highestOf = (values: number[]) => (values.length > 0 ? Math.max(...values) : 0);

function hoursSpan(tours: TourDetails[]) {
	const hours = tours.map((details) => details.durationHours);
	const min = lowestOf(hours);
	const max = highestOf(hours);
	return min === max ? `${min}` : `de ${min} a ${max}`;
}

function sharedPort(tours: TourDetails[]) {
	const port = tours[0]?.port;
	return port && tours.every((details) => details.port === port) ? departurePorts[port].port : undefined;
}

const extraFees = (tours: TourDetails[]) => tours.flatMap((details) => Object.values(details.pickupFees)).filter((fee) => fee > 0);

const feeRange = (fees: number[]) => {
	const min = lowestOf(fees);
	const max = highestOf(fees);
	return min === max ? formatPrice(min) : `de ${formatPrice(min)} a ${formatPrice(max)}`;
};

const sameFees = (tours: TourDetails[]) =>
	tours.every((details) => pickupZones.every((zone) => details.pickupFees[zone.id] === tours[0].pickupFees[zone.id]));


const answerDurations: Record<DurationCategory, string> = {
	'full-day': 'de día completo',
	'half-day': 'de medio día',
	night: 'de noche',
};

function pickupSentences(tours: TourDetails[]): string[] {
	const included = tours.filter(pickupIncluded);

	if (included.length === 0) {
		const lowest = lowestOf(extraFees(tours));
		return [`La recogida se paga aparte, desde ${formatPrice(lowest)} por persona.`];
	}
	if (included.length < tours.length) {
		return [`La recogida es gratis desde ${includedPickupZoneName} en ${titles(included)}; en las demás se paga aparte.`];
	}

	const verb = tours.length === 1 ? 'Incluye' : 'Incluyen';
	const short = `${verb} la recogida desde ${includedPickupZoneName}.`;
	const full = sameFees(tours)
		? `${verb} la recogida desde ${includedPickupZoneName}; desde otras zonas cuesta ${feeRange(extraFees(tours))}.`
		: `La recogida es gratis desde ${includedPickupZoneName}, y desde otras zonas puede costar hasta ${formatPrice(highestOf(extraFees(tours)))}.`;
	return [full, short];
}

export function destinationAnswer(destination: Destination) {
	const tours = destinationTourDetails(destination);
	const category = sharedCategory(tours);
	const port = sharedPort(tours);
	const subject = isPlace(destination)
		? `Hay ${tourCountText(tours.length)} a ${destination.name}`
		: `Hay ${tourCountText(tours.length)} de ${destination.name.toLowerCase()} en Punta Cana`;
	const duration = category ? answerDurations[category] : `${hoursSpan(tours)} horas`;
	const first = `${subject} desde ${formatPrice(destination.fromPrice)}, ${duration} y con salida ${scheduleWhen(departureDays(tours))}${port ? ` desde ${port}` : ''}.`;

	const candidates = pickupSentences(tours).map((pickup) => `${first} ${pickup}`);
	const answer = candidates.find((candidate) => candidate.length <= answerMaxLength);
	if (answer) return answer;

	const shortest = candidates.reduce((best, candidate) => (candidate.length < best.length ? candidate : best));
	console.warn(`La respuesta directa de ${destination.name} pasa de ${answerMaxLength} caracteres (${shortest.length}): ${shortest}`);
	return shortest;
}

function keyFacts(destination: Destination, tours: TourDetails[]): PillarKeyFact[] {
	const cheapest = tours.find((details) => details.pricePer === 'person' && details.price === destination.fromPrice);
	const category = sharedCategory(tours);
	const port = sharedPort(tours);
	const included = tours.filter(pickupIncluded);
	const span = hoursSpan(tours);

	const pickup: PillarKeyFact =
		included.length === 0
			? { label: 'Recogida', value: `Aparte, desde ${formatPrice(lowestOf(extraFees(tours)))}`, note: 'por persona' }
			: included.length === tours.length
				? { label: 'Recogida', value: `Incluida desde ${includedPickupZoneName}` }
				: { label: 'Recogida', value: `Incluida en ${included.length} de ${tours.length}` };

	return [
		{ label: 'Precio desde', value: formatPrice(destination.fromPrice), ...(cheapest && { note: cheapest.priceUnit }) },
		{ label: 'Duración', value: category ? `${durationCategoryLabels[category]}, ${span} h` : `${span.charAt(0).toUpperCase()}${span.slice(1)} h` },
		{ label: 'Salidas', value: scheduleLabel(departureDays(tours)) },
		pickup,
		...(port ? [{ label: 'Embarque', value: `Puerto de ${port}`, hiddenBelowSm: true }] : []),
	];
}

function comparisonRow(details: TourDetails): ComparisonRow {
	return {
		details,
		href: tourDetailsHref(details),
		title: details.title,
		price: formatPrice(details.price),
		priceUnit: details.priceUnit,
		childPrice: childPriceLabel(details),
		duration: durationLabel(details),
		days: scheduleLabel(details.days),
		includes: details.includesSummary,
		bestFor: details.bestFor,
		notes: [...(details.minAge ? [minAgeLabel(details)] : []), ...tourNotes(details)],
	};
}

function tableNote(tours: TourDetails[]) {
	const noPregnancy = tours.every((details) => details.pregnancy === 'not-allowed');
	const noWheelchair = tours.every((details) => !details.wheelchair);
	if (noPregnancy && noWheelchair) return 'Ninguna admite embarazadas ni está adaptada para silla de ruedas.';
	if (noPregnancy) return 'Ninguna admite embarazadas.';
	if (noWheelchair) return 'Ninguna está adaptada para silla de ruedas.';
	return undefined;
}

function generatedQuestions(destination: Destination) {
	const name = destination.name;
	return {
		price: isPlace(destination) ? `¿Cuánto cuesta la excursión a ${name}?` : `¿Cuánto cuestan las excursiones de ${name.toLowerCase()} en Punta Cana?`,
		pickup: isPlace(destination) ? '¿Incluye la recogida en el hotel?' : '¿Incluyen la recogida en el hotel?',
		suitability: '¿Pueden ir niños, embarazadas o personas en silla de ruedas?',
		weather: weatherFaq.question,
	};
}

function priceAnswer(destination: Destination, tours: TourDetails[]) {
	const perPerson = tours.filter((details) => details.pricePer === 'person');
	const perGroup = tours.filter((details) => details.pricePer === 'group');
	const withChild = tours.filter((details) => details.childPrice);
	const sentences: string[] = [];

	if (perPerson.length === 1) sentences.push(`${perPerson[0].title} cuesta ${priceLabel(perPerson[0])}.`);
	if (perPerson.length === 2) {
		const [low, high] = perPerson;
		sentences.push(`${low.title} cuesta ${formatPrice(low.price)} y ${high.title}, ${formatPrice(high.price)}.`);
	}
	if (perPerson.length > 2) {
		const low = perPerson[0];
		const high = perPerson.reduce((max, details) => (details.price > max.price ? details : max));
		sentences.push(`La más barata es ${low.title}, por ${formatPrice(low.price)}, y la más cara, ${high.title}, por ${formatPrice(high.price)}.`);
	}

	const child = withChild[0]?.childPrice;
	if (child && withChild.length === 1) {
		sentences.push(`En ${withChild[0].title}, los niños de ${child.fromAge} a ${child.toAge} años pagan ${formatPrice(child.amount)}.`);
	} else if (child) {
		const sameAges = withChild.every((details) => details.childPrice?.fromAge === child.fromAge && details.childPrice?.toAge === child.toAge);
		const prices = withChild.map((details) => {
			const price = details.childPrice!;
			return `${formatPrice(price.amount)} en ${details.title}${sameAges ? '' : ` (de ${price.fromAge} a ${price.toAge} años)`}`;
		});
		sentences.push(
			sameAges
				? `Los niños de ${child.fromAge} a ${child.toAge} años pagan ${listFormat.format(prices)}.`
				: `Los niños pagan ${listFormat.format(prices)}.`,
		);
	}

	for (const details of perGroup) {
		sentences.push(`${details.title} cuesta ${priceLabel(details)}, con ${formatPrice(details.deposit)} de depósito que pagas online.`);
	}
	if (perPerson.length > 0) {
		const deposits = perPerson.map((details) => details.deposit);
		const min = lowestOf(deposits);
		const max = highestOf(deposits);
		const deposit = min === max ? formatPrice(min) : `${formatPrice(min)} a ${formatPrice(max)}`;
		const subject = perGroup.length > 0 ? 'Las demás se reservan' : isPlace(destination) ? 'Se reserva' : 'Se reservan';
		sentences.push(`${subject} online con un depósito de ${deposit} por persona, y el resto se paga el día de la excursión.`);
	}
	return sentences.join(' ');
}

function feesByZone(tours: TourDetails[]) {
	const fees = tours[0]?.pickupFees ?? {};
	const servedZones = pickupZones.filter((zone) => fees[zone.id] !== undefined);
	return [...Map.groupBy(servedZones, (zone) => fees[zone.id])]
		.map(([fee, zones]) => ({ fee, zones: listFormat.format(zones.map((zone) => zone.name)) }))
		.sort((first, second) => first.fee - second.fee);
}

const joinWithFinalComma = (parts: string[]) =>
	parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, y ${parts.at(-1)}` : parts.join('');

function pickupAnswer(tours: TourDetails[]) {
	const included = tours.filter(pickupIncluded);

	if (included.length === tours.length && !sameFees(tours)) {
		return `Sí, sin cargo desde ${includedPickupZoneName} en todas. Desde otras zonas puede costar hasta ${formatPrice(highestOf(extraFees(tours)))} por persona según la excursión; en cada ficha está el precio para tu zona.`;
	}
	if (included.length > 0 && included.length < tours.length) {
		return `${titles(included)} la ${included.length === 1 ? 'incluye' : 'incluyen'} sin cargo desde ${includedPickupZoneName}. En las demás se paga aparte; en cada ficha está el precio para tu zona.`;
	}

	const groups = feesByZone(tours);
	if (included.length === 0) {
		const parts = groups.map(({ fee, zones }, index) => `${formatPrice(fee)}${index === 0 ? ' por persona' : ''} desde ${zones}`);
		return `No, se paga aparte: ${joinWithFinalComma(parts)}.`;
	}

	const [free, ...paid] = groups;
	if (!free) return `Sí, sin cargo desde ${includedPickupZoneName}.`;
	const parts = paid.map(({ fee, zones }, index) =>
		index === 0 ? `desde ${zones} se suman ${formatPrice(fee)} por persona` : `desde ${zones}, ${formatPrice(fee)}`,
	);
	const rest = joinWithFinalComma(parts);
	return `Sí, sin cargo desde ${free.zones}.${rest ? ` ${rest.charAt(0).toUpperCase()}${rest.slice(1)}.` : ''}`;
}

function ageSentence(tours: TourDetails[]) {
	const withAge = tours.filter((details) => details.minAge);
	if (withAge.length === 0) return 'Pueden ir niños de cualquier edad.';
	if (withAge.length === tours.length && withAge.every((details) => details.minAge === withAge[0].minAge)) {
		return tours.length === 1
			? `${tours[0].title} pide ${tours[0].minAge} años como mínimo.`
			: `Todas piden ${withAge[0].minAge} años como mínimo.`;
	}

	const groups = [...Map.groupBy(withAge, (details) => details.minAge!)].sort(([a], [b]) => a - b);
	const clauses = groups.map(([age, group], index) =>
		index === 0 ? `${titles(group)} ${group.length === 1 ? 'pide' : 'piden'} ${age} años como mínimo` : `${titles(group)}, ${age}`,
	);
	const without = tours.filter((details) => !details.minAge);
	const rest =
		without.length === 0 ? '' : without.length === 1 ? ` ${without[0].title} no tiene edad mínima.` : ' Las demás no tienen edad mínima.';
	return `${clauses.join('; ')}.${rest}`;
}

function pregnancySentence(tours: TourDetails[]) {
	const allowed = tours.filter((details) => details.pregnancy === 'allowed');
	const limited = tours.filter((details) => details.pregnancy === 'limited');
	const refused = tours.filter((details) => details.pregnancy === 'not-allowed');
	if (refused.length === tours.length) return 'Ninguna admite embarazadas.';
	if (allowed.length === tours.length) return tours.length === 1 ? 'Admite embarazadas.' : 'Todas admiten embarazadas.';

	const clauses: [TourDetails[], string][] = [
		...(allowed.length > 0 ? [[allowed, ''] as [TourDetails[], string]] : []),
		...[...Map.groupBy(limited, (details) => details.pregnancyMaxMonths ?? 0)].map(
			([months, group]) => [group, ` hasta los ${months} meses`] as [TourDetails[], string],
		),
	];
	const sentences = clauses.map(
		([group, limit], index) => `${titles(group)} ${index === 0 ? '' : 'las '}${group.length === 1 ? 'admite' : 'admiten'}${index === 0 ? ' embarazadas' : ''}${limit}.`,
	);
	if (refused.length > 0) sentences.push(`${titles(refused)} no las ${refused.length === 1 ? 'admite' : 'admiten'}.`);
	return sentences.join(' ');
}

function wheelchairSentence(tours: TourDetails[]) {
	const accessible = tours.filter((details) => details.wheelchair);
	if (accessible.length === 0) return 'Ninguna está adaptada para silla de ruedas.';
	if (accessible.length === tours.length) return 'Todas se pueden hacer en silla de ruedas.';
	return `En silla de ruedas se ${accessible.length === 1 ? 'puede' : 'pueden'} hacer ${titles(accessible)}.`;
}

function accessSentences(tours: TourDetails[]) {
	const allAllowed = tours.length > 1 && tours.every((details) => details.pregnancy === 'allowed' && details.wheelchair);
	if (allAllowed) return 'Todas admiten embarazadas y se pueden hacer en silla de ruedas.';
	const none = tours.every((details) => details.pregnancy === 'not-allowed' && !details.wheelchair);
	if (none) return 'Ninguna admite embarazadas ni está adaptada para silla de ruedas.';
	return `${pregnancySentence(tours)} ${wheelchairSentence(tours)}`;
}

export function generatedFaqs(destination: Destination, tours = orderedTours(destination)): Faq[] {
	const questions = generatedQuestions(destination);
	return [
		{ question: questions.price, answer: priceAnswer(destination, tours) },
		{ question: questions.pickup, answer: pickupAnswer(tours), link: pickupZonesLink },
		{
			question: questions.suitability,
			answer: [ageSentence(tours), accessSentences(tours)].join(' '),
		},
		{ question: questions.weather, answer: weatherFaq.answer },
	];
}

const toursTitle = (destination: Destination) =>
	isPlace(destination) ? `Todas las excursiones a ${destination.name}` : `Todas las excursiones de ${destination.name.toLowerCase()}`;

const guidesTitle = (destination: Destination) =>
	isPlace(destination) ? `Guías para ir a ${destination.name}` : `Guías de ${destination.name.toLowerCase()}`;

const serviceRoutes: string[] = [
	'/',
	routes.pickupZones,
	routes.howToBook,
	routes.cancellations,
	routes.faq,
	routes.contact,
	routes.catalog,
	routes.guides,
];

const normalizeQuestion = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[¿?¡!.,]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

function collectStrings(value: unknown, path: string, out: [string, string][]) {
	if (typeof value === 'string') out.push([path, value]);
	else if (Array.isArray(value)) value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, out));
	else if (value && typeof value === 'object' && !(value instanceof Date)) {
		for (const [key, item] of Object.entries(value)) collectStrings(item, path ? `${path}.${key}` : key, out);
	}
	return out;
}

const allowedTag = /^<(a href="[^"<>]+"|\/a|strong|\/strong)>$/;

function linkErrors(destination: Destination, tours: TourDetails[], links: [string, string][]) {
	const own = new Set([destinationHref(destination), ...tours.map(tourDetailsHref)]);
	const guidePaths = new Map(
		allGuides.filter((guide) => guide.silo === destination.id || guide.silo === 'general').map((guide) => [guideHref(guide), guide]),
	);
	const foreign = new Map(crossSiloLinks[destination.id].map((id) => [destinationHref(findDestination(id)), 0]));
	const errors: string[] = [];

	for (const [path, href] of links) {
		const target = href.split('#')[0];
		if (!href.startsWith('/')) {
			errors.push(`${path}: solo se enlazan rutas internas que empiezan por «/» (${href})`);
		} else if (own.has(target) || serviceRoutes.includes(target)) {
			continue;
		} else if (guidePaths.has(target)) {
			if (!isGuidePublished(guidePaths.get(target)!.slug)) errors.push(`${path}: la guía ${target} no tiene contenido y no se enlaza`);
		} else if (foreign.has(target)) {
			const count = foreign.get(target)! + 1;
			foreign.set(target, count);
			if (count > 1) errors.push(`${path}: la pilar ${target} se enlaza más de una vez`);
		} else {
			errors.push(`${path}: enlace no permitido en este silo (${href})`);
		}
	}
	return errors;
}

export interface PillarReview {
	errors: string[];
	warnings: string[];
}

export function validatePillar(destination: Destination, content: PillarContent): PillarReview {
	const tours = destinationTourDetails(destination);
	const errors: string[] = [];
	const warnings: string[] = [];
	const check = (ok: boolean, message: string) => {
		if (!ok) errors.push(message);
	};
	const warn = (ok: boolean, message: string) => {
		if (!ok) warnings.push(message);
	};

	const fromPrice = formatPrice(destination.fromPrice);
	check(content.seoTitle.length <= 60, `seoTitle: máximo 60 caracteres (${content.seoTitle.length})`);
	warn(content.description.length <= 155, `description: máximo 155 caracteres (${content.description.length})`);
	warn(content.description.includes(fromPrice), `description: tiene que llevar el precio desde (${fromPrice})`);
	if (!isPlace(destination)) check(Boolean(content.heading?.includes('Punta Cana')), 'heading: obligatorio y con «Punta Cana»');
	check((content.comparisonIntro ?? '').length <= 120, 'comparisonIntro: máximo 120 caracteres');
	check(content.faqs.length <= 8, `faqs: máximo 8 (${content.faqs.length})`);
	check(content.sections.length <= 6, `sections: máximo 6 (${content.sections.length})`);
	check((content.facts ?? []).length <= 6, `facts: máximo 6 (${content.facts?.length})`);
	for (const fact of content.facts ?? []) {
		check(fact.label.length <= 28 && fact.value.length <= 60, `facts: «${fact.label}» pasa de 28 caracteres en label o de 60 en value`);
	}
	check(content.cta.title.length <= 40, `cta.title: máximo 40 caracteres (${content.cta.title.length})`);
	check(content.cta.text.length <= 160, `cta.text: máximo 160 caracteres (${content.cta.text.length})`);

	const links: [string, string][] = [];
	for (const [path, text] of collectStrings(content, '', [])) {
		warn(!/[—–·]| - /.test(text), `${path}: raya, semirraya, punto medio o guion como separador`);
		warn(!/\b(TODO|REVISAR|PENDIENTE|XXX)\b|\{\{/.test(text) && !/lorem/i.test(text), `${path}: marca de hueco`);
		check(!text.includes('[') || path === 'cta.whatsappMessage', `${path}: «[» solo en cta.whatsappMessage`);
		if (path.endsWith('link.href')) links.push([path, text]);

		const tags = text.match(/<[^>]*>/g) ?? [];
		if (path.startsWith('sections[') && path.includes('.blocks[')) {
			for (const tag of tags) check(allowedTag.test(tag), `${path}: etiqueta no permitida ${tag}`);
			for (const match of text.matchAll(/<a href="([^"]*)">/g)) links.push([path, match[1]]);
		} else {
			check(!text.includes('<'), `${path}: sin HTML fuera de las secciones (en las preguntas, el enlace va en link)`);
		}
	}
	errors.push(...linkErrors(destination, tours, links));

	const generated = Object.values(generatedQuestions(destination)).map(normalizeQuestion);
	const seen = new Set<string>();
	for (const faq of content.faqs) {
		const question = normalizeQuestion(faq.question);
		check(!seen.has(question), `faqs: pregunta repetida «${faq.question}»`);
		check(!generated.includes(question), `faqs: «${faq.question}» ya es una pregunta generada`);
		seen.add(question);
	}
	return { errors, warnings };
}

export function pillarPage(destination: Destination): PillarPage {
	const content = pillarContents[destination.id];
	const { errors, warnings } = validatePillar(destination, content);
	const listed = (messages: string[]) => messages.map((message) => `  ${message}`).join('\n');
	if (errors.length > 0) throw new Error(`La pilar de ${destination.name} no pasa la validación:\n${listed(errors)}`);
	if (warnings.length > 0) console.warn(`La pilar de ${destination.name} tiene avisos por datos editados en el panel:\n${listed(warnings)}`);

	const tours = orderedTours(destination);
	const heading = content.heading ?? destinationToursTitle(destination);
	const guides = siloGuides(destination.id)
		.toSorted((a, b) => Number(isGuidePublished(b.slug)) - Number(isGuidePublished(a.slug)))
		.slice(0, 3);
	const updatedAt = new Date(Math.max(content.updatedAt.getTime(), ...tours.map((details) => details.updatedAt.getTime())));

	const navLinks: PillarNavLink[] = [
		{ href: '#comparar', label: 'Comparar' },
		{ href: '#excursiones', label: 'Excursiones', count: { value: tours.length, label: tourCountText(tours.length) } },
		...(content.sections.length > 0 ? [{ href: '#como-es', label: isPlace(destination) ? 'Cómo es' : 'Qué esperar' }] : []),
		...(guides.some((guide) => isGuidePublished(guide.slug))
			? [{ href: '#guias', label: 'Guías', count: { value: guides.length, label: guideCountLabel(guides.length) } }]
			: []),
		{ href: '#preguntas-title', label: 'Preguntas' },
	];

	return {
		destination,
		content,
		href: destinationHref(destination),
		heading,
		answer: destinationAnswer(destination),
		keyFacts: keyFacts(destination, tours),
		tours,
		rows: tours.map(comparisonRow),
		tableNote: tableNote(tours),
		toursTitle: toursTitle(destination),
		guides,
		guidesTitle: guidesTitle(destination),
		faqs: [...content.faqs, ...generatedFaqs(destination, tours)],
		faqTitle: content.faqTitle ?? `Preguntas frecuentes sobre ${isPlace(destination) ? destination.name : lowerFirst(heading)}`,
		navLinks,
		updatedAt,
	};
}
