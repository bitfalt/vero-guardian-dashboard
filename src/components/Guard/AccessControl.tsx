'use client';

import type { ReactElement, ReactNode } from 'react';
import { useRole } from '@/context/RoleContext';
import type { UserRole } from '@/services/roleClient';

export interface AccessControlProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function AccessControl({
  roles,
  children,
  fallback = null,
  loadingFallback = null,
}: AccessControlProps): ReactElement {
  const { role, isLoading } = useRole();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default AccessControl;
