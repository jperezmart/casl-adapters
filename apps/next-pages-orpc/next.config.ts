import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // `next dev` would otherwise write its own AGENTS.md here whenever an AI
  // agent runs it; the repository's AGENTS.md already covers this app.
  agentRules: false,
};

export default config;
