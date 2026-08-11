/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import VampireImporterHUD from '../vampire/VampireImporterHUD.svelte';
import VampireImporterArena from '../vampire/VampireImporterArena.svelte';
import { VampireImporterEngine } from '../vampire/VampireImporterEngine.svelte';

vi.mock('$lib/firebase/config', () => ({
  db: {},
  functions: {}
}));

vi.mock('$lib/stores/auth/facade.svelte', () => ({
  authStore: {
    isAuthenticated: true
  }
}));

describe('Vampire Importer UI', () => {
  let engine: VampireImporterEngine;

  beforeEach(() => {
    engine = new VampireImporterEngine();
  });

  it('renders the HUD correctly', () => {
    render(VampireImporterHUD, { engine });
    expect(screen.getByText('Vampire Importer')).toBeInTheDocument();
  });

  it('renders the Arena drag & drop zone', () => {
    render(VampireImporterArena, { engine });
    expect(screen.getByText('Drag & Drop CSV Here')).toBeInTheDocument();
  });

  it('updates state properly on upload trigger', async () => {
    engine.isUploading = true;
    render(VampireImporterHUD, { engine });
    expect(screen.getByText('Uploading & Parsing...')).toBeInTheDocument();
  });
});
