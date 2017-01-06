// Generated by CoffeeScript 1.12.2

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

/**
 * @module request
 */
var Promise, assign, defaults, errors, getRequest, getToken, isEmpty, noop, onlyIf, progress, urlLib, utils;

Promise = require('bluebird');

urlLib = require('url');

assign = require('lodash/assign');

noop = require('lodash/noop');

defaults = require('lodash/defaults');

isEmpty = require('lodash/isEmpty');

errors = require('resin-errors');

getToken = require('resin-token');

utils = require('./utils');

progress = require('./progress');

onlyIf = utils.onlyIf;

module.exports = getRequest = function(arg) {
  var debug, debugRequest, exports, isBrowser, prepareOptions, ref, ref1, ref2, ref3, retries, token;
  ref = arg != null ? arg : {}, token = ref.token, debug = (ref1 = ref.debug) != null ? ref1 : false, retries = (ref2 = ref.retries) != null ? ref2 : 0, isBrowser = (ref3 = ref.isBrowser) != null ? ref3 : false;
  debugRequest = !debug ? noop : utils.debugRequest;
  exports = {};
  prepareOptions = function(options) {
    var baseUrl;
    if (options == null) {
      options = {};
    }
    defaults(options, {
      method: 'GET',
      json: true,
      strictSSL: true,
      headers: {},
      refreshToken: true,
      retries: retries
    });
    baseUrl = options.baseUrl;
    if (options.uri) {
      options.url = options.uri;
      delete options.uri;
    }
    if (urlLib.parse(options.url).protocol != null) {
      delete options.baseUrl;
    }
    return Promise["try"](function() {
      if (!options.refreshToken) {
        return;
      }
      return utils.shouldUpdateToken(token).then(function(shouldUpdateToken) {
        if (!shouldUpdateToken) {
          return;
        }
        return exports.send({
          url: '/whoami',
          baseUrl: baseUrl,
          refreshToken: false
        })["catch"]({
          name: 'ResinRequestError',
          statusCode: 401
        }, function() {
          return token.get().tap(token.remove).then(function(sessionToken) {
            throw new errors.ResinExpiredToken(sessionToken);
          });
        }).get('body').then(token.set);
      });
    }).then(function() {
      return utils.getAuthorizationHeader(token);
    }).then(function(authorizationHeader) {
      if (authorizationHeader != null) {
        options.headers.Authorization = authorizationHeader;
      }
      if (!isEmpty(options.apiKey)) {
        options.url += urlLib.parse(options.url).query != null ? '&' : '?';
        options.url += "apikey=" + options.apiKey;
      }
      return options;
    });
  };

  /**
  	 * @summary Perform an HTTP request to Resin.io
  	 * @function
  	 * @public
  	 *
  	 * @description
  	 * This function automatically handles authorization with Resin.io.
  	 *
  	 * The module scans your environment for a saved session token. Alternatively, you may pass the `apiKey` options. Otherwise, the request is made anonymously.
  	 *
  	 * @param {Object} options - options
  	 * @param {String} [options.method='GET'] - method
  	 * @param {String} options.url - relative url
  	 * @param {String} [options.apiKey] - api key
  	 * @param {*} [options.body] - body
  	 *
  	 * @returns {Promise<Object>} response
  	 *
  	 * @example
  	 * request.send
  	 * 	method: 'GET'
  	 * 	baseUrl: 'https://api.resin.io'
  	 * 	url: '/foo'
  	 * .get('body')
  	 *
  	 * @example
  	 * request.send
  	 * 	method: 'POST'
  	 * 	baseUrl: 'https://api.resin.io'
  	 * 	url: '/bar'
  	 * 	data:
  	 * 		hello: 'world'
  	 * .get('body')
   */
  exports.send = function(options) {
    if (options == null) {
      options = {};
    }
    if (options.timeout == null) {
      options.timeout = 30000;
    }
    return prepareOptions(options).then(utils.requestAsync).then(function(response) {
      return utils.getBody(response).then(function(body) {
        var responseError;
        response = assign({}, response, {
          body: body
        });
        if (utils.isErrorCode(response.statusCode)) {
          responseError = utils.getErrorMessageFromResponse(response);
          debugRequest(options, response);
          throw new errors.ResinRequestError(responseError, response.statusCode);
        }
        return response;
      });
    });
  };

  /**
  	 * @summary Stream an HTTP response from Resin.io.
  	 * @function
  	 * @public
  	 *
  	 * @description
  	 * **Not implemented for the browser.**
  	 * This function emits a `progress` event, passing an object with the following properties:
  	 *
  	 * - `Number percent`: from 0 to 100.
  	 * - `Number total`: total bytes to be transmitted.
  	 * - `Number received`: number of bytes transmitted.
  	 * - `Number eta`: estimated remaining time, in seconds.
  	 *
  	 * The stream may also contain the following custom properties:
  	 *
  	 * - `String .mime`: Equals the value of the `Content-Type` HTTP header.
  	 *
  	 * See `request.send()` for an explanation on how this function handles authentication.
  	 *
  	 * @param {Object} options - options
  	 * @param {String} [options.method='GET'] - method
  	 * @param {String} options.url - relative url
  	 * @param {*} [options.body] - body
  	 *
  	 * @returns {Promise<Stream>} response
  	 *
  	 * @example
  	 * request.stream
  	 * 	method: 'GET'
  	 * 	baseUrl: 'https://img.resin.io'
  	 * 	url: '/download/foo'
  	 * .then (stream) ->
  	 * 	stream.on 'progress', (state) ->
  	 * 		console.log(state)
  	 *
  	 * 	stream.pipe(fs.createWriteStream('/opt/download'))
   */
  exports.stream = onlyIf(!isBrowser)(function(options) {
    var rindle;
    if (options == null) {
      options = {};
    }
    rindle = require('rindle');
    return prepareOptions(options).then(progress.estimate).then(function(download) {
      if (!utils.isErrorCode(download.response.statusCode)) {
        download.mime = download.response.headers.get('Content-Type');
        return download;
      }
      return rindle.extract(download).then(function(data) {
        var responseError;
        responseError = data || 'The request was unsuccessful';
        debugRequest(options, download.response);
        throw new errors.ResinRequestError(responseError, download.response.statusCode);
      });
    });
  });
  return exports;
};

getRequest._setFetch = utils._setFetch;
