/**
 * GRACE Server Routes
 *
 * Mounts at /api/grace/* via app.ts.
 *
 * Routes:
 *   POST /api/grace/provider/openclaw/probe
 *     Calls testEnvironment() from the openclaw-gateway adapter to do a
 *     real WebSocket-level connectivity check against the configured gateway.
 *     Body: { url: string; authToken?: string }
 *     Returns: AdapterEnvironmentTestResult
 */

import { Router } from "express";
import { testEnvironment } from "@paperclipai/adapter-openclaw-gateway/server";

export function graceRoutes(): Router {
  const router = Router();

  router.post("/provider/openclaw/probe", async (req, res) => {
    try {
      const { url, authToken } = req.body as { url?: unknown; authToken?: unknown };

      const config: Record<string, unknown> = {};
      if (typeof url === "string" && url.trim()) {
        config.url = url.trim();
      }
      if (typeof authToken === "string" && authToken.trim()) {
        config.authToken = authToken.trim();
      }

      const result = await testEnvironment({
        companyId: "grace",
        adapterType: "openclaw-gateway",
        config,
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown probe error";
      res.status(500).json({
        adapterType: "openclaw-gateway",
        status: "fail",
        checks: [
          {
            code: "probe_internal_error",
            level: "error",
            message: `Server-side probe failed: ${message}`,
          },
        ],
        testedAt: new Date().toISOString(),
      });
    }
  });

  return router;
}
