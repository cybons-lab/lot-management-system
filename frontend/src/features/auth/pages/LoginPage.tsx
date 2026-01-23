import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { http } from "@/shared/api/http-client";

// Minimal User Type for Selection (API returns id, not user_id)
interface UserSummary {
  id: number;
  username: string;
  display_name: string;
}

export function LoginPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  // Load users for selection (public endpoint, no auth required)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await http.get<UserSummary[]>("auth/login-users");
        setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users", error);
        toast.error("ユーザー一覧の取得に失敗しました");
      }
    };
    fetchUsers();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(returnTo);
    }
  }, [user, navigate, returnTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    const userId = parseInt(selectedUserId, 10);
    const selectedUser = users.find((u) => u.id === userId);

    setIsLoading(true);
    try {
      await login(userId, selectedUser?.username);
      navigate(returnTo);
    } catch (error) {
      console.error("Login failed", error);
      toast.error("ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
          <p className="text-sm text-gray-500">開発用簡易ログイン（ユーザーを選択してください）</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="user-select"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                ユーザー選択
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="ユーザーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.display_name} ({u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !selectedUserId}>
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
