import Facebook from '../../assets/icons/social/facebook.svg';
import Instagram from '../../assets/icons/social/instagram.svg';
import TikTok from '../../assets/icons/social/tiktok.svg';
import WhatsApp from '../../assets/icons/social/whatsapp.svg';
import Mastercard from '../../assets/icons/payment/mastercard.svg';
import PayPal from '../../assets/icons/payment/paypal.svg';
import Visa from '../../assets/icons/payment/visa.svg';
import type { PaymentMethod, SocialNetwork } from './company';

export const whatsappIcon = WhatsApp;

export const socialIcons: Record<SocialNetwork, typeof WhatsApp> = {
	instagram: Instagram,
	tiktok: TikTok,
	facebook: Facebook,
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
	visa: 'Visa',
	mastercard: 'Mastercard',
	paypal: 'PayPal',
};

export const paymentIcons: Record<PaymentMethod, typeof WhatsApp> = {
	visa: Visa,
	mastercard: Mastercard,
	paypal: PayPal,
};
