/**
 * Button that requires an explicit confirmation before firing `onConfirm`.
 * Wraps shadcn Button + AlertDialog so destructive actions (delete, cancel,
 * bulk ops) get a consistent confirm step app-wide.
 */
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  onConfirm: () => void;
  confirmTitle?: string;
  confirmDescription?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm action as destructive (default true when variant is destructive). */
  destructive?: boolean;
}

export const ConfirmButton = ({
  onConfirm,
  confirmTitle = "Are you sure?",
  confirmDescription = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  children,
  variant,
  ...buttonProps
}: ConfirmButtonProps) => {
  const isDestructive = destructive ?? variant === "destructive";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} {...buttonProps}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              isDestructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmButton;
