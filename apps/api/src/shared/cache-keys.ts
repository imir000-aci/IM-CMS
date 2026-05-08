export const CacheKeys = {
  session: (tokenHash: string) => `sess:${tokenHash}`,

  delivery: {
    page: (slug: string, locale: string) => `del:page:${slug}:${locale}`,
    slot: (slotId: string, locale: string) => `del:slot:${slotId}:${locale}`,
    pattern: (slug: string) => `del:page:${slug}:*`,
  },

  presence: {
    campaign: (campaignId: string) => `pres:campaign:${campaignId}`,
  },

  rateLimit: (ip: string, endpoint: string) => `rl:${ip}:${endpoint}`,

  audiences: {
    catalog: (orgId: string) => `aud:catalog:${orgId}`,
  },

  experiments: {
    status: (orgId: string, experimentKey: string) => `exp:status:${orgId}:${experimentKey}`,
  },
} as const
