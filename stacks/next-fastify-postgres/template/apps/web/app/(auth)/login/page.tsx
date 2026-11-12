import type { Metadata } from 'next';

import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Log in' };

const LoginPage = () => {
  return <AuthForm mode="login" />;
};

export default LoginPage;
