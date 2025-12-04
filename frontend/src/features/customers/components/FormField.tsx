/**
 * FormField - Reusable form field component with label and error display
 */

import type { UseFormRegisterReturn, FieldError } from "react-hook-form";

import { form as formStyles } from "../pages/styles";

import { Input, Label } from "@/components/ui";

interface FormFieldProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  error?: FieldError;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}

export function FormField({
  id,
  label,
  register,
  error,
  placeholder,
  type = "text",
  required = false,
  disabled = false,
  hint,
}: FormFieldProps) {
  return (
    <div className={formStyles.field}>
      <Label htmlFor={id} className={formStyles.label}>
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        {...register}
        placeholder={placeholder}
        disabled={disabled}
        className={formStyles.input}
      />
      {error && <p className={formStyles.error}>{error.message}</p>}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
