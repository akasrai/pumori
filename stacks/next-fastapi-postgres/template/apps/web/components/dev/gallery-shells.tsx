'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTE, SHELL, type ShellKind } from '@/lib/app-constants';
import { cn } from '@/lib/utils';

import { GallerySection } from './gallery-section';

interface ShellOption {
  kind: ShellKind;
  label: string;
  summary: string;
}

const SHELLS: ShellOption[] = [
  {
    kind: SHELL.SIDEBAR,
    label: 'Sidebar',
    summary: 'Many sections, nested groups, admin-heavy back offices. 220 px white sidebar behind one hairline; a menu sheet below md.',
  },
  {
    kind: SHELL.TOPBAR,
    label: 'Top bar',
    summary: '≤5 main sections, project- or entity-centric products. Logo, context switcher, account menu; underline tabs that scroll sideways below md.',
  },
];

interface PreviewFrameProps {
  kind: ShellKind;
  label: string;
  /** `desktop`: a browser window as wide as the column; `phone`: 390 px. */
  device: 'desktop' | 'phone';
}

/** One shell rendered for real (same-origin iframe of /dev/ui/shells/<kind>) inside a device frame. */
const PreviewFrame = ({ kind, label, device }: PreviewFrameProps) => {
  const src = `${ROUTE.DEV_UI_SHELLS}/${kind}`;
  const isPhone = device === 'phone';

  return (
    <figure className={cn('grid gap-2', isPhone ? 'hidden w-[408px] max-w-full justify-self-center lg:grid' : '')}>
      <div className={cn('overflow-hidden border', isPhone ? 'rounded-[2rem] border-border-strong p-2' : 'rounded-lg')}>
        {isPhone ? null : (
          <div aria-hidden="true" className="flex h-8 items-center border-b px-3">
            <span className="truncate font-mono text-xs text-muted-foreground">app.example.com/overview</span>
          </div>
        )}
        <iframe
          src={src}
          data-shell-preview={kind}
          title={`${label} shell preview (${device})`}
          className={cn('block w-full bg-background', isPhone ? 'h-[720px] rounded-[1.5rem]' : 'h-[560px]')}
        />
      </div>
      <figcaption className="text-caption text-muted-foreground">{isPhone ? 'Phone, 390 px' : 'Desktop'}</figcaption>
    </figure>
  );
};

/** Both app shells, switchable, each in a desktop frame (and a phone frame from lg). */
export const GalleryShells = () => (
  <GallerySection id="shells" title="App shells" source="@/components/shell/* · APP_SHELL in lib/app-constants.ts">
    <p className="max-w-prose text-sm text-muted-foreground">
      One product uses one shell: set <code className="font-mono text-xs">APP_SHELL</code> to <code className="font-mono text-xs">&apos;sidebar&apos;</code> or{' '}
      <code className="font-mono text-xs">&apos;topbar&apos;</code>. Both read <code className="font-mono text-xs">SHELL_NAV</code>. The frames below are live pages.
    </p>
    <Tabs defaultValue={SHELL.SIDEBAR}>
      <TabsList aria-label="Shell">
        {SHELLS.map((shell) => <TabsTrigger key={shell.kind} value={shell.kind}>{shell.label}</TabsTrigger>)}
      </TabsList>
      {SHELLS.map((shell) => (
        <TabsContent key={shell.kind} value={shell.kind} className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{shell.summary}</p>
            <a
              href={`${ROUTE.DEV_UI_SHELLS}/${shell.kind}`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring rounded-sm text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Open full page
            </a>
          </div>
          <PreviewFrame kind={shell.kind} label={shell.label} device="desktop" />
          <PreviewFrame kind={shell.kind} label={shell.label} device="phone" />
        </TabsContent>
      ))}
    </Tabs>
  </GallerySection>
);
