"use client";

import { useState } from "react";
import type { ChefAssistantContext, ChefAssistantResponse } from "@/lib/chef-assistant/types";

export function useMiracoliChefAssistant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ChefAssistantResponse | null>(null);

  const ask = async (message: string, context: ChefAssistantContext) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetch("/api/chef-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, context }),
      });

      const data = (await result.json()) as ChefAssistantResponse | { error: string };

      if (!result.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Assistant request failed.");
      }

      setResponse(data);
      return data;
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Assistant request failed.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    response,
    ask,
  };
}
