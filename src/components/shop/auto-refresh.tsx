"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ seconds, max }: { seconds: number; max: number }) {
  const router = useRouter();
  const count = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (++count.current > max) return clearInterval(t);
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds, max]);
  return null;
}
