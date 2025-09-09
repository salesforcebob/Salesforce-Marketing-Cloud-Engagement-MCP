export type MceProfile = {
  name: string;
  clientId: string;
  clientSecret: string;
  subdomain: string; // <subdomain>.auth.marketingcloudapis.com
  accountId?: string; // MID
  businessUnitId?: string; // BU-specific context
};

export type AppConfig = {
  defaultProfile?: string;
  profiles: Record<string, MceProfile>;
};

function readEnv(name: string): string | undefined {
  return process.env[name];
}

export function loadConfigFromEnv(env = process.env): AppConfig {
  const defaultProfile = env.MCE_PROFILE_DEFAULT || undefined;
  const profiles: Record<string, MceProfile> = {};

  // Detect profiles by env prefix MCE_<PROFILE>_*
  // Collect candidate profile names from env var keys
  const profileNames = new Set<string>();
  for (const key of Object.keys(env)) {
    const match = /^MCE_(.+)_(CLIENT_ID|CLIENT_SECRET|SUBDOMAIN|ACCOUNT_ID|BUSINESS_UNIT_ID)$/.exec(key);
    if (match) {
      profileNames.add(match[1].toLowerCase());
    }
  }

  for (const name of profileNames) {
    const upper = name.toUpperCase();
    const clientId = env[`MCE_${upper}_CLIENT_ID`];
    const clientSecret = env[`MCE_${upper}_CLIENT_SECRET`];
    const subdomain = env[`MCE_${upper}_SUBDOMAIN`];
    const accountId = env[`MCE_${upper}_ACCOUNT_ID`];
    const businessUnitId = env[`MCE_${upper}_BUSINESS_UNIT_ID`];
    if (!clientId || !clientSecret || !subdomain) {
      continue; // skip incomplete profile
    }
    profiles[name] = {
      name,
      clientId,
      clientSecret,
      subdomain,
      accountId,
      businessUnitId,
    };
  }

  return { defaultProfile, profiles };
}

export function getActiveProfile(config: AppConfig, preferred?: string): MceProfile | undefined {
  const name = preferred || config.defaultProfile;
  if (name && config.profiles[name]) return config.profiles[name];
  const first = Object.values(config.profiles)[0];
  return first;
}



