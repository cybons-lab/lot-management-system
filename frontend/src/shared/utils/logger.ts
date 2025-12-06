import api from "@/shared/api/http-client";

export class Logger {
  static async info(message: string, userAgent?: string) {
    this.send("info", message, userAgent);
  }

  static async error(message: string, userAgent?: string) {
    this.send("error", message, userAgent);
  }

  private static async send(level: string, message: string, userAgent?: string) {
    // Simple console fallback
    console.log(`[Logger][${level}]`, message);

    try {
      // We use a relative import or absolute depending on project structure
      // Assuming api client is available
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await api.post("system/logs/client", {
        json: {
          level,
          message,
          user_agent: userAgent || navigator.userAgent,
        },
        headers,
      });
    } catch (e) {
      console.error("Failed to send log", e);
    }
  }
}
