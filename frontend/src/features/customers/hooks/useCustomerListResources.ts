import { useState } from "react";

import { type Customer } from "../api";
import { useCustomers } from "../hooks";

import { useListPageDialogs } from "@/hooks/ui";

export function useCustomerListResources() {
  const [showInact, setShowInact] = useState(false);
  const dlgs = useListPageDialogs<Customer>();
  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useCustomers();
  const res = useList(showInact);
  const mutations = {
    create: useCreate(),
    softDel: useSoftDelete(),
    permDel: usePermanentDelete(),
    rest: useRestore(),
  };

  return { showInact, setShowInact, dlgs, ...res, cust: res.data || [], ...mutations };
}
