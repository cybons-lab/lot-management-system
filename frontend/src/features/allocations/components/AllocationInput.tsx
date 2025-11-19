import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/libs/utils";
import { useToast } from "@/hooks/use-toast"; // Toastを使う場合

interface AllocationInputProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function AllocationInput({ value, max, onChange, disabled = false }: AllocationInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isShaking, setIsShaking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (Number(inputValue) !== value) {
      setInputValue(value.toString());
    }
  }, [value]);

  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValueStr = e.target.value;
    setInputValue(newValueStr);
    const parsed = Number(newValueStr);

    if (isNaN(parsed)) return;

    if (parsed < 0) {
      setIsShaking(true);
      toast({ variant: "destructive", title: "マイナスの数量は入力できません" });
      onChange(0);
      setInputValue("0");
      return;
    }

    if (parsed > max) {
      setIsShaking(true);
      toast({ variant: "warning", title: `在庫数量(${max})を超える入力はできません` });
      onChange(max);
      setInputValue(max.toString());
      return;
    }

    onChange(parsed);
  };

  const handleBlur = () => {
    const parsed = Number(inputValue);
    if (isNaN(parsed) || parsed < 0) {
      setInputValue("0");
      onChange(0);
    } else if (parsed > max) {
      setInputValue(max.toString());
      onChange(max);
    } else {
      setInputValue(parsed.toString());
    }
  };

  return (
    <Input
      type="number"
      min={0}
      max={max}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={cn(
        "h-9 w-24 text-right font-mono",
        isShaking && "animate-shake border-red-500 ring-red-500",
      )}
    />
  );
}
