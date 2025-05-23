// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import "dotenv/config";
/**
 * @summary Classification policy crud
 */
import type {
  QueueLengthExceptionTrigger,
  AzureCommunicationRoutingServiceClient,
} from "@azure-rest/communication-job-router";
import JobRouter from "@azure-rest/communication-job-router";

const connectionString = process.env["COMMUNICATION_CONNECTION_STRING"] || "";

// Create a classification policy
async function createClassificationPolicy(): Promise<void> {
  // Create the Router Client
  const routerClient: AzureCommunicationRoutingServiceClient = JobRouter(connectionString);

  const distributionPolicyId = "distribution-policy-123";
  await routerClient
    .path("/routing/distributionPolicies/{distributionPolicyId}", distributionPolicyId)
    .patch({
      contentType: "application/merge-patch+json",
      body: {
        name: "distribution-policy-123",
        mode: {
          kind: "longestIdle",
          minConcurrentOffers: 1,
          maxConcurrentOffers: 5,
          bypassSelectors: false,
        },
        offerExpiresAfterSeconds: 120,
      },
    });

  // define exception trigger for queue over flow
  const queueLengthExceptionTrigger: QueueLengthExceptionTrigger = {
    kind: "queueLength",
    threshold: 100,
  };

  const exceptionPolicyId = "exception-policy-123";
  await routerClient
    .path("/routing/exceptionPolicies/{exceptionPolicyId}", exceptionPolicyId)
    .patch({
      contentType: "application/merge-patch+json",
      body: {
        name: "test-policy",
        exceptionRules: [
          {
            id: "MaxWaitTimeExceeded",
            actions: [
              {
                kind: "reclassify",
                classificationPolicyId: "Main",
                labelsToUpsert: {
                  escalated: true,
                },
              },
            ],
            trigger: queueLengthExceptionTrigger,
          },
        ],
      },
    });

  const classificationPolicyId = "classification-policy-123";
  const salesQueueId = "queue-123";
  await routerClient
    .path("/routing/classificationPolicies/{classificationPolicyId}", classificationPolicyId)
    .patch({
      contentType: "application/merge-patch+json",
      body: {
        name: "Default Classification Policy",
        fallbackQueueId: salesQueueId,
        queueSelectorAttachments: [
          {
            kind: "static",
            queueSelector: { key: "department", labelOperator: "equal", value: "xbox" },
          },
        ],
        workerSelectorAttachments: [
          {
            kind: "static",
            workerSelector: { key: "english", labelOperator: "greaterThan", value: 5 },
          },
        ],
        prioritizationRule: {
          kind: "expression",
          language: "powerFx",
          expression: 'If(job.department = "xbox", 2, 1)',
        },
      },
    });

  const queueId = "queue-123";
  await routerClient.path("/routing/queues/{queueId}", queueId).patch({
    contentType: "application/merge-patch+json",
    body: {
      distributionPolicyId: "distribution-policy-123",
      name: "Main",
      labels: {},
      exceptionPolicyId: "exception-policy-123",
    },
  });

  const result = await routerClient
    .path("/routing/classificationPolicies/{classificationPolicyId}", classificationPolicyId)
    .patch({
      contentType: "application/merge-patch+json",
      body: {
        name: "test-policy",
        fallbackQueueId: "queue-123",
        queueSelectorAttachments: [
          {
            kind: "conditional",
            queueSelectors: [
              {
                key: "foo",
                labelOperator: "equal",
                value: { default: 10 },
              },
            ],
            condition: {
              kind: "direct-map-rule",
            },
          },
        ],
        prioritizationRule: {
          kind: "static",
          value: { default: 2 },
        },
      },
    });

  console.log("classification policy: " + result);
}

createClassificationPolicy().catch(console.error);
