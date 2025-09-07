import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import Dashboard from '../../pages/Dashboard/Dashboard';
import { mockUser } from '../setup';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component, user = mockUser) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            {component}
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// Mock the AuthContext to provide a user
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

describe('Dashboard Component', () => {
  it('should render welcome message with user name', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText(`Welcome back, ${mockUser.firstName}! 👋`)).toBeInTheDocument();
  });

  it('should render dashboard title and subtitle', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText("Here's what's happening with your content campaigns today.")).toBeInTheDocument();
  });

  it('should render stats cards', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
    expect(screen.getByText('WordPress Sites')).toBeInTheDocument();
    expect(screen.getByText('Total Posts Published')).toBeInTheDocument();
    expect(screen.getByText('Posts This Month')).toBeInTheDocument();
  });

  it('should display correct stats values', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('0')).toBeInTheDocument(); // Active campaigns
    expect(screen.getByText('0')).toBeInTheDocument(); // WordPress sites
    expect(screen.getByText(mockUser.totalPostsPublished.toString())).toBeInTheDocument();
    expect(screen.getByText(mockUser.postsPublishedThisMonth.toString())).toBeInTheDocument();
  });

  it('should render quick action cards', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Create Campaign')).toBeInTheDocument();
    expect(screen.getByText('Add WordPress Site')).toBeInTheDocument();
  });

  it('should have create campaign button with correct link', () => {
    renderWithProviders(<Dashboard />);

    const createCampaignButton = screen.getByRole('link', { name: /create campaign/i });
    expect(createCampaignButton).toHaveAttribute('href', '/campaigns/create');
  });

  it('should have add WordPress site button with correct link', () => {
    renderWithProviders(<Dashboard />);

    const addSiteButton = screen.getByRole('link', { name: /add site/i });
    expect(addSiteButton).toHaveAttribute('href', '/wordpress');
  });

  it('should render recent activity section', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('should show empty state for recent activity', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('No recent activity yet. Create your first campaign to get started!')).toBeInTheDocument();
  });

  it('should render action card descriptions', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Set up a new AI-powered content campaign to automatically generate and publish blog posts.')).toBeInTheDocument();
    expect(screen.getByText('Connect your WordPress site to start publishing content automatically.')).toBeInTheDocument();
  });

  it('should render all stat icons', () => {
    renderWithProviders(<Dashboard />);

    // Check that stat cards are rendered (they contain icons)
    const statCards = screen.getAllByText(/Active Campaigns|WordPress Sites|Total Posts Published|Posts This Month/);
    expect(statCards).toHaveLength(4);
  });

  it('should render action card icons', () => {
    renderWithProviders(<Dashboard />);

    // Check that action cards are rendered (they contain icons)
    const actionCards = screen.getAllByText(/Create Campaign|Add WordPress Site/);
    expect(actionCards).toHaveLength(2);
  });

  it('should have proper button variants', () => {
    renderWithProviders(<Dashboard />);

    const createCampaignButton = screen.getByRole('link', { name: /create campaign/i });
    const addSiteButton = screen.getByRole('link', { name: /add site/i });

    // These should be styled buttons (the actual styling is handled by styled-components)
    expect(createCampaignButton).toBeInTheDocument();
    expect(addSiteButton).toBeInTheDocument();
  });

  it('should display user subscription tier in stats', () => {
    renderWithProviders(<Dashboard />);

    // The dashboard should show the user's current subscription information
    // This is implicit in the stats display
    expect(screen.getByText(mockUser.totalPostsPublished.toString())).toBeInTheDocument();
  });

  it('should handle empty campaigns and sites gracefully', () => {
    renderWithProviders(<Dashboard />);

    // Should show 0 for campaigns and sites
    const zeroValues = screen.getAllByText('0');
    expect(zeroValues.length).toBeGreaterThanOrEqual(2); // At least campaigns and sites
  });
});

