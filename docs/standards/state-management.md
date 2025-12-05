# State Management Standards

## Overview

- **Server State:** TanStack Query (cache, sync, refetch)
- **Client State:** Jotai (UI state, filters, preferences)

---

## TanStack Query

### Global Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min
      cacheTime: 30 * 60 * 1000,   // 30 min
      retry: 3,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,  // Never retry mutations
    },
  },
});
```

### Cache Strategy

| Data Type | staleTime | Refetch |
|-----------|-----------|---------|
| Master data | 10 min | On focus |
| Inventory | 1 min | Polling |
| Orders | 30 sec | Polling |
| Reports | 5 min | Manual |

### Cache Invalidation (REQUIRED)

```typescript
const { mutate } = useMutation({
  mutationFn: createOrder,
  onSuccess: () => {
    // Invalidate ALL affected queries
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["allocations"] });
  },
});
```

**Dependency Map:**

| Mutation | Invalidate |
|----------|-----------|
| Create Order | orders, inventory, allocations |
| Update Lot | lots, inventory |
| Allocate Stock | allocations, inventory, orders |

---

## Jotai

### Naming Convention

```typescript
// Pattern: {feature}{purpose}Atom
export const orderFilterAtom = atom<OrderFilter>({...});
export const selectedProductsAtom = atom<string[]>([]);
```

### When to Use

**Jotai (Client State):**
- UI state (modals, tabs)
- Filters and search
- User preferences

**React Query (Server State):**
- API data
- Needs caching
- Needs background sync

```typescript
// ✅ Correct
const { data: products } = useQuery({...});  // Server
const [filter, setFilter] = useAtom(filterAtom);  // Client

// ❌ Wrong: Don't store server data in Jotai
const [products, setProducts] = useAtom(productsAtom);
```

### Persistence

```typescript
// Persist user preferences
import { atomWithStorage } from 'jotai/utils';

export const themeAtom = atomWithStorage('theme', 'light');

// ❌ Don't persist sensitive data
export const tokenAtom = atomWithStorage('token', '');  // Security risk
```

---

## Optimistic Updates

```typescript
const { mutate } = useMutation({
  mutationFn: createProduct,
  onMutate: async (newProduct) => {
    // Cancel refetches
    await queryClient.cancelQueries({ queryKey: ["products"] });
    
    // Snapshot
    const previous = queryClient.getQueryData(["products"]);
    
    // Optimistic update
    queryClient.setQueryData(["products"], (old) => [...old, newProduct]);
    
    return { previous };
  },
  onError: (err, newProduct, context) => {
    // Rollback
    queryClient.setQueryData(["products"], context?.previous);
  },
  onSettled: () => {
    // Sync with server
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});
```
