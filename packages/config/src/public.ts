export type PublicConfig = Readonly<{
  appUrl: string;
}>;

export function createPublicConfig(appUrl: string): PublicConfig {
  return { appUrl };
}
