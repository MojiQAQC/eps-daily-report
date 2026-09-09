import type { VercelConfig } from "@vercel/config/v1";

// Project was created via an anonymous CLI deploy, which left the dashboard's
// Framework Preset as "Other" (defaulting Output Directory to the app's own
// public/ folder instead of the Next.js build). Pin it explicitly so builds
// are reproducible regardless of dashboard state.
export const config: VercelConfig = {
  framework: "nextjs",
};
