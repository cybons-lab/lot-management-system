/**
 * CustomerForm
 * 得意先の新規登録/編集フォーム
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Customer } from "../api";
import { form as formStyles } from "../pages/styles";

import { CustomerFormFields } from "./CustomerFormFields";
import { customerFormSchema, type CustomerFormData } from "./customerFormSchema";

import { Button } from "@/components/ui";

export type { CustomerFormData };

export interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const EMPTY_DEFAULTS: CustomerFormData = {
  customer_code: "",
  customer_name: "",
  address: "",
  contact_name: "",
  phone: "",
  email: "",
};

function getSubmitLabel(isSubmitting: boolean, isEditMode: boolean): string {
  if (isSubmitting) return "保存中...";
  return isEditMode ? "更新" : "登録";
}

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CustomerFormProps) {
  const isEditMode = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customer
      ? {
          customer_code: customer.customer_code,
          customer_name: customer.customer_name,
          address: customer.address || "",
          contact_name: customer.contact_name || "",
          phone: customer.phone || "",
          email: customer.email || "",
        }
      : EMPTY_DEFAULTS,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formStyles.grid}>
      <CustomerFormFields register={register} errors={errors} />
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {getSubmitLabel(isSubmitting, isEditMode)}
        </Button>
      </div>
    </form>
  );
}
