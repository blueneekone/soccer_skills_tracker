import DOMPurify from 'isomorphic-dompurify';

export function sanitizeSvg(svg: string | undefined | null): string {
	if (!svg) return '';
	return DOMPurify.sanitize(svg, {
		USE_PROFILES: { svg: true, svgFilters: true },
	});
}
