'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';

import { apiRequest } from '@/lib/api';
import { ROUTE } from '@/lib/app-constants';

const logoutResponseSchema = z.undefined();

/** Ends the session and goes to the login page. */
export const useLogout = () => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    setIsLoggingOut(true);
    // Leave either way: if the call failed, the next protected page load re-checks the session.
    await apiRequest('/api/auth/logout', { method: 'POST' }, logoutResponseSchema);
    router.replace(ROUTE.LOGIN);
    router.refresh();
  };

  return { logout, isLoggingOut };
};
