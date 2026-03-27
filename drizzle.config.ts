import {defineConfig} from "drizzle-kit";

export default defineConfig({
    schema: "./src/schema.ts",
    out:    "./drizzle",
    // Using 'sqlite' dialect here. To switch to PostgreSQL, change dialect
    // to 'postgresql' and update the dbCredentials url.
    dialect: "sqlite",
    dbCredentials: {
        url: "./settings.sqlite3",
    },
});
