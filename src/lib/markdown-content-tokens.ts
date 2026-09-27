import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import { contentTokens, fillContentTokens } from '../data/guides/content-tokens';

type MdastPlugin = NonNullable<SatteriProcessorOptions['mdastPlugins']>[number];

const tokensFingerprint = Object.entries(contentTokens)
	.map(([name, value]) => `${name}=${value}`)
	.join(';');

export const contentTokensPlugin = {
	name: `content-tokens(${tokensFingerprint})`,
	text(node, context) {
		const value = fillContentTokens(node.value);
		if (value !== node.value) context.setProperty(node, 'value', value);
	},
	link(node, context) {
		const url = fillContentTokens(decodeURI(node.url));
		if (url !== node.url) context.setProperty(node, 'url', url);
	},
} satisfies MdastPlugin;
