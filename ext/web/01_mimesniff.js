// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

// @ts-check
/// <reference path="../../core/internal.d.ts" />
/// <reference path="../../core/lib.deno_core.d.ts" />
/// <reference path="../web/internal.d.ts" />
/// <reference path="../web/lib.deno_web.d.ts" />

import { primordials } from "ext:core/mod.js";
const {
  ArrayPrototypeIncludes,
  MapPrototypeGet,
  MapPrototypeHas,
  MapPrototypeSet,
  RegExpPrototypeTest,
  RegExpPrototypeExec,
  SafeMap,
  SafeMapIterator,
  StringPrototypeReplaceAll,
  StringPrototypeToLowerCase,
} = primordials;

import {
  collectHttpQuotedString,
  collectSequenceOfCodepoints,
  HTTP_QUOTED_STRING_TOKEN_POINT_RE,
  HTTP_TOKEN_CODE_POINT_RE,
  HTTP_WHITESPACE,
  HTTP_WHITESPACE_PREFIX_RE,
  HTTP_WHITESPACE_SUFFIX_RE,
} from "ext:deno_web/00_infra.js";

/**
 * @typedef MimeType
 * @property {string} type
 * @property {string} subtype
 * @property {Map<string,string>} parameters
 */

/**
 * @param {string} input
 * @returns {MimeType | null}
 */
function parseMimeType(input) {
  // 1.
  input = StringPrototypeReplaceAll(input, HTTP_WHITESPACE_PREFIX_RE, "");
  input = StringPrototypeReplaceAll(input, HTTP_WHITESPACE_SUFFIX_RE, "");

  // 2.
  let position = 0;
  const endOfInput = input.length;

  // 3.
  const res1 = collectSequenceOfCodepoints(
    input,
    position,
    (c) => c != "\u002F",
  );
  const type = res1.result;
  position = res1.position;

  // 4.
  if (type === "" || !RegExpPrototypeTest(HTTP_TOKEN_CODE_POINT_RE, type)) {
    return null;
  }

  // 5.
  if (position >= endOfInput) return null;

  // 6.
  position++;

  // 7.
  const res2 = collectSequenceOfCodepoints(
    input,
    position,
    (c) => c != "\u003B",
  );
  let subtype = res2.result;
  position = res2.position;

  // 8.
  subtype = StringPrototypeReplaceAll(subtype, HTTP_WHITESPACE_SUFFIX_RE, "");

  // 9.
  if (
    subtype === "" || !RegExpPrototypeTest(HTTP_TOKEN_CODE_POINT_RE, subtype)
  ) {
    return null;
  }

  // 10.
  const mimeType = {
    type: StringPrototypeToLowerCase(type),
    subtype: StringPrototypeToLowerCase(subtype),
    /** @type {Map<string, string>} */
    parameters: new SafeMap(),
  };

  // 11.
  while (position < endOfInput) {
    // 11.1.
    position++;

    // 11.2.
    const res1 = collectSequenceOfCodepoints(
      input,
      position,
      (c) => ArrayPrototypeIncludes(HTTP_WHITESPACE, c),
    );
    position = res1.position;

    // 11.3.
    const res2 = collectSequenceOfCodepoints(
      input,
      position,
      (c) => c !== "\u003B" && c !== "\u003D",
    );
    let parameterName = res2.result;
    position = res2.position;

    // 11.4.
    parameterName = StringPrototypeToLowerCase(parameterName);

    // 11.5.
    if (position < endOfInput) {
      if (input[position] == "\u003B") continue;
      position++;
    }

    // 11.6.
    if (position >= endOfInput) break;

    // 11.7.
    let parameterValue = null;

    // 11.8.
    if (input[position] === "\u0022") {
      // 11.8.1.
      const res = collectHttpQuotedString(input, position, true);
      parameterValue = res.result;
      position = res.position;

      // 11.8.2.
      position++;
    } else { // 11.9.
      // 11.9.1.
      const res = collectSequenceOfCodepoints(
        input,
        position,
        (c) => c !== "\u003B",
      );
      parameterValue = res.result;
      position = res.position;

      // 11.9.2.
      parameterValue = StringPrototypeReplaceAll(
        parameterValue,
        HTTP_WHITESPACE_SUFFIX_RE,
        "",
      );

      // 11.9.3.
      if (parameterValue === "") continue;
    }

    // 11.10.
    if (
      parameterName !== "" &&
      RegExpPrototypeTest(HTTP_TOKEN_CODE_POINT_RE, parameterName) &&
      RegExpPrototypeTest(
        HTTP_QUOTED_STRING_TOKEN_POINT_RE,
        parameterValue,
      ) &&
      !MapPrototypeHas(mimeType.parameters, parameterName)
    ) {
      MapPrototypeSet(mimeType.parameters, parameterName, parameterValue);
    }
  }

  // 12.
  return mimeType;
}

/**
 * @param {MimeType} mimeType
 * @returns {string}
 */
function essence(mimeType) {
  return `${mimeType.type}/${mimeType.subtype}`;
}

/**
 * @param {MimeType} mimeType
 * @returns {string}
 */
function serializeMimeType(mimeType) {
  let serialization = essence(mimeType);
  for (const param of new SafeMapIterator(mimeType.parameters)) {
    serialization += `;${param[0]}=`;
    let value = param[1];
    if (RegExpPrototypeExec(HTTP_TOKEN_CODE_POINT_RE, value) === null) {
      value = StringPrototypeReplaceAll(value, "\\", "\\\\");
      value = StringPrototypeReplaceAll(value, '"', '\\"');
      value = `"${value}"`;
    }
    serialization += value;
  }
  return serialization;
}

/**
 * Part of the Fetch spec's "extract a MIME type" algorithm
 * (https://fetch.spec.whatwg.org/#concept-header-extract-mime-type).
 * @param {string[] | null} headerValues The result of getting, decoding and
 * splitting the "Content-Type" header.
 * @returns {MimeType | null}
 */
function extractMimeType(headerValues) {
  if (headerValues === null) return null;

  let charset = null;
  let essence_ = null;
  let mimeType = null;
  for (let i = 0; i < headerValues.length; ++i) {
    const value = headerValues[i];
    const temporaryMimeType = parseMimeType(value);
    if (
      temporaryMimeType === null ||
      essence(temporaryMimeType) == "*/*"
    ) {
      continue;
    }
    mimeType = temporaryMimeType;
    if (essence(mimeType) !== essence_) {
      charset = null;
      const newCharset = MapPrototypeGet(mimeType.parameters, "charset");
      if (newCharset !== undefined) {
        charset = newCharset;
      }
      essence_ = essence(mimeType);
    } else {
      if (
        !MapPrototypeHas(mimeType.parameters, "charset") &&
        charset !== null
      ) {
        MapPrototypeSet(mimeType.parameters, "charset", charset);
      }
    }
  }
  return mimeType;
}

export { essence, extractMimeType, parseMimeType, serializeMimeType };
