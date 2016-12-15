// Generated by CoffeeScript 1.12.1

/*
Copyright 2016 Resin.io

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */
var Promise, UNSUPPORTED_REQUEST_PARAMS, assign, includes, notImplemented, parseInt, processBody, processRequestOptions, qs, urlLib;

Promise = require('bluebird');

urlLib = require('url');

qs = require('qs');

parseInt = require('lodash/parseInt');

assign = require('lodash/assign');

includes = require('lodash/includes');


/**
 * @module utils
 */

exports.TOKEN_REFRESH_INTERVAL = 1 * 1000 * 60 * 60;


/**
 * @summary Determine if the token should be updated
 * @function
 * @protected
 *
 * @description
 * This function makes use of a soft user-configurable setting called `tokenRefreshInterval`.
 * That setting doesn't express that the token is "invalid", but represents that it is a good time for the token to be updated *before* it get's outdated.
 *
 * @param {Object} tokenInstance - an instance of `resin-token`
 * @returns {Promise<Boolean>} the token should be updated
 *
 * @example
 * tokenUtils.shouldUpdateToken(tokenInstance).then (shouldUpdateToken) ->
 *		if shouldUpdateToken
 *			console.log('Updating token!')
 */

exports.shouldUpdateToken = function(token) {
  return token.getAge().then(function(age) {
    return age >= exports.TOKEN_REFRESH_INTERVAL;
  });
};


/**
 * @summary Get authorization header content
 * @function
 * @protected
 *
 * @description
 * This promise becomes undefined if no saved token.
 *
 * @param {Object} tokenInstance - an instance of `resin-token`
 * @returns {Promise<String>} authorization header
 *
 * @example
 * utils.getAuthorizationHeader(tokenInstance).then (authorizationHeader) ->
 *		headers =
 *			Authorization: authorizationHeader
 */

exports.getAuthorizationHeader = function(token) {
  return token.get().then(function(sessionToken) {
    if (sessionToken == null) {
      return;
    }
    return "Bearer " + sessionToken;
  });
};


/**
 * @summary Get error message from response
 * @function
 * @protected
 *
 * @param {Object} response - node request response
 * @returns {String} error message
 *
 * @example
 * request
 *		method: 'GET'
 *		url: 'https://foo.bar'
 *	, (error, response) ->
 *		throw error if error?
 *		message = utils.getErrorMessageFromResponse(response)
 */

exports.getErrorMessageFromResponse = function(response) {
  if (!response.body) {
    return 'The request was unsuccessful';
  }
  if (response.body.error != null) {
    return response.body.error.text;
  }
  return response.body;
};


/**
 * @summary Check if the status code represents an error
 * @function
 * @protected
 *
 * @param {Number} statusCode - status code
 * @returns {Boolean} represents an error
 *
 * @example
 * if utils.isErrorCode(400)
 *		console.log('400 is an error code!')
 */

exports.isErrorCode = function(statusCode) {
  return statusCode >= 400;
};


/**
 * @summary Check whether a response body is compressed
 * @function
 * @protected
 *
 * @param {Object} response - request response object
 * @returns {Boolean} whether the response body is compressed
 *
 * @example
 * if utils.isResponseCompressed(response)
 * 	console.log('The response body is compressed')
 */

exports.isResponseCompressed = function(response) {
  return response.headers.get('Content-Encoding') === 'gzip';
};


/**
 * @summary Get response compressed/uncompressed length
 * @function
 * @protected
 *
 * @param {Object} response - request response object
 * @returns {Object} response length
 *
 * @example
 * responseLength = utils.getResponseLength(response)
 * console.log(responseLength.compressed)
 * console.log(responseLength.uncompressed)
 */

exports.getResponseLength = function(response) {
  return {
    uncompressed: parseInt(response.headers.get('Content-Length'), 10) || void 0,
    compressed: parseInt(response.headers.get('X-Transfer-Length'), 10) || void 0
  };
};


/**
 * @summary Print debug information about a request/response.
 * @function
 * @protected
 *
 * @param {Object} options - request options
 * @param {Object} response - request response
 *
 * @example
 * options = {
 * 	method: 'GET'
 *	 url: '/foo'
 * }
 *
 * request(options).spread (response) ->
 * 	utils.debugRequest(options, response)
 */

exports.debugRequest = function(options, response) {
  return console.error(assign({
    statusCode: response.statusCode,
    duration: response.duration
  }, options));
};

UNSUPPORTED_REQUEST_PARAMS = ['qsParseOptions', 'qsStringifyOptions', 'useQuerystring', 'form', 'formData', 'multipart', 'preambleCRLF', 'postambleCRLF', 'jsonReviver', 'jsonReplacer', 'auth', 'oauth', 'aws', 'httpSignature', 'followAllRedirects', 'maxRedirects', 'removeRefererHeader', 'encoding', 'jar', 'agent', 'agentClass', 'agentOptions', 'forever', 'pool', 'localAddress', 'proxy', 'proxyHeaderWhiteList', 'proxyHeaderExclusiveList', 'time', 'har', 'callback'];

processRequestOptions = function(options) {
  var body, headers, i, key, len, opts, params, url;
  if (options == null) {
    options = {};
  }
  url = options.url || options.uri;
  if (options.baseUrl) {
    url = urlLib.resolve(options.baseUrl, url);
  }
  if (options.qs) {
    params = qs.stringify(options.qs);
    url += (url.indexOf('?') >= 0 ? '&' : '?') + params;
  }
  opts = {};
  opts.retries = options.retries;
  opts.method = options.method;
  opts.compress = options.gzip;
  body = options.body, headers = options.headers;
  if (headers == null) {
    headers = {};
  }
  if (options.json && body) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }
  opts.body = body;
  headers['Accept-Encoding'] || (headers['Accept-Encoding'] = 'compress, gzip');
  if (options.followRedirect) {
    opts.redirect = 'follow';
  }
  opts.headers = new Headers(headers);
  if (options.strictSSL === false) {
    throw new Error('`strictSSL` must be true or absent');
  }
  for (i = 0, len = UNSUPPORTED_REQUEST_PARAMS.length; i < len; i++) {
    key = UNSUPPORTED_REQUEST_PARAMS[i];
    if (options[key] != null) {
      throw new Error("The " + key + " param is not supported. Value: " + options[key]);
    }
  }
  opts.mode = 'cors';
  return [url, opts];
};


/**
 * @summary Extract the body from the server response
 * @function
 * @protected
 *
 * @param {Response} response
 *
 * @example
 * utils.getBody(response).then (body) ->
 * 	console.log(body)
 */

exports.getBody = processBody = function(response) {
  return Promise["try"](function() {
    var contentType;
    contentType = response.headers.get('Content-Type');
    if (includes(contentType, 'binary/octet-stream')) {
      if (typeof response.blob === 'function') {
        return response.blob();
      }
      if (typeof response.buffer === 'function') {
        return response.buffer();
      }
      throw new Error('This `fetch` implementation does not support decoding binary streams.');
    }
    if (includes(contentType, 'application/json')) {
      return response.json();
    }
    return response.text();
  });
};


/**
 * @summary The method that keeps partial compatibility with promisified `request` but uses `fetch` behind the scenes.
 * @function
 * @protected
 *
 * @param {Object} options
 *
 * @example
 * utils.requestAsync({ url: 'http://example.com' }).then (response) ->
 * 	console.log(response)
 */

exports.requestAsync = function(options, retriesRemaining) {
  var opts, p, ref, requestTime, timeout, url;
  if (retriesRemaining == null) {
    retriesRemaining = void 0;
  }
  ref = processRequestOptions(options), url = ref[0], opts = ref[1];
  if (retriesRemaining == null) {
    retriesRemaining = opts.retries;
  }
  timeout = opts.timeout;
  delete opts.timeout;
  requestTime = new Date();
  p = fetch(url, opts);
  if (timeout) {
    p = p.timeout(timeout);
  }
  return p.then(function(response) {
    var responseTime;
    responseTime = new Date();
    response.duration = responseTime - requestTime;
    response.statusCode = response.status;
    response.request = {
      headers: options.headers,
      uri: urlLib.parse(url)
    };
    return response;
  })["catch"](function(error) {
    if (retriesRemaining > 0) {
      return exports.requestAsync(options, retriesRemaining - 1);
    } else {
      throw error;
    }
  });
};

exports.notImplemented = notImplemented = function() {
  throw new Error('The method is not implemented.');
};

exports.onlyIf = function(cond) {
  return function(fn) {
    if (cond) {
      return fn;
    } else {
      return notImplemented;
    }
  };
};
