/**
 * CustomerFormFields - Form fields for customer form
 */

import type { FieldErrors, UseFormRegister } from "react-hook-form";

import type { CustomerFormData } from "./customerFormSchema";
import { FormField } from "./FormField";

interface CustomerFormFieldsProps {
  register: UseFormRegister<CustomerFormData>;
  errors: FieldErrors<CustomerFormData>;
}

export function CustomerFormFields({ register, errors }: CustomerFormFieldsProps) {
  return (
    <>
      <FormField
        id="customer_code"
        label="得意先コード"
        register={register("customer_code")}
        error={errors.customer_code}
        placeholder="例: CUST-001"
        required
      />
      <FormField
        id="customer_name"
        label="得意先名"
        register={register("customer_name")}
        error={errors.customer_name}
        placeholder="例: 株式会社サンプル"
        required
      />
      <FormField
        id="address"
        label="住所"
        register={register("address")}
        error={errors.address}
        placeholder="例: 東京都千代田区..."
      />
      <FormField
        id="contact_name"
        label="担当者名"
        register={register("contact_name")}
        error={errors.contact_name}
        placeholder="例: 山田 太郎"
      />
      <FormField
        id="phone"
        label="電話番号"
        register={register("phone")}
        error={errors.phone}
        placeholder="例: 03-1234-5678"
      />
      <FormField
        id="email"
        label="メールアドレス"
        register={register("email")}
        error={errors.email}
        placeholder="例: contact@example.com"
        type="email"
      />
    </>
  );
}
