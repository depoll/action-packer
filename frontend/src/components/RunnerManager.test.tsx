/**
 * Tests for RunnerManager component (architecture selection)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RunnerManager } from './RunnerManager';

const { createRunnerMock } = vi.hoisted(() => ({
  createRunnerMock: vi.fn().mockResolvedValue({
    runner: { id: 'runner-1' },
  }),
}));

vi.mock('../api', () => ({
  runnersApi: {
    list: vi.fn().mockResolvedValue({ runners: [] }),
    create: (...args: unknown[]) => createRunnerMock(...args),
    start: vi.fn(),
    stop: vi.fn(),
    sync: vi.fn(),
    delete: vi.fn(),
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
}));

describe('RunnerManager (architecture selection)', () => {
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
        <RunnerManager />
      </QueryClientProvider>
    );

    const openButton = await screen.findByRole('button', { name: /Create Runner/i });
    await waitFor(() => expect(openButton).not.toBeDisabled());
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Runner' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Architecture')).not.toBeInTheDocument();

    const isolationLabel = screen.getByText('Isolation Type');
    const isolationSelect = isolationLabel.parentElement?.querySelector('select');
    expect(isolationSelect).toBeTruthy();

    fireEvent.change(isolationSelect as HTMLSelectElement, { target: { value: 'docker' } });
    expect(screen.getByText('Architecture')).toBeInTheDocument();

    fireEvent.change(isolationSelect as HTMLSelectElement, { target: { value: 'native' } });
    expect(screen.queryByText('Architecture')).not.toBeInTheDocument();
  });

  it('shows emulation warning when x64 is selected on an ARM64 host', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RunnerManager />
      </QueryClientProvider>
    );

    const openButton = await screen.findByRole('button', { name: /Create Runner/i });
    await waitFor(() => expect(openButton).not.toBeDisabled());
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Runner' })).toBeInTheDocument();
    });

    const isolationLabel = screen.getByText('Isolation Type');
    const isolationSelect = isolationLabel.parentElement?.querySelector('select') as HTMLSelectElement;
    fireEvent.change(isolationSelect, { target: { value: 'docker' } });

    const archLabel = screen.getByText('Architecture');
    const archSelect = archLabel.parentElement?.querySelector('select') as HTMLSelectElement;

    expect(archSelect.value).toBe('arm64');
    expect(screen.queryByText(/run under emulation/i)).not.toBeInTheDocument();

    fireEvent.change(archSelect, { target: { value: 'x64' } });
    expect(screen.getByText(/x64 will run under emulation on ARM64/i)).toBeInTheDocument();
  });

  it('passes architecture only when Docker isolation is selected', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RunnerManager />
      </QueryClientProvider>
    );

    const openButton = await screen.findByRole('button', { name: /Create Runner/i });
    await waitFor(() => expect(openButton).not.toBeDisabled());

    // Native: architecture should not be provided
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Runner' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('my-runner'), { target: { value: 'native-runner' } });

    const nativeModal = screen.getByRole('heading', { name: 'Create Runner' }).closest('.card');
    expect(nativeModal).toBeTruthy();
    fireEvent.click(within(nativeModal as HTMLElement).getByRole('button', { name: 'Create Runner' }));

    await waitFor(() => {
      expect(createRunnerMock).toHaveBeenCalled();
    });

    expect(createRunnerMock).toHaveBeenCalledWith(
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
      expect(screen.getByRole('heading', { name: 'Create Runner' })).toBeInTheDocument();
    });

    const isolationLabel = screen.getByText('Isolation Type');
    const isolationSelect = isolationLabel.parentElement?.querySelector('select') as HTMLSelectElement;
    fireEvent.change(isolationSelect, { target: { value: 'docker' } });

    const archLabel = screen.getByText('Architecture');
    const archSelect = archLabel.parentElement?.querySelector('select') as HTMLSelectElement;
    fireEvent.change(archSelect, { target: { value: 'x64' } });

    fireEvent.change(screen.getByPlaceholderText('my-runner'), { target: { value: 'docker-runner' } });

    const dockerModal = screen.getByRole('heading', { name: 'Create Runner' }).closest('.card');
    expect(dockerModal).toBeTruthy();
    fireEvent.click(within(dockerModal as HTMLElement).getByRole('button', { name: 'Create Runner' }));

    await waitFor(() => {
      expect(createRunnerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isolationType: 'docker',
          architecture: 'x64',
        }),
        expect.anything()
      );
    });
  });
});
