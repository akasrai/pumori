'use client';

import { Slot } from 'radix-ui';
import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Label } from './label';

/** Wiring for the control; spread it onto the focusable element. */
export interface FormControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface FormFieldProps {
  /** Visible label. Every control has one; never rely on a placeholder. */
  label: ReactNode;
  /**
   * The control. A single element (`<Input />`, `<Textarea />`) receives id, aria-describedby and
   * aria-invalid automatically; for composites pass a function and spread the props onto the focusable
   * part: `{(control) => <Select><SelectTrigger {...control}>...</SelectTrigger>...</Select>}`.
   */
  children: ReactNode | ((control: FormControlProps) => ReactNode);
  /** Id of the control (and the label's htmlFor). Generated when omitted. */
  id?: string;
  /** Help text under the control. */
  description?: ReactNode;
  /** Validation message; marks the control aria-invalid and replaces the description visually. */
  error?: ReactNode;
  /** Adds "(optional)" to the label. Fields are required unless marked optional. */
  optional?: boolean;
  className?: string;
}

/** Label + control + description/error, wired for screen readers. Stack fields with `gap-5` in a form. */
export const FormField = ({ label, children, id, description, error, optional = false, className }: FormFieldProps) => {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const hasError = error !== undefined && error !== null && error !== false && error !== '';
  const describedBy = [description ? descriptionId : null, hasError ? errorId : null].filter(Boolean).join(' ') || undefined;
  const control: FormControlProps = { id: controlId, 'aria-describedby': describedBy, 'aria-invalid': hasError || undefined };

  return (
    <div data-slot="form-field" className={cn('grid content-start gap-2', className)}>
      <Label htmlFor={controlId}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      {typeof children === 'function' ? children(control) : <Slot.Root {...control}>{children}</Slot.Root>}
      {description && !hasError ? (
        <p id={descriptionId} className="text-caption text-muted-foreground">{description}</p>
      ) : null}
      {description && hasError ? <span id={descriptionId} className="sr-only">{description}</span> : null}
      {hasError ? (
        <p id={errorId} className="text-caption font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
};
