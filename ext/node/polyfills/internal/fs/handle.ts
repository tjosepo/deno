// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

// TODO(petamoriken): enable prefer-primordials for node polyfills
// deno-lint-ignore-file prefer-primordials

import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";
import { promises, read, write } from "node:fs";
import {
  BinaryOptionsArgument,
  FileOptionsArgument,
  ReadOptions,
  TextOptionsArgument,
} from "ext:deno_node/_fs/_fs_common.ts";

interface WriteResult {
  bytesWritten: number;
  buffer: Buffer | string;
}

interface ReadResult {
  bytesRead: number;
  buffer: Buffer;
}

export class FileHandle extends EventEmitter {
  #rid: number;
  constructor(rid: number) {
    super();
    this.rid = rid;
  }

  get fd() {
    return this.rid;
  }

  read(
    buffer: Buffer,
    offset?: number,
    length?: number,
    position?: number | null,
  ): Promise<ReadResult>;
  read(options?: ReadOptions): Promise<ReadResult>;
  read(
    bufferOrOpt: Buffer | ReadOptions,
    offset?: number,
    length?: number,
    position?: number | null,
  ): Promise<ReadResult> {
    if (bufferOrOpt instanceof Buffer) {
      return new Promise((resolve, reject) => {
        read(
          this.fd,
          bufferOrOpt,
          offset,
          length,
          position,
          (err, bytesRead, buffer) => {
            if (err) reject(err);
            else resolve({ buffer: buffer, bytesRead: bytesRead });
          },
        );
      });
    } else {
      return new Promise((resolve, reject) => {
        read(this.fd, bufferOrOpt, (err, bytesRead, buffer) => {
          if (err) reject(err);
          else resolve({ buffer: buffer, bytesRead: bytesRead });
        });
      });
    }
  }

  readFile(
    opt?: TextOptionsArgument | BinaryOptionsArgument | FileOptionsArgument,
  ): Promise<string | Buffer> {
    return promises.readFile(this, opt);
  }

  write(
    buffer: Buffer,
    offset: number,
    length: number,
    position: number,
  ): Promise<WriteResult>;
  write(
    str: string,
    position: number,
    encoding: string,
  ): Promise<WriteResult>;
  write(
    bufferOrStr: Buffer | string,
    offsetOrPosition: number,
    lengthOrEncoding: number | string,
    position?: number,
  ): Promise<WriteResult> {
    if (bufferOrStr instanceof Buffer) {
      const buffer = bufferOrStr;
      const offset = offsetOrPosition;
      const length = lengthOrEncoding;

      return new Promise((resolve, reject) => {
        write(
          this.fd,
          buffer,
          offset,
          length,
          position,
          (err, bytesWritten, buffer) => {
            if (err) reject(err);
            else resolve({ buffer, bytesWritten });
          },
        );
      });
    } else {
      const str = bufferOrStr;
      const position = offsetOrPosition;
      const encoding = lengthOrEncoding;

      return new Promise((resolve, reject) => {
        write(
          this.fd,
          str,
          position,
          encoding,
          (err, bytesWritten, buffer) => {
            if (err) reject(err);
            else resolve({ buffer, bytesWritten });
          },
        );
      });
    }
  }

  close(): Promise<void> {
    // Note that Deno.close is not async
    return Promise.resolve(Deno.close(this.fd));
  }
}

export default {
  FileHandle,
};
