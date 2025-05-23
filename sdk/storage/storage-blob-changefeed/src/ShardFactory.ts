// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ChunkFactory } from "./ChunkFactory.js";
import type { ShardCursor } from "./models/ChangeFeedCursor.js";
import { Shard } from "./Shard.js";
import type { ContainerClient, CommonOptions } from "@azure/storage-blob";
import type { Chunk } from "./Chunk.js";
import type { AbortSignalLike } from "@azure/abort-controller";
import { tracingClient } from "./utils/tracing.js";

/**
 * Options to configure {@link ShardFactory.create} operation.
 */
export interface CreateShardOptions extends CommonOptions {
  /**
   * An implementation of the `AbortSignalLike` interface to signal the request to cancel the operation.
   * For example, use the &commat;azure/abort-controller to create an `AbortSignal`.
   */
  abortSignal?: AbortSignalLike;
}

export class ShardFactory {
  private readonly chunkFactory: ChunkFactory;

  constructor(chunkFactory: ChunkFactory) {
    this.chunkFactory = chunkFactory;
  }

  public async create(
    containerClient: ContainerClient,
    shardPath: string,
    shardCursor?: ShardCursor,
    options: CreateShardOptions = {},
  ): Promise<Shard> {
    return tracingClient.withSpan("ShardFactory-create", options, async (updatedOptions) => {
      const chunks: string[] = [];
      const blockOffset: number = shardCursor?.BlockOffset || 0;
      const eventIndex: number = shardCursor?.EventIndex || 0;

      for await (const blobItem of containerClient.listBlobsFlat({
        prefix: shardPath,
        abortSignal: options.abortSignal,
        tracingOptions: updatedOptions.tracingOptions,
      })) {
        chunks.push(blobItem.name);
      }

      const currentChunkPath = shardCursor?.CurrentChunkPath;
      let chunkIndex = -1;
      let currentChunk: Chunk | undefined = undefined;
      // Chunks can be empty right after hour flips.
      if (chunks.length !== 0) {
        // Fast forward to current Chunk
        if (currentChunkPath) {
          for (let i = 0; i < chunks.length; i++) {
            if (chunks[i] === currentChunkPath) {
              chunkIndex = i;
              break;
            }
          }
          if (chunkIndex === -1) {
            throw new Error(`Chunk ${currentChunkPath} not found.`);
          }
        } else {
          chunkIndex = 0;
        }

        // Fast forward to current Chunk.
        if (chunkIndex > 0) {
          chunks.splice(0, chunkIndex);
        }

        currentChunk = await this.chunkFactory.create(
          containerClient,
          chunks.shift()!,
          blockOffset,
          eventIndex,
          {
            abortSignal: options.abortSignal,
            tracingOptions: updatedOptions.tracingOptions,
          },
        );
      }

      return new Shard(containerClient, this.chunkFactory, chunks, currentChunk, shardPath);
    });
  }
}
