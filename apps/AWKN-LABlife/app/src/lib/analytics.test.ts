import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/api/client', () => ({ apiClient: { post } }));
vi.mock('@/lib/tokenStorage', () => ({ getAuthToken: () => null }));

describe('frontend error tracking', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK', 'false');
    post.mockClear();
    sessionStorage.clear();
  });

  it('reports readiness, script errors and broken resources with bounded payloads', async () => {
    const { initFrontendErrorTracking } = await import('./analytics');
    const cleanup = initFrontendErrorTracking();
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'boom',
      filename: '/life/assets/app.js',
      lineno: 10,
    }));

    const image = document.createElement('img');
    image.src = '/life/assets/missing.png';
    document.body.appendChild(image);
    image.dispatchEvent(new Event('error'));

    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(3));
    const activityTypes = post.mock.calls.map((call) => call[1].activityType);
    expect(activityTypes).toEqual(expect.arrayContaining([
      'frontend_error_tracking_ready',
      'frontend_error',
      'resource_error',
    ]));

    cleanup();
    image.remove();
  });
});
