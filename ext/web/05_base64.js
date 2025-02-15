// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

// @ts-check
/// <reference path="../../core/internal.d.ts" />
/// <reference path="../webidl/internal.d.ts" />
/// <reference path="../web/internal.d.ts" />
/// <reference lib="esnext" />

import { core, primordials } from "ext:core/mod.js";
const {
  op_base64_atob,
  op_base64_btoa,
} = core.ensureFastOps();
const {
  ObjectPrototypeIsPrototypeOf,
  TypeErrorPrototype,
} = primordials;

import * as webidl from "ext:deno_webidl/00_webidl.js";
import { DOMException } from "ext:deno_web/01_dom_exception.js";

/**
 * @param {string} data
 * @returns {string}
 */
function atob(data) {
  const prefix = "Failed to execute 'atob'";
  webidl.requiredArguments(arguments.length, 1, prefix);
  data = webidl.converters.DOMString(data, prefix, "Argument 1");
  try {
    return op_base64_atob(data);
  } catch (e) {
    if (ObjectPrototypeIsPrototypeOf(TypeErrorPrototype, e)) {
      throw new DOMException(
        "Failed to decode base64: invalid character",
        "InvalidCharacterError",
      );
    }
    throw e;
  }
}

/**
 * @param {string} data
 * @returns {string}
 */
function btoa(data) {
  const prefix = "Failed to execute 'btoa'";
  webidl.requiredArguments(arguments.length, 1, prefix);
  data = webidl.converters.DOMString(data, prefix, "Argument 1");
  try {
    return op_base64_btoa(data);
  } catch (e) {
    if (ObjectPrototypeIsPrototypeOf(TypeErrorPrototype, e)) {
      throw new DOMException(
        "The string to be encoded contains characters outside of the Latin1 range.",
        "InvalidCharacterError",
      );
    }
    throw e;
  }
}

export { atob, btoa };
