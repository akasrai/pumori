import type { Metadata } from 'next';

import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Sign up' };

const SignupPage = () => {
  return <AuthForm mode="signup" />;
};

export default SignupPage;
