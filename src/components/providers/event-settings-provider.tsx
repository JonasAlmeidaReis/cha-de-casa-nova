"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_EVENT_SETTINGS,
  type EventSettings,
} from "@/lib/firebase/models";
import { subscribeEventSettings } from "@/lib/firebase/settings";

type EventSettingsContextValue = {
  settings: EventSettings;
  loading: boolean;
};

const EventSettingsContext = createContext<EventSettingsContextValue | undefined>(
  undefined,
);

export function EventSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<EventSettings>(DEFAULT_EVENT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeEventSettings((nextSettings) => {
      setSettings(nextSettings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<EventSettingsContextValue>(
    () => ({ settings, loading }),
    [settings, loading],
  );

  return (
    <EventSettingsContext.Provider value={value}>
      {children}
    </EventSettingsContext.Provider>
  );
}

export function useEventSettings(): EventSettingsContextValue {
  const context = useContext(EventSettingsContext);
  if (!context) {
    throw new Error(
      "useEventSettings deve ser usado dentro de EventSettingsProvider.",
    );
  }

  return context;
}

