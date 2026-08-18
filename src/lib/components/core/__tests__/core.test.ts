// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import { appendItem, snapshotState } from '../../../utils/stateHelpers';

describe('stateHelpers', () => {
  it('should immutably append items to an array', () => {
    const original = [1, 2];
    const updated = appendItem(original, 3);
    expect(updated).toEqual([1, 2, 3]);
    expect(original).toEqual([1, 2]); // Original shouldn't mutate
  });

  it('should snapshot states correctly', () => {
    const proxyMock = { value: 1 };
    expect(snapshotState(proxyMock)).toEqual(proxyMock);
  });
});

import BentoTestWrapper from '../../shared/BentoTestWrapper.svelte';
import TelemetryTable from '../../shared/TelemetryTable.svelte';

describe('BentoContainer', () => {
  it('should render content', () => {
    render(BentoTestWrapper as any);
    expect(screen.getByTestId('bento-content')).toBeInTheDocument();
  });
});

describe('TelemetryTable', () => {
  it('should render table rows', () => {
    render(TelemetryTable as any, { props: { data: [{ id: '1', description: 'desc', value: 100, timestamp: '12:00' }] } });
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('desc')).toBeInTheDocument();
  });
});
