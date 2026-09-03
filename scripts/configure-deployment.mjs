import { readFile, writeFile } from "node:fs/promises";

const required = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];
for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Required deployment value ${name} is missing.`);
  }
}

const path = new URL("../wrangler.jsonc", import.meta.url);
const config = JSON.parse(await readFile(path, "utf8"));
config.vars.SUPABASE_URL = process.env.SUPABASE_URL;
config.vars.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
await writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
