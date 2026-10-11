"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/wallet/auth-context";
import { api, type Features, type PrivateProfile, type PublicProfile } from "@/lib/api-client";

/** Server features (accounts need Privy + a database). Cached for the session; never throws. */
export function useFeatures() {
  return useQuery({
    queryKey: ["features"],
    staleTime: Infinity,
    retry: 1,
    queryFn: () => api<Features>("/api/health").catch((): Features => ({ auth: false, db: false, accounts: false, rateLimit: false })),
  });
}

/** The signed-in user's Stamp profile (null when signed out or accounts are off). */
export function useMe() {
  const auth = useAuth();
  const { data: features } = useFeatures();
  return useQuery({
    queryKey: ["me", auth.address ?? null],
    enabled: Boolean(features?.accounts && auth.authenticated && auth.mode === "privy"),
    retry: (n, err) => n < 2 && (err as { status?: number }).status !== 404,
    queryFn: async () => {
      const token = await auth.getAccessToken();
      return (await api<{ profile: PrivateProfile }>("/api/me", { token })).profile;
    },
  });
}

export type ProfilePatch = Partial<Pick<PrivateProfile, "displayName" | "avatarSource">> & {
  privacy?: Partial<PrivateProfile["privacy"]>;
  onboarding?: Partial<PrivateProfile["onboarding"]>;
};

export function useUpdateMe() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      const token = await auth.getAccessToken();
      return (await api<{ profile: PrivateProfile }>("/api/me", { method: "PATCH", body: patch, token })).profile;
    },
    onSuccess: (profile) => qc.setQueriesData({ queryKey: ["me"] }, profile),
  });
}

/** Public profile for an address (handle, name, avatar), when it has one. */
export function useProfileByAddress(address: string | undefined) {
  const { data: features } = useFeatures();
  return useQuery({
    queryKey: ["profileByAddress", address?.toLowerCase()],
    enabled: Boolean(address && features?.db),
    staleTime: 60_000,
    queryFn: async () => (await api<{ profile: PublicProfile | null }>(`/api/resolve?address=${address}`)).profile,
  });
}
