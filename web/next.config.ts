import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone", poweredByHeader: false,
  // Next treats underscore-prefixed folders as private; expose the legacy probe.
  async rewrites() { return [{ source: "/_stcore/health", destination: "/api/health" }]; },
};
export default config;
