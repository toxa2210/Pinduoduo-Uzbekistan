export function createAppConfig() {
  return {
    apiPrefix: "api/v1",
    port: Number(process.env.APP_PORT ?? 8000),
    environment: process.env.APP_ENV ?? "development"
  };
}

if (require.main === module) {
  const config = createAppConfig();
  console.log(`Pinduoduo Uzbekistan API configured on port ${config.port}`);
}
