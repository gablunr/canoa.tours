import { PUBLIC_STRIPE_KEY } from 'astro:env/client';
import type { Appearance, CustomFontSource, Stripe, StripeCheckoutLoadActionsResult } from '@stripe/stripe-js';

export const paymentUnavailableMessage = 'No hemos podido cargar el pago. Vuelve atrás e inténtalo de nuevo.';
export const paymentFailedMessage = 'No se pudo completar el pago. Revisa los datos e inténtalo de nuevo.';

const colors = {
	text: '#02242d',
	secondary: '#5e6c70',
	placeholder: '#7c898d',
	border: '#d7e0e2',
	borderStrong: '#7c898d',
	surface: '#f3f8f9',
	background: '#ffffff',
	error: '#b3261e',
};

const appearance: Appearance = {
	theme: 'stripe',
	labels: 'above',
	variables: {
		colorPrimary: colors.text,
		colorBackground: colors.background,
		colorText: colors.text,
		colorTextSecondary: colors.secondary,
		colorTextPlaceholder: colors.placeholder,
		colorDanger: colors.error,
		fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
		fontSizeBase: '16px',
		borderRadius: '16px',
	},
	rules: {
		'.Label': { color: colors.text, fontSize: '14px', fontWeight: '500' },
		'.Input': { border: `1px solid ${colors.borderStrong}`, boxShadow: 'none', padding: '12px 16px' },
		'.Input:hover': { borderColor: colors.secondary },
		'.Input:focus': { borderColor: colors.text, boxShadow: 'none' },
		'.Input--invalid': { borderColor: colors.error, boxShadow: 'none' },
		'.Tab': { border: `1px solid ${colors.border}`, boxShadow: 'none' },
		'.Tab:hover': { borderColor: colors.secondary },
		'.Tab--selected': { borderColor: colors.text, backgroundColor: colors.surface, boxShadow: 'none' },
		'.Error': { fontSize: '12px' },
	},
};

const interFont = (file: string, weight: string): CustomFontSource => ({
	family: 'Inter',
	src: `url(${new URL(`/fonts/inter/${file}`, location.origin).href}) format('woff2')`,
	weight,
});

let stripeLoader: Promise<Stripe | null> | null = null;

export function loadStripeClient() {
	stripeLoader ??= import('@stripe/stripe-js')
		.then(({ loadStripe }) => loadStripe(PUBLIC_STRIPE_KEY, { locale: 'es' }))
		.catch(() => {
			stripeLoader = null;
			return null;
		});
	return stripeLoader;
}

export interface PaymentHandlers {
	onReady: () => void;
	onCanConfirmChange: (canConfirm: boolean) => void;
	onLoadError: (message: string) => void;
}

export interface MountedPayment {
	confirm: (email: string) => Promise<string | null>;
	destroy: () => void;
}

export async function mountPayment(container: HTMLElement, clientSecret: string, handlers: PaymentHandlers): Promise<MountedPayment | null> {
	const stripe = await loadStripeClient();
	if (!stripe) return null;

	const checkout = stripe.initCheckoutElementsSdk({
		clientSecret,
		elementsOptions: {
			appearance,
			loader: 'never',
			fonts: [interFont('Inter-Regular.woff2', '400'), interFont('Inter-Medium.woff2', '500')],
		},
	});
	checkout.on('change', (session) => handlers.onCanConfirmChange(session.canConfirm));

	const element = checkout.createPaymentElement();
	element.on('ready', () => handlers.onReady());
	element.on('loaderror', (event) => handlers.onLoadError(event.error.message || paymentUnavailableMessage));
	element.mount(container);

	const actionsLoaded: Promise<StripeCheckoutLoadActionsResult> = checkout
		.loadActions()
		.catch(() => ({ type: 'error', error: { message: paymentUnavailableMessage, code: null } }));

	return {
		async confirm(email) {
			const loaded = await actionsLoaded;
			if (loaded.type === 'error') return loaded.error.message || paymentUnavailableMessage;
			const { actions } = loaded;
			const result = await actions.confirm(actions.getSession().email ? undefined : { email });
			return result.type === 'error' ? result.error.message || paymentFailedMessage : null;
		},
		destroy() {
			element.destroy();
		},
	};
}
