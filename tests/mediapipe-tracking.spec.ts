import { test, expect } from '@playwright/test';
import { MediaPipeTelemetryGrabber } from '../src/lib/services/tracking/mediapipe';

test.describe('Player OS - MediaPipe 1000Hz Telemetry', () => {
  test('processes frame touches within 15ms latency target', async () => {
    const grabber = new MediaPipeTelemetryGrabber();
    const mockCanvas = { width: 1920, height: 1080 } as HTMLCanvasElement;

    const result = grabber.processCanvasFrame(mockCanvas, 1000);

    expect(result.touch).not.toBeNull();
    expect(result.touch?.x).toBe(960);
    expect(result.touch?.y).toBe(540);
    expect(result.latencyMs).toBeLessThan(15);
  });
});
