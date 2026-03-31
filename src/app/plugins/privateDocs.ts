import swaggerUi from "@fastify/swagger-ui";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  isAuthorizedForPrivateDocs as isAuthorizedForPrivateDocsShared,
  resolvePrivateDocsToken as resolvePrivateDocsTokenShared
} from "@axiomnode/shared-sdk-client/private-docs";

import { AppConfig } from "../config.js";

/** @module privateDocs — Fastify plugin for token-protected Swagger UI documentation. */

/** Resolve the token used to protect private docs, with fallback to the AI engine key. */
export function resolvePrivateDocsToken(config: AppConfig): string | null {
  return resolvePrivateDocsTokenShared(config, { fallbackToAiEngineKey: true });
}

/** Check whether an incoming request carries a valid private-docs authorization token. */
export function isAuthorizedForPrivateDocs(
  request: FastifyRequest,
  expectedToken: string
): boolean {
  return isAuthorizedForPrivateDocsShared(request.headers, expectedToken);
}

/** Register the Swagger UI plugin behind token authentication, if enabled. */
export async function registerPrivateDocs(app: FastifyInstance, config: AppConfig): Promise<void> {
  if (!config.PRIVATE_DOCS_ENABLED) {
    return;
  }

  const privateDocsToken = resolvePrivateDocsToken(config);
  if (!privateDocsToken) {
    throw new Error("Private docs are enabled but no token is configured");
  }

  await app.register(swaggerUi, {
    routePrefix: config.PRIVATE_DOCS_PREFIX,
    staticCSP: true,
    transformSpecificationClone: true,
    uiHooks: {
      onRequest: async (request: FastifyRequest, reply: FastifyReply) => {
        if (!isAuthorizedForPrivateDocs(request, privateDocsToken)) {
          return reply.code(401).send({ message: "Unauthorized private docs access" });
        }
        return;
      }
    }
  });
}
