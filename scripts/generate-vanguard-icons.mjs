#!/usr/bin/env node
/**
 * Rasterize Gold Command Vanguard app marks from shared geometry (pngjs).
 * Source SVG: static/icons/favicon.svg
 *
 * Usage: node scripts/generate-vanguard-icons.mjs
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'static', 'icons');

const VOID = [2, 2, 2];
const WELL = [5, 5, 10];
const SLATE = [51, 65, 85];
const GOLD = [251, 191, 36];

/** @param {number} deg */
function rad(deg) {
	return (deg * Math.PI) / 180;
}

/** Flat-top hex vertices clockwise from top. */
function hexPoints(cx, cy, r) {
	return Array.from({ length: 6 }, (_, i) => {
		const a = rad(60 * i - 90);
		return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
	});
}

/** @param {number} x @param {number} y @param {{x:number,y:number}[]} poly */
function pointInPoly(x, y, poly) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const xi = poly[i].x;
		const yi = poly[i].y;
		const xj = poly[j].x;
		const yj = poly[j].y;
		const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}

/** @param {number} px @param {number} py @param {{x:number,y:number}[]} poly */
function distToPolyEdge(px, py, poly) {
	let min = Infinity;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len2 = dx * dx + dy * dy;
		const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
		const cx = a.x + t * dx;
		const cy = a.y + t * dy;
		const d = Math.hypot(px - cx, py - cy);
		if (d < min) min = d;
	}
	return min;
}

/** @param {number} px @param {number} py @param {{x:number,y:number}[]} tri */
function pointInTri(px, py, tri) {
	return pointInPoly(px, py, tri);
}

/** @param {import('pngjs').PNG} png @param {number} size @param {{scale?: number}} [opts] */
function drawMark(png, size, opts = {}) {
	const scale = opts.scale ?? 1;
	const cx = size / 2;
	const cy = size / 2;
	const hexR = size * 0.32 * scale;
	const hex = hexPoints(cx, cy, hexR);
	const stroke = Math.max(2, Math.round(size * 0.02));

	const chevron = [
		{ x: cx - hexR * 0.47, y: cy - hexR * 0.08 },
		{ x: cx, y: cy + hexR * 0.42 },
		{ x: cx + hexR * 0.47, y: cy - hexR * 0.08 },
	];
	const chevronInnerLeft = { x: cx - hexR * 0.18, y: cy + hexR * 0.08 };
	const chevronInnerRight = { x: cx + hexR * 0.18, y: cy + hexR * 0.08 };
	const chevronTopLeft = { x: cx - hexR * 0.31, y: cy - hexR * 0.08 };
	const chevronTopRight = { x: cx + hexR * 0.31, y: cy - hexR * 0.08 };
	const leftWing = [chevron[0], chevron[1], chevronInnerLeft, chevronTopLeft];
	const rightWing = [chevronTopRight, chevronInnerRight, chevron[1], chevron[2]];

	const nodeHalf = Math.max(2, Math.round(size * 0.016 * scale));
	const nodeY = cy + hexR * 0.52;

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const idx = (size * y + x) << 2;
			let r = VOID[0];
			let g = VOID[1];
			let b = VOID[2];

			if (pointInPoly(x + 0.5, y + 0.5, hex)) {
				r = WELL[0];
				g = WELL[1];
				b = WELL[2];
			}

			const edge = distToPolyEdge(x + 0.5, y + 0.5, hex);
			if (edge <= stroke / 2 && edge >= 0) {
				r = SLATE[0];
				g = SLATE[1];
				b = SLATE[2];
			}

			if (
				pointInTri(x + 0.5, y + 0.5, leftWing) ||
				pointInTri(x + 0.5, y + 0.5, rightWing)
			) {
				r = GOLD[0];
				g = GOLD[1];
				b = GOLD[2];
			}

			if (Math.abs(x + 0.5 - cx) <= nodeHalf && Math.abs(y + 0.5 - nodeY) <= nodeHalf) {
				r = GOLD[0];
				g = GOLD[1];
				b = GOLD[2];
			}

			png.data[idx] = r;
			png.data[idx + 1] = g;
			png.data[idx + 2] = b;
			png.data[idx + 3] = 255;
		}
	}
}

/** @param {number} size @param {{scale?: number}} [opts] */
function renderPng(size, opts) {
	const png = new PNG({ width: size, height: size });
	drawMark(png, size, opts);
	return PNG.sync.write(png);
}

/** Embed PNG bytes in a minimal single-image ICO container. */
function pngToIco(pngBuf) {
	const pngOffset = 6 + 16;
	const total = pngOffset + pngBuf.length;
	const out = Buffer.alloc(total);
	out.writeUInt16LE(0, 0);
	out.writeUInt16LE(1, 2);
	out.writeUInt16LE(1, 4);
	out.writeUInt8(32, 6);
	out.writeUInt8(32, 7);
	out.writeUInt8(0, 8);
	out.writeUInt8(0, 9);
	out.writeUInt16LE(1, 10);
	out.writeUInt16LE(32, 12);
	out.writeUInt32LE(pngBuf.length, 14);
	out.writeUInt32LE(pngOffset, 18);
	pngBuf.copy(out, pngOffset);
	return out;
}

function main() {
	writeFileSync(join(OUT_DIR, 'icon-192.png'), renderPng(192));
	writeFileSync(join(OUT_DIR, 'icon-512.png'), renderPng(512));
	writeFileSync(join(OUT_DIR, 'icon-maskable-512.png'), renderPng(512, { scale: 0.78 }));
	const fav32 = renderPng(32);
	writeFileSync(join(OUT_DIR, 'favicon.ico'), pngToIco(fav32));
	console.log('[generate-vanguard-icons] Wrote icon-192.png, icon-512.png, icon-maskable-512.png, favicon.ico');
}

main();
