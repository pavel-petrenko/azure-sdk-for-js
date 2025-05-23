// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { isLiveMode, Recorder } from "@azure-tools/test-recorder";
import {
  base64encode,
  bodyToString,
  configureBlobStorageClient,
  getBSU,
  getSASConnectionStringFromEnvironment,
  getUniqueName,
  recorderEnvSetup,
  uriSanitizers,
} from "./utils/index.js";
import type { ContainerClient, BlobClient } from "../src/index.js";
import { BlockBlobClient } from "../src/index.js";
import { Test_CPK_INFO } from "./utils/fakeTestSecrets.js";
import { BlockBlobTier } from "../src/index.js";
import { isNodeLike } from "@azure/core-util";
import { describe, it, assert, beforeEach, afterEach } from "vitest";

describe("BlockBlobClient", () => {
  let containerName: string;
  let containerClient: ContainerClient;
  let blobName: string;
  let blobClient: BlobClient;
  let blockBlobClient: BlockBlobClient;

  let recorder: Recorder;

  beforeEach(async (ctx) => {
    recorder = new Recorder(ctx);
    await recorder.start(recorderEnvSetup);
    await recorder.addSanitizers(
      {
        uriSanitizers,
        removeHeaderSanitizer: { headersForRemoval: ["x-ms-copy-source", "x-ms-encryption-key"] },
      },
      ["playback", "record"],
    );
    const blobServiceClient = getBSU(recorder);
    containerName = recorder.variable("container", getUniqueName("container"));
    containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.create();
    blobName = recorder.variable("blob", getUniqueName("blob"));
    blobClient = containerClient.getBlobClient(blobName);
    blockBlobClient = blobClient.getBlockBlobClient();
  });

  afterEach(async () => {
    if (containerClient) {
      await containerClient.delete();
    }
    await recorder.stop();
  });

  it("upload with string body and default parameters", async () => {
    const body: string = recorder.variable("randomstring", getUniqueName("randomstring"));
    await blockBlobClient.upload(body, body.length);
    const result = await blobClient.download(0);
    assert.deepStrictEqual(await bodyToString(result, body.length), body);
  });

  it("upload with progress report", async () => {
    const body: string = recorder.variable("randomstring", getUniqueName("randomstring"));
    await blockBlobClient.upload(body, body.length, {
      onProgress: () => {
        /* empty */
      },
    });
    const result = await blobClient.download(0);
    assert.deepStrictEqual(await bodyToString(result, body.length), body);
  });

  it("upload with string body and all parameters set", async () => {
    const body: string = recorder.variable("randomstring", getUniqueName("randomstring"));
    const options = {
      blobCacheControl: "blobCacheControl",
      blobContentDisposition: "blobContentDisposition",
      blobContentEncoding: "blobContentEncoding",
      blobContentLanguage: "blobContentLanguage",
      blobContentType: "blobContentType",
      metadata: {
        keya: "vala",
        keyb: "valb",
      },
    };
    await blockBlobClient.upload(body, body.length, {
      blobHTTPHeaders: options,
      metadata: options.metadata,
      tier: BlockBlobTier.Cool,
    });
    const result = await blobClient.download(0);
    assert.deepStrictEqual(await bodyToString(result, body.length), body);
    assert.deepStrictEqual(result.cacheControl, options.blobCacheControl);
    assert.deepStrictEqual(result.contentDisposition, options.blobContentDisposition);
    assert.deepStrictEqual(result.contentEncoding, options.blobContentEncoding);
    assert.deepStrictEqual(result.contentLanguage, options.blobContentLanguage);
    assert.deepStrictEqual(result.contentType, options.blobContentType);
    assert.deepStrictEqual(result.metadata, options.metadata);

    const gResp = await blobClient.getProperties();
    assert.equal(gResp.accessTier, BlockBlobTier.Cool);
  });

  it("stageBlock", async () => {
    const body = "HelloWorld";
    await blockBlobClient.stageBlock(base64encode("1"), body, body.length);
    await blockBlobClient.stageBlock(base64encode("2"), body, body.length);
    const listResponse = await blockBlobClient.getBlockList("uncommitted");
    assert.equal(listResponse.uncommittedBlocks!.length, 2);
    assert.equal(listResponse.uncommittedBlocks![0].name, base64encode("1"));
    assert.equal(listResponse.uncommittedBlocks![0].size, body.length);
    assert.equal(listResponse.uncommittedBlocks![1].name, base64encode("2"));
    assert.equal(listResponse.uncommittedBlocks![1].size, body.length);
  });

  it("stageBlock with progress report", async () => {
    const body = "HelloWorld";
    await blockBlobClient.stageBlock(base64encode("1"), body, body.length, {
      onProgress: () => {
        /* empty */
      },
    });
    await blockBlobClient.stageBlock(base64encode("2"), body, body.length, {
      onProgress: () => {
        /* empty */
      },
    });
    await blockBlobClient.commitBlockList([base64encode("1"), base64encode("2")]);
    const listResponse = await blockBlobClient.getBlockList("committed");
    assert.equal(listResponse.committedBlocks!.length, 2);
    assert.equal(listResponse.committedBlocks![0].name, base64encode("1"));
    assert.equal(listResponse.committedBlocks![0].size, body.length);
    assert.equal(listResponse.committedBlocks![1].name, base64encode("2"));
    assert.equal(listResponse.committedBlocks![1].size, body.length);
  });

  it("stageBlockFromURL copy source blob as single block", async () => {
    const body = "HelloWorld";
    await blockBlobClient.upload(body, body.length);

    // When in browsers testing with SAS tokens, setAccessPolicy won't work.
    // so only test setAccessPolicy in Node.js environment.
    if (isNodeLike) {
      await containerClient.setAccessPolicy("container");
    }

    const newBlockBlobClient = containerClient.getBlockBlobClient(
      recorder.variable("newblockblob", getUniqueName("newblockblob")),
    );
    await newBlockBlobClient.stageBlockFromURL(base64encode("1"), blockBlobClient.url);

    const listResponse = await newBlockBlobClient.getBlockList("uncommitted");
    assert.equal(listResponse.uncommittedBlocks!.length, 1);
    assert.equal(listResponse.uncommittedBlocks![0].name, base64encode("1"));
    assert.equal(listResponse.uncommittedBlocks![0].size, body.length);
  });

  it("stageBlockFromURL copy source blob as separate blocks", async () => {
    const body = "HelloWorld";
    await blockBlobClient.upload(body, body.length);

    // When in browsers testing with SAS tokens, setAccessPolicy won't work.
    // so only test setAccessPolicy in Node.js environment.
    if (isNodeLike) {
      await containerClient.setAccessPolicy("container");
    }

    const newBlockBlobClient = containerClient.getBlockBlobClient(
      recorder.variable("newblockblob", getUniqueName("newblockblob")),
    );
    await newBlockBlobClient.stageBlockFromURL(base64encode("1"), blockBlobClient.url, 0, 4);
    await newBlockBlobClient.stageBlockFromURL(base64encode("2"), blockBlobClient.url, 4, 4);
    await newBlockBlobClient.stageBlockFromURL(base64encode("3"), blockBlobClient.url, 8, 2);

    const listResponse = await newBlockBlobClient.getBlockList("uncommitted");
    assert.equal(listResponse.uncommittedBlocks!.length, 3);
    assert.equal(listResponse.uncommittedBlocks![0].name, base64encode("1"));
    assert.equal(listResponse.uncommittedBlocks![0].size, 4);
    assert.equal(listResponse.uncommittedBlocks![1].name, base64encode("2"));
    assert.equal(listResponse.uncommittedBlocks![1].size, 4);
    assert.equal(listResponse.uncommittedBlocks![2].name, base64encode("3"));
    assert.equal(listResponse.uncommittedBlocks![2].size, 2);

    await newBlockBlobClient.commitBlockList([
      base64encode("1"),
      base64encode("2"),
      base64encode("3"),
    ]);

    const downloadResponse = await newBlockBlobClient.download(0);
    assert.equal(await bodyToString(downloadResponse, 10), body);
  });

  it("commitBlockList", async () => {
    const body = "HelloWorld";
    await blockBlobClient.stageBlock(base64encode("1"), body, body.length);
    await blockBlobClient.stageBlock(base64encode("2"), body, body.length);
    await blockBlobClient.commitBlockList([base64encode("1"), base64encode("2")]);
    const listResponse = await blockBlobClient.getBlockList("committed");
    assert.equal(listResponse.committedBlocks!.length, 2);
    assert.equal(listResponse.committedBlocks![0].name, base64encode("1"));
    assert.equal(listResponse.committedBlocks![0].size, body.length);
    assert.equal(listResponse.committedBlocks![1].name, base64encode("2"));
    assert.equal(listResponse.committedBlocks![1].size, body.length);
  });

  it("commitBlockList with all parameters set", async () => {
    const body = "HelloWorld";
    await blockBlobClient.stageBlock(base64encode("1"), body, body.length);
    await blockBlobClient.stageBlock(base64encode("2"), body, body.length);

    const options = {
      blobCacheControl: "blobCacheControl",
      blobContentDisposition: "blobContentDisposition",
      blobContentEncoding: "blobContentEncoding",
      blobContentLanguage: "blobContentLanguage",
      blobContentType: "blobContentType",
      metadata: {
        keya: "vala",
        keyb: "valb",
      },
    };
    await blockBlobClient.commitBlockList([base64encode("1"), base64encode("2")], {
      blobHTTPHeaders: options,
      metadata: options.metadata,
      tier: BlockBlobTier.Cool,
    });

    const listResponse = await blockBlobClient.getBlockList("committed");
    assert.equal(listResponse.committedBlocks!.length, 2);
    assert.equal(listResponse.committedBlocks![0].name, base64encode("1"));
    assert.equal(listResponse.committedBlocks![0].size, body.length);
    assert.equal(listResponse.committedBlocks![1].name, base64encode("2"));
    assert.equal(listResponse.committedBlocks![1].size, body.length);

    const result = await blobClient.download(0);
    assert.deepStrictEqual(await bodyToString(result, body.repeat(2).length), body.repeat(2));
    assert.deepStrictEqual(result.cacheControl, options.blobCacheControl);
    assert.deepStrictEqual(result.contentDisposition, options.blobContentDisposition);
    assert.deepStrictEqual(result.contentEncoding, options.blobContentEncoding);
    assert.deepStrictEqual(result.contentLanguage, options.blobContentLanguage);
    assert.deepStrictEqual(result.contentType, options.blobContentType);
    assert.deepStrictEqual(result.metadata, options.metadata);

    const gResp = await blobClient.getProperties();
    assert.equal(gResp.accessTier, BlockBlobTier.Cool);
  });

  it("getBlockList", async () => {
    const body = "HelloWorld";
    await blockBlobClient.stageBlock(base64encode("1"), body, body.length);
    await blockBlobClient.stageBlock(base64encode("2"), body, body.length);
    await blockBlobClient.commitBlockList([base64encode("2")]);
    const listResponse = await blockBlobClient.getBlockList("all");
    assert.equal(listResponse.committedBlocks!.length, 1);
    assert.equal(listResponse.uncommittedBlocks!.length, 0);
    assert.equal(listResponse.committedBlocks![0].name, base64encode("2"));
    assert.equal(listResponse.committedBlocks![0].size, body.length);
  });

  it("commitBlockList with cold tier", async () => {
    const body = "HelloWorld";
    await blockBlobClient.stageBlock(base64encode("1"), body, body.length);
    await blockBlobClient.stageBlock(base64encode("2"), body, body.length);
    await blockBlobClient.commitBlockList([base64encode("1"), base64encode("2")], {
      tier: "Cold",
    });

    const properties = await blockBlobClient.getProperties();
    assert.equal(properties.accessTier, "Cold");

    const result = await blockBlobClient.download(0);
    assert.deepStrictEqual(await bodyToString(result, body.length * 2), "HelloWorldHelloWorld");
  });

  it("can be created with a sas connection string", async (ctx) => {
    if (isNodeLike && !isLiveMode()) {
      ctx.skip();
    }
    const newClient = new BlockBlobClient(
      getSASConnectionStringFromEnvironment(recorder),
      containerName,
      blobName,
    );
    configureBlobStorageClient(recorder, newClient);

    const body: string = recorder.variable("randomstring", getUniqueName("randomstring"));
    await newClient.upload(body, body.length);
    const result = await newClient.download(0);
    assert.deepStrictEqual(await bodyToString(result, body.length), body);
  });

  it("throws error if constructor containerName parameter is empty", async () => {
    try {
      new BlockBlobClient(getSASConnectionStringFromEnvironment(recorder), "", "blobName");
      assert.fail("Expecting an thrown error but didn't get one.");
    } catch (error: any) {
      assert.equal(
        "Expecting non-empty strings for containerName and blobName parameters",
        error.message,
        "Error message is different than expected.",
      );
    }
  });

  it("throws error if constructor blobName parameter is empty", async () => {
    try {
      // tslint:disable-next-line: no-unused-expression
      new BlockBlobClient(getSASConnectionStringFromEnvironment(recorder), "containerName", "");
      assert.fail("Expecting an thrown error but didn't get one.");
    } catch (error: any) {
      assert.equal(
        "Expecting non-empty strings for containerName and blobName parameters",
        error.message,
        "Error message is different than expected.",
      );
    }
  });

  it("upload and download with CPK", async () => {
    const body: string = recorder.variable("randomstring", getUniqueName("randomstring"));
    const options = {
      blobCacheControl: "blobCacheControl",
      blobContentDisposition: "blobContentDisposition",
      blobContentEncoding: "blobContentEncoding",
      blobContentLanguage: "blobContentLanguage",
      blobContentType: "blobContentType",
      metadata: {
        keya: "vala",
        keyb: "valb",
      },
    };
    const uResp = await blockBlobClient.upload(body, body.length, {
      blobHTTPHeaders: options,
      metadata: options.metadata,
      customerProvidedKey: Test_CPK_INFO,
    });
    assert.equal(uResp.encryptionKeySha256, Test_CPK_INFO.encryptionKeySha256);
    const result = await blobClient.download(0, undefined, {
      customerProvidedKey: Test_CPK_INFO,
    });
    assert.deepStrictEqual(await bodyToString(result, body.length), body);
    assert.deepStrictEqual(result.cacheControl, options.blobCacheControl);
    assert.deepStrictEqual(result.contentDisposition, options.blobContentDisposition);
    assert.deepStrictEqual(result.contentEncoding, options.blobContentEncoding);
    assert.deepStrictEqual(result.contentLanguage, options.blobContentLanguage);
    assert.deepStrictEqual(result.contentType, options.blobContentType);
    assert.deepStrictEqual(result.metadata, options.metadata);
  });

  it("stageBlock, stageBlockURL and commitBlockList with CPK", async () => {
    const body = "HelloWorld";
    await blockBlobClient.upload(body, body.length);

    // When in browsers testing with SAS tokens, setAccessPolicy won't work.
    // so only test setAccessPolicy in Node.js environment.
    if (isNodeLike) {
      await containerClient.setAccessPolicy("container");
    }

    const newBlockBlobURL = containerClient.getBlockBlobClient(
      recorder.variable("newblockblob", getUniqueName("newblockblob")),
    );
    const sResp = await newBlockBlobURL.stageBlock(base64encode("1"), body.substring(0, 4), 4, {
      customerProvidedKey: Test_CPK_INFO,
    });
    assert.equal(sResp.encryptionKeySha256, Test_CPK_INFO.encryptionKeySha256);

    const sResp2 = await newBlockBlobURL.stageBlockFromURL(
      base64encode("2"),
      blockBlobClient.url,
      4,
      4,
      { customerProvidedKey: Test_CPK_INFO },
    );
    assert.equal(sResp2.encryptionKeySha256, Test_CPK_INFO.encryptionKeySha256);

    await newBlockBlobURL.stageBlockFromURL(base64encode("3"), blockBlobClient.url, 8, 2, {
      customerProvidedKey: Test_CPK_INFO,
    });

    const listResponse = await newBlockBlobURL.getBlockList("uncommitted");
    assert.equal(listResponse.uncommittedBlocks!.length, 3);
    assert.equal(listResponse.uncommittedBlocks![0].name, base64encode("1"));
    assert.equal(listResponse.uncommittedBlocks![0].size, 4);
    assert.equal(listResponse.uncommittedBlocks![1].name, base64encode("2"));
    assert.equal(listResponse.uncommittedBlocks![1].size, 4);
    assert.equal(listResponse.uncommittedBlocks![2].name, base64encode("3"));
    assert.equal(listResponse.uncommittedBlocks![2].size, 2);

    const cmResp = await newBlockBlobURL.commitBlockList(
      [base64encode("1"), base64encode("2"), base64encode("3")],
      { customerProvidedKey: Test_CPK_INFO },
    );
    assert.equal(cmResp.encryptionKeySha256, Test_CPK_INFO.encryptionKeySha256);

    const downloadResponse = await newBlockBlobURL.download(0, undefined, {
      customerProvidedKey: Test_CPK_INFO,
    });
    assert.equal(await bodyToString(downloadResponse, 10), body);
  });

  it("download without CPK should fail, if upload with CPK", async () => {
    const body: string = recorder.variable("randomstring", getUniqueName("randomstring"));
    await blockBlobClient.upload(body, body.length, {
      customerProvidedKey: Test_CPK_INFO,
    });

    let exceptionCaught = false;
    try {
      await blobClient.download(0);
    } catch (error: any) {
      // HTTP/1.1 409 The blob is encrypted with customer specified encryption, but it was not provided in the request.
      exceptionCaught = true;
    }

    assert.ok(exceptionCaught);
  });

  it("stageBlock with invalid CRC64 should fail", async () => {
    const content = "Hello World!";
    let exceptionCaught = false;
    try {
      await blockBlobClient.stageBlock(base64encode("1"), content, content.length, {
        transactionalContentCrc64: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      });
    } catch (err: any) {
      if (
        err instanceof Error &&
        err.message.startsWith(
          "The CRC64 value specified in the request did not match with the CRC64 value calculated by the server.",
        )
      ) {
        exceptionCaught = true;
      }
    }

    assert.ok(exceptionCaught);
  });

  it("syncUploadFromURL with public source should work", async () => {
    const metadata = {
      key1: "val1",
      key2: "val2",
    };

    await blockBlobClient.syncUploadFromURL("https://azure.github.io/azure-sdk-for-js/index.html", {
      conditions: {
        ifNoneMatch: "*",
      },
      metadata,
    });

    const getRes = await blockBlobClient.getProperties();
    assert.deepStrictEqual(getRes.metadata, metadata);

    try {
      await blockBlobClient.syncUploadFromURL(
        "https://azure.github.io/azure-sdk-for-js/index.html",
        {
          conditions: {
            ifNoneMatch: "*",
          },
          metadata,
        },
      );
      assert.fail();
    } catch (err: any) {
      assert.deepStrictEqual(err.code, "BlobAlreadyExists");
    }
  });

  it("syncUploadFromURL with cold tier should work", async () => {
    await blockBlobClient.syncUploadFromURL("https://azure.github.io/azure-sdk-for-js/index.html", {
      tier: "Cold",
    });

    const properties = await blockBlobClient.getProperties();
    assert.ok(properties.accessTier);
    assert.equal(properties.accessTier!, "Cold");
  });

  it("Upload special content should work", async () => {
    const content =
      "////Upper/blob/empty /another 汉字 ру́сский язы́к ру́сский язы́к عربي/عربى にっぽんご/にほんご . special ~!@#$%^&*()_+`1234567890-={}|[]\\:\";'<>?,/'+%2F'%25%";

    await blockBlobClient.upload(content, content.length);

    const result = await blockBlobClient.download();
    assert.deepStrictEqual(await bodyToString(result), content);
  });
});
