'use client';

import { CircleAlertIcon, CircleCheckIcon, DownloadIcon, InfoIcon, PlusIcon, TrashIcon, TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { GalleryExample, GallerySection } from './gallery-section';

/** Buttons, badges, form controls and alerts. */
export const GalleryControls = () => (
  <>
    <GallerySection id="buttons" title="Button" source="@/components/ui/button">
      <GalleryExample title="Variants (one solid primary per view; outline for the rest)">
        <Button>Save changes</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Delete</Button>
      </GalleryExample>
      <GalleryExample title="Sizes and icons">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button><PlusIcon />New project</Button>
        <Button variant="outline"><DownloadIcon />Export</Button>
        <Button variant="outline" size="icon" aria-label="Delete"><TrashIcon /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Add"><PlusIcon /></Button>
      </GalleryExample>
      <GalleryExample title="States">
        <Button isLoading>Saving</Button>
        <Button disabled>Disabled</Button>
        <Button variant="outline" disabled>Disabled</Button>
        <Button asChild variant="outline"><Link href="#buttons">As a link</Link></Button>
      </GalleryExample>
    </GallerySection>

    <GallerySection id="badges" title="Badge" source="@/components/ui/badge">
      <GalleryExample title="Status: dot + word (never colour alone)">
        <Badge dot variant="success">Paid</Badge>
        <Badge dot variant="warning">Pending</Badge>
        <Badge dot variant="destructive">Overdue</Badge>
        <Badge dot variant="info">In review</Badge>
      </GalleryExample>
      <GalleryExample title="Neutral labels">
        <Badge>Draft</Badge>
        <Badge variant="outline">Preview</Badge>
        <Badge variant="primary">New</Badge>
      </GalleryExample>
    </GallerySection>

    <GallerySection id="forms" title="Form controls" source="@/components/ui/{form-field,input,textarea,select,checkbox,switch,radio-group,label}">
      <div className="grid gap-6 md:grid-cols-2">
        <FormField label="Project name" description="Shown to everyone in the workspace.">
          <Input placeholder="Acme rollout" />
        </FormField>
        <FormField label="Email" error="Enter a valid email address">
          <Input type="email" defaultValue="not-an-email" />
        </FormField>
        <FormField label="Website" optional>
          <Input type="url" placeholder="https://example.com" />
        </FormField>
        <FormField label="Disabled">
          <Input disabled defaultValue="Read only value" />
        </FormField>
        <FormField label="Status">
          {(control) => (
            <Select defaultValue="active">
              <SelectTrigger {...control}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Owner" error="Choose an owner">
          {(control) => (
            <Select>
              <SelectTrigger {...control}><SelectValue placeholder="Select a person" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ana">Ana Lima</SelectItem>
                <SelectItem value="sam">Sam Park</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Notes" optional className="md:col-span-2" description="Markdown is not supported.">
          <Textarea placeholder="Anything the team should know" />
        </FormField>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm font-semibold">Checkbox</legend>
          <div className="flex items-center gap-3"><Checkbox id="cb-1" defaultChecked /><Label htmlFor="cb-1">Email me updates</Label></div>
          <div className="flex items-center gap-3"><Checkbox id="cb-2" /><Label htmlFor="cb-2">Weekly summary</Label></div>
          <div className="flex items-center gap-3"><Checkbox id="cb-3" disabled /><Label htmlFor="cb-3">Disabled</Label></div>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm font-semibold">Switch</legend>
          <div className="flex items-center gap-3"><Switch id="sw-1" defaultChecked /><Label htmlFor="sw-1">Notifications</Label></div>
          <div className="flex items-center gap-3"><Switch id="sw-2" /><Label htmlFor="sw-2">Two-factor sign-in</Label></div>
          <div className="flex items-center gap-3"><Switch id="sw-3" disabled /><Label htmlFor="sw-3">Disabled</Label></div>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm font-semibold">Radio group</legend>
          <RadioGroup defaultValue="monthly" aria-label="Billing period">
            <div className="flex items-center gap-3"><RadioGroupItem value="monthly" id="rg-1" /><Label htmlFor="rg-1">Monthly</Label></div>
            <div className="flex items-center gap-3"><RadioGroupItem value="yearly" id="rg-2" /><Label htmlFor="rg-2">Yearly</Label></div>
            <div className="flex items-center gap-3"><RadioGroupItem value="never" id="rg-3" disabled /><Label htmlFor="rg-3">Disabled</Label></div>
          </RadioGroup>
        </fieldset>
      </div>
    </GallerySection>

    <GallerySection id="alerts" title="Alert" source="@/components/ui/alert">
      <div className="grid gap-3">
        <Alert role="status"><InfoIcon /><AlertTitle>Default</AlertTitle><AlertDescription>Neutral information about this page.</AlertDescription></Alert>
        <Alert role="status" variant="info"><InfoIcon /><AlertTitle>Heads up</AlertTitle><AlertDescription>Imports run every night at 02:00 UTC.</AlertDescription></Alert>
        <Alert role="status" variant="success"><CircleCheckIcon /><AlertTitle>Connected</AlertTitle><AlertDescription>Your bank account is linked.</AlertDescription></Alert>
        <Alert role="status" variant="warning"><TriangleAlertIcon /><AlertTitle>Trial ends in 3 days</AlertTitle><AlertDescription>Add a payment method to keep your data.</AlertDescription></Alert>
        <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>Could not save</AlertTitle><AlertDescription>The server took too long to respond. Try again.</AlertDescription></Alert>
      </div>
    </GallerySection>
  </>
);
