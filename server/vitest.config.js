import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        // Integration tests spin up a real (in-memory) MongoDB replica set,
        // which takes a few seconds — give it room before timing out.
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});
