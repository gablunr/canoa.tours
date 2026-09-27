import type { QuestionAndAnswer } from '../seo/structured-data';
import type { StoredGuideBlock, StoredGuideSection } from './render-guide-content';

export interface GuideMarkdownContent {
	answer: string;
	sections: StoredGuideSection[];
	faqs: QuestionAndAnswer[];
}

export interface GuideMarkdownIssue {
	line: number;
	message: string;
}

export const faqHeading = 'Preguntas frecuentes';

const limits = {
	answer: 1200,
	sections: 30,
	sectionTitle: 120,
	paragraph: 4000,
	listItem: 500,
	tableColumnsMin: 2,
	tableColumnsMax: 6,
	tableHeadCell: 80,
	tableCell: 300,
	faqs: 20,
	question: 200,
	faqAnswer: 2000,
};

const comparable = (text: string) =>
	text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.trim();

const isFaqHeading = (title: string) => comparable(title) === comparable(faqHeading);

const headingPattern = /^(#{1,6})\s+(.*?)\s*#*$/;
const listItemPattern = /^[-*•]\s+(.*)$/;
const tableSeparatorPattern = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

const tableCells = (line: string) =>
	line
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim());

const tableRow = (cells: string[]) => `| ${cells.join(' | ')} |`;

function blockMarkdown(block: StoredGuideBlock) {
	if (block.type === 'paragraph') return block.text;
	if (block.type === 'list') return block.items.map((item) => `- ${item}`).join('\n');
	return [tableRow(block.head), tableRow(block.head.map(() => '---')), ...block.rows.map(tableRow)].join('\n');
}

export function guideToMarkdown({ answer, sections, faqs }: GuideMarkdownContent) {
	const parts: string[] = [];
	if (answer.trim()) parts.push(answer.trim());
	sections.forEach((section) => {
		parts.push(`## ${section.title}`);
		section.blocks.forEach((block) => parts.push(blockMarkdown(block)));
	});
	if (faqs.length > 0) {
		parts.push(`## ${faqHeading}`);
		faqs.forEach((faq) => parts.push(`### ${faq.question}`, faq.answer));
	}
	return parts.length > 0 ? `${parts.join('\n\n')}\n` : '';
}

type Area = 'intro' | 'section' | 'faqs';

interface OpenTable {
	head: string[];
	rows: string[][];
	line: number;
}

interface OpenFaq {
	question: string;
	answerParts: string[];
	line: number;
}

export function parseGuideMarkdown(markdown: string): { content: GuideMarkdownContent; issues: GuideMarkdownIssue[] } {
	const issues: GuideMarkdownIssue[] = [];
	const introParts: string[] = [];
	const sections: (StoredGuideSection & { line: number })[] = [];
	const faqs: OpenFaq[] = [];
	let area: Area = 'intro';
	let paragraph: string[] = [];
	let list: string[] | null = null;
	let table: OpenTable | null = null;
	let blockLine = 1;

	const report = (line: number, message: string) => issues.push({ line, message });
	const tooLong = (text: string, limit: number) => text.length > limit;

	function addBlock(block: StoredGuideBlock, line: number) {
		if (area === 'section') {
			sections[sections.length - 1]?.blocks.push(block);
			return;
		}
		if (area === 'intro') {
			if (block.type === 'paragraph') introParts.push(block.text);
			else report(line, 'Antes de la primera sección solo va el texto de lo esencial, sin listas ni tablas.');
			return;
		}
		const faq = faqs[faqs.length - 1];
		if (!faq) report(line, 'En Preguntas frecuentes, cada pregunta empieza con ###.');
		else if (block.type === 'paragraph') faq.answerParts.push(block.text);
		else report(line, 'Las respuestas de las preguntas son solo texto, sin listas ni tablas.');
	}

	function closeTable(openTable: OpenTable) {
		const columns = openTable.head.length;
		if (columns < limits.tableColumnsMin) report(openTable.line, 'La tabla necesita al menos dos columnas.');
		if (columns > limits.tableColumnsMax) report(openTable.line, `Una tabla puede tener como mucho ${limits.tableColumnsMax} columnas.`);
		if (openTable.head.every((cell) => !cell)) report(openTable.line, 'La primera fila de la tabla es la cabecera: pon el nombre de cada columna.');
		if (openTable.head.some((cell) => tooLong(cell, limits.tableHeadCell))) report(openTable.line, 'Los nombres de columna son demasiado largos.');
		if (openTable.rows.length === 0) report(openTable.line, 'La tabla necesita al menos una fila debajo de la cabecera.');
		if (openTable.rows.some((row) => row.length > columns)) report(openTable.line, 'Hay filas con más celdas que columnas tiene la tabla.');
		if (openTable.rows.some((row) => row.some((cell) => tooLong(cell, limits.tableCell)))) report(openTable.line, 'Hay celdas demasiado largas en la tabla.');
		const rows = openTable.rows.map((row) => Array.from({ length: columns }, (_, index) => row[index] ?? ''));
		addBlock({ type: 'table', head: openTable.head, rows }, openTable.line);
	}

	function flush() {
		if (paragraph.length > 0) {
			const text = paragraph.join(' ');
			if (area === 'section' && tooLong(text, limits.paragraph)) report(blockLine, 'Este párrafo es demasiado largo. Pártelo en dos.');
			addBlock({ type: 'paragraph', text }, blockLine);
		}
		if (list) {
			if (list.some((item) => tooLong(item, limits.listItem))) report(blockLine, 'Hay elementos de la lista demasiado largos.');
			addBlock({ type: 'list', items: list }, blockLine);
		}
		if (table) closeTable(table);
		paragraph = [];
		list = null;
		table = null;
	}

	markdown
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.forEach((rawLine, index) => {
			const lineNumber = index + 1;
			const line = rawLine.trim();

			if (!line) {
				flush();
				return;
			}

			const heading = headingPattern.exec(line);
			if (heading) {
				flush();
				const level = heading[1].length;
				const title = heading[2].trim();
				if (level === 2 && isFaqHeading(title)) {
					area = 'faqs';
				} else if (level === 2) {
					area = 'section';
					sections.push({ title, blocks: [], line: lineNumber });
				} else if (level === 3 && area === 'faqs') {
					faqs.push({ question: title, answerParts: [], line: lineNumber });
				} else if (level === 1) {
					report(lineNumber, 'El título de la guía va en su campo de arriba. Para una sección usa ##.');
				} else {
					report(lineNumber, level === 3 ? 'Usa ### solo para las preguntas, dentro de ## Preguntas frecuentes.' : 'Para una sección usa ##.');
				}
				return;
			}

			const listItem = listItemPattern.exec(line);
			if (listItem) {
				if (!list) {
					flush();
					list = [];
					blockLine = lineNumber;
				}
				list.push(listItem[1].trim());
				return;
			}

			if (line.startsWith('|')) {
				if (!table) {
					flush();
					table = { head: tableCells(line), rows: [], line: lineNumber };
				} else if (!tableSeparatorPattern.test(line)) {
					table.rows.push(tableCells(line));
				}
				return;
			}

			if (list || table) flush();
			if (paragraph.length === 0) blockLine = lineNumber;
			paragraph.push(line);
		});
	flush();

	const answer = introParts.join('\n\n');
	if (tooLong(answer, limits.answer)) report(1, `Lo esencial, el texto antes de la primera sección, puede tener como mucho ${limits.answer} caracteres.`);
	if (sections.length > limits.sections) report(sections[limits.sections].line, `Una guía puede tener como mucho ${limits.sections} secciones.`);
	if (faqs.length > limits.faqs) report(faqs[limits.faqs].line, `Puede haber como mucho ${limits.faqs} preguntas.`);

	sections.forEach((section) => {
		if (section.title.length < 2 || tooLong(section.title, limits.sectionTitle)) report(section.line, 'El título de esta sección es demasiado corto o demasiado largo.');
		if (section.blocks.length === 0) report(section.line, `La sección «${section.title}» está vacía.`);
	});

	const parsedFaqs = faqs.map((faq) => {
		const faqAnswer = faq.answerParts.join('\n\n');
		if (faq.question.length < 5 || tooLong(faq.question, limits.question)) report(faq.line, 'Esta pregunta es demasiado corta o demasiado larga.');
		if (!faqAnswer) report(faq.line, `La pregunta «${faq.question}» no tiene respuesta.`);
		else if (faqAnswer.length < 5 || tooLong(faqAnswer, limits.faqAnswer)) report(faq.line, 'La respuesta de esta pregunta es demasiado corta o demasiado larga.');
		return { question: faq.question, answer: faqAnswer };
	});

	return {
		content: {
			answer,
			sections: sections.map(({ title, blocks }) => ({ title, blocks })),
			faqs: parsedFaqs,
		},
		issues: issues.sort((first, second) => first.line - second.line),
	};
}
