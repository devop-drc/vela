// Storefront CTA button that applies the configured button style + shape
// (config.components.button / buttonShape). Use for primary calls-to-action so
// the "Button style" design option actually takes effect.

import { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';

export const SfButton = forwardRef<HTMLButtonElement, ButtonProps>(({ className, style, variant, ...props }, ref) => {
  const config = useStorefrontConfig();
  const b = config.components.button;
  const shape = config.components.buttonShape;
  const shapeCls = shape === 'pill' ? 'rounded-full' : shape === 'sharp' ? 'rounded-none' : '';

  // An explicit variant from the caller (e.g. a secondary outline button) wins.
  if (variant) return <Button ref={ref} variant={variant} className={cn(shapeCls, className)} style={style} {...props} />;

  if (b === 'outline')
    return <Button ref={ref} variant="outline" className={cn(shapeCls, 'border-primary text-primary hover:bg-primary/10', className)} style={style} {...props} />;
  if (b === 'soft')
    return <Button ref={ref} variant="ghost" className={cn(shapeCls, 'bg-primary/15 text-primary hover:bg-primary/25', className)} style={style} {...props} />;
  if (b === 'gradient')
    return <Button ref={ref} className={cn(shapeCls, 'text-primary-foreground border-0 hover:opacity-90', className)} style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--sf-primary-2)))', ...style }} {...props} />;

  // solid (default)
  return <Button ref={ref} className={cn(shapeCls, className)} style={style} {...props} />;
});
SfButton.displayName = 'SfButton';
