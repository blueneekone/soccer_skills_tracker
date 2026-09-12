<script lang="ts">
	import { untrack } from 'svelte';
	import type { ArmoryStudioEngine } from './ArmoryEngine.svelte.js';
	import { browser } from '$app/environment';

	interface Props {
		engine: ArmoryStudioEngine;
		accentColor: string;
		CATALOG: any[];
	}

	let { engine, accentColor, CATALOG }: Props = $props();

	let canvasRef: HTMLCanvasElement;

	$effect(() => {
		const ctx = canvasRef?.getContext('2d');
		if (!ctx) return;

		const currentEquipped = engine.equipped;
		const currentAccent = accentColor;

		untrack(() => {
			let destroyed = false;

			// Clear Canvas (Void Contract >=40% black)
			ctx.fillStyle = '#020617';
			ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

			// Render Background
			ctx.fillStyle = '#000000';
			ctx.fillRect(20, 20, canvasRef.width - 40, canvasRef.height - 40);

			// Universal Joint Map & Z-Index Layering
			// Order: Base Geometry -> Torso -> Footwear -> Head -> Expression
			const layers = [
				{ id: currentEquipped.base, type: 'base', yOffset: 100 },
				{ id: currentEquipped.torso, type: 'torso', yOffset: 150 },
				{ id: currentEquipped.footwear, type: 'footwear', yOffset: 300 },
				{ id: currentEquipped.head, type: 'head', yOffset: 50 },
				{ id: currentEquipped.expression, type: 'expression', yOffset: 50 }
			];

			layers.forEach(layer => {
				if (!layer.id) return;
				
				// Mock rendering a block for the layer to simulate the joints
				ctx.fillStyle = '#1e293b'; // Base gray for gear
				if (layer.type === 'base') ctx.fillStyle = '#334155';
				
				// Mock Universal Joint anchor positioning
				const width = layer.type === 'torso' ? 100 : (layer.type === 'head' ? 60 : 40);
				const height = layer.type === 'torso' ? 120 : 60;
				const xAnchor = (canvasRef.width / 2) - (width / 2);
				
				ctx.fillRect(xAnchor, layer.yOffset, width, height);

				// Apply Accent Color Engine to 'premium' gears
				const asset = CATALOG.find(a => a.id === layer.id);
				if (asset?.isPremium) {
					ctx.strokeStyle = currentAccent;
					ctx.lineWidth = 2;
					ctx.strokeRect(xAnchor, layer.yOffset, width, height);
					
					// Glowing piping
					ctx.shadowColor = currentAccent;
					ctx.shadowBlur = 10;
					ctx.strokeRect(xAnchor + 2, layer.yOffset + 2, width - 4, height - 4);
					ctx.shadowBlur = 0; // Reset
				}
			});

			return () => {
				destroyed = true;
				ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
			};
		});
	});
</script>

<div class="tw-w-[400px] tw-h-[500px] tw-bg-[#000000] tw-rounded-lg tw-shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] tw-overflow-hidden">
	<canvas bind:this={canvasRef} width="400" height="500"></canvas>
</div>
