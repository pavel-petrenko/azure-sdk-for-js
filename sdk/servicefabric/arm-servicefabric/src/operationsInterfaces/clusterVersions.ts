/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import {
  ClusterVersionsGetOptionalParams,
  ClusterVersionsGetResponse,
  ClusterVersionsEnvironment,
  ClusterVersionsGetByEnvironmentOptionalParams,
  ClusterVersionsGetByEnvironmentResponse,
  ClusterVersionsListOptionalParams,
  ClusterVersionsListResponse,
  ClusterVersionsListByEnvironmentOptionalParams,
  ClusterVersionsListByEnvironmentResponse
} from "../models/index.js";

/** Interface representing a ClusterVersions. */
export interface ClusterVersions {
  /**
   * Gets information about an available Service Fabric cluster code version.
   * @param location The location for the cluster code versions. This is different from cluster location.
   * @param clusterVersion The cluster code version.
   * @param options The options parameters.
   */
  get(
    location: string,
    clusterVersion: string,
    options?: ClusterVersionsGetOptionalParams
  ): Promise<ClusterVersionsGetResponse>;
  /**
   * Gets information about an available Service Fabric cluster code version by environment.
   * @param location The location for the cluster code versions. This is different from cluster location.
   * @param environment The operating system of the cluster. The default means all.
   * @param clusterVersion The cluster code version.
   * @param options The options parameters.
   */
  getByEnvironment(
    location: string,
    environment: ClusterVersionsEnvironment,
    clusterVersion: string,
    options?: ClusterVersionsGetByEnvironmentOptionalParams
  ): Promise<ClusterVersionsGetByEnvironmentResponse>;
  /**
   * Gets all available code versions for Service Fabric cluster resources by location.
   * @param location The location for the cluster code versions. This is different from cluster location.
   * @param options The options parameters.
   */
  list(
    location: string,
    options?: ClusterVersionsListOptionalParams
  ): Promise<ClusterVersionsListResponse>;
  /**
   * Gets all available code versions for Service Fabric cluster resources by environment.
   * @param location The location for the cluster code versions. This is different from cluster location.
   * @param environment The operating system of the cluster. The default means all.
   * @param options The options parameters.
   */
  listByEnvironment(
    location: string,
    environment: ClusterVersionsEnvironment,
    options?: ClusterVersionsListByEnvironmentOptionalParams
  ): Promise<ClusterVersionsListByEnvironmentResponse>;
}
