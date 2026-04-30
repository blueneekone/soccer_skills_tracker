<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	/**
	 * @typedef {'alpha' | 'bravo'} OperativeBodyType
	 * @typedef {{
	 *   skinTone?: string;
	 *   jerseyColor?: string;
	 *   cleatColor?: string;
	 *   bodyType?: string;
	 * }} OperativeAvatar3DConfig
	 */

	let {
		/** @type {OperativeAvatar3DConfig} */
		config = {},
		class: className = '',
	} = $props();

	const bodyType = $derived(config.bodyType === 'bravo' ? 'bravo' : 'alpha');

	const colors = $derived({
		skinTone: config.skinTone ?? '#d2996c',
		jerseyColor: config.jerseyColor ?? '#dc2626',
		cleatColor: config.cleatColor ?? '#bef264',
	});

	let hostEl = $state(/** @type {HTMLDivElement | undefined} */ (undefined));
	let canvasEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	let loadError = $state(/** @type {string | null} */ (null));

	/** @type {{ dispose: () => void } | null} */
	let engineApi = null;

	/** @type {import('three').Group | null} */
	let modelRoot = $state(null);

	/** Set by Three bootstrap — reactive so `$effect` can swap meshes when `bodyType` changes. */
	let swapBodyRef = $state(/** @type {null | ((bt: OperativeBodyType) => void)} */ (null));

	/**
	 * @param {import('three').Object3D} root
	 */
	function disposeModelSubtree(root) {
		const geos = new Set();
		const mats = new Set();
		root.traverse((obj) => {
			const mesh = /** @type {import('three').Mesh} */ (obj);
			if (mesh.isMesh) {
				if (mesh.geometry) geos.add(mesh.geometry);
				const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				for (const m of ms) if (m) mats.add(m);
			}
		});
		for (const g of geos) g.dispose();
		for (const m of mats) m.dispose();
	}

	/**
	 * @param {import('three').Object3D | null} root
	 * @param {typeof colors} c
	 */
	function applyMaterials(root, c) {
		if (!root) return;

		root.traverse((/** @type {import('three').Object3D} */ child) => {
			const mesh = /** @type {import('three').Mesh & { isMesh?: boolean }} */ (child);
			if (!mesh.isMesh) return;

			const meshName = (mesh.name || '').toLowerCase();
			const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

			for (const mat of mats) {
				if (!mat || typeof mat !== 'object') continue;
				const std = /** @type {import('three').MeshStandardMaterial} */ (mat);
				if (!std.color) continue;

				const matName = (std.name || '').toLowerCase();
				const hay = `${meshName} ${matName}`;

				if (hay.includes('jersey') || hay.includes('shirt') || hay.includes('kit')) {
					std.color.set(c.jerseyColor);
				} else if (
					hay.includes('cleat') ||
					hay.includes('boot') ||
					hay.includes('shoe')
				) {
					std.color.set(c.cleatColor);
				} else if (
					hay.includes('skin') ||
					hay.includes('face') ||
					hay.includes('head') ||
					hay.includes('hand') ||
					hay.includes('leg') ||
					hay.includes('arm')
				) {
					std.color.set(c.skinTone);
				}
			}
		});
	}

	/**
	 * @param {typeof import('three')} THREE
	 * @param {typeof colors} c
	 * @param {OperativeBodyType} bt
	 */
	function buildFallbackOperative(THREE, c, bt) {
		const group = new THREE.Group();
		group.name = `operative_fallback_${bt}`;

		const scale = bt === 'bravo' ? 0.94 : 1;

		const skinMat = new THREE.MeshStandardMaterial({
			color: c.skinTone,
			roughness: 0.55,
			metalness: 0.05,
			name: 'skin_mat',
		});
		const jerseyMat = new THREE.MeshStandardMaterial({
			color: c.jerseyColor,
			roughness: 0.45,
			metalness: 0.08,
			name: 'jersey_mat',
		});
		const cleatMat = new THREE.MeshStandardMaterial({
			color: c.cleatColor,
			roughness: 0.35,
			metalness: 0.15,
			name: 'cleat_mat',
		});

		const head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 28, 28), skinMat);
		head.name = 'operative_skin_head';
		head.position.set(0, 1.05 * scale, 0);

		const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48 * scale, 0.52 * scale, 0.28 * scale), jerseyMat);
		torso.name = 'operative_jersey_torso';
		torso.position.set(0, 0.62 * scale, 0);

		const hip = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.18 * scale, 0.22 * scale), skinMat);
		hip.name = 'operative_skin_hips';
		hip.position.set(0, 0.28 * scale, 0);

		const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.08 * scale, 0.42 * scale, 14), skinMat);
		legL.name = 'operative_skin_leg_l';
		legL.position.set(-0.14 * scale, -0.05 * scale, 0);
		const legR = new THREE.Mesh(
			new THREE.CylinderGeometry(0.09 * scale, 0.08 * scale, 0.42 * scale, 14),
			skinMat,
		);
		legR.name = 'operative_skin_leg_r';
		legR.position.set(0.14 * scale, -0.05 * scale, 0);

		const cleatL = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.08 * scale, 0.26 * scale), cleatMat);
		cleatL.name = 'operative_cleat_l';
		cleatL.position.set(-0.14 * scale, -0.32 * scale, 0.05 * scale);
		const cleatR = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.08 * scale, 0.26 * scale), cleatMat);
		cleatR.name = 'operative_cleat_r';
		cleatR.position.set(0.14 * scale, -0.32 * scale, 0.05 * scale);

		group.add(head, torso, hip, legL, legR, cleatL, cleatR);
		return group;
	}

	onMount(() => {
		if (!browser || !canvasEl || !hostEl) return () => {};

		let disposed = false;

		void (async () => {
			const THREE = await import('three');
			const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
			const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

			if (disposed || !canvasEl || !hostEl) return;

			const scene = new THREE.Scene();

			const renderer = new THREE.WebGLRenderer({
				canvas: canvasEl,
				antialias: true,
				alpha: true,
				powerPreference: 'high-performance',
			});
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
			renderer.outputColorSpace = THREE.SRGBColorSpace;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			renderer.toneMappingExposure = 1;

			const camera = new THREE.PerspectiveCamera(42, 1, 0.08, 80);
			camera.position.set(1.35, 1.05, 2.2);

			const ambient = new THREE.AmbientLight(0xffffff, 0.42);
			scene.add(ambient);

			const key = new THREE.DirectionalLight(0xffffff, 1.35);
			key.position.set(4.5, 8, 5);
			key.castShadow = false;
			scene.add(key);

			const rim = new THREE.DirectionalLight(0xa5f3fc, 0.38);
			rim.position.set(-4, 3, -5);
			scene.add(rim);

			const controls = new OrbitControls(camera, canvasEl);
			controls.enableDamping = true;
			controls.dampingFactor = 0.06;
			controls.enableZoom = false;
			controls.minPolarAngle = Math.PI * 0.25;
			controls.maxPolarAngle = Math.PI * 0.92;
			controls.target.set(0, 0.55, 0);

			/** @type {number | undefined} */
			let rafId;

			/** Increment to ignore stale GLTF callbacks when body type changes quickly. */
			let loadGen = 0;

			function resize() {
				if (!hostEl || !canvasEl) return;
				const w = Math.max(1, hostEl.clientWidth);
				const h = Math.max(1, hostEl.clientHeight);
				camera.aspect = w / h;
				camera.updateProjectionMatrix();
				renderer.setSize(w, h, false);
			}

			function frameModel(root) {
				const box = new THREE.Box3().setFromObject(root);
				const center = box.getCenter(new THREE.Vector3());
				const size = box.getSize(new THREE.Vector3());
				const maxDim = Math.max(size.x, size.y, size.z, 0.001);

				controls.target.copy(center);

				const dist =
					maxDim /
					(2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) /
					Math.min(camera.aspect, 1);

				const offset = new THREE.Vector3(0.85, 0.35, 1).normalize().multiplyScalar(dist * 1.08);
				camera.position.copy(center.clone().add(offset));
				camera.near = Math.max(0.05, dist / 80);
				camera.far = Math.max(60, dist * 40);
				camera.updateProjectionMatrix();
			}

			const loader = new GLTFLoader();

			function snapshotColors() {
				return {
					skinTone: config.skinTone ?? '#d2996c',
					jerseyColor: config.jerseyColor ?? '#dc2626',
					cleatColor: config.cleatColor ?? '#bef264',
				};
			}

			function detachCurrentModel() {
				const prev = modelRoot;
				if (!prev) return;
				scene.remove(prev);
				disposeModelSubtree(prev);
				modelRoot = null;
			}

			/**
			 * @param {OperativeBodyType} bt
			 */
			function swapBody(bt) {
				if (disposed) return;

				const gen = ++loadGen;
				detachCurrentModel();

				const url = `/models/base_${bt}.glb`;
				loadError = null;

				loader.load(
					url,
					(gltf) => {
						if (disposed || gen !== loadGen) return;
						loadError = null;
						const root = gltf.scene;
						root.updateMatrixWorld(true);
						scene.add(root);
						modelRoot = root;
						frameModel(root);
					},
					undefined,
					() => {
						if (disposed || gen !== loadGen) return;
						const snap = snapshotColors();
						loadError = `Missing or invalid ${url} — placeholder geometry (${bt}).`;
						console.warn('[OperativeAvatar3D]', loadError);
						const fb = buildFallbackOperative(THREE, snap, bt);
						fb.updateMatrixWorld(true);
						scene.add(fb);
						modelRoot = fb;
						frameModel(fb);
					},
				);
			}

			swapBodyRef = swapBody;

			const ro = new ResizeObserver(() => resize());
			ro.observe(hostEl);
			resize();

			function loop() {
				if (disposed) return;
				rafId = requestAnimationFrame(loop);
				controls.update();
				renderer.render(scene, camera);
			}
			loop();

			engineApi = {
				dispose() {
					disposed = true;
					loadGen++;
					swapBodyRef = null;
					if (rafId !== undefined) cancelAnimationFrame(rafId);
					ro.disconnect();
					controls.dispose();

					detachCurrentModel();

					const geos = new Set();
					const mats = new Set();
					scene.traverse((obj) => {
						const mesh = /** @type {import('three').Mesh} */ (obj);
						if (mesh.isMesh) {
							if (mesh.geometry) geos.add(mesh.geometry);
							const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
							for (const m of ms) if (m) mats.add(m);
						}
					});
					for (const g of geos) g.dispose();
					for (const m of mats) m.dispose();

					renderer.dispose();
				},
			};
		})();

		return () => {
			engineApi?.dispose?.();
			engineApi = null;
			modelRoot = null;
		};
	});

	/** Reload GLB when operative frame (alpha/bravo) changes. */
	$effect(() => {
		if (!browser || !swapBodyRef) return;
		bodyType;
		swapBodyRef(bodyType);
	});

	$effect(() => {
		if (!browser) return;
		colors.skinTone;
		colors.jerseyColor;
		colors.cleatColor;
		modelRoot;
		applyMaterials(modelRoot, colors);
	});
</script>

<div
	bind:this={hostEl}
	class={`operative-avatar-3d-host tw-relative tw-h-full tw-w-full tw-min-h-[220px] tw-overflow-hidden tw-rounded-xl tw-bg-gradient-to-b tw-from-slate-950/20 tw-to-black/40 ${className ?? ''}`}
	data-region="operative-avatar-3d"
	data-body-type={bodyType}
>
	{#if loadError}
		<p
			class="qa-mono tw-pointer-events-none tw-absolute tw-left-2 tw-top-2 tw-z-[2] tw-m-0 tw-max-w-[min(100%,18rem)] tw-rounded-md tw-border tw-border-amber-500/25 tw-bg-black/55 tw-px-2 tw-py-1 tw-text-[0.58rem] tw-leading-snug tw-text-amber-100/90"
			role="status"
		>
			{loadError}
		</p>
	{/if}
	<canvas
		bind:this={canvasEl}
		class="tw-block tw-h-full tw-w-full tw-touch-none"
		aria-label="3D operative preview — drag to rotate"
	></canvas>
</div>

<style>
	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	.operative-avatar-3d-host :global(canvas) {
		outline: none;
	}
</style>
