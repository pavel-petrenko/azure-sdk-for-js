/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import { ExpressRouteProviderPortsLocation } from "../operationsInterfaces/index.js";
import * as coreClient from "@azure/core-client";
import * as Mappers from "../models/mappers.js";
import * as Parameters from "../models/parameters.js";
import { NetworkManagementClient } from "../networkManagementClient.js";
import {
  ExpressRouteProviderPortsLocationListOptionalParams,
  ExpressRouteProviderPortsLocationListResponse,
} from "../models/index.js";

/** Class containing ExpressRouteProviderPortsLocation operations. */
export class ExpressRouteProviderPortsLocationImpl
  implements ExpressRouteProviderPortsLocation
{
  private readonly client: NetworkManagementClient;

  /**
   * Initialize a new instance of the class ExpressRouteProviderPortsLocation class.
   * @param client Reference to the service client
   */
  constructor(client: NetworkManagementClient) {
    this.client = client;
  }

  /**
   * Retrieves all the ExpressRouteProviderPorts in a subscription.
   * @param options The options parameters.
   */
  list(
    options?: ExpressRouteProviderPortsLocationListOptionalParams,
  ): Promise<ExpressRouteProviderPortsLocationListResponse> {
    return this.client.sendOperationRequest({ options }, listOperationSpec);
  }
}
// Operation Specifications
const serializer = coreClient.createSerializer(Mappers, /* isXml */ false);

const listOperationSpec: coreClient.OperationSpec = {
  path: "/subscriptions/{subscriptionId}/providers/Microsoft.Network/expressRouteProviderPorts",
  httpMethod: "GET",
  responses: {
    200: {
      bodyMapper: Mappers.ExpressRouteProviderPortListResult,
    },
    default: {
      bodyMapper: Mappers.CloudError,
    },
  },
  queryParameters: [Parameters.apiVersion, Parameters.filter],
  urlParameters: [Parameters.$host, Parameters.subscriptionId],
  headerParameters: [Parameters.accept],
  serializer,
};
