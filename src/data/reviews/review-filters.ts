export const reviewPageSize = 6;

export const reviewRatingFilters = [
	{ value: 'all', label: 'Todas', matches: () => true },
	{ value: '5', label: '5 estrellas', matches: (rating: number) => rating === 5 },
	{ value: '4', label: '4 estrellas', matches: (rating: number) => rating === 4 },
	{ value: 'low', label: '3 o menos', matches: (rating: number) => rating <= 3 },
];
