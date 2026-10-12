import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // tsconfig để "jsx": "preserve" cho Next tự dịch; test component (*.test.tsx) cần esbuild dịch JSX.
  esbuild: { jsx: "automatic" },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.mjs", "next.config.test.mjs"],
    // Mặc định vẫn là Node. Test component tự khai báo `// @vitest-environment jsdom` ở đầu tệp.
    environment: "node",
  },
});
