'use client';

import { CopyIcon, PencilIcon, SettingsIcon, TrashIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { KebabMenu } from '@/components/ui/kebab-menu';
import { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { GalleryExample, GallerySection } from './gallery-section';

const EditProjectSheet = () => {
  const [isOpen, setIsOpen] = useState(false);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsOpen(false);
    toast.success('Project saved');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild><Button variant="outline"><PencilIcon />Edit in side panel</Button></SheetTrigger>
      <SheetContent>
        <form onSubmit={save} className="flex h-full flex-col" aria-label="Edit project">
          <SheetHeader>
            <SheetTitle>Edit project</SheetTitle>
            <SheetDescription>Changes are visible to everyone in the workspace.</SheetDescription>
          </SheetHeader>
          <SheetBody className="grid content-start gap-5">
            <FormField label="Name"><Input defaultValue="Acme rollout" /></FormField>
            <FormField label="Description" optional><Textarea defaultValue="Phase two of the rollout." /></FormField>
          </SheetBody>
          <SheetFooter>
            <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
            <Button type="submit">Save changes</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

/** Dialog, confirmation, side panel, menus, tooltip and toasts. */
export const GalleryOverlays = () => {
  const [showArchived, setShowArchived] = useState(false);

  return (
    <GallerySection id="overlays" title="Overlays and feedback" source="@/components/ui/{dialog,alert-dialog,sheet,dropdown-menu,kebab-menu,tooltip,sonner}">
      <GalleryExample title="Dialog (short focused task)">
        <Dialog>
          <DialogTrigger asChild><Button variant="outline">Rename</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>The new name is shown everywhere immediately.</DialogDescription>
            </DialogHeader>
            <FormField label="Project name"><Input defaultValue="Acme rollout" /></FormField>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <DialogClose asChild><Button onClick={() => toast.success('Project renamed')}>Rename</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </GalleryExample>

      <GalleryExample title="Alert dialog (confirm a destructive action)">
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive"><TrashIcon />Delete project</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “Acme rollout”?</AlertDialogTitle>
              <AlertDialogDescription>This permanently deletes the project and its 24 tasks. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => toast.success('Project deleted')}>Delete project</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </GalleryExample>

      <GalleryExample title="Sheet (side panel for create and edit)">
        <EditProjectSheet />
      </GalleryExample>

      <GalleryExample title="Dropdown menu and kebab menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline"><SettingsIcon />Options</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived}>Show archived</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><CopyIcon />Duplicate<DropdownMenuShortcut>⌘D</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem disabled>Move (disabled)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive"><TrashIcon />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <KebabMenu label="Actions for Acme rollout">
          <DropdownMenuItem>Open</DropdownMenuItem>
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </KebabMenu>
      </GalleryExample>

      <GalleryExample title="Tooltip (hints only)">
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Copy link"><CopyIcon /></Button></TooltipTrigger>
          <TooltipContent>Copy link</TooltipContent>
        </Tooltip>
      </GalleryExample>

      <GalleryExample title="Toast (result of an action)">
        <Button variant="outline" onClick={() => toast.success('Invoice sent', { description: 'Acme Corp will get it by email.' })}>Success</Button>
        <Button variant="outline" onClick={() => toast.error('Could not send the invoice', { description: 'The server took too long to respond.' })}>Error</Button>
        <Button variant="outline" onClick={() => toast.warning('Your trial ends in 3 days')}>Warning</Button>
        <Button variant="outline" onClick={() => toast.info('Import started')}>Info</Button>
        <Button variant="outline" onClick={() => toast('Link copied')}>Neutral</Button>
      </GalleryExample>
    </GallerySection>
  );
};
