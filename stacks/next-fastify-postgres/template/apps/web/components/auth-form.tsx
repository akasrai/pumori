'use client';

import { CircleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authResponseSchema, loginInputSchema, signupInputSchema } from '@app/shared';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/api';
import { ROUTE } from '@/lib/app-constants';

const copy = {
  signup: {
    title: 'Create your account',
    description: 'Enter your email and choose a password.',
    submit: 'Sign up',
    alt: 'Already have an account?',
    altHref: ROUTE.LOGIN,
    altLabel: 'Log in',
  },
  login: {
    title: 'Log in',
    description: 'Welcome back. Log in to continue.',
    submit: 'Log in',
    alt: 'New here?',
    altHref: ROUTE.SIGNUP,
    altLabel: 'Create an account',
  },
} as const;

export interface AuthFormProps {
  mode: 'signup' | 'login';
}

export const AuthForm = ({ mode }: AuthFormProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const text = copy[mode];

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const schema = mode === 'signup' ? signupInputSchema : loginInputSchema;
    // Same schema the API enforces: instant feedback, single source of truth.
    const parsed = schema.safeParse({ email: form.get('email'), password: form.get('password') });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');

      return;
    }
    setPending(true);
    setError(null);
    const result = await apiRequest(`/api/auth/${mode}`, { method: 'POST', body: parsed.data }, authResponseSchema);
    setPending(false);

    if (!result.ok) {
      setError(result.error.message);

      return;
    }
    router.replace(ROUTE.HOME);
    router.refresh();
  };

  return (
    // No card: a 360 px column on white (AuthShell), title, form, a hairline, then the alternative.
    <div className="grid gap-8">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{text.title}</h1>
        <p className="text-sm text-muted-foreground">{text.description}</p>
      </div>
      <form onSubmit={onSubmit} noValidate aria-label={text.title} className="grid gap-4">
        <FormField id="email" label="Email">
          <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </FormField>
        <FormField
          id="password"
          label="Password"
          description={mode === 'signup' ? 'At least 8 characters.' : undefined}
        >
          <Input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
        </FormField>
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" className="mt-1 w-full" isLoading={pending}>
          {text.submit}
        </Button>
      </form>
      <Separator />
      <p className="text-center text-sm text-muted-foreground">
        {text.alt}{' '}
        <Link href={text.altHref} className="focus-ring rounded-sm font-medium text-foreground underline-offset-4 hover:underline">
          {text.altLabel}
        </Link>
      </p>
    </div>
  );
};
