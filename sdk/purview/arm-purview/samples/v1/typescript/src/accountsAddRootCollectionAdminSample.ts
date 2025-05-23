/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  CollectionAdminUpdate,
  PurviewManagementClient
} from "@azure/arm-purview";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * This sample demonstrates how to Add the administrator for root collection associated with this account.
 *
 * @summary Add the administrator for root collection associated with this account.
 * x-ms-original-file: specification/purview/resource-manager/Microsoft.Purview/stable/2021-07-01/examples/Accounts_AddRootCollectionAdmin.json
 */
async function accountsAddRootCollectionAdmin(): Promise<void> {
  const subscriptionId = "34adfa4f-cedf-4dc0-ba29-b6d1a69ab345";
  const resourceGroupName = "SampleResourceGroup";
  const accountName = "account1";
  const collectionAdminUpdate: CollectionAdminUpdate = {
    objectId: "7e8de0e7-2bfc-4e1f-9659-2a5785e4356f"
  };
  const credential = new DefaultAzureCredential();
  const client = new PurviewManagementClient(credential, subscriptionId);
  const result = await client.accounts.addRootCollectionAdmin(
    resourceGroupName,
    accountName,
    collectionAdminUpdate
  );
  console.log(result);
}

accountsAddRootCollectionAdmin().catch(console.error);
