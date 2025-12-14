/**
 * Tests for PoolManager component (architecture selection)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PoolManager } from './PoolManager';

const { createPoolMock } = vi.hoisted(() => ({
  createPoolMock: vi.fn().mockResolvedValue({
    pool: { id: 'pool-1' },
  }),
}));

vi.mock('../api', () => ({
  poolsApi: {
    list: vi.fn().mockResolvedValue({ pools: [] }),
    create: (...args: unknown[]) => createPoolMock(...args),
    delete: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
  credentialsApi: {
    list: vi.fn().mockResolvedValue({
      credentials: [
        {
          id: 'cred-1',
          name: 'Test PAT',
          type: 'pat',
          scope: 'repo',
          target: 'owner/repo',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          validated_at: '2024-01-01T00:00:00Z',
        },
      ],
    }),
  },
  runnersApi: {
    getSystemInfo: vi.fn().mockResolvedValue({
      platform: 'darwin',
      architecture: 'arm64',
      dockerAvailable: true,
      defaultIsolation: 'native',
      supportedIsolationTypes: [
        { type: 'native', available: true, description: 'Native runner' },
        { type: 'docker', available: true, description: 'Docker container' },
      ],
    }),
  },
}));

describe('PoolManager (architecture selection)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('shows architecture selector only for Docker isolation', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PoolManager />
      </QueryClientProvider>
    );

    const openButton = await screen.findByRole('button', { name: /Create Pool/i });
    await waitFor(() => expect(openButton).not.toBeDisabled());
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Runner Pool' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Architecture')).not.toBeInTheDocument();

    const isolationLabel = screen.getByText('Isolation Type');
    const isolationSelect = isolationLabel.parentElement?.querySelector('select') as HTMLSelectElement;

    fireEvent.change(isolationSelect, { target: { value: 'docker' } });
    expect(screen.getByText('Architecture')).toBeInTheDocument();

    fireEvent.change(isolationSelect, { target: { value: 'native' } });
    expect(screen.queryByText('Architecture')).not.toBeInTheDocument();
  });

  it('shows emulation warning when x64 is selected on an ARM64 host', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PoolManager />
      </QueryClientProvider>
    );

    const openButton = await screen.findByRole('button', { name: /Create Pool/i });
    await waitFor(() => expect(openButton).not.toBeDisabled());
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Runner Pool' })).toBeInTheDocument();
    });

    const isolationLabel = screen.getByText('Isolation Type');
    const isolationSelect = isolationLabel.parentElement?.querySelector('select') as HTMLSelectElement;
    fireEvent.change(isolationSelect, { target: { value: 'docker' } });

    const archLabel = screen.getByText('Architecture');
    const archSelect = archLabel.parentElement?.querySelector('select') as HTMLSelectElement;

    expect(archSelect.value).toBe('arm64');
    fireEvent.change(archSelect, { target: { value: 'x64' } });

    expect(screen.getByText(/x64 will run under emulation on ARM64/i)).toBeInTheDocument();
  });

  it('passes architecture only when Docker isolation is selected', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PoolManager />
      </QueryClientProvider>
    );

    const openButton = await screen.findByRole('button', { name: /Create Pool/i });
    await waitFor(() => expect(openButton).not.toBeDisabled());

    // Native: architecture should not be provided
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Runner Pool' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('my-pool'), { target: { value: 'native-pool' } });

    const nativeModal = screen.getByRole('heading', { name: 'Create Runner Pool' }).closest('.card');
    expect(nativeModal).toBeTruthy();
    fireEvent.click(within(nativeModal as HTMLElement).getByRole('button', { name: 'Create Pool' }));

    await waitFor(() => {
      expect(createPoolMock).toHaveBeenCalled();
    });

    expect(createPoolMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isolationType: 'native',
        architecture: undefined,
      }),
      expect.anything()
    );

    // Close modal
    fireEvent.click(within(nativeModal as HTMLElement).getByRole('button', { name: 'Cancel' }));

    // Docker: architecture should be provided
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Runner Pool' })).toBeInTheDocument();
    });

    const isolationLabel = screen.getByText('Isolation Type');
    const isolationSelect = isolationLabel.parentElement?.querySelector('select') as HTMLSelectElement;
    fireEvent.change(isolationSelect, { target: { value: 'docker' } });

    const archLabel = screen.getByText('Architecture');
    const archSelect = archLabel.parentElement?.querySelector('select') as HTMLSelectElement;
    fireEvent.change(archSelect, { target: { value: 'x64' } });

    fireEvent.change(screen.getByPlaceholderText('my-pool'), { target: { value: 'docker-pool' } });

    const dockerModal = screen.getByRole('heading', { name: 'Create Runner Pool' }).closest('.card');
    expect(dockerModal).toBeTruthy();
    fireEvent.click(within(dockerModal as HTMLElement).getByRole('button', { name: 'Create Pool' }));

    await waitFor(() => {
      expect(createPoolMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isolationType: 'docker',
          architecture: 'x64',
        }),
        expect.anything()
      );
    });
  });
});
