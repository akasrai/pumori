'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { GalleryExample, GallerySection } from './gallery-section';

const THEMES = ['system', 'light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

const isTheme = (value: string): value is Theme => THEMES.some((theme) => theme === value);

const SWATCHES = [
  { name: 'background', className: 'bg-background' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'card', className: 'bg-card' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'primary', className: 'bg-primary' },
  { name: 'brand-secondary', className: 'bg-brand-secondary' },
  { name: 'border', className: 'bg-border' },
  { name: 'input', className: 'bg-input' },
  { name: 'ring', className: 'bg-ring' },
  { name: 'selected', className: 'bg-selected' },
  { name: 'link', className: 'bg-link' },
  { name: 'sidebar', className: 'bg-sidebar' },
  { name: 'success', className: 'bg-success' },
  { name: 'success-subtle', className: 'bg-success-subtle' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'warning-subtle', className: 'bg-warning-subtle' },
  { name: 'destructive', className: 'bg-destructive' },
  { name: 'destructive-subtle', className: 'bg-destructive-subtle' },
  { name: 'info', className: 'bg-info' },
  { name: 'info-subtle', className: 'bg-info-subtle' },
] as const;

const TYPE_SCALE = [
  { name: 'Page title · text-2xl semibold tight (24 px)', className: 'text-2xl font-semibold tracking-tight' },
  { name: 'Card / dialog title · text-title semibold (15 px)', className: 'text-title font-semibold tracking-tight' },
  { name: 'Section title · text-sm semibold (14 px)', className: 'text-sm font-semibold' },
  { name: 'Body (the base) · text-sm (14 px)', className: 'text-sm' },
  { name: 'Secondary · text-caption muted (13 px)', className: 'text-caption text-muted-foreground' },
  { name: 'Label · text-caption medium (13 px)', className: 'text-caption font-medium' },
  { name: 'Number · text-2xl semibold tabular-nums', className: 'text-2xl font-semibold tracking-tight tabular-nums' },
  { name: 'ID / hash / code · font-mono text-caption', className: 'font-mono text-caption' },
] as const;

const DENSITY = [
  { token: 'h-control-sm', size: '32 px', use: 'size="sm" buttons: toolbars, table rows, card actions' },
  { token: 'h-control', size: '36 px', use: 'default buttons, inputs, selects, table header' },
  { token: 'h-control-lg', size: '40 px', use: 'size="lg": rare, hero or empty-state actions' },
  { token: 'h-row', size: '40 px', use: 'table rows, tabs' },
  { token: 'max-md:h-touch', size: '44 px', use: 'every control, nav item and menu item below md (touch)' },
] as const;

/** Theme preview, colour tokens, the type scale and the density scale. */
export const GalleryFoundations = () => {
  const [theme, setTheme] = useState<Theme>('system');

  const changeTheme = (value: string) => {
    if (!isTheme(value)) return;
    setTheme(value);

    if (value === 'system') {
      delete document.documentElement.dataset.theme;

      return;
    }
    document.documentElement.dataset.theme = value;
  };

  return (
    <>
      <GallerySection id="theme" title="Theme" source="app/globals.css">
        <GalleryExample title="Preview (not saved; the app follows the OS setting)">
          <RadioGroup value={theme} onValueChange={changeTheme} aria-label="Theme" className="flex flex-wrap gap-5">
            {THEMES.map((value) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`theme-${value}`} />
                <Label htmlFor={`theme-${value}`} className="capitalize">{value}</Label>
              </div>
            ))}
          </RadioGroup>
        </GalleryExample>
      </GallerySection>

      <GallerySection id="colors" title="Colour tokens" source="bg-* / text-* / border-* utilities">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map((swatch) => (
            <li key={swatch.name} className="grid gap-2">
              <div className={`h-10 rounded-md border ${swatch.className}`} />
              <code className="font-mono text-xs text-muted-foreground">{swatch.name}</code>
            </li>
          ))}
        </ul>
      </GallerySection>

      <GallerySection id="density" title="Density" source="app/globals.css · --spacing-control*, --spacing-row, --spacing-touch">
        <GalleryExample title="Compact controls (resize below 768 px: they grow to 44 px tap targets)">
          <Button size="sm">Small 32</Button>
          <Button>Default 36</Button>
          <Button size="lg">Large 40</Button>
          <Input aria-label="Input example" placeholder="Input 36" className="w-40" />
        </GalleryExample>
        <dl className="grid gap-2 text-sm">
          {DENSITY.map((item) => (
            <div key={item.token} className="grid gap-1 sm:grid-cols-[10rem_4rem_1fr] sm:gap-4">
              <dt><code className="font-mono text-xs">{item.token}</code></dt>
              <dd className="tabular-nums">{item.size}</dd>
              <dd className="text-muted-foreground">{item.use}</dd>
            </div>
          ))}
        </dl>
        <p className="max-w-prose text-sm text-muted-foreground">
          Base text 14 px; cards pad 20 px (16 px on phones); 6 px radius; gaps on the 4 px grid (gap-1/2/3/4/6/8).
        </p>
      </GallerySection>

      <GallerySection id="type" title="Typography" source="Brand font (Geist by default) · next/font/local; system mono for IDs and code">
        <dl className="grid gap-4">
          {TYPE_SCALE.map((item) => (
            <div key={item.name} className="grid gap-1 sm:grid-cols-[16rem_1fr] sm:items-baseline">
              <dt className="text-caption text-muted-foreground">{item.name}</dt>
              <dd className={item.className}>The quick brown fox · 1,234.56</dd>
            </div>
          ))}
        </dl>
      </GallerySection>
    </>
  );
};
