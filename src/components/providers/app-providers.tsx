"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/providers/auth-provider";
import { EventSettingsProvider } from "@/components/providers/event-settings-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <EventSettingsProvider>{children}</EventSettingsProvider>
    </AuthProvider>
  );
}

