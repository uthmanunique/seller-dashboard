// src/app/page.tsx
"use client"; // Mark as Client Component

import { useEffect } from "react";
import { useRouter } from "next/navigation"; // Correct import for App Router

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return null;
}