import { render, screen } from '@testing-library/react';
import AccessControl from '@/components/Guard/AccessControl';
import { useRole } from '@/context/RoleContext';
import type { UserRole } from '@/services/roleClient';

jest.mock('@/context/RoleContext', () => ({
  useRole: jest.fn(),
}));

const mockUseRole = useRole as jest.MockedFunction<typeof useRole>;

type MockRoleState = {
  role: UserRole;
  isAdmin: boolean;
  isGuardian: boolean;
  canVote: boolean;
  canManageTasks: boolean;
  isLoading: boolean;
  error: string | null;
  refreshRole: jest.Mock;
};

const baseRole: MockRoleState = {
  role: 'guardian',
  isAdmin: false,
  isGuardian: true,
  canVote: true,
  canManageTasks: false,
  isLoading: false,
  error: null,
  refreshRole: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AccessControl', () => {
  it('renders children when the current role is allowed', () => {
    mockUseRole.mockReturnValue({
      ...baseRole,
      role: 'admin',
      isAdmin: true,
      isGuardian: false,
      canManageTasks: true,
    });

    render(
      <AccessControl roles={['admin']} fallback={<p>fallback</p>}>
        <p>admin content</p>
      </AccessControl>
    );

    expect(screen.getByText('admin content')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });

  it('renders fallback for a guardian when only admin is allowed', () => {
    mockUseRole.mockReturnValue(baseRole);

    render(
      <AccessControl roles={['admin']} fallback={<p>admin only</p>}>
        <p>admin content</p>
      </AccessControl>
    );

    expect(screen.getByText('admin only')).toBeInTheDocument();
    expect(screen.queryByText('admin content')).not.toBeInTheDocument();
  });

  it('renders loading fallback while role data is loading', () => {
    mockUseRole.mockReturnValue({
      ...baseRole,
      isLoading: true,
    });

    render(
      <AccessControl
        roles={['guardian']}
        fallback={<p>blocked</p>}
        loadingFallback={<p>loading role</p>}
      >
        <p>guardian content</p>
      </AccessControl>
    );

    expect(screen.getByText('loading role')).toBeInTheDocument();
    expect(screen.queryByText('guardian content')).not.toBeInTheDocument();
    expect(screen.queryByText('blocked')).not.toBeInTheDocument();
  });
});
