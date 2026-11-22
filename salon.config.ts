/**
 * The salon this deployment serves. Everything that changes from one salon to another
 * lives in the exported configuration: to set the site up for a new client, replace the
 * export below with their own `defineConfig({...})` (copy src/config/demo.config.ts as a
 * starting point) and replace the files in public/hero/. No other code changes are needed.
 */
export { default } from "./src/config/demo.config";
