"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toggleSpaceActive, deleteSpace } from "@/lib/actions/spaces";

interface SpaceActionsProps {
  spaceId: string;
  isActive: boolean;
  bookingCount: number;
}

export function SpaceActions({ spaceId, isActive, bookingCount }: SpaceActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    try {
      setLoading(true);
      await toggleSpaceActive(spaceId, !isActive);
      toast.success(isActive ? "Space deactivated" : "Space activated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    try {
      setLoading(true);
      const result = await deleteSpace(spaceId);
      if ("error" in result) {
        toast.error(result.error as string);
      } else {
        toast.success("Space deleted");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            ···
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/settings/spaces/${spaceId}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggle}>
            {isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete space?</AlertDialogTitle>
            <AlertDialogDescription>
              {bookingCount > 0
                ? `This space has ${bookingCount} booking(s) and cannot be deleted. Deactivate it instead.`
                : "This action cannot be undone. The space will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {bookingCount === 0 && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
