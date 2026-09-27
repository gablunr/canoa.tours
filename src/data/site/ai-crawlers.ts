export const aiCrawlersByOperator: Record<string, string[]> = {
	OpenAI: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User'],
	Anthropic: ['ClaudeBot', 'Claude-SearchBot', 'Claude-User'],
	Google: ['Google-Extended', 'GoogleOther'],
	Perplexity: ['PerplexityBot', 'Perplexity-User'],
	Apple: ['Applebot', 'Applebot-Extended'],
	Meta: ['meta-externalagent', 'meta-externalfetcher'],
	Amazon: ['Amazonbot'],
	Mistral: ['MistralAI-User'],
	DuckDuckGo: ['DuckAssistBot'],
	Cohere: ['cohere-ai'],
	CommonCrawl: ['CCBot'],
};

export const aiCrawlers = Object.values(aiCrawlersByOperator).flat();
