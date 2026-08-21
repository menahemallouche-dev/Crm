/**
 * Shared e2e test environment. Uses a dedicated database
 * (gecodis_crm_test) so e2e runs never touch dev/demo data — override any
 * of these via real environment variables (e.g. in CI) if needed.
 */
export function applyTestEnv() {
  process.env.DATABASE_URL ??= "postgresql://postgres:gecodis@localhost:5432/gecodis_crm_test?schema=public";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-jwt-refresh-secret";
  process.env.PORTAL_JWT_SECRET ??= "test-portal-jwt-secret";
  process.env.JWT_EXPIRES_IN ??= "15m";
  process.env.JWT_REFRESH_EXPIRES_IN ??= "30d";
  process.env.EMAIL_PROVIDER ??= "console";
  process.env.SEARCH_PROVIDER ??= "postgres";
  process.env.BILLING_SOFTWARE_WEBHOOK_SECRET ??= "test-billing-secret";
  process.env.WMS_WEBHOOK_SECRET ??= "test-wms-secret";
  process.env.APP_URL ??= "http://localhost:3000";
  process.env.API_URL ??= "http://localhost:4000";
}
