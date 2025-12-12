/**
 * Tests for shared utility functions
 */
import { describe, it, expect } from "vitest";

import { cn, formatCodeAndName } from "./utils";

describe("utils", () => {
  describe("cn (classname merger)", () => {
    it("merges multiple class names", () => {
      const result = cn("px-4", "py-2", "bg-blue-500");
      expect(result).toContain("px-4");
      expect(result).toContain("py-2");
      expect(result).toContain("bg-blue-500");
    });

    it("handles conditional classes", () => {
      const isActive = true;
      const result = cn("base", isActive && "active");
      expect(result).toContain("base");
      expect(result).toContain("active");
    });

    it("filters out falsy values", () => {
      const shouldHide = false;
      const result = cn("base", shouldHide && "hidden", null, undefined, "visible");
      expect(result).toContain("base");
      expect(result).toContain("visible");
      expect(result).not.toContain("hidden");
    });

    it("merges conflicting tailwind classes (last wins)", () => {
      const result = cn("p-4", "p-2");
      expect(result).toContain("p-2");
      expect(result).not.toContain("p-4");
    });

    it("handles array of classes", () => {
      const result = cn(["px-4", "py-2"]);
      expect(result).toContain("px-4");
      expect(result).toContain("py-2");
    });

    it("handles object syntax", () => {
      const result = cn({
        "bg-red-500": true,
        "bg-blue-500": false,
      });
      expect(result).toContain("bg-red-500");
      expect(result).not.toContain("bg-blue-500");
    });
  });

  describe("formatCodeAndName", () => {
    describe("both code and name provided", () => {
      it("combines code and name with default separator", () => {
        expect(formatCodeAndName("ABC", "テスト名")).toBe("ABC テスト名");
      });

      it("uses custom separator", () => {
        expect(formatCodeAndName("ABC", "テスト名", { separator: ": " })).toBe("ABC: テスト名");
        expect(formatCodeAndName("ABC", "テスト名", { separator: "-" })).toBe("ABC-テスト名");
      });

      it("trims whitespace from code and name", () => {
        expect(formatCodeAndName("  ABC  ", "  テスト名  ")).toBe("ABC テスト名");
      });
    });

    describe("only code provided", () => {
      it("returns code only", () => {
        expect(formatCodeAndName("ABC", null)).toBe("ABC");
        expect(formatCodeAndName("ABC", undefined)).toBe("ABC");
        expect(formatCodeAndName("ABC", "")).toBe("ABC");
      });

      it("trims whitespace", () => {
        expect(formatCodeAndName("  ABC  ", null)).toBe("ABC");
      });
    });

    describe("only name provided", () => {
      it("returns name only", () => {
        expect(formatCodeAndName(null, "テスト名")).toBe("テスト名");
        expect(formatCodeAndName(undefined, "テスト名")).toBe("テスト名");
        expect(formatCodeAndName("", "テスト名")).toBe("テスト名");
      });

      it("trims whitespace", () => {
        expect(formatCodeAndName(null, "  テスト名  ")).toBe("テスト名");
      });
    });

    describe("neither code nor name provided", () => {
      it("returns empty string for null", () => {
        expect(formatCodeAndName(null, null)).toBe("");
      });

      it("returns empty string for undefined", () => {
        expect(formatCodeAndName(undefined, undefined)).toBe("");
      });

      it("returns empty string for empty strings", () => {
        expect(formatCodeAndName("", "")).toBe("");
      });

      it("returns empty string for whitespace only", () => {
        expect(formatCodeAndName("   ", "   ")).toBe("");
      });
    });
  });
});
