const defaultRetryDelays = [300, 1000];

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function withRetries<Result>(load: () => Promise<Result>, retryDelays: readonly number[] = defaultRetryDelays): Promise<Result> {
	for (const delay of retryDelays) {
		try {
			return await load();
		} catch (error) {
			console.warn(`Falló la lectura de la base, se reintenta en ${delay} ms: ${describeError(error)}`);
			await wait(delay);
		}
	}
	return load();
}
