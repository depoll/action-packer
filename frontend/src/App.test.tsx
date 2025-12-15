import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock the onboarding API
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    onboardingApi: {
      getStatus: vi.fn().mockResolvedValue({
        isComplete: true,
        steps: {
          githubApp: { complete: true, appName: 'Test App', appSlug: 'test-app' },
          installation: { complete: true, count: 1 },
        },
      }),
    },
  };
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Action Packer app', async () => {
    render(<App />);
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText(/Action Packer/i)).toBeInTheDocument();
    });
  });
  
  it('renders the sidebar navigation when setup is complete', async () => {
    render(<App />);
    // Wait for loading to finish and navigation to appear
    await waitFor(() => {
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });
    // Verify key navigation labels are present
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Credentials/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Runners/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();
  });
});
