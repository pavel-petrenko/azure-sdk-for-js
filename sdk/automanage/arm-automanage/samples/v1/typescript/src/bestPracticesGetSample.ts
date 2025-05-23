/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
import { AutomanageClient } from "@azure/arm-automanage";
import { DefaultAzureCredential } from "@azure/identity";
import "dotenv/config";

/**
 * This sample demonstrates how to Get information about a Automanage best practice
 *
 * @summary Get information about a Automanage best practice
 * x-ms-original-file: specification/automanage/resource-manager/Microsoft.Automanage/stable/2022-05-04/examples/getBestPractice.json
 */
async function getAnAutomanageBestPractice() {
  const subscriptionId =
    process.env["AUTOMANAGE_SUBSCRIPTION_ID"] ||
    "00000000-0000-0000-0000-000000000000";
  const bestPracticeName = "azureBestPracticesProduction";
  const credential = new DefaultAzureCredential();
  const client = new AutomanageClient(credential, subscriptionId);
  const result = await client.bestPractices.get(bestPracticeName);
  console.log(result);
}

async function main() {
  getAnAutomanageBestPractice();
}

main().catch(console.error);
