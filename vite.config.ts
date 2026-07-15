import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        const isSignalRAnnotationNoise =
          warning.code === "INVALID_ANNOTATION" &&
          (warning.id?.indexOf("@microsoft/signalr/dist/esm/Utils.js") ?? -1) >= 0;
        if (!isSignalRAnnotationNoise) warn(warning);
      },
    },
  },
  server: {
    port: 3090,
  },
});
