import { forwardRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightSlot?: ReactNode;
  // Solo marca visualmente el campo como obligatorio (asterisco) — no añade validación
  // nueva, sirve para que se vea por qué el formulario no deja avanzar (#144).
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, rightSlot, required, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-text-secondary font-dm uppercase tracking-wide">
          {label}{required && <span className="text-gold ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-dm',
            'placeholder:text-text-secondary/50 outline-none',
            'focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors duration-150',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            rightSlot ? 'pr-10' : '',
            className
          )}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{rightSlot}</div>
        )}
      </div>
      {error && <p className="text-xs text-danger font-dm">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, required, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-text-secondary font-dm uppercase tracking-wide">
          {label}{required && <span className="text-gold ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'bg-surface2 border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-dm',
          'outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors duration-150',
          error && 'border-danger',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-danger font-dm">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-text-secondary font-dm uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={4}
        className={cn(
          'bg-surface2 border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-dm resize-none',
          'placeholder:text-text-secondary/50 outline-none',
          'focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors duration-150',
          error && 'border-danger',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger font-dm">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
