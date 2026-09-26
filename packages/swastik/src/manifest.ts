export const moduleTiers = [
  "admin",
  "core",
  "standard",
  "marketplace",
] as const;

export type ModuleTier = (typeof moduleTiers)[number];

export interface ModuleCommandManifest {
  name: string;
  description: string;
  guildOnly?: boolean;
  requiresDefer?: boolean;
  ephemeral?: boolean;
  nsfw?: boolean;
  permissions?: {
    discord?: readonly string[];
  };
  defaultMemberPermissions?: string | null;
  rbacRequirement?:
    "RESTRICTED" | "MEMBER" | "HELPER" | "MOD" | "ADMIN" | "OWNER" | null;
}

export interface ModuleManifest {
  name: string;
  version: string;
  description: string;
  tier: ModuleTier;
  devGuildOnly?: boolean;
  hardcoded?: boolean;
  hardcodeGuildId?: string;
  releaseStatus?: "alpha" | "beta" | "stable" | "deprecated";
  devId?: string;
  buildId?: string;
  marketplaceCategory?: string;
  required: boolean;
  depends?: readonly string[];
  provides?: readonly string[];
  intents?: readonly string[];
  partials?: readonly string[];
  commands?: readonly ModuleCommandManifest[];
  events?: readonly string[];
  services?: readonly string[];
  repositories?: readonly string[];
  jobs?: readonly string[];
  tasks?: readonly string[];
  routes?: readonly string[];
  middleware?: readonly string[];
  migrations?: readonly string[];
  locales?: readonly string[];
  config?: Record<string, unknown>;
  eventsCatalog?: readonly {
    name: string;
    description: string;
  }[];
  dashboardSchema?: Record<string, unknown>;
  crossModuleReads?: readonly {
    targetModule: string;
    accessor: string;
  }[];
}

export interface ModuleLifecycle<Container = unknown> {
  onLoad?: (container: Container) => Promise<void> | void;
  onReady?: (container: Container) => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
}

export interface SwastikModule<
  Container = unknown,
> extends ModuleLifecycle<Container> {
  manifest: ModuleManifest;
}

export function defineModule<Container = unknown>(
  moduleDefinition: SwastikModule<Container>,
): SwastikModule<Container> {
  return moduleDefinition;
}
