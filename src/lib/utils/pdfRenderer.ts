import { tick } from 'svelte';

export async function renderPdfPageToCanvas(
	url: string,
	pdfCanvasEl: HTMLCanvasElement,
	abortSignal?: AbortSignal
): Promise<void> {
	await tick();
	if (abortSignal?.aborted || !pdfCanvasEl) return;
	
	const pdfjs = await import('pdfjs-dist');
	const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
	const workerSrc = typeof workerMod.default === 'string' ? workerMod.default : String(workerMod.default);
	pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

	const task = pdfjs.getDocument({ url, withCredentials: false });
	const pdf = await task.promise;
	if (abortSignal?.aborted) return;
	
	const page = await pdf.getPage(1);
	if (abortSignal?.aborted) return;
	
	const canvas = pdfCanvasEl;
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	
	const baseVp = page.getViewport({ scale: 1 });
	const maxW = Math.min(720, typeof window !== 'undefined' ? window.innerWidth - 48 : 720);
	const scale = Math.min(maxW / baseVp.width, 2);
	const vp = page.getViewport({ scale });
	
	canvas.width = Math.floor(vp.width);
	canvas.height = Math.floor(vp.height);
	
	const renderTask = page.render({
		canvasContext: ctx,
		viewport: vp,
		canvas,
	});
	await renderTask.promise;
}
