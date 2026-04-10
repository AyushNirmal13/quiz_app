"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { fetchCurrentUser } from "@/lib/auth-client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    const redirectUser = async () => {
      const user = await fetchCurrentUser();

      if (!isActive) {
        return;
      }

      if (user) {
        router.replace("/dashboard");
        return;
      }

      router.replace("/auth/login");
    };

    void redirectUser();

    return () => {
      isActive = false;
    };
  }, [router]);

  return null;
}
