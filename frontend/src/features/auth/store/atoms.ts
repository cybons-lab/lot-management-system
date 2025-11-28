import { atomWithStorage } from "jotai/utils";

interface AuthState {
    token: string | null;
    username: string | null;
}

export const authAtom = atomWithStorage<AuthState>("auth", {
    token: null,
    username: null,
});
