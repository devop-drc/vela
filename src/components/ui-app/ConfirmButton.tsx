/**
 * Button that requires an explicit confirmation before firing `onConfirm`.
 * Wraps shadcn Button + AlertDialog so destructive actions (delete, cancel,
 * bulk ops) get a consistent confirm step app-wide.
 */
import * as React from "react";
import { useTranslation } from "react-i18next";
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
  confirmTitle,
  confirmDescription,
  confirmLabel,
  cancelLabel,
  destructive,
  children,
  variant,
  ...buttonProps
}: ConfirmButtonProps) => {
  const { t } = useTranslation();
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
          <AlertDialogTitle>{confirmTitle ?? t('app_ui.are_you_sure')}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDescription ?? t('app_ui.action_cannot_be_undone')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel ?? t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              isDestructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {confirmLabel ?? t('common.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmButton;
