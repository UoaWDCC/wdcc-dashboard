import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/server/**"],
              message:
                "lib/ must stay browser-safe. Move the caller to hooks/ or server/.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // Row 4 of ARCHITECTURE.md moves these two to hooks/; until then they are the
  // lib -> server back-edge the rule above exists to prevent.
  {
    files: ["lib/flyio/queries.ts", "lib/tasks/queries.ts"],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
