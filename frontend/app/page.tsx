"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/chat" : "/login");
  }, [user, isLoading, router]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
      Loading…
    </div>
  );
}
