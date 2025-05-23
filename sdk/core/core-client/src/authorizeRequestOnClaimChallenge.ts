// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { AuthorizeRequestOnChallengeOptions } from "@azure/core-rest-pipeline";
import { logger as coreClientLogger } from "./log.js";
import { decodeStringToString } from "./base64.js";

/**
 * Converts: `Bearer a="b", c="d", Bearer d="e", f="g"`.
 * Into: `[ { a: 'b', c: 'd' }, { d: 'e', f: 'g' } ]`.
 *
 * @internal
 */
export function parseCAEChallenge(challenges: string): any[] {
  const bearerChallenges = `, ${challenges.trim()}`.split(", Bearer ").filter((x) => x);
  return bearerChallenges.map((challenge) => {
    const challengeParts = `${challenge.trim()}, `.split('", ').filter((x) => x);
    const keyValuePairs = challengeParts.map((keyValue) =>
      (([key, value]) => ({ [key]: value }))(keyValue.trim().split('="')),
    );
    // Key-value pairs to plain object:
    return keyValuePairs.reduce((a, b) => ({ ...a, ...b }), {});
  });
}

/**
 * CAE Challenge structure
 */
export interface CAEChallenge {
  scope: string;
  claims: string;
}

/**
 * This function can be used as a callback for the `bearerTokenAuthenticationPolicy` of `@azure/core-rest-pipeline`, to support CAE challenges:
 * [Continuous Access Evaluation](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation).
 *
 * Call the `bearerTokenAuthenticationPolicy` with the following options:
 *
 * ```ts snippet:AuthorizeRequestOnClaimChallenge
 * import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
 * import { authorizeRequestOnClaimChallenge } from "@azure/core-client";
 *
 * const policy = bearerTokenAuthenticationPolicy({
 *   challengeCallbacks: {
 *     authorizeRequestOnChallenge: authorizeRequestOnClaimChallenge,
 *   },
 *   scopes: ["https://service/.default"],
 * });
 * ```
 *
 * Once provided, the `bearerTokenAuthenticationPolicy` policy will internally handle Continuous Access Evaluation (CAE) challenges.
 * When it can't complete a challenge it will return the 401 (unauthorized) response from ARM.
 *
 * Example challenge with claims:
 *
 * ```
 * Bearer authorization_uri="https://login.windows-ppe.net/", error="invalid_token",
 * error_description="User session has been revoked",
 * claims="eyJhY2Nlc3NfdG9rZW4iOnsibmJmIjp7ImVzc2VudGlhbCI6dHJ1ZSwgInZhbHVlIjoiMTYwMzc0MjgwMCJ9fX0="
 * ```
 */
export async function authorizeRequestOnClaimChallenge(
  onChallengeOptions: AuthorizeRequestOnChallengeOptions,
): Promise<boolean> {
  const { scopes, response } = onChallengeOptions;
  const logger = onChallengeOptions.logger || coreClientLogger;

  const challenge = response.headers.get("WWW-Authenticate");
  if (!challenge) {
    logger.info(
      `The WWW-Authenticate header was missing. Failed to perform the Continuous Access Evaluation authentication flow.`,
    );
    return false;
  }
  const challenges: CAEChallenge[] = parseCAEChallenge(challenge) || [];

  const parsedChallenge = challenges.find((x) => x.claims);
  if (!parsedChallenge) {
    logger.info(
      `The WWW-Authenticate header was missing the necessary "claims" to perform the Continuous Access Evaluation authentication flow.`,
    );
    return false;
  }

  const accessToken = await onChallengeOptions.getAccessToken(
    parsedChallenge.scope ? [parsedChallenge.scope] : scopes,
    {
      claims: decodeStringToString(parsedChallenge.claims),
    },
  );

  if (!accessToken) {
    return false;
  }

  onChallengeOptions.request.headers.set(
    "Authorization",
    `${accessToken.tokenType ?? "Bearer"} ${accessToken.token}`,
  );
  return true;
}
