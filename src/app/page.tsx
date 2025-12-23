"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to welcome page
    router.replace("/welcome");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
