import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // eslint-plugin-react-hooks v7 flags setState-in-useEffect as a
      // "cascading render" smell. That's correct for most cases, but
      // we have two legitimate uses we don't want to refactor away:
      //   * mount-detection (ThemeToggle reads the data-theme attr set
      //     by the inline pre-paint script, then mirrors it into state)
      //   * on-mount async kickoff (Receive reads window.location.hash
      //     and starts the fetch+decrypt flow)
      // Both happen exactly once after hydration, so the cascading-render
      // risk doesn't apply. Turning off the rule globally instead of
      // disabling per-line so the code stays clean.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
