/**
* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved.
 * Oracle Mobile Cloud Service JavaScript SDK for Browsers, Release: 16.4.5.0, E76062-04
*/





(function(g){


/* dev */
"use strict";
/* /dev */
/**
 * Enum values for [Platform.setDeviceState()]{@link Platform#setDeviceState}.
 * @enum
 */
var deviceState =  {
  /**
   * Indicates that the device is offline.
   * @type {Number}
   */
  offline: 0,

    /**
     * Indicates that the device is online and network and battery state allow for unrestricted
     * background processing.
     * @type {Number}
     */
    unrestricted: 1,

    /**
     * Indicates that the device is online and network and battery state allow for only restricted
     * important background processing.
     * @type {Number}
     */
    restricted: 2,

    /**
     * Indicates that the network and battery state do not allow for any background processing.
     * For example, the device may be on a roaming data network or the battery charge level may be low.
     * @type {Number}
     */
    critical: 3
};

var LOG_LEVEL = {
  ERROR: 1,
  INFO: 2,
  VERBOSE: 3
};

var AUTHORIZATION_TYPES = {
  basicAuth: 'basicAuth',
  oAuth: 'oAuth',
  facebookAuth: 'facebookAuth',
  ssoAuth: 'ssoAuth'
};





/**
 * Class that provides network response details.
 * @constructor
 * @global
 */
function NetworkResponse(statusCode, data, headers) {

  /**
   * The network status code.
   * @type {Number}
   */
  this.statusCode = statusCode;

  /**
   * The error data.
   * @type {Object}
   */
  this.data = data;

  /**
   * The response headers.
   * @type {String}
   */
  this.headers = headers;
}

/**
 * Class that provides network storage object details.
 * @constructor
 * @global
 */
function NetworkStorageObject(statusCode, storageObject) {

  /**
   * The network status code.
   * @type {Number}
   */
  this.statusCode = statusCode;

  /**
   * The error data.
   * @type {StorageObject}
   */
  this.storageObject = storageObject;
}

function Logger(){

  this.logLevel = LOG_LEVEL.INFO;
}


Logger.prototype.Exception = function(message){
  this.message = message;
  this.name = "Exception";
  console.error(this.name + " : " + this.message);
};

Logger.prototype.debug = function(tag, message) {
  console.log(tag + ' ' + message);
};

Logger.prototype.error = function(message, object){
  this.log(LOG_LEVEL.ERROR, message, false, object);
};

Logger.prototype.info = function(message, object){
  this.log(LOG_LEVEL.INFO, message, false, object);
};

Logger.prototype.verbose = function(message, object){
  this.log(LOG_LEVEL.VERBOSE, message, false, object);
};

Logger.prototype.warn = function(message, object){
  this.log(LOG_LEVEL.ERROR, message, true, object);
};

Logger.prototype.log = function(level, message, isWarn, object) {
  if(this.logLevel >= level) {
    if(this.logLevel === LOG_LEVEL.ERROR){
      isWarn ? console.warn(message, object) : console.error(message, object);
    } else {
      console.log(message, object);
    }
  }
};


var KEY_STR = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

var HEADERS = {
  ORACLE_MOBILE_DIAGNOSTIC_SESSION_ID: "Oracle-Mobile-DIAGNOSTIC-SESSION-ID",
  ORACLE_MOBILE_DEVICE_ID: "Oracle-Mobile-DEVICE-ID",
  ORACLE_MOBILE_CLIENT_REQUEST_TIME: "Oracle-Mobile-CLIENT-REQUEST-TIME",

  ORACLE_MOBILE_NAME: "Oracle-Mobile-Name",
  ORACLE_MOBILE_CREATED_BY: "Oracle-Mobile-Created-By",
  ORACLE_MOBILE_CREATED_ON: "Oracle-Mobile-Created-On",
  ORACLE_MOBILE_MODIFIED_BY: "Oracle-Mobile-Modified-By",
  ORACLE_MOBILE_MODIFIED_ON: "Oracle-Mobile-Modified-On",

  ORACLE_MOBILE_SYNC_RESOURCE_TYPE: 'Oracle-Mobile-Sync-Resource-Type',
  ORACLE_MOBILE_SYNC_AGENT: "Oracle-Mobile-Sync-Agent",
  LOCATION: "Location",

  ORACLE_MOBILE_APPLICATION_KEY: "Oracle-Mobile-Application-Key",
  ORACLE_MOBILE_BACKEND_ID: "Oracle-Mobile-Backend-Id",
  ORACLE_MOBILE_SOCIAL_IDENTITY_PROVIDER: "Oracle-Mobile-Social-Identity-Provider",
  ORACLE_MOBILE_SOCIAL_ACCESS_TOKEN: "Oracle-Mobile-Social-Access-Token",

  ACCEPT: "Accept",
  CONTENT_TYPE: "Content-Type",
  E_TAG: "ETag",
  IF_MATCH: "If-Match",
  AUTHORIZATION: "Authorization",
  X_USER_IDENTITY_DOMAIN_NAME: "X-USER-IDENTITY-DOMAIN-NAME"
};

var ACCEPT_TYPES = {
  APPLICATION_JSON: "application/json",
  TEXT_PLAIN: "text/plain"
};

var HTTP_METHODS = {
  GET: 'GET',
  PUT: 'PUT',
  PATCH: 'PATCH',
  POST: 'POST',
  DELETE: 'DELETE',
  HEAD: 'HEAD'
};

var RESOURCE_TYPES = {
  ITEM: 'item',
  COLLECTION: 'collection',
  FILE: 'file'
};

var AUTHENTICATION_TYPES = {
  BASIC: 'basicAuth',
  OAUTH: 'oAuth',
  SSO: 'ssoAuth',
  FACEBOOK: 'facebookAuth',
  TOKEN: 'tokenAuth'
};

function removeSpace(input) {
  return input.replace(/ /g, '');
}

function Utils(){
  this.HEADERS = HEADERS;
  this.RESOURCE_TYPES = RESOURCE_TYPES;
  this.HTTP_METHODS = HTTP_METHODS;
  this.ACCEPT_TYPES = ACCEPT_TYPES;
  this.AUTHENTICATION_TYPES = AUTHENTICATION_TYPES;
}

Utils.prototype.uuid = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

Utils.prototype.validateConfiguration = function (input) {
  var prop = input;
  if (/\s/.test(prop) && prop != undefined) {
    prop = removeSpace(input);
  }
  return prop;
};

Utils.prototype.encodeBase64 = function (input) {

  var output = "";
  var chr1, chr2, chr3 = "";
  var enc1, enc2, enc3, enc4 = "";

  var i = 0;
  do {
    chr1 = input.charCodeAt(i++);
    chr2 = input.charCodeAt(i++);
    chr3 = input.charCodeAt(i++);

    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }

    output = output +
      KEY_STR.charAt(enc1) +
      KEY_STR.charAt(enc2) +
      KEY_STR.charAt(enc3) +
      KEY_STR.charAt(enc4);
    chr1 = chr2 = chr3 = "";
    enc1 = enc2 = enc3 = enc4 = "";
  } while (i < input.length);

  return output;
};

Utils.prototype.decodeBase64 = function (input) {

  var output = "";
  var chr1, chr2, chr3 = "";
  var enc1, enc2, enc3, enc4 = "";
  var i = 0;
  var base64test = /[^A-Za-z0-9\+\/\=]/g;
  if (base64test.exec(input)) {
    return null;
  }

  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

  do {
    enc1 = KEY_STR.indexOf(input.charAt(i++));
    enc2 = KEY_STR.indexOf(input.charAt(i++));
    enc3 = KEY_STR.indexOf(input.charAt(i++));
    enc4 = KEY_STR.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 != 64) {
      output = output + String.fromCharCode(chr2);
    }

    if (enc4 != 64) {
      output = output + String.fromCharCode(chr3);
    }

    chr1 = chr2 = chr3 = "";
    enc1 = enc2 = enc3 = enc4 = "";
  } while (i < input.length);
  return output;
};

Utils.prototype.hasValue = function (obj, key, value) {

  return obj.hasOwnProperty(key) && obj[key] === value;
};

Utils.prototype.isEquivalentURL = function (url1, url2){

  if(url1.indexOf("https") === 0 && url2.indexOf("https") === 0){
    url1 = this.getPort(url1) === 443 ? url1.replace(':443', '') : url1;
    url2 = this.getPort(url2) === 443 ? url2.replace(':443', '') : url2;
  } else if(url1.indexOf("https") === -1 && url2.indexOf("https") === -1) {
    url1 = this.getPort(url1) === 80 ? url1.replace(':80', '') : url1;
    url2 = this.getPort(url2) === 80 ? url2.replace(':80', '') : url2;
  }

  return url1.indexOf(url2) === 0;

};

Utils.prototype.getPort = function (url){
  var colonIdx = url.indexOf(':', 7);
  var slashIdx = url.indexOf('/', colonIdx);
  if(colonIdx > 0 && slashIdx == -1){
    slashIdx = url.length;
  }
  var port = url.substr(colonIdx + 1, slashIdx - colonIdx - 1);
  if(port && !isNaN(port*1)){
    return port * 1;
  } else{
    return -1;
  }
};

Utils.prototype.parseHeaders = function (headerStr) {
  var headers = {};
  if (!headerStr) {
    return headers;
  }
  var headerPairs = headerStr.split('\u000d\u000a');
  for (var i = 0, ilen = headerPairs.length; i < ilen; i++) {
    var headerPair = headerPairs[i];
    var index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      headers[headerPair.substring(0, index)] = headerPair.substring(index + 2);
    }
  }
  return headers;
};


/**
 * Base class for platform-specific capabilities. Users may derive from this class to
 * provide implementations specific to their platform.
 * @constructor
 * @abstract
 * @global
 */
function Platform(logger, utils) {

  var _deviceId = utils.uuid();

  this._deviceState = deviceState.unrestricted;
  this._deviceStateChangedCallbacks = [];

  /**
   * Returns a device ID used by [Diagnostics]{@link Diagnostics}.
   * @returns {String} The device ID.
   */
  this.getDeviceId = function() {
    return _deviceId;
  };

  /**
   * Sets the current state of the device. Platform implementations should call this function
   * when the state changes. The state is inspected before background operations
   * like synchronization are performed.
   * @param state {mcs.deviceState} The new state of the device.
   */
  this.setDeviceState = function(state) {
    if(this._deviceState != state) {

      logger.info("Device state changing from " + this._deviceState + " to " + state);

      this._deviceState = state;

      for(var i=0; i<this._deviceStateChangedCallbacks.length; i++) {
        this._deviceStateChangedCallbacks[i](this._deviceState);
      }
    }
  };
}

/**
 * Class that provides the current GPS location of the device.
 * @typedef {Object} Platform~GPSLocation
 * @property {String} latitude - The device's current latitude.
 * @property {String} longitude - The device's current longitude.
 */

/**
 * Returns an object that has the current GPS location of the device or null.
 * @returns {Platform~GPSLocation} The GPS location is available.
 */
Platform.prototype.getGPSLocation = function() {
  return {
    "latitude": null,
    "longitude": null
  };
};

/**
 * Class that provides information about the device.
 * @typedef {Object} Platform~DeviceInformation
 * @property {String} model - The device's model.
 * @property {String} manufacturer - The device's manufacturer.
 * @property {String} osName - The operating system.
 * @property {String} osVersion - The operating system's version.
 * @property {String} osBuild - The operating system's build number.
 * @property {String} carrier - The device's wireless carrier.
 */

/**
 * Returns an object with device information used by [Analytics]{@link Analytics}
 * @returns {Platform~DeviceInformation} The device specific information.
 */
Platform.prototype.getDeviceInformation = function() {
  return {
    "model": "<unknown>",
    "manufacturer": "<unknown>",
    "osName": "<unknown>",
    "osVersion": "<unknown>",
    "osBuild": "<unknown>",
    "carrier": "<unknown>"
  };
};

/**
 * Performs an HTTP request.
 * @param request {Object} The format of the request parameter is identical to the settings parameter in
 * [JQuery's ajax]{@link http://api.jquery.com/jQuery.ajax/} method. However, only the method, url, headers ,data, success
 * and error properties are used.
 * @abstract
 */
Platform.prototype.invokeService = function(request) {
  throw Error("invokeService() not implemented in Platform!");
};

/**
 * Implementors can override this function to allow offline login. [cacheCredentials()]{Platform#cacheCredentials}
 * Should also be overridden to cache the credentials. The default implementation returns false.
 *
 * @param username {String} The user name.
 * @param password {String} The password.
 * @returns {Boolean} True if the username and password are valid, false otherwise.
 */
Platform.prototype.validateCachedCredentials = function(username, password) {
  return false;
};

/**
 * Implementors can override this function to cache user credentials for offline login. The default implementation
 * is a no-op.
 * @param username {String} The user name.
 * @param password {String} The password.
 */
Platform.prototype.cacheCredentials = function(username, password) {
  throw Error("cacheCredentials() not implemented in Platform!");
};


/**
 * Platform class for browser applications. Derives from [Platform]{@link Platform}.
 * @constructor
 * @global
 */
function BrowserPlatform(manager, logger, utils) {
  manager = manager || mcs.mobileBackendManager;
  utils = utils || mcs._utils;
  logger = logger || mcs._logger;

  var queryRegex = (/\?/);
  Platform.call(this, logger, utils);

  this.isBrowser = true;
  this.isCordova = false;

  this.invokeService = function (request) {
    var url = request.url;
    if(this.isBrowser){
      url = url + (queryRegex.test(url) ? "&" : "?" ) + "_=" + new Date().getTime();
    }

    return new Promise(invoke);

    function invoke(resolve, reject){

      var xhr = new XMLHttpRequest();
      xhr.open(request.method, url);

      for (var key in request.headers) {
        if (request.headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, request.headers[key]);
        }
      }

      xhr.withCredentials = true;
      xhr.responseType = request.responseType || 'json';
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          var response = xhr.responseType == '' || xhr.responseType == 'text' ? xhr.responseText : xhr.response;
          var headers = xhr.responseHeaders || utils.parseHeaders(xhr.getAllResponseHeaders());
          var netResponse = new NetworkResponse(xhr.status, response, headers);
          if(manager._config.logHTTP){
            var object = {
              headers: headers,
              body: response
            };
            logger.verbose('Received ' + request.method + ' response from ' + request.url, object);
          }
          if (xhr.status >= 200 && xhr.status <= 299) {
            resolve(netResponse);
          }
          else {
            reject(netResponse);
          }
        }
      };
      xhr.send(request.data);
      if(manager._config.logHTTP){
        var object = {
          headers: request.headers,
          body: request.body
        };
        logger.verbose('Sent ' + request.method + ' request to ' + request.url, object);
      }

    }
  };
}

BrowserPlatform.prototype = Object.create(Platform.prototype);
BrowserPlatform.prototype.constructor = BrowserPlatform;


/**
 * Class that holds an analytics event.
 * @constructor
 * @global
 */
function AnalyticsEvent(name) {

  /**
   * The name of the event.
   * @type(String)
   */
  this.name = name;

  /**
   * The timestamp of the event. The system will populate with the current time by default.
   * @type(String)
   */
  this.timestamp = new Date().toISOString();

  /**
   * The ID of the current session.
   * @type {String}
   */
  this.sessionID = null;
  delete this.sessionID; // Just so that we can document!

  /**
   * Custom caller specifiable properties as key/value strings.
   * @type {Object}
   */
  this.properties = {};
}



/**
 *
 * Class that provides analytics capabilities. Callers should use
 * MobileBackend's [analytics]{@link MobileBackend#analytics} property.
 * @constructor
 * @global
 */
function Analytics(backend, platform, utils, logger) {

    /**
     * Callback invoked after successfully flushing analytics events.
     * @callback Analytics~successCallback
     * @deprecated Use promises instead
     */

    /**
     * Callback invoked on error.
     * @callback Analytics~errorCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param message {String} The HTTP payload from the server, if available, or an error message.
     * @deprecated Use promises instead
     */

    var _backend = backend;
    var _sessionId = null;
    var _events = [];

  /**
   * Returns session ID for current session.
   * @returns {String}
   */
  this.getSessionId = function(){
    return _sessionId;
  };

  this._getEvents = function(){
    return _events;
  };

  /**
   * Starts a new session. If one is in progress, then a new session will not be created.
   */
  this.startSession = function () {
    if (_sessionId == null) {
      _sessionId = utils.uuid();
      this.logNamedEvent('sessionStart').type = 'system';
    }
  };

    /**
     * Ends a session if one exists.
     * @param [successCallback] {Analytics~successCallback} Callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {Analytics~errorCallback} Callback invoked on error (deprecated use promises instead).
     * @return {Promise.<Undefined|NetworkResponse>}
     */
  this.endSession = function (successCallback, errorCallback) {
    if (_sessionId != null) {
      var _this = this;
      _this.logNamedEvent("sessionEnd").type = "system";
      logger.verbose('Deactivate a default session');
      return this.flush().then(flushSuccess, flushError);
    } else {
      if(errorCallback){
        errorCallback(500, 'Session ID is null');
        return undefined;
      } else {
        return Promise.reject(new NetworkResponse(500, 'Session ID is null'));
      }
    }

    function flushSuccess(){
      _sessionId = null;
      if(successCallback){
        successCallback();
      }
    }

    function flushError(exception){
      if(errorCallback){
        errorCallback(exception.statusCode, exception.data);
      } else {
        return Promise.reject(exception);
      }
    }
  };

  /**
   * Creates a new analytics event with the given name.
   * @param name {String} The name of the event.
   * @returns {AnalyticsEvent} The [AnalyticsEvent]{@link AnalyticsEvent} instance that was logged.
   */
  this.logNamedEvent = function (name) {
    var event = new AnalyticsEvent(name);
    this.logEvent(event);
    return event;
  };

  /**
   * Writes out an analytics event. It will implicitly call startSession(),
   * which will add a new event to the list of events for Oracle Mobile Cloud Service to consume
   * @param event {AnalyticsEvent} The event to log.
   * @example event: "GettingStartedJSEvent"
   * @returns {AnalyticsEvent} The [AnalyticsEvent]{@link AnalyticsEvent} instance that was logged.
   */
  this.logEvent = function (event) {
    if (_events.length == 0) {
      _events[0] = this._createContextEvent();
    }

    this.startSession();
    _events[_events.length] = event;
    event.sessionID = _sessionId;

    return event;
  };

      /**
     * Uploads all events to the service if the device is online or caches them locally until the device goes online, at
     * which point they will be uploaded. If a session is in progress it will end.
     * @param [successCallback] {Analytics~successCallback} Callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {Analytics~errorCallback} Callback invoked on error (deprecated use promises instead).
     * @return {Promise.<Object|NetworkResponse>}
     */
  this.flush = function (successCallback, errorCallback) {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].name == "context") {

        var gpsLocation = platform.getGPSLocation();
        if (gpsLocation != null && gpsLocation.latitude != null) {
          _events[i].properties.latitude = gpsLocation.latitude;
        }

        if (gpsLocation != null && gpsLocation.longitude != null) {
          _events[i].properties.longitude = gpsLocation.longitude;
        }
      }
    }

    var eventsString = JSON.stringify(_events);

    var headers = backend.getHttpHeaders();
    headers[utils.HEADERS.CONTENT_TYPE] = utils.ACCEPT_TYPES.APPLICATION_JSON;

    return platform.invokeService({
      method: utils.HTTP_METHODS.POST,
      url: backend.getPlatformUrl("analytics/events"),
      headers: headers,
      data: eventsString
    }).then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess() {
      logger.verbose('Analytics events flushed.');
      _events = [];
      if (successCallback) {
        successCallback();
      }
    }

    function invokeServiceError(response) {
      logger.error('Failed to flush analytics events.');
      if (errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  this._createContextEvent = function () {
    var contextEvent = new AnalyticsEvent("context");
    contextEvent.type = "system";
    contextEvent.properties.timezone = "" + new Date().getTimezoneOffset() * 60;

    var deviceInformation = platform.getDeviceInformation();
    contextEvent.properties.model = deviceInformation.model;
    contextEvent.properties.manufacturer = deviceInformation.manufacturer;
    contextEvent.properties.osName = deviceInformation.osName;
    contextEvent.properties.osVersion = deviceInformation.osVersion;
    contextEvent.properties.osBuild = deviceInformation.osBuild;
    contextEvent.properties.carrier = deviceInformation.carrier;

    return contextEvent;
  };
}


/**
 * Class used to authorize a mobile user against Oracle Mobile Cloud Service.
 * @abstract
 * @constructor
 * @global
 */
function Authorization(backend, appKey, utils, platform, logger) {

   /**
     * Callback invoked after successfully authenticating.
     * @callback Authorization~authenticateSuccessCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param message {String} The HTTP payload from the server, if available, or an error message.
     * @deprecated Use promises instead
     */

    /**
     * Callback invoked on error while authenticating.
     * @callback Authorization~errorCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param message {String} The HTTP payload from the server, if available, or an error message.
     * @deprecated Use promises instead
     */


  if (this.constructor === Authorization) {
    throw new Error("Can't instantiate abstract class!");
  }

  var HEADERS = utils.HEADERS;

  var _accessToken = null;
  var _appKey = utils.validateConfiguration(appKey);
  var _isAnonymous = false;
  var _isAuthorized = false;
  var _anonymousAccessToken = null;

  /**
   * Returns true if a user has been authorized, false otherwise. A user can be authorized by calling authenticate() or authenticateAnonymous().
   * @returns {Boolean}
   */
  Object.defineProperty(this, "isAuthorized", {
    get: function() {
      return _isAuthorized;
    }
  });

  /**
   * Returns the current access token from user credentials.
   * @return current access token from user credentials.
   */
  this.getAccessToken = function () {
    return _accessToken;
  };

  this._setAccessToken = function (token) {
    _accessToken = token;
  };

  this._getApplicationKey = function () {
    return _appKey;
  };

  this._getIsAnonymous = function () {
    return _isAnonymous;
  };

  this._getIsAuthorized = function () {
    return _isAuthorized;
  };

  this._getAnonymousAccessToken = function () {
    return _anonymousAccessToken;
  };

  this._authenticateAnonymousInvoke = function(authorizationToken, headers, url, method, data) {
    var _this = this;

    this.logout();
    headers[HEADERS.AUTHORIZATION] = authorizationToken;
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = _appKey;

    return platform.invokeService({
        url: url,
        method: method,
        headers: headers,
        data: data
      })
      .then(function responseConverter(response){
        return { orgResponse: response, authorizationToken: authorizationToken };
      })
      .then(_this._anonymousTokenResponseConverter, invokeServiceError)
      .then(_this._authenticateAnonymousSuccess);

    function invokeServiceError(response) {
      logger.error("Login failed with error: " + response.statusCode);
      _this._clearState();
      return Promise.reject(response);
    }
  };

  this._authenticateAnonymousSuccess = function(response) {
    logger.info("User logged in anonymously " + response.orgResponse.statusCode);
    _isAnonymous = true;
    _isAuthorized = true;
    _anonymousAccessToken = response.anonymousAccessToken;
    return response.orgResponse;
  };

  this._authenticateSuccess = function(response, accessToken){
    logger.info("User logged in " + response.statusCode);
    _isAnonymous = false;
    _isAuthorized = true;
    _accessToken = accessToken;
  };

  this._authenticateError = function(response){
    logger.error("Login failed with error: " + response.statusCode);
    this._clearState();
  };

  this._clearState = function(){
    _accessToken = null;
    _isAnonymous = false;
    _anonymousAccessToken = null;
    _isAuthorized = false;
  };

  /**
   * Callback invoked after downloading or updating a user resource.
   * @callback Authorization~userSuccessCallback
   * @param statusCode {Number} Any HTTP status code returned from the server, if available.
   * @param user {User} The user resource returned by the service.
   */

  /**
   * Object returned from getCurrentUser().
   * @typedef Authorization~CurrentUserData
   * @property statusCode {Number} Any HTTP status code returned from the server, if available.
   * @property user {User} The user resource returned by the service.
   */

  /**
   * Returns the user resource associated with the logged in user.
   * @param [successCallback] {Authorization~userSuccessCallback} Optional callback invoked on success (deprecated).
   * @param [errorCallback] {Authorization~errorCallback} Optional callback invoked on failure (deprecated).
   * @return {Promise.<Authorization~CurrentUserData|NetworkResponse>}
   * @example <caption>Example usage of mcs.mobileBackend.authorization.getCurrentUser()</caption>
   * mcs.mobileBackend.authorization.getCurrentUser().then(
   * function(data){
 * },
   * function(exception){
 * });
   * // returns statusCode, and the user object on successCallback function from the data parameter.
   {
     "id": "c9a5fdc5-737d-4e93-b292-d258ba334149",
     "username": "DwainDRob",
     "email": "js_sdk@mcs.com",
     "firstName": "Mobile",
     "lastName": "User",
     "properties": {}
   }
   */
  this.getCurrentUser = function(successCallback, errorCallback) {

    return platform.invokeService({
        method: 'GET',
        url: backend.getPlatformUrl("users/~"),
        headers: backend.getHttpHeaders({})
      })
      .then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess(response) {
      var user = new User(response.data);
      if (user.links != null) {
        delete user.links;
      }
      if (successCallback && typeof successCallback === 'function') {
        successCallback(response.statusCode, user);
      }
      return { statusCode: response.statusCode, user: user };
    }

    function invokeServiceError(response) {
      if (errorCallback && typeof errorCallback === 'function') {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };
}

/**
 * Returns true if the access token returned by the service is still valid.
 * @abstract
 * @returns {Boolean}
 */
Authorization.prototype.isTokenValid = function () {
  throw new Error("Abstract method!");
};

/**
 * Callback invoked after successfully authenticating.
 * @callback Authorization~authenticateSuccessCallback
 * @param statusCode {Number} Any HTTP status code returned from the server, if available.
 * @param message {String} The HTTP payload from the server, if available, or an error message.
 */

/**
 * Callback invoked on error while authenticating.
 * @callback Authorization~authenticateErrorCallback
 * @param statusCode {Number} Any HTTP status code returned from the server, if available.
 * @param message {String} The HTTP payload from the server, if available, or an error message.
 */

/**
 * Authenticates an anonymous user against the service. The user remains logged in until logout() is called.
 * @abstract
 * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated).
 * @param [errorCallback] {Authorization~authenticateErrorCallback} Optional callback invoked on failure (deprecated).
 */
Authorization.prototype.authenticateAnonymous = function(successCallback, errorCallback) {
  throw new Error("Abstract method!");
};

/**
 * Authenticates a user with the given credentials against the service. The user remains logged in until logout() is called.
 * @abstract
 */
Authorization.prototype.authenticate = function() {
  throw new Error("Abstract method!");
};
/**
 * Refreshes the authentication token if it has expired. The authentication scheme should support refresh.
 * @abstract
 * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success.
 * @param [errorCallback] {Authorization~errorCallback} Optional callback invoked on failure.
 */
Authorization.prototype.refreshToken = function(successCallback, errorCallback) {
  throw new Error("Abstract method!");
};

/**
 * Logs out the current user and clears credentials and tokens.
 * @abstract
 */
Authorization.prototype.logout = function(){
  throw new Error("Abstract method!");
};

/**
 * Convert response to response token
 * @abstract
 * @param response
 * @private
 * @ignore
 */
Authorization.prototype._anonymousTokenResponseConverter = function(response){
  throw new Error("Abstract method!");
};

/**
 * Return headers
 * @abstract
 * @param headers
 * @private
 * @ignore
 */
Authorization.prototype._getHttpHeaders = function(headers) {
  throw new Error("Abstract method!");
};



/**
 * Class used to authorize a mobile user against Oracle Mobile Cloud Service. Callers should use
 * MobileBackend's [BasicAuthorization()]{@link MobileBackend#authorization} property.
 * Derives from {@link Authorization}.
 * @constructor
 * @global
 */
function BasicAuthorization(config, backend, appKey, utils, platform, logger) {

  Authorization.call(this, backend, appKey, utils, platform, logger);

  var HEADERS = utils.HEADERS;

  var _backendId = utils.validateConfiguration(config.backendId);
  var _anonymousToken = utils.validateConfiguration(config.anonymousToken);

  var _authorizedUserName = null;

  var _this = this;

  /**
   * Returns the username of the current authorized user if any, null otherwise.
   * @type {String}
   */
  this.getAuthorizedUserName = function(){
    return _authorizedUserName;
  };


  /**
   * Authenticates a user with the given credentials against the service. The user remains logged in until logout() is called.
   * @param username {String} The username of the credentials.
   * @param password {String} The password of the credentials.
   * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated).
   * @param [errorCallback] {Authorization~authenticateErrorCallback} Optional callback invoked on failure (deprecated).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.authenticate = function (username, password, successCallback, errorCallback) {

    this.logout();

    if (!username || !password) {
      logger.error('Wrong username or password parameter');
      if (errorCallback) {
        errorCallback(400, 'Bad Request');
        return undefined;
      } else {
        return Promise.reject(new NetworkResponse(400, 'Bad Request'));
      }
    }

    var authorizationToken = "Basic " + utils.encodeBase64(username + ":" + password);

    var headers = {};
    headers[HEADERS.AUTHORIZATION] = authorizationToken;
    headers[HEADERS.ORACLE_MOBILE_BACKEND_ID] = _backendId;
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = _this._getApplicationKey();

    return platform.invokeService({
        url: backend.getPlatformUrl("users/login"),
        method: utils.HTTP_METHODS.GET,
        headers: headers
      })
      .then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess(response){
      _this._authenticateSuccess(response, authorizationToken);
      _authorizedUserName = username;

      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeServiceError(response){
      _this._authenticateError(response);
      if (errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

    /**
     * Authenticates an anonymous user against the service. The user remains logged in until logout() is called.
     * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {Authorization~errorCallback} Optional callback invoked on failure (deprecated use promises instead).
     * @return {Promise.<NetworkResponse|NetworkResponse>}
     */
    this.authenticateAnonymous = function (successCallback, errorCallback) {

    var authorizationToken = 'Basic ' + _anonymousToken;
    var headers = {};
    headers[HEADERS.ORACLE_MOBILE_BACKEND_ID] = _backendId;

    return this._authenticateAnonymousInvoke(authorizationToken,
      headers,
      backend.getPlatformUrl("users/login"),
      utils.HTTP_METHODS.GET)
      .then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess(response) {
      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  this._anonymousTokenResponseConverter = function(response){
    return { orgResponse: response.orgResponse, anonymousAccessToken: response.authorizationToken };
  };


  /**
   * Checks to see if the authorization token is null, undefined, NaN,an empty string (""), 0, or false.
   * @returns {Boolean}
   */
  this.isTokenValid = function () {

    if (this.getAccessToken() !== null && typeof this.getAccessToken() == 'string') {
      logger.info("Authorization token is not null or empty");
      return true;
    }
    else if (this.getAccessToken() == null && typeof this.getAccessToken() !== 'string') {
      logger.info("Authorization token is null and/or empty");
      return false;
    }
  };

  /**
   * For BasicAuth, there is no need to call this function, because the token never expires.
   * This function only exists here because it inherits from the Authorization object, which is also used for other types of authentication in which the token can expire.
   * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {Authorization~authenticateErrorCallback} Optional callback invoked on failure (deprecated use promises instead).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.refreshToken = function(successCallback, errorCallback) {

    if (!this._getIsAuthorized() && !this.isTokenValid()) {
      if (errorCallback && typeof errorCallback === 'function') {
        errorCallback(401, "Please use the authenticate with username/password combination or authenticateAnonymous function before using refreshToken.");
        return undefined;
      } else {
        return Promise.reject(new NetworkResponse(401, "Please use the authenticate with username/password combination or authenticateAnonymous function before using refreshToken."));
      }
    }
    else if (this._getIsAuthorized() && this.isTokenValid()) {
      logger.error("Authenticated token is valid, you do not need to refresh.");
      if (successCallback && typeof successCallback === 'function') {
        successCallback(200, this.getAccessToken());
      }
      return Promise.resolve(new NetworkResponse(200, this.getAccessToken()));
    }
  };

  /**
   * Logs out the current user and clears credentials and tokens.
   */
  this.logout = function() {
    this._clearState();
  };

  this._getHttpHeaders = function(headers) {
    if (this.getAccessToken() !== null && typeof this.getAccessToken() == "string") {
      headers[HEADERS.AUTHORIZATION] = this.getAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_BACKEND_ID] = _backendId;
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY]= _this._getApplicationKey();
  };

  this._getAnonymousHttpHeaders = function (headers) {
    if (this._getAnonymousAccessToken() && typeof this._getAnonymousAccessToken() == "string") {
      headers[HEADERS.AUTHORIZATION] = this._getAnonymousAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_BACKEND_ID] = _backendId;
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = _this._getApplicationKey();
  };

  var baseClearState = this._clearState;
  this._clearState = function(){
    baseClearState.call(this);
    _authorizedUserName = null;
  }
}

BasicAuthorization.prototype = Object.create(Authorization.prototype);
BasicAuthorization.prototype.constructor = BasicAuthorization;



/**
 * Class used to authorize a mobile user against Oracle Mobile Cloud Service. Callers should use
 * MobileBackend's [authorization]{@link MobileBackend#authorization} property.
 * Derives from {@link Authorization}.
 * @constructor
 * @global
 */
function OAuthAuthorization(config, backend, appKey, utils, platform, logger) {

  Authorization.call(this, backend, appKey, utils, platform, logger);

  var HEADERS = utils.HEADERS;

  var _clientId = utils.validateConfiguration(config.clientId);
  var _clientSecret = utils.validateConfiguration(config.clientSecret);

  if(config.hasOwnProperty("userIdentityDomainName")){
    var _tenantName = utils.validateConfiguration(config.userIdentityDomainName);
  }

  var _tokenExpiredTime = null;
  var _authorizedUserName = null;

  var _this = this;

  /**
   * Returns the username of the current authorized user if any, null otherwise.
   * @type {String}
   */
  this.getAuthorizedUserName = function(){
    return _authorizedUserName;
  };

  /**
   * Returns the client ID for the current backend.
   */
  this.getClientId = function(){
    return _clientId;
  };

  /**
   * Returns the tenant name for the current backend.
   */
  this.getTenantName = function(){
    return _tenantName;
  };

  /**
   * Returns the client secret for the current backend.
   */
  this.getClientSecret= function(){
    return _clientSecret;
  };


  /**
   * Authenticates a user with the given credentials against the service. The user remains logged in until logout() is called.
   * @param username {String} The username of the credentials.
   * @param password {String} The password of the credentials.
   * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {Authorization~authenticateErrorCallback} Optional callback invoked on failure (deprecated use promises instead).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.authenticate = function (username, password, successCallback, errorCallback) {

    this.logout();

    if(!username || !password){
      logger.error("Wrong username or password parameter");
      if(errorCallback){
        errorCallback(400, 'Bad Request');
        return undefined;
      } else {
        return Promise.reject(new NetworkResponse(400, 'Bad Request'));
      }
    }

    var authorizationToken = "Basic " + utils.encodeBase64(this.getClientId() + ":" + this.getClientSecret());
    var requestBody = urlEncodeComponent(username, password);

    var headers = {};
    headers[HEADERS.CONTENT_TYPE] = 'application/x-www-form-urlencoded; charset=utf-8';
    headers[HEADERS.AUTHORIZATION] = authorizationToken;
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = this._getApplicationKey();

    if(typeof _this.getTenantName() !== 'undefined'){
      headers[HEADERS.X_USER_IDENTITY_DOMAIN_NAME] = _this.getTenantName();
    }

    return platform.invokeService({
        url: backend.getOAuthTokenUrl(),
        method: utils.HTTP_METHODS.POST,
        headers: headers,
        data: requestBody
      })
      .then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess(response){
      _this._authenticateSuccess(response, response.data.access_token);
      _authorizedUserName = username;

      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeServiceError(response){
      _this._authenticateError(response);
      if (errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

    /**
     * Authenticates an anonymous user against the service. The user remains logged in until logout() is called.
     * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {Authorization~errorCallback} Optional callback invoked on failure (deprecated use promises instead).
     * @return {Promise.<NetworkResponse|NetworkResponse>}
     */
    this.authenticateAnonymous = function (successCallback, errorCallback) {

    var authorizationToken = "Basic " + utils.encodeBase64(this.getClientId() + ":" + this.getClientSecret());
    var headers = {};
    headers[HEADERS.CONTENT_TYPE] = 'application/x-www-form-urlencoded; charset=utf-8';
    if (typeof _this.getTenantName() !== 'undefined') {
      headers[HEADERS.X_USER_IDENTITY_DOMAIN_NAME] = this.getTenantName();
    }

    return this._authenticateAnonymousInvoke(authorizationToken,
      headers,
      backend.getOAuthTokenUrl(),
      utils.HTTP_METHODS.POST,
      'grant_type=client_credentials')
      .then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess(response) {
      _tokenExpiredTime = Date.now() + response.data.expires_in * 1000;

      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  this._anonymousTokenResponseConverter = function(response){
    return { orgResponse: response.orgResponse, anonymousAccessToken: response.orgResponse.data.access_token };
  };

  /**
   * Checks to see if the OAuth token is null, undefined, NaN,an empty string (""), 0,or false. It also checks the timestamp
   * for when the token was first retrieved to see if it was still valid.
   * @returns {Boolean}
   */
  this.isTokenValid = function () {

    if (this.getAccessToken() || this._getAnonymousAccessToken()) {
      logger.verbose("Token is not null or empty");

      var currentTime = Date.now();
      if (currentTime >= _tokenExpiredTime) {
        logger.info("Token has expired");
        return false;
      }
      else {
        logger.verbose("Token is still valid");
        return true;
      }
    } else {
      return false;
    }
  };

  /**
   * Logs out the current user and clears credentials and tokens.
   */
  this.logout = function() {
    this._clearState();
  };

    /**
     * For OAuth, the SDK can not refresh because it does not persist client credentials.
     * This function only exists here because it inherits from the Authorization object, which is also used for other types of authentication in which the token can expire.
     * @param successCallback {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
     * @param errorCallback {Authorization~errorCallback} Optional callback invoked on failure (deprecated use promises instead).
     * @return {Promise.<String|NetworkResponse>}
     */
    this.refreshToken = function(successCallback, errorCallback) {

    var isTokenValid = this.isTokenValid();

    if (isTokenValid && !this.getAccessToken() && this._getIsAnonymous()) {
      if (successCallback) {
        logger.error("Anonymous token is valid, you do not need to refresh.");
        successCallback(200, this._getAnonymousAccessToken());
      }
      return Promise.resolve(new NetworkResponse(200, this._getAnonymousAccessToken()));
    } else if (isTokenValid && !this._getAnonymousAccessToken() && !this._getIsAnonymous()) {
      if (successCallback) {
        logger.error("Authenticated token is valid, you do not need to refresh.");
        successCallback(200, this.getAccessToken());
      }
      return Promise.resolve(new NetworkResponse(200, this._getAnonymousAccessToken()));
    } else {
      logger.error("Token has expired or user has not been authenticate with the service.");
      if (errorCallback) {
        errorCallback(401, "Please use the authenticate with username/password combination or authenticateAnonymous function before using refreshToken.")
      }
      return Promise.resolve(new NetworkResponse(401, "Please use the authenticate with username/password combination or authenticateAnonymous function before using refreshToken."));
    }
  };

  var baseClearState = this._clearState;
  this._clearState = function(){
    baseClearState.call(this);
    _authorizedUserName = null;
    _tokenExpiredTime = Date.now() * 1000;
  };

  function urlEncodeComponent(user,pass){

    var username;
    var password;

    if(user.indexOf("@") > -1){
      username = encodeURIComponent(user).replace(/%20/g,'+');
    }
    else{
      username = encodeURIComponent(user).replace(/%5B/g, '[').replace(/%5D/g, ']');
    }

    if(pass.indexOf("&") > -1){
      password = encodeURIComponent(pass).replace(/%20/g,'+');
    }
    else{
      password = encodeURIComponent(pass).replace(/%5B/g, '[').replace(/%5D/g, ']');
    }

    return "grant_type=password&username=" + username +"&password=" + password;
  }

  this._getHttpHeaders = function (headers) {
    if (this.getAccessToken() !== null && typeof this.getAccessToken() == "string") {
      headers[HEADERS.AUTHORIZATION] = "Bearer " + this.getAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY]= this._getApplicationKey();
  };


  this._getAnonymousHttpHeaders = function (headers) {
    if (this._getAnonymousAccessToken() && typeof this._getAnonymousAccessToken() == "string") {
      headers[HEADERS.AUTHORIZATION] = "Bearer " + this._getAnonymousAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = this._getApplicationKey();
  };


}

OAuthAuthorization.prototype = Object.create(Authorization.prototype);
OAuthAuthorization.prototype.constructor = OAuthAuthorization;



/**
 * Class used to authorize a user against Facebook and use the OAuth token from Facebook
 * to authenicate against Oracle Mobile Cloud Service. Callers should use
 * MobileBackend's [FacebookAuthorization()]{@link MobileBackend#authorization} property.
 * Derives from {@link Authorization}.
 * @constructor
 * @global
 */
function FacebookAuthorization(config, backend, appKey, utils, platform, logger) {
  var HEADERS = utils.HEADERS;

  Authorization.call(this, backend, appKey, utils, platform, logger);

  var _backendId = utils.validateConfiguration(config.backendId);
  var _anonymousToken = utils.validateConfiguration(config.anonymousToken);
  var _facebookAppId = utils.validateConfiguration(config.facebookAppId);

  var expiredTime = null;

  var _this = this;

  /**
   * Returns the Facebook Application Id token for the current backend.
   */
  this.getFacebookAppId = function () {
    return _facebookAppId;
  };

  /**
   * Callback invoked after successfully authenticating.
   * @callback Authorization~authenticateSuccessCallback
   * @param statusCode {Number} Any HTTP status code returned from the server, if available.
   * @param message {String} The HTTP payload from the server, if available, or an error message.
   */

  /**
   * Callback invoked on error while authenticating.
   * @callback Authorization~authenticateErrorCallback
   * @param statusCode {Number} Any HTTP status code returned from the server, if available.
   * @param message {String} The HTTP payload from the server, if available, or an error message.
   */

  /**
   * Authenticates a user with the given credentials against Facebook. The user remains logged in until logout() is called.
   * In the Facebook Developer console you must define the domain that the application will use.
   * in the Facebook Developer UI, When you add a platform for the application, you choose Website and set the site URL to http://localhost/.
   * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {Authorization~authenticateErrorCallback} Optional callback invoked on failure (deprecated use promises instead).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.authenticate = function (successCallback, errorCallback) {

    this.logout();

    if (window.cordova) {
      var metadata = cordova.require('cordova/plugin_list').metadata;

      if (IsInAppBrowserInstalled(metadata) !== true) {
        if (errorCallback != null) {
          errorCallback(100, 'Could not find InAppBrowser plugin, use command "cordova plugin add cordova-plugin-inappbrowser"');
          return undefined;
        } else {
          return Promise.reject(new NetworkResponse(100, 'Could not find InAppBrowser plugin, use command "cordova plugin add cordova-plugin-inappbrowser"'));
        }
      } else {
        return authenticateInvoke(successCallback, errorCallback);
      }
    } else {
      if (errorCallback != null) {
        errorCallback(400, 'Bad Request - This method require Cordova framework');
        return undefined;
      } else {
        return Promise.reject(new NetworkResponse(400, 'Bad Request - This method require Cordova framework'));
      }
    }
  };

  function authenticateInvoke (successCallback, errorCallback){

    return new Promise(invoke)
      .then(invokeSuccess)
      .catch(invokeError);

    function invoke(resolve, reject){
      var clientId = _this.getFacebookAppId();

      var redirect_uri = 'http://localhost/callback';
      var flowUrl = 'https://www.facebook.com/dialog/oauth?client_id=' + clientId + '&redirect_uri=' + redirect_uri + '&response_type=token&scope=' + 'public_profile';
      var browserRef = window.open(flowUrl, '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
      browserRef.show();

      logger.info('Opening InAppBrowser to url: ' + flowUrl);

      browserRef.addEventListener('loadstart', function loadStart(event) {
        if ((event.url).indexOf(redirect_uri) === 0) {
          browserRef.close();
          var callbackResponse = (event.url).split('#')[1];
          var responseParameters = (callbackResponse).split('&');
          var social_token = {};
          for (var i = 0; i < responseParameters.length; i++) {
            social_token[responseParameters[i].split('=')[0]] = responseParameters[i].split('=')[1];
          }
          if (social_token.access_token) {
            expiredTime = Date.now() + social_token.expires_in * 1000;
            resolve(new NetworkResponse(200, social_token));
          } else {
            if ((event.url).indexOf('error_code=100') !== 0 && !_this.isAuthorized) {
              reject(new NetworkResponse(100, 'Cannot authenticate via a web browser'));
            }
          }
        }
      });

      browserRef.addEventListener('exit', function () {
        if (!_this._getIsAuthorized()) {
          reject(new NetworkResponse(100, 'Cannot authenticate via a web browser'));
        }
      })
    }

    function invokeSuccess(response){
      _this._authenticateSuccess(response, response.data.access_token);
      expiredTime = Date.now() + response.data.expires_in * 1000;

      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeError(response){
      _this._authenticateError(response);
      if (errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }

  }

  /**
   * Authenticates an anonymous user against the service. The user remains logged in until logout() is called.
   * @param successCallback {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
   * @param errorCallback {Authorization~authenticateErrorCallback} Optional callback invoked on failure (deprecated use promises instead).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.authenticateAnonymous = function (successCallback, errorCallback) {

    var authorizationToken = 'Basic ' + _anonymousToken;
    var headers = {};
    headers[HEADERS.ORACLE_MOBILE_BACKEND_ID] = _backendId;

    return this._authenticateAnonymousInvoke(authorizationToken,
      headers,
      backend.getPlatformUrl("users/login"),
      utils.HTTP_METHODS.GET)
      .then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess(response) {
      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  this._anonymousTokenResponseConverter = function(response){
    return { orgResponse: response.orgResponse, anonymousAccessToken: response.authorizationToken };
  };

  /**
   * Checks to see if the OAuth token is null, undefined, NaN, AN empty string (''), 0, or false. It also checks the timestamp
   * for when the token was first retrieved to see if it was still valid.
   * @returns {Boolean}
   */
  this.isTokenValid = function () {

  if (this.getAccessToken() || this._getAnonymousAccessToken()) {
    logger.verbose('Token is not null or empty');

    var currentTime = Date.now();
    if (currentTime >= expiredTime) {
      logger.info('Token has expired or user has not been authenticate with the service/Facebook');
      return false;
    }
    else {
      logger.verbose('Token is still valid');
      return true;
    }
  } else {
    return false;
  }
};

  /**
   * Refreshes the authentication token if it has expired from Facebook. The authentication scheme should support refresh.
   * @param successCallback {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
   * @param errorCallback {Authorization~authenticateErrorCallback} Optional callback invoked on failure (deprecated use promises instead).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.refreshToken = function(successCallback,errorCallback) {
    var isTokenValid = _this.isTokenValid();
    if (isTokenValid && this.getAccessToken() == null && this._getIsAnonymous()) {
      if (successCallback) {
        logger.error('Anonymous token is valid, you do not need to refresh.');
        successCallback(200, this._getAnonymousAccessToken());
      }
      return Promise.resolve(new NetworkResponse(200, this._getAnonymousAccessToken()));
    } else if (isTokenValid && this._getAnonymousAccessToken() && !this._getIsAnonymous()) {
      if (successCallback) {
        logger.error('Authenticated token is valid, you do not need to refresh.');
        successCallback(200, this.getAccessToken());
      }
      return Promise.resolve(new NetworkResponse(200, this._getAnonymousAccessToken()));
    } else {
      logger.error('Token is not valid and has expired, refreshing token from Facebook.');
      return this.authenticate(successCallback, errorCallback);
    }
  };

  /**
   * Logs out the current user and clears credentials and tokens.
   */
  this.logout = function() {
    this._clearState();
    expiredTime = Date.now() * 1000;
  };


  this._getHttpHeaders = function(headers) {
    if (this.getAccessToken() != null && typeof this.getAccessToken() == 'string') {
      headers[HEADERS.AUTHORIZATION] = 'Basic ' + _anonymousToken;
      headers[HEADERS.ORACLE_MOBILE_SOCIAL_ACCESS_TOKEN] = this.getAccessToken();
      headers[HEADERS.ORACLE_MOBILE_SOCIAL_IDENTITY_PROVIDER] = 'facebook';
    }

    headers[HEADERS.ORACLE_MOBILE_BACKEND_ID] = _backendId;
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = this._getApplicationKey();
  };


  this._getAnonymousHttpHeaders = function (headers) {

    if (this._getAnonymousAccessToken() && typeof this._getAnonymousAccessToken() == 'string') {
      headers[HEADERS.AUTHORIZATION] = this._getAnonymousAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_BACKEND_ID] = _backendId;
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = this._getApplicationKey();
  }
}


/**
 * Checks to see if the correct plugin is installed into the application.
 * @return {boolean}
 */
var IsInAppBrowserInstalled = function (metadata) {

  var inAppBrowserNames = ['cordova-plugin-inappbrowser', 'org.apache.cordova.inappbrowser'];
  return inAppBrowserNames.some(function (name) {
    return metadata.hasOwnProperty(name);
  });
};

FacebookAuthorization.prototype = Object.create(Authorization.prototype);
FacebookAuthorization.prototype.constructor = FacebookAuthorization;




/**
 * Class used to authorize a mobile user against Oracle Mobile Cloud Service. Callers should use
 * MobileBackend's [SSOAuthAuthorization()]{@link MobileBackend#authorization} property.
 * Derives from {@link Authorization}.
 * @constructor
 * @global
 */

function SSOAuthorization(config, backend, appKey, utils, platform, logger) {
  var HEADERS = utils.HEADERS;

  Authorization.call(this, backend, appKey, utils, platform, logger);

  var _clientId = utils.validateConfiguration(config.clientId);
  var _clientSecret = utils.validateConfiguration(config.clientSecret);

  var domains = {};

  if(config.hasOwnProperty('userIdentityDomainName')){
    var _tenantName = utils.validateConfiguration(config.userIdentityDomainName);
  }

  var expiredTime = null;

  var _this = this;


  /**
   * Returns the client ID for the current backend.
   * @type {String}
   */
  this.getClientId = function(){
    return _clientId;
  };

  /**
   * Returns the tenant name for the current backend.
   * @type {String}
   */
  this.getTenantName = function(){
    return _tenantName;
  };

  /**
   * Returns the client secret for the current backend.
   * @type {String}
   */
  this.getClientSecret= function(){
    return _clientSecret;
  };


     /**
     * Authenticates a user with the given credentials using federated single sign-on. The user remains logged in until logout() is called.
     * You must have SSO enabled for the mobile backend.
     * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {Authorization~errorCallback} Optional callback invoked on failure (deprecated use promises instead).
     * @return {Promise.<NetworkResponse|NetworkResponse>}
     */
  this.authenticate = function(successCallback, errorCallback) {

    this.logout();

    if (window.cordova) {
      var metadata = cordova.require('cordova/plugin_list').metadata;

      if (IsInAppBrowserInstalled(metadata) !== true) {
        if (errorCallback != null) {
          errorCallback(100, 'Could not find InAppBrowser, use command "cordova plugin add cordova-plugin-inappbrowser"');
          return undefined;
        } else {
          return Promise.reject(new NetworkResponse(100, 'Could not find InAppBrowser, use command "cordova plugin add cordova-plugin-inappbrowser"'));
        }
      } else if (!metadata.hasOwnProperty('oracle-mobile-cloud-cookies')) {
        if (errorCallback != null) {
          errorCallback(100, 'Could not find oracle-mobile-cloud-cookies plugin, use command "cordova plugin add {path to oracle plugin}oracle-mobile-cloud-cookies"');
          return undefined;
        } else {
          return Promise.reject(new NetworkResponse(100, 'Could not find oracle-mobile-cloud-cookies plugin, use command "cordova plugin add {path to oracle plugin}oracle-mobile-cloud-cookies"'));
        }
      } else {
        return authenticateInvoke(successCallback, errorCallback);
      }
    } else {
      if (errorCallback != null) {
        errorCallback(400, 'Bad Request - This method require Cordova framework');
        return undefined;
      } else {
        return Promise.reject(400, 'Bad Request - This method require Cordova framework');
      }
    }
  };

  function authenticateInvoke(successCallback, errorCallback){

    return new Promise(invoke)
      .then(invokeSuccess, invokeError);

    function invoke(resolve, reject){
      var sso_token = {};
      var clientId = _this.getClientId();
      var flowUrl = backend.getPlatformUrl('sso/token') + '?clientID=' + clientId + '&format=json';
      var browserRef = window.open(flowUrl, '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
      browserRef.show();

      logger.info('Opening InAppBrowser to url: ' + flowUrl);

      domains = {};

      browserRef.addEventListener('loadstop', function (event) {
        var domain = extractDomain(event.url);
        if (!domains[domain]) {
          domains[domain] = true;
        }
        if (utils.isEquivalentURL(event.url, flowUrl)) {
          console.log('Domains object:', domains);
          browserRef.executeScript({code: 'document.body.innerHTML'},
            function (htmlarray) {
              browserRef.close();
              var html = htmlarray[0];
              var start = html.indexOf('{');
              var end = html.lastIndexOf('}') + 1;
              var json = html.substring(start, end);
              sso_token = JSON.parse(json);
              if (sso_token.access_token !== undefined && sso_token.access_token !== null) {
                resolve(new NetworkResponse(200, sso_token));
              } else if (_this._getIsAuthorized() !== true && sso_token.status >= 401) {
                reject(new NetworkResponse(100, 'Cannot authenticate via a web browser'));
              } else {
                reject(new NetworkResponse(sso_token.status, sso_token))
              }
            });
        }
      });

      browserRef.addEventListener('exit', function () {
        if (_this._getIsAuthorized() !== true || sso_token.status) {
          reject(new NetworkResponse(100, 'Cannot authenticate via a web browser'));
        }
      });
    }

    function invokeSuccess(response){
      _this._authenticateSuccess(response, response.data.access_token);
      expiredTime = Date.now() + response.data.expires_in * 1000;

      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeError(response){
      _this._authenticateError(response);
      if (errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  }

     /**
     * Authenticates an anonymous user against the service. The user remains logged in until logout() is called.
     * @param [successCallback] {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {Authorization~errorCallback} Optional callback invoked on failure (deprecated use promises instead).
     * @return {Promise.<NetworkResponse|NetworkResponse>}
     */
  this.authenticateAnonymous = function (successCallback, errorCallback) {
    var authorizationToken = 'Basic ' + utils.encodeBase64(this.getClientId() + ':' + this.getClientSecret());
    var headers = {};
    headers[HEADERS.CONTENT_TYPE] = 'application/x-www-form-urlencoded; charset=utf-8';
    if (typeof this.getTenantName() !== 'undefined') {
      headers[HEADERS.X_USER_IDENTITY_DOMAIN_NAME] = this.getTenantName();
    }

    return this._authenticateAnonymousInvoke(authorizationToken,
      headers,
      backend.getSSOAuthTokenUrl(),
      utils.HTTP_METHODS.POST,
      'grant_type=client_credentials')
      .then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess(response) {
      expiredTime = Date.now() + response.data.expires_in * 1000;

      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  this._anonymousTokenResponseConverter = function(response){
    return { orgResponse: response.orgResponse, anonymousAccessToken: response.orgResponse.data.access_token };
  };

  /**
   * Checks to see if the correct plugin is installed into the application.
   * @return {boolean}
   */
  var IsInAppBrowserInstalled = function(metadata){

    var inAppBrowserNames = ['cordova-plugin-inappbrowser', 'org.apache.cordova.inappbrowser'];
    return inAppBrowserNames.some(function(name) {
      return metadata.hasOwnProperty(name);
    });
  };

  /**
   * Clears the current session cookies and logs out the user.
   */
  var clearCookies = function(){
    var metadata = cordova.require('cordova/plugin_list').metadata;

    if (!metadata.hasOwnProperty('oracle-mobile-cloud-cookies')) {
      logger.error('Could not find oracle-mobile-cloud-cookies plugin, use command "cordova plugin add {path to oracle plugin}oracle-mobile-cloud-cookies"');
      return;
    }
    var mainUrl = backend.getPlatformUrl('sso/token');
    var mainDomain = extractDomain(mainUrl);
    var cookieName = 'OAMAuthnCookie_' + (mainUrl.indexOf('https') === 0 ? 'https' : 'http');
    clearCookie(mainDomain, cookieName);

    cookieName = 'OAMAuthnCookie_' + mainDomain;
    if(mainUrl.indexOf('443') >= 0){
      cookieName += ':443'
    }
    clearCookie(mainDomain, cookieName);

    for(var domain in domains){
      if(domains.hasOwnProperty(domain)){
        removeCookies(domain);
      }
    }
  };

  function clearCookie(domain, cookieName){
    cordova.plugins.MCSCookies.set(domain, cookieName, '', setSuccess, setError);
    function setSuccess(message) {
      console.log('Cookie ' + cookieName + ' set successful for domain:' + domain, message);
    }
    function setError() { }
  }

  function removeCookies(domain) {
    cordova.plugins.MCSCookies.remove(domain, '^(?!OAM_PREFS)(OAM.*)|^ORA_OSFS_SESSION$', removeSuccess, removeError);

    function removeSuccess(message) {
      console.log('Cookies removed successful for domain:' + domain, message);
    }

    function removeError() { }
  }


  function extractDomain(url) {
    var domain;
    if (url.indexOf('://') > -1) {
      domain = url.split('/')[2];
    }
    else {
      domain = url.split('/')[0];
    }
    domain = domain.split(':')[0];

    return domain;
  }

  /**
   * Checks to see if the OAuth token is null,undefined,NaN,empty string (''),0,false and also checks the timestamp
   * of when the token was first retrieved to see if it was still valid.
   * @returns {Boolean}
   */
  this.isTokenValid = function () {

    if (this.getAccessToken() || this._getAnonymousAccessToken()) {
      logger.verbose( 'Token is not null or empty');

      var currentTime = Date.now();
      if (currentTime >= expiredTime) {
        logger.info( 'Token has expired or user has not been authenticate with the service');
        return false;
      }
      else {
        logger.verbose( 'Token is still valid');
        return true;
      }
    } else {
      return false;
    }
  };

  /**
   * Logs out the current user and clears credentials and tokens and cookies.
   */
  this.logout = function() {
    this._clearState();
    expiredTime = Date.now() * 1000;
    clearCookies();
  };

    /**
     * Refreshes the authentication token if it has expired. The authentication scheme should support refresh.
     * @param successCallback {Authorization~authenticateSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
     * @param errorCallback {Authorization~errorCallback} Optional callback invoked on failure (deprecated use promises instead).
     * @return {Promise.<NetworkResponse|NetworkResponse>}
     */
    this.refreshToken = function(successCallback,errorCallback) {

    var boolean = _this.isTokenValid();

    if (boolean !== false) {
      if (this.getAccessToken() == null && this._getIsAnonymous()) {
        if (successCallback) {
          logger.error( 'Anonymous token is valid, you do not need to refresh.');
          successCallback(200, this._getAnonymousAccessToken());
        }
      }
      if (!this._getAnonymousAccessToken() && !this._getIsAnonymous()) {
        if (successCallback) {
          logger.error( 'Authenticated token is valid, you do not need to refresh.');
          successCallback(200, this.getAccessToken());
        }
      }
    }
    else{
      logger.error( 'Token is not valid and has expired, refreshing token from service.');
      this.authenticate(successCallback, errorCallback);
    }
  };


  this._getHttpHeaders = function (headers) {
    if (this.getAccessToken() !== null && typeof this.getAccessToken() == 'string') {
      headers[HEADERS.AUTHORIZATION] = 'Bearer ' + this.getAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = this._getApplicationKey();
  };


  this._getAnonymousHttpHeaders = function (headers) {
    if (this._getAnonymousAccessToken() && typeof this._getAnonymousAccessToken() == 'string') {
      headers[HEADERS.AUTHORIZATION] = 'Bearer ' + this._getAnonymousAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = this._getApplicationKey();
  };

}


SSOAuthorization.prototype = Object.create(Authorization.prototype);
SSOAuthorization.prototype.constructor = SSOAuthorization;



function ExternalTokenExchangeAuthorization(config, backend, appKey, utils, platform, logger) {

  Authorization.call(this, backend, appKey, utils, platform, logger);

  var HEADERS = utils.HEADERS;

  var _backendId =utils.validateConfiguration(config.backendId);

  var _this = this;

  var _expiredTime = null;
  var _redToken = null;

  /**
   * Authenticates a user with the given credentials using federated single sign-on. The user remains logged in until logout() is called.
   * You must have SSO enabled for the mobile backend.
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   * @ignore
   */
  this.authenticate = function(token) {

    this.logout();

    _redToken = token;

    if (!token) {
      logger.error('Wrong token parameter');
      return Promise.reject(new NetworkResponse(400, 'Bad Request'));
    }

    if(!pako){
      logger.error('Pako library is not installed.');
      return Promise.reject(new NetworkResponse(400, 'Pako library is not installed.'));
    }

    var authorizationToken = "Bearer " + token;

    var headers = backend.getHttpHeaders();
    headers[HEADERS.AUTHORIZATION] = authorizationToken;
    headers[HEADERS.ORACLE_MOBILE_BACKEND_ID] = _backendId;
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = _this._appKey;

    return platform.invokeService({
        url: backend.getPlatformUrl('sso/exchange-token?format=json'),
        method: utils.HTTP_METHODS.GET,
        headers: headers
      })
      .then(invokeServiceSuccess)
      .catch(invokeServiceError);

    function invokeServiceSuccess(response){
      if(response.data.access_token.indexOf('.') >= 0){
        var jwtParts = response.data.access_token.split('.');
        var data =  JSON.parse(atob(jwtParts[1]));
        _expiredTime = new Date(data.exp);
      } else {
        var xml = _this._inflate(response.data.access_token);
        var strDate = _this._getXmlTokenExpiryDate(xml);
        _expiredTime = _this._parseDate(strDate);
       }
      _this._authenticateSuccess(response, response.data.access_token);
      return new NetworkResponse(200, response.data);
    }

    function invokeServiceError(response){
      _this._authenticateError(response);
      return Promise.reject(response);
    }
  };

  /**
   * Authenticates an anonymous user against the service. The user remains logged in until logout() is called.
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   * @ignore
   */
  this.authenticateAnonymous = function () {
    var authorizationToken = 'Basic ' + utils.encodeBase64(_this.getClientId() + ':' + _this.getClientSecret());
    var headers = {};
    headers[HEADERS.CONTENT_TYPE] = 'application/x-www-form-urlencoded; charset=utf-8';
    if (typeof _this.getTenantName() !== 'undefined') {
      headers[HEADERS.X_USER_IDENTITY_DOMAIN_NAME] = _this.getTenantName();
    }

    return _this._authenticateAnonymousInvoke(authorizationToken,
      headers,
      backend.getSSOAuthTokenUrl(),
      utils.HTTP_METHODS.POST,
      'grant_type=client_credentials')
      .then(invokeServiceSuccess);

    function invokeServiceSuccess(response) {
      _expiredTime = Date.now() + response.data.expires_in * 1000;
      return response;
    }
  };

  /**
   * Checks to see if the OAuth token is null,undefined,NaN,empty string (''),0,false and also checks the timestamp
   * of when the token was first retrieved to see if it was still valid.
   * @returns {Boolean}
   * @ignore
   */
  this.isTokenValid = function () {

    if (this.getAccessToken() || this._getAnonymousAccessToken()) {
      logger.verbose( 'Token is not null or empty');

      var currentTime = Date.now();
      if (currentTime >= _expiredTime) {
        logger.info( 'Token has expired or user has not been authenticate with the service');
        return false;
      }
      else {
        logger.verbose( 'Token is still valid');
        return true;
      }
    } else {
      return false;
    }
  };

  /**
   * Logs out the current user and clears credentials and tokens and cookies.
   */
  this.logout = function() {
    _redToken = null;
    this._clearState();
  };

  /**
   * Refreshes the authentication token if it has expired. The authentication scheme should support refresh.
   * @return {Promise.<String|NetworkResponse>}
   * @ignore
   */
  this.refreshToken = function() {

    var boolean = _this.isTokenValid();

    if (boolean !== false) {
      if (_this._accessToken == null && _this._isAnonymous) {
        logger.error( 'Anonymous token is valid, you do not need to refresh.');
        return Promise.resolve(_this._anonymousAccessToken);
      }

      if (!_this._anonymousAccessToken && !_this._isAnonymous) {
        logger.error( 'Authenticated token is valid, you do not need to refresh.');
        return Promise.resolve(_this._accessToken);
      }
    }
    else{
      logger.error( 'Token is not valid and has expired, refreshing token from service.', _redToken);
      return _this.authenticate(_redToken).then(function(){
        return _this._accessToken;
      });
    }
  };


  this._getHttpHeaders = function (headers) {
    if (this.getAccessToken() !== null && typeof this.getAccessToken() == 'string') {
      headers[HEADERS.AUTHORIZATION] = 'Bearer ' + this.getAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = this._getApplicationKey();
  };

  this._getAnonymousHttpHeaders = function (headers) {
    if (this._getAnonymousAccessToken() && typeof this._getAnonymousAccessToken() == 'string') {
      headers[HEADERS.AUTHORIZATION] = 'Bearer ' +  this._getAnonymousAccessToken();
    }
    headers[HEADERS.ORACLE_MOBILE_APPLICATION_KEY] = this._getApplicationKey();
  };
}


ExternalTokenExchangeAuthorization.prototype = Object.create(Authorization.prototype);
ExternalTokenExchangeAuthorization.prototype.constructor = ExternalTokenExchangeAuthorization;

ExternalTokenExchangeAuthorization.prototype._inflate = function(data){
  var compressedData = atob(data);
  var array8CompressedData = compressedData.split('').map(function(e) {
    return e.charCodeAt(0);
  });
  var array8Data = pako.inflate(array8CompressedData);
  return String.fromCharCode.apply(null, array8Data);
};

ExternalTokenExchangeAuthorization.prototype._deflate = function(data){
  var array8Token = data.split('').map(function(e) {
    return e.charCodeAt(0);
  });
  var array8CompressedToken = pako.gzip(array8Token);
  return btoa(String.fromCharCode.apply(null, array8CompressedToken));
};

ExternalTokenExchangeAuthorization.prototype._getXmlTokenExpiryDate = function(xml){
  var startIdx = xml.indexOf('NotOnOrAfter="');
  if(startIdx === -1){
    return null;
  }
  startIdx += 14;
  var length = xml.indexOf('"', startIdx) - startIdx;
  return xml.substr(startIdx, length)
};

ExternalTokenExchangeAuthorization.prototype._parseDate = function(date){
  var parts = date.split('T');
  var dateParts = parts[0].split('-');
  var timeParts = parts[1].split(':');
  return new Date(dateParts[0], dateParts[1], dateParts[2], timeParts[0], timeParts[1]);
};

ExternalTokenExchangeAuthorization.prototype._anonymousTokenResponseConverter = function(response){
  return { orgResponse: response.orgResponse, anonymousAccessToken: response.orgResponse.data.access_token };
};



/**
 * Class that enables you to retrieve information on the current user and manage its properties. Callers should use
 * MobileBackend's [User()]{@link MobileBackend#User} property.
 * @constructor
 * @global
 */
function User(user) {


  var _id = user.id;
  var _userName = user.username;
  var firstName = user.firstName;
  var lastName = user.lastName;
  var email = user.email;

  var _properties = {};

  for (var key in user) {
    if (["id", "username", "firstName", "lastName", "email"].indexOf(key) < 0) {
      _properties[key] = user[key];
    }
    if(_properties.links != null) {
      delete _properties.links;
    }
  }

  /**
   * Returns the current user's name.
   *
   * @return Current user's name
   */
  this.getId = function(){
    return _id;
  };


  /**
   * Returns the current user's name.
   *
   * @return Current user's name
   */
  this.getUsername = function(){
    return _userName;
  };
  /**
   * Sets username for current user.
   *
   * @param username Properties associated with current user
   */
  this.setUsername = function(username){
    _userName = username;
  };

  /**
   * Returns the properties of current user.
   *
   * @return properties {} of current user
   */
  this.getProperties  = function(){
    return _properties;
  };
  /**
   * Sets properties for current user.
   *
   * @param key {String} the key in the properties object
   * @param value {String} the value of the key in the properties object
   *
   */
  this.setProperties = function(key,value){
    var obj = this.getProperties(); //outside (non-recursive) call, use "data" as our base object
    var ka = key.split(/\./); //split the key by the dots
    if (ka.length < 2) {
      obj[ka[0]] = value; //only one part (no dots) in key, just set value
    } else {
      if (!obj[ka[0]]) obj[ka[0]] = {}; //create our "new" base obj if it doesn't exist
      obj = obj[ka.shift()]; //remove the new "base" obj from string array, and hold actual object for recursive call
      this.setProperties(ka.join("."),value); //join the remaining parts back up with dots, and recursively set data on our new "base" obj
    }
  };

  /**
   * Returns first name for current user.
   */
  this.getFirstName = function(){
    return firstName;
  };

  /**
   * Sets first name for current user.
   *
   * @param firstname Properties associated with current user
   */
  this.setFirstName = function(firstname){
    firstName = firstname;
  };

  /**
   * Returns last name for current user.
   */
  this.getLastName = function(){
    return lastName;
  };

  /**
   * Sets last name for current user.
   *
   * @param lastname Properties associated with current user
   */
  this.setLastName = function(lastname){
    lastName = lastname;
  };

  /**
   * Returns email address for current user.
   */
  this.getEmail = function(){
    return email;
  };

  /**
   * Sets the email address property of current user.
   *
   * @return email properties of current user
   */
  this.setEmail = function(Email){
    email = Email;
  };
  /**
   * Sets password for current user.
   *
   * @param password Properties associated with current user
   */

  /**
   * Returns the password property for current user.
   */

}



/**
 * Class that provides diagnostics capabilities. Callers should use
 * MobileBackend's [Diagnostics()]{@link MobileBackend#Diagnostics} property.
 * @constructor
 * @global
 */
function Diagnostics(platform, utils) {

  var HEADERS = utils.HEADERS;
  var _sessionId = utils.uuid();

  this._getHttpHeaders = function(headers) {
    headers[HEADERS.ORACLE_MOBILE_DIAGNOSTIC_SESSION_ID] = this.getSessionId();
    headers[HEADERS.ORACLE_MOBILE_DEVICE_ID] = platform.getDeviceId();
    headers[HEADERS.ORACLE_MOBILE_CLIENT_REQUEST_TIME] = new Date().toISOString();
  };

  /**
   * Returns the session ID or process ID of the Diagnostics event.
   * @return process id for the Diagnostics session.
   */
  this.getSessionId = function(){
    return _sessionId;
  }
}

/**
 * This class provides a way to invoke custom API endpoints for the
 * currently active mobile backend. Callers should use
 * MobileBackend's [CustomCode()]{@link MobileBackend#CustomCode} property.
 * @constructor
 * @private
 * @global
 */
function CustomCode(backend, utils, platform) {
    /**
     * Callback invoked after successfully flushing analytics events.
     * @callback CustomCode~successCallback
     * @deprecated Use promises instead
     */

    /**
     * Callback invoked on error.
     * @callback CustomCode~errorCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param message {String} The HTTP payload from the server, if available, or an error message.
     * @deprecated Use promises instead
     */

  /**
   * @ignore
   * @type {{GET: string, POST: string, PUT: string, DELETE: string}}
   */
  var httpMethods = {GET: 'GET', POST: 'POST', PUT: 'PUT', DELETE: 'DELETE'};

  var _backend = backend;

  function checkParameters(params, comparison) {
    return isJSON(params) && params && params != undefined && typeof params == comparison;
  }

  function isJSON(params) {
    if (typeof params != 'string')
      params = JSON.stringify(params);

    try {
      JSON.parse(params);
      return true;
    } catch (e) {
      return false;
    }
  }


    /**
     * Allows the user to call custom Code defined on the UI and assigned to the backend defined by the user
     * This custom endpoint should return data only in JSON format.
     * @param path {String} The path of the endpoint following the platform prefix, i.e. {BaseUrl}/mobile/custom/{path to the custom API endpoint}.
     * @param method {String} HTTP method that is invoked.
     * @param data {Object} Data that is inserted into the call on the server for POST and PUT methods. Only accepts a JSON object and/or JavaScript array.
     * @param [successCallback] {CustomCode~successCallback} Optional callback invoked on success that returns the status code and the data from the request (deprecated use promises instead).
     * @param [errorCallback] {CustomCode~errorCallback} Optional callback invoked on failure that returns the status code and the data from the request (deprecated use promises instead).
     * @return {Promise.<NetworkResponse|NetworkResponse>}
     * @example path: "TasksAPI/tasks/100"
     * @example method: "GET,POST,PUT,DELETE"
     * @example data:  {
        "name": "Complete reports",
        "completed": false,
        "priority": "high",
        "dueDate": "2015-03-15T17:00:00Z"
      }
     * These methods must be defined in the custom API for these methods to work.
     * @example <caption>Example usage of mcs.MobileBackend.invokeCustomCodeJSONRequest()</caption>
     mcs.MobileBackend.customCode
     .invokeCustomCodeJSONRequest('TaskApi1/tasks/100' ,'GET' ,null)
     .then(invokeSuccess, invokeError);

   function invokeSuccess(response) {
      console.log(response.data);// returns object in JSON format
    }

   function invokeError(response) {

    }
   {
      "name": "Complete reports",
      "completed": false,
      "priority": "high",
      "dueDate": "2015-03-15T17:00:00Z"
    }
   */
  this.invokeCustomCodeJSONRequest = function (path, method, data, successCallback, errorCallback) {
    if (method in httpMethods) {

      if(method === httpMethods.DELETE && data){
        if (errorCallback != null) {
          errorCallback(500, 'DELETE method content body');
          return undefined;
        } else {
          return Promise.reject(new NetworkResponse(500, 'DELETE method content body'));
        }
      }

      var headers = _backend.getHttpHeaders();
      headers[utils.HEADERS.CONTENT_TYPE] = 'application/json';

      var customData = data ? JSON.stringify(data) : null;

      return platform.invokeService({
        method: method,
        url: _backend.getCustomCodeUrl(path),
        headers: headers,
        data: customData
      }).then(invokeServiceSuccess, invokeServiceError);
    } else {
      if (errorCallback != null) {
        errorCallback(501, 'Method Not Implemented');
        return undefined;
      } else {
        return Promise.reject(new NetworkResponse(501, 'Method Not Implemented'));
      }
    }

    function invokeServiceSuccess(response) {
      if (successCallback) {
        successCallback(response.statusCode, response.data, response.headers);
      }
      return response;
    }

    function invokeServiceError(response) {
      if (errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };
}


/**
 * Represents a mobile backend in Oracle Mobile Cloud Service and provides access to all capabilities of the backend.
 * Callers should use MobileBackendManager's [getMobileBackend()]{@link MobileBackendManager#getMobileBackend} method.
 * @constructor
 * @global
 */
function MobileBackend(manager, name, config, platform, utils, logger, persistence) {
  var _this = this;

  var AUTHENTICATION_TYPES = utils.AUTHENTICATION_TYPES;
  var PLATFORM_PATH = 'mobile/platform';
  var CUSTOM_CODE_PATH = 'mobile/custom';


  this._config = config;
  this._baseUrl = utils.validateConfiguration(this._config.baseUrl);


  var _authenticationType = null;


  this._getCustomCodeUri = function(path){
    var url = "/" + CUSTOM_CODE_PATH;
    if (strEndsWith(path,"/")) {
      path = path.slice(0, -1);
    }

    return url +  '/' + path;
  };

  /**
   * The name of the MobileBackend as read from the configuration.
   * @type {String}
   * @name MobileBackend#name
   * @readonly
   */
  this.name = name;


  /**
   * Get current authorization object.
   * @returns {Authorization}
   */
  this.authorization = null;

  /**
   * Current authorization object.
   * @type {Authorization}
   * @name MobileBackend#Authorization
   * @readonly
   * @deprecated Will be removed in next version. Use {@link MobileBackend#authorization} instead.
   */
  Object.defineProperty(this, "Authorization", {
    get: function() {
      return _this.authorization;
    }
  });

  /**
   * Returns the Diagnostics object that enables end-end debugging across application and cloud.
   * @returns {Diagnostics}
   */
  this.diagnostics = new Diagnostics(platform, utils);

  /**
   * Returns the Diagnostics object that enables end-end debugging across application and cloud.
   * @type {Diagnostics}
   * @name MobileBackend#Diagnostics
   * @deprecated Will be deleted in next version. Use {@link MobileBackend#diagnostics} instead.
   */
  Object.defineProperty(this, "Diagnostics", {
    get: function() {
      return _this.diagnostics;
    }
  });

  /**
   * Returns the CustomCode object that enables calls to custom APIs.
   * @returns {CustomCode}
   */
  this.customCode = new CustomCode(this, utils, platform);

  /**
   * Returns the CustomCode object that enables calls to custom APIs.
   * @type {CustomCode}
   * @name MobileBackend#CustomCode
   * @readonly
   * @deprecated Will be deleted in next version. Use {@link MobileBackend#customCode} instead.
   */
  Object.defineProperty(this, "CustomCode", {
    get: function() {
      return _this.customCode;
    }
  });

  /**
   * Returns the Analytics object that enables capture of mobile analytics events.
   * @returns {Analytics}
   */
  this.analytics = new Analytics(this, platform, utils, logger);

  /**
   * Returns the Analytics object that enables capture of mobile analytics events.
   * @type {Analytics}
   * @name MobileBackend#Analytics
   * @readonly
   * @deprecated Will be deleted in next version. Use {@link MobileBackend#analytics} instead.
   */
  Object.defineProperty(this, "Analytics", {
    get: function() {
      return _this.analytics;
    }
  });

  /**
   * Returns the Storage object that provides cloud-based object storage capabilities.
   * @returns {Storage}
   */
  this.storage = new Storage(this, utils, platform, logger);

  /**
   * Returns the Storage object that provides cloud-based object storage capabilities.
   * @type {Storage}
   * @name MobileBackend#Storage
   * @readonly
   * @deprecated Will be deleted in next version. Use {@link MobileBackend#storage} instead.
   */
  Object.defineProperty(this, "Storage", {
    get: function() {
      return _this.storage;
    }
  });

  if(persistence) {
    /**
     * Returns the Synchronization object that provides caching and synchronization capabilities.
     * @readonly
     * @name MobileBackend#synchronization
     * @type {Synchronization}
     * @deprecated Will be deleted in next version. Use {@link MobileBackend#synchronization} instead.
     */
    Object.defineProperty(this, "Synchronization", {
      get: function () {
        return _this.synchronization;
      }
    });

    /**
     * Returns the Synchronization object that provides caching and synchronization capabilities.
     * @returns {Synchronization}
     */
    this.synchronization = new Synchronization(manager, this, this._config.synchronization, utils, platform, persistence);
  }

  if(Notifications){
    /**
     * Returns the Notifications object that provides notification capabilities.
     * @returns {Notifications}
     */
    this.notifications = new Notifications(this, utils, platform, logger);

    /**
     * Returns the Notifications object that provides notification capabilities.
     * @type {Notifications}
     * @name MobileBackend#Notifications
     * @readonly
     * @deprecated Will be deleted in next version. Use {@link MobileBackend#notifications} instead.
     */
    Object.defineProperty(this, "Notifications", {
      get: function() {
        return _this.notifications;
      }
    });
  }

  /**
   * Returns an instance of the application configuration object.
   * Callers can download the configuration from the service by invoking loadAppConfig().
   * @returns {Object}
   */
  this.appConfig = {};

  /**
   * Returns an instance of the application configuration object.
   * Callers can download the configuration from the service by invoking loadAppConfig().
   * @deprecated Will be deleted in next version. Use {@link MobileBackend#appConfig} instead.
   * @name MobileBackend#AppConfig
   * @readonly
   * @type {Object}
   */
  Object.defineProperty(this, "AppConfig", {
    get: function() {
      return _this.appConfig;
    }
  });

  /**
   * Constructs a full URL by prepending the prefix for platform API REST endpoints to the given endpoint path.
   * @param path {String} The relative path of the endpoint following the platform prefix, i.e. {BaseUrl}/mobile/platform.
   * @returns {String} The full URL.
   */
  this.getPlatformUrl = function (path) {

    var url = _this._config.baseUrl;
    if(_authenticationType == "ssoAuth" && strEndsWith(_this._config.baseUrl,"1")){
      url = url.substring(0, url.length - 4) + "7777";
    }

    url = utils.validateConfiguration(url) + "/" + PLATFORM_PATH;
    if (!strEndsWith(url, "/")) {
      url += "/";
    }
    return url + path;
  };


  /**
   * Constructs a full URL by prepending the prefix for custom API REST endpoints to the given endpoint path.
   * @param path {String} The relative path of the endpoint following the platform prefix, i.e. {BaseUrl}/mobile/custom.
   * @returns {String} The full URL.
   */
  this.getCustomCodeUrl = function (path) {
    return utils.validateConfiguration(_this._config.baseUrl) + _this._getCustomCodeUri(path);
  };

  /**
   * Constructs a full URL, including the prefix, for the OAuth token endpoint.
   * @returns {String} The full URL for the OAuth token endpoint.
   */
  this.getOAuthTokenUrl = function () {
    var tokenUri = utils.validateConfiguration(this._config.authorization.oAuth.tokenEndpoint);
    if(!strEndsWith(tokenUri,"/")) {
      tokenUri += "/"
    }
    return tokenUri;
  };

  /**
   * Constructs a full URL, including the prefix, for the SSO token endpoint.
   * @returns {String} The full URL for the SSO token endpoint.
   */
  this.getSSOAuthTokenUrl = function () {
    var tokenUri = utils.validateConfiguration(_this._config.authorization.ssoAuth.tokenEndpoint);
    if(!strEndsWith(tokenUri,"/")) {
      tokenUri += "/"
    }
    return tokenUri;
  };

  /**
   * Populates auth and diagnostics HTTP headers for making REST calls to a mobile backend.
   * @param [headers] {Object} An optional object with which to populate with the headers.
   * @returns {Object} The headers parameter that is passed in. If not provided, a new object with the populated
   * headers as properties of that object is created.
   */
  this.getHttpHeaders = function (headers) {
    if (headers == null) {
      headers = {};
    }

    _this.diagnostics._getHttpHeaders(headers);

    if(_this.authorization) {

      if (_this.authorization._getIsAuthorized() && _this.authorization._getIsAnonymous()) {
        _this.authorization._getAnonymousHttpHeaders(headers);
      }
      else {
        _this.authorization._getHttpHeaders(headers);
      }
    }

    return headers;
  };


  /**
   * Returns the Authentication type.
   * @return {String} Authentication type
   * @deprecated Will be deleted in next version. Use {@link MobileBackend#getAuthenticationType} instead.
   */
  this.getAuthenticationTypeVariable = function(){
    return _authenticationType;
  };

  /**
   * Sets Authentication variable for MobileBackend.
   * @param type
   * @deprecated Will be deleted in next version. Use {@link MobileBackend#setAuthenticationType} instead.
   */
  this.setAuthenticationTypeVariable = function(type){
    _authenticationType = type;
  };

  /**
   * Returns the Authentication type.
   * @return {String} Authentication type
   */
  this.getAuthenticationType = function(){
    return _authenticationType;
  };

  /**
   * Returns the Authorization object that provides authorization capabilities and access to user properties.
   * @param {string} type.
   * For Basic Authentication, you would specify "basicAuth" to use the Basic Authentication security schema.
   * For OAuth authentication, you would specify "oAuth" to use OAuth Authentication security schema.
   * If you put any type other than those two, it will throw an Exception stating that the type of Authentication that you provided
   * is not supported at this time.
   * @type {Authorization}
   * @example <caption>Example usage of mobileBackend.setAuthenticationType()</caption>
   * @example var mobileBackend = mcs.mobileBackendManager.getMobileBackend('YOUR_BACKEND_NAME');
   * @example mobileBackend.setAuthenicationType("basicAuth");
   * //Basic Authorization schema
   * @example mobileBackend.setAuthenicationType("oAuth");
   * //OAuth Authorization schema
   * @example mobileBackend.setAuthenicationType("facebookAuth");
   * //Facebook Authorization schema
   * @example mobileBackend.setAuthenicationType("ssoAuth");
   * //Single Sign On Authorization schema
   * @example mobileBackend.setAuthenicationType("tokenAuth");
   * //Token Exchange Authorization schema
   */
  this.setAuthenticationType = function(type) {

    var authType = utils.validateConfiguration(type);

    _this.authorization = null;

    if (!_this._config.authorization.hasOwnProperty(authType)) {
      throw logger.Exception("No Authentication Type called " + type +
        " is defined in MobileBackendManager.config " + "\n" +
        "check MobileBackendManager.config in authorization object for the following objects:" + "\n" +
        AUTHENTICATION_TYPES.BASIC + "\n" +
        AUTHENTICATION_TYPES.OAUTH + "\n"+
        AUTHENTICATION_TYPES.FACEBOOK + "\n"+
        AUTHENTICATION_TYPES.TOKEN + "\n"+
        AUTHENTICATION_TYPES.SSO);
    }

    if (_this.authorization && _this.authorization._getIsAuthorized()) {
      _this.authorization.logout();
    }

    if (authType === AUTHENTICATION_TYPES.BASIC) {
      _this.authorization = new BasicAuthorization(_this._config.authorization.basicAuth, _this, _this._config.applicationKey, utils, platform, logger);
      logger.info(  "Your Authentication type: " + authType);
      _authenticationType = authType;
    }
    else if (authType === AUTHENTICATION_TYPES.OAUTH) {
      _this.authorization = new OAuthAuthorization(_this._config.authorization.oAuth, _this, _this._config.applicationKey, utils, platform, logger);
      logger.info(  "Your Authentication type: " + authType);
      _authenticationType = authType;
    }
    else if(authType === AUTHENTICATION_TYPES.FACEBOOK){
      _this.authorization = new FacebookAuthorization(_this._config.authorization.facebookAuth,_this, _this._config.applicationKey, utils, platform, logger);
      logger.info(  "Your Authentication type: " + authType);
      _authenticationType = authType;
    }
    else if(authType === AUTHENTICATION_TYPES.SSO){
      _this.authorization = new SSOAuthorization(_this._config.authorization.ssoAuth, _this, _this._config.applicationKey, utils, platform, logger);
      logger.info( "Your Authentication type: " + authType);
      _authenticationType = authType;
    } else if(authType === AUTHENTICATION_TYPES.TOKEN){
      _this.authorization = new ExternalTokenExchangeAuthorization(_this._config.authorization.tokenAuth, _this, _this._config.applicationKey, utils, platform, logger);
      logger.info( "Your Authentication type: " + authType);
      _authenticationType = authType;
    }
    return _this.authorization;
  };

    /**
     * Callback invoked after downloading the application configuration.
     * @callback MobileBackend~appConfigSuccessCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param appConfig {Object} The downloaded application configuration object.
     * @deprecated Use promises instead
     */

    /**
     * Callback invoked on an error while downloading the application configuration.
     * @callback MobileBackend~errorCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param message {String} The HTTP payload from the server, if available, or an error message.
     * @deprecated Use promises instead
     */

    /**
     * Downloads the configuration from the service. The AppConfig property will contain the downloaded configuration.
     * @param [successCallback] {MobileBackend~appConfigSuccessCallback} Optional callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {MobileBackend~errorCallback} Optional callback invoked on failure (deprecated use promises instead).
     * @return {Promise.<NetworkResponse|NetworkResponse>}
     */
  this.loadAppConfig = function(successCallback, errorCallback) {

    if (!_this.authorization._getIsAuthorized()) {
      return _this.authorization.authenticateAnonymous()
        .then(loadAppConfig)
        .then(loadAppConfigSuccess, loadAppConfigFail);
    } else {
      return loadAppConfig()
        .then(loadAppConfigSuccess, loadAppConfigFail);
    }

    function loadAppConfigSuccess(response){
      if(successCallback){
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function loadAppConfigFail(response){
      if(errorCallback != null) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }

    function loadAppConfig() {

      var headers = _this.getHttpHeaders();
      headers["Content-Type"] = "application/json";

      return platform.invokeService({
        method: 'GET',
        url: _this.getPlatformUrl("appconfig/client"),
        headers: headers
      }).catch(invokeServiceFail);

      function invokeServiceFail(response){
        logger.error("App config download failed! with status code: " + response.statusCode);
        return Promise.reject(response);
      }
    }
  };

  /*
   * Checks to see if the string ends with a suffix.
   * @return {boolean}
   */
  function strEndsWith(str, suffix) {
    return str.match(suffix + '$') == suffix;
  }
}


/**
 * The entry-point into the Oracle Mobile Cloud Service SDK. The MobileBackendManager has a singleton from which MobileBackend
 * objects can be accessed, which in turn provide access to Analytics, Storage, Auth and other capabilities. The
 * singleton can be accessed as {@link mcs.mobileBackendManager}.
 * @global
 * @constructor
 */
function MobileBackendManager(logger, utils, sync) {

  var POLICIES_MAP = {
    fetchPolicy: {
      persistencePropertyName: 'fetchPolicy',
      FETCH_FROM_CACHE_SCHEDULE_REFRESH: 'FETCH_FROM_CACHE_SCHEDULE_REFRESH',
      FETCH_FROM_SERVICE_IF_ONLINE: 'FETCH_FROM_SERVICE_IF_ONLINE',
      FETCH_FROM_CACHE: 'FETCH_FROM_CACHE',
      FETCH_FROM_SERVICE: 'FETCH_FROM_SERVICE',
      FETCH_FROM_SERVICE_ON_CACHE_MISS: 'FETCH_FROM_SERVICE_ON_CACHE_MISS',
      FETCH_FROM_SERVICE_ON_CACHE_MISS_OR_EXPIRY: 'FETCH_FROM_SERVICE_ON_CACHE_MISS_OR_EXPIRY',
      FETCH_WITH_REFRESH: 'FETCH_WITH_REFRESH'
    },
    evictionPolicy: {
      persistencePropertyName: 'evictionPolicy',
      EVICT_ON_EXPIRY_AT_STARTUP: 'EVICT_ON_EXPIRY_AT_STARTUP',
      MANUAL_EVICTION: 'MANUAL_EVICTION'
    },
    expirationPolicy: {
      persistencePropertyName: 'expirationPolicy',
      EXPIRE_ON_RESTART: 'EXPIRE_ON_RESTART',
      EXPIRE_AFTER: 'EXPIRE_AFTER',
      NEVER_EXPIRE: 'NEVER_EXPIRE'
    },
    updatePolicy: {
      persistencePropertyName: 'updatePolicy',
      QUEUE_IF_OFFLINE: 'QUEUE_IF_OFFLINE',
      UPDATE_IF_ONLINE: 'UPDATE_IF_ONLINE'
    },
    refreshPolicy: {
      persistencePropertyName: 'refreshPolicy',
      PeriodicallyRefreshExpiredResource: ''
    },
    conflictResolutionPolicy: {
      persistencePropertyName: 'conflictResolutionPolicy',
      SERVER_WINS: 'SERVER_WINS',
      PRESERVE_CONFLICT: 'PRESERVE_CONFLICT',
      CLIENT_WINS: 'CLIENT_WINS'
    },
    noCache: {
      persistencePropertyName: 'noCache',
      'false': false,
      'true': true
    }
  };
  var _config = null;
  var _mobileBackends = {};

  if(sync) {
    var _originalIsOnline = sync.options.isOnline;
    var _isOffline = false;

    sync.options.isOnline = function () {
      return _isOffline === false ? _originalIsOnline() : !_isOffline;
    };

    this._setOfflineMode = function (isOffline) {
      _isOffline = (typeof isOffline === 'boolean') ? isOffline : true;
    };
  }

  /**
   * The platform implementation to use in the application. Callers can derive from [Platform]{@link Platform} to provide a
   * specific implementation for device state and capabilities.
   * @type {Platform}
   * @name MobileBackendManager#platform
   */
  this.platform = null;

  Object.defineProperty(this, "_config", {
    get: function() {
      return _config;
    }
  });

  /**
   * Sets the configuration for the application. The configuration should be set once before any MobileBackend is accessed.
   * @param name {String} The name of the MobileBackend.
   * @param config {OracleMobileCloudConfig} The Oracle mobile cloud configuration object.
   * @returns {MobileBackend} A MobileBackend object with the specified name.
   */
  this.returnMobileBackend = function (name, config) {

    if (g.cordova) {
      this.platform = new CordovaPlatform(this, logger, utils);
      logger.info("The Cordova platform is set!");
    }
    else {
      this.platform = new BrowserPlatform(this, logger, utils);
      logger.info("The Browser platform is set!");
    }

    this.setConfig(config);
    logger.info("The config has been set and now it has the backend defined in the config " +
      "as the point of entry for the " +
      "rest of the functions you need to call.");

    return this.getMobileBackend(name);

  };

  /**
   * Create and return mobile backend.
   * @param name {String} The name of the MobileBackend.
   * @returns {MobileBackend} A MobileBackend object with the specified name.
   */
  this.getMobileBackend = function(name) {

    if(!this.platform){
      logger.error('Platform was not initialized, please initialize mcs.mobileBackendManager.platform');
      return null;
    }

    if(!_config){
      logger.error('Mobile Backend Manager was not configured, please set config by mcs.mobileBackendManager.setConfig method');
      return null;
    }

    name = utils.validateConfiguration(name);

    if (_mobileBackends[name] != null) {
      return _mobileBackends[name];
    }

    if(_config.mobileBackends[name]){
      var backend = new MobileBackend(this, name, _config.mobileBackends[name], this.platform, utils, logger, sync);
      _mobileBackends[name] = backend;
      return backend;
    } else {
      logger.error('No mobile backend called " + name + " is defined in MobileBackendManager.config');
      return null;
    }
  };

  /**
   * Sets the configuration for the application. The configuration should be set once before any MobileBackend is accessed.
   * @param config {OracleMobileCloudConfig} The Oracle mobile cloud configuration object.
   */
  this.setConfig = function(config) {

    if (config.logLevel != null) {
      logger.logLevel = config.logLevel;
    }
    _config = config;
    _mobileBackends = {};

      if (sync) {
        _initPersistenceConfiguration(config);
      } else if(config.sync || config.syncExpress){
        logger.verbose('WARNING, sync script was not included on page, switch caching off');
      }
    };

  function _initPersistenceConfiguration(config) {
    var syncConfig = null;
    if(config.sync && config.syncExpress) {
      logger.error('WARNING, configuration contains two types synchronisation, please choose one of those types, switch caching off');
      sync.options.off = true;
      return;
    } else if(config.sync){
      syncConfig = config.sync;
      sync.options.module = new sync.MCSHandler();
    } else if(config.syncExpress){
      syncConfig = config.syncExpress;
      var isOracleRestHandler = config.syncExpress.handler && config.syncExpress.handler === 'OracleRestHandler';
      sync.options.module = isOracleRestHandler ? new sync.OracleRestHandler() : new sync.RequestHandler();
    } else {
      logger.verbose('WARNING, missing synchronization configuration, switch caching off');
      sync.options.off = true;
      return;
    }
    sync.options.off = false;

    var persistenceConfig = {
      default: {
        conflictResolutionPolicy: 'CLIENT_WINS',
        expirationPolicy: 'NEVER_EXPIRE',
        expireAfter: 600,
        evictionPolicy: 'MANUAL_EVICTION',
        fetchPolicy: 'FETCH_FROM_SERVICE_IF_ONLINE',
        updatePolicy: 'QUEUE_IF_OFFLINE',
        noCache: false
      },
      periodicRefreshInterval: syncConfig.backgroundRefreshPolicy || 120,
      policies: []
    };

    var mcsPolicies = syncConfig.policies;

    for (var idx in mcsPolicies) {
      if (mcsPolicies.hasOwnProperty(idx)) {
        var policy = mcsPolicies[idx];
        if (policy) {
          persistenceConfig.policies.push(_getPersistencePolicy(policy));
        } else {
          logger.error('WARNING, the ' + policy + 'policy was not found in accepted policies.');
        }
      }
    }
    sync.options.Policies = persistenceConfig;
    sync.options.dbFirst = false;
    sync.options.maxSyncAttempts = 1;
    sync.options.autoRemoveAfterReachMaxAttemps = true;
  }

  function _getPersistencePolicy(mcsPolicy) {
    var policy = {};
    policy.path = mcsPolicy.path;
    for (var prop in mcsPolicy) {
      if (mcsPolicy.hasOwnProperty(prop) && prop !== 'path') {
        var persMap = POLICIES_MAP[prop];
        if (!persMap) {
          logger.error('WARNING, the ' + prop + ' policy was not found in accepted policies.');
        } else if (persMap[mcsPolicy[prop]] === undefined) {
          logger.error('WARNING, the ' + prop + ' policy value ' + mcsPolicy[prop] + ' was not found in accepted policy values.');
        } else {
          policy[persMap.persistencePropertyName] = persMap[mcsPolicy[prop]];
        }
      }
    }
    return policy;
  }
}


/**
 * Class that represents a storage object resource that can be used to store data.
 * @param storageCollection {StorageCollection}
 * @param json {Object}
 * @constructor
 * @global
 */
function StorageObject(storageCollection, json, utils, platform) {

  utils = utils || mcs._utils;
  platform = platform || mcs.mobileBackendManager.platform;

  var HEADERS = utils.HEADERS;
  var _backend = storageCollection._getBackend();
  var _storageCollection = storageCollection;
  var _payload = null;

  if (json) {
    /**
     * A service generated ID for the StorageObject. The ID is unique in the StorageCollection.
     * @type {String}
     */
    this.id = json.id;

    /**
     * A user-provided name for the StorageObject. A StorageCollection may have multiple StorageObjects with the same name.
     * @type {String}
     */
    this.name = json.name;

    /**
     * The length of data content in bytes stored in the StorageObject.
     * @type {Number}
     */
    this.contentLength = json.contentLength;

    /**
     * The media-type associated with the StorageObject.
     * @type {String}
     */
    this.contentType = json.contentType;

    this._eTag = json.eTag;

    /**
     * The name of the user who created the StorageObject.
     * @type {String}
     */
    this.createdBy = json.createdBy;

    /**
     * Server-generated timestamp when the StorageObject was created.
     * @type {String}
     */
    this.createdOn = json.createdOn;

    /**
     * The name of the user who last updated the StorageObject.
     * @type {String}
     */
    this.modifiedBy = json.modifiedBy;

    /**
     * Server-generated timestamp for when the StorageObject was last updated.
     * @type {String}
     */
    this.modifiedOn = json.modifiedOn;
  }

  /**
   * Returns the current StorageObject payload.
   *
   * @return Current Storage object payload.
   */
  this.getPayload = function(){
    return _payload;
  };


  /**
   * Sets the payload for the StorageObject.
   *
   * @param payload The payload to be associated with StorageObject.
   */
  this.setPayload =function(payload){
    _payload = payload;
  };

  /**
   * Returns the current StorageCollection.
   *
   * @return Current StorageCollection.
   */
  this.getstorageCollection = function(){
    return _storageCollection;
  };

  /**
   * Returns the current StorageObject.
   *
   * @return Current StorageObject.
   */
  this.getStorage = function(){
    return _storageCollection._storage
  };

  /**
   * Loads a StorageObject's contents from an object.
   * @param payload {Object} The object to load from.
   * @example payload: "Hello my name is Mia and this is a sample payload".
   * @param contentType {String} The media-type to associate with the content.
   * @example contentType: "application/json,text/plain".
   */
  this.loadPayload = function(payload, contentType) {

    _payload = payload;
    this.contentType = contentType;

    if(this.contentType == utils.ACCEPT_TYPES.TEXT_PLAIN){
      if(typeof _payload == "string") {
        _payload = payload;
      }
    }
    else if(this.contentType == utils.ACCEPT_TYPES.APPLICATION_JSON){
      if(typeof _payload == "string"){
        _payload = payload;
      }
      else if(typeof _payload == "object"){
        _payload = JSON.stringify(payload);
      }
    }
    this.contentLength = _payload.length;
  };
  /**
   * Sets a StorageObject's display name from an object.
   * @param name {Object} The object's name to be associated with the object.
   * @example name: "JSFile中国人.txt"
   * @returns The object's name in UTC-8 ASCII format.
   */
  this.setDisplayName = function(name){
    this.name = name;
  };

  /**
   * Returns a StorageObject's display name from an object.
   *
   * @returns String object's name decoded if encoded into the MobileBackend.
   */
  this.getDisplayName = function(){
    return this.name;
  };


    /**
     * Callback invoked after successfully downloading data from the StorageObject.
     * @callback StorageObject~readPayloadSuccessCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param mobileObject {Object} The downloaded data.
     * @deprecated Use promises instead
     */

    /**
     * Callback invoked on error.
     * @callback StorageObject~errorCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param message {String} The HTTP payload from the server, if available, or an error message.
     * @deprecated Use promises instead
     */

    /**
     * Returns the contents of the StorageObject. May result in a download from the service if the contents were not
     * previously downloaded.
     * @param [successCallback] {StorageObject~readPayloadSuccessCallback} Callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {StorageObject~errorCallback} Callback invoked on error (deprecated use promises instead).
     * @param objectType responseType for the XMLHttpRequest Object.
     * @return {Promise.<StorageObject|NetworkResponse>}
     */
  this.readPayload = function(successCallback, errorCallback, objectType) {
    var payload = this.getPayload();
    if(!payload) {
      if(typeof successCallback != 'function'){
        objectType = successCallback;
      }

      var storageObject = this;

      var headers = _backend.getHttpHeaders({});

      var url = "storage/collections/" + _storageCollection.id + "/objects/" + this.id;

      if(_storageCollection.userId != null && _storageCollection.getUserIsolated()){
        url += "?user=" + _storageCollection.userId;
      }

      return platform.invokeService({
        method: utils.HTTP_METHODS.GET,
        url: _backend.getPlatformUrl(url),
        headers: headers,
        responseType: objectType || "blob"
      }).then(invokeServiceSuccess,invokeServiceError);
    } else {
      if(successCallback && typeof successCallback == 'function'){
        successCallback(payload);
      }
      return Promise.resolve(payload);
    }

    function invokeServiceSuccess(response) {
      storageObject.setPayload(response.data);
      storageObject.name = decodeURI(response.headers[HEADERS.ORACLE_MOBILE_NAME]);
      storageObject._eTag = response.headers[HEADERS.E_TAG];
      storageObject.contentLength = response.data.size;
      storageObject.contentType = response.headers[HEADERS.CONTENT_TYPE];
      storageObject.createdBy = response.headers[HEADERS.ORACLE_MOBILE_CREATED_BY];
      storageObject.createdOn = response.headers[HEADERS.ORACLE_MOBILE_CREATED_ON];
      storageObject.modifiedBy = response.headers[HEADERS.ORACLE_MOBILE_MODIFIED_BY];
      storageObject.modifiedOn = response.headers[HEADERS.ORACLE_MOBILE_MODIFIED_ON];

      if (successCallback && typeof successCallback == 'function') {
        successCallback(storageObject);
      }
      return storageObject;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };
}

/**
 * Class that holds the StorageCollection resource. StorageCollections contain Storage objects
 * which can be used to persist data in Oracle Mobile Cloud Service.
 * @constructor
 * @global
 */
function StorageCollection(name, userId, userIsolated, backend, utils, logger, platform) {
  var HEADERS = utils.HEADERS;
  var APPLICATION_JSON = utils.ACCEPT_TYPES.APPLICATION_JSON;
  var HTTP_METHODS = utils.HTTP_METHODS;

  var _backend = backend;
  var _storage = backend.storage;
  var _userId = utils.validateConfiguration(userId);
  var _data;

  var storageCollection = this;

  this._getBackend = function(){
    return _backend;
  };

  this.getUserIsolated = function(){
    return _data ? _data.userIsolated : userIsolated;
  };

  /**
   * Returns storage object for current storage collection.
   *
   * @return storage object data for current storage collection.
   */
  this.getStorage = function(){
    return _storage;
  };

  /**
   * Returns user ID for current storage collection.
   *
   * @return user ID for current storage collection.
   */
  this.getUserId = function(){
    return _userId ;
  };

  /**
   * Returns data for current storage collection.
   *
   * @return storage object data for current storage collection.
   */
  this.getData = function(){
    return _data;
  };

  /**
   * The ID of the StorageCollection.
   * @type {String}
   */
  this.id = utils.validateConfiguration(name);

  /**
   * The description of the StorageCollection.
   * @type {String}
   * @deprecated Will be deleted in next version. Use {@link StorageCollection#getDescription} instead.
   */
  this.description = _data ? _data.description : undefined;

  /**
   * The description of the StorageCollection.
   * @type {String}
   * @deprecated Will be deleted in next version. Use {@link StorageCollection#getDescription} instead.
   */
  this.getDescription = function(){
    if(_data){
      return _data.description;
    } else {
      logger.warn('Collection metadata was not loaded yet, please use StorageCollection.loadMetadata to load metadata.');
    }
  };

  /**
   * Load collection metadata
   * @returns {Promise<StorageCollection|NetworkResponse>}
   */
  this.loadMetadata = function(){
    var _this = this;
    var headers = _backend.getHttpHeaders({});
    headers[utils.HEADERS.ACCEPT] = utils.ACCEPT_TYPES.APPLICATION_JSON;

    return platform.invokeService({
      method: utils.HTTP_METHODS.GET,
      url: _backend.getPlatformUrl("storage/collections/" + _this.id),
      headers: headers
    }).then(invokeServiceSuccess);

    function invokeServiceSuccess(response) {
      _data = response.data;
      _this.description = response.data.description;
      return _this;
    }
  };

  /**
   * Callback invoked after successfully fetching a StorageCollection.
   * @callback StorageCollection~getObjectsSuccessCallback
   * @param objects {Array} An array of StorageObjects downloaded from the service.
   * @deprecated Use promises instead
   */

  /**
   * Callback invoked on error.
   * @callback StorageCollection~errorCallback
   * @param statusCode {Number} Any HTTP status code returned from the server, if available.
   * @param message {String} The HTTP payload from the server, if available, or an error message.
   * @deprecated Use promises instead
   */

  /**
   * Returns a list of StorageObjects from the collection starting from the offset and up to the limit. The service may return fewer objects.
   * 1. If the collection is a shared collection, then it returns all the objects.
   * 2. If the collection is a user-isolated collection and allObjects is false, then it returns the objects which belong to the current user.
   * 3. If the collection is user-isolated collection, and allObjects is true, then it returns all the objects in the collection.
   * The objects might belong to other users. And the current user MUST have READ_ALL or READ_WRITE_ALL permission.
   * @param offset {Number} The offset at which to start. Must be greater than 0.
   * @example offset: "3"
   * @param limit {Number} The max number of StorageObjects to return. Must be non-negative.
   * @example limit: "2"
   * @param allObjects {Boolean} whether to return all the objects in the list.
   * @param [successCallback] {StorageCollection~getObjectsSuccessCallback} Callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {StorageCollection~errorCallback} Callback invoked on error (deprecated use promises instead).
   * @return {Promise.<Array.<StorageObject>|NetworkResponse>}
   */
  this.getObjects = function(offset, limit, allObjects, successCallback, errorCallback) {

    var headers = _backend.getHttpHeaders({});
    headers[HEADERS.ACCEPT] = APPLICATION_JSON;
    if(typeof allObjects === 'function'){
      logger.warn('getObjects method without allObjects parameter is deprecated in next version, please add allObjects parameter.');
      errorCallback = successCallback;
      successCallback = allObjects;
      allObjects = false;
    }

    var url = "storage/collections/" + storageCollection.id + "/objects";

    if(offset != null) {
      url += url.indexOf("?") == -1 ? "?" : "&";
      url += "offset=" + offset;
    }

    if(limit != null) {
      url += url.indexOf("?") == -1 ? "?" : "&";
      url += "limit=" + limit;
    }

    if (storageCollection.getUserIsolated() && allObjects) {
      url += url.indexOf("?") == -1 ? "?" : "&";
      url += "user=*";
    } else if(storageCollection.getUserIsolated() && storageCollection.getUserId() != null){
      url += url.indexOf("?") == -1 ? "?" : "&";
      url += "user=" + storageCollection.getUserId();
    }

    return platform.invokeService({
      method: HTTP_METHODS.GET,
      url: _backend.getPlatformUrl(url),
      headers: headers
    }).then(invokeServiceSuccess, invokeServiceError);

    function invokeServiceSuccess(response) {
      var objects = [];
      var objectsJson = response.data;
      for(var i=0; i<objectsJson.items.length; i++) {
        objects[objects.length] = new StorageObject(storageCollection, objectsJson.items[i], utils, platform);
      }

      if (successCallback) {
        successCallback(objects);
      }
      return objects;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  /**
   * Callback invoked after successfully fetching a StorageObject.
   * @callback StorageCollection~storageObjectSuccessCallback
   * @param object {StorageObject} The StorageObject downloaded from the service.
   * @deprecated Use promises instead
   */

  /**
   * Returns a StorageObject given its ID. The contents of the object will be downloaded lazily.
   * @example StorageCollection.getObject(id,successCallback,errorCallback,objectType);
   * @param id {String} The ID of the Storage Object to return.
   * @example id: "00e39862-9652-458b-9a82-d1a66cf1a0c7"
   * @param [successCallback] {StorageCollection~storageObjectSuccessCallback} Callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {StorageCollection~errorCallback} Callback invoked on error (deprecated use promises instead).
   * @param objectType {object} responseType for the XMLHttpRequest Object. Default response type if not defined is json.
   * @return {Promise.<StorageObject|NetworkResponse>}
   *
   *
   * @example <caption>Example usage of StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7","blob")</caption>
   *
   * @example StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7","blob");
   * StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7", "blob").then(
   * function(StorageObject){
   * },
   * function(NetworkResponse){
   * });
   *
   * @example StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7","arraybuffer");
   * StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7","arraybuffer").then(
   * function(StorageObject){
   * },
   * function(NetworkResponse){
   * });
   *
   * @example StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7","document");
   * StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7", "document").then(
   * function(StorageObject){
   * },
   * function(NetworkResponse){
   * });
   *
   * @example StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7","text");
   * StorageCollection.getObject("00e39862-9652-458b-9a82-d1a66cf1a0c7","text").then(
   * function(StorageObject){
   * },
   * function(NetworkResponse){
   * });
   */
  this.getObject = function(id, successCallback, errorCallback, objectType) {
    if(typeof successCallback != 'function'){
      objectType = successCallback;
    }

    var storageObject = new StorageObject(this, _backend, utils, platform);
    storageObject.id = id;

    return storageObject
      .readPayload(objectType)
      .then(readPayloadSuccess, readPayloadError);

    function readPayloadSuccess() {
      if (successCallback && typeof successCallback == 'function') {
        successCallback(storageObject);
      }
      return storageObject;
    }

    function readPayloadError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  /**
   * Creates a new StorageObject in the collection.
   * @param storageObject {StorageObject} The StorageObject to create.
   * @example storageObject:
   * {
   * "id": " 213ddbac-ccb2-4a53-ad48-b4588244tc4c", // A service generated ID for the StorageObject. The ID is unique in the StorageCollection.
   * "name" : "JSText.txt", // A user provided name for the StorageObject. A StorageCollection may have multiple StorageObjects with the same name.
   * "contentLength": 798", // The length of data content in bytes stored in the StorageObject.
   * "contentType" : "text/plain ", // The media-type associated with the StorageObject.
   * "createdBy" : "DwainDRob", // The name of the user who created the StorageObject
   * "createdOn": "Sat, 17 Oct 2015 10:33:12", // Server generated timestamp when the StorageObject was created.
   * "modifiedBy": "DwainDRob", // The name of the user who last updated the StorageObject.
   * "modifiedOn": "Sat, 17 Oct 2015 10:33:12" //  Server generated timestamp when the StorageObject was last updated.
   * }
   * @param [successCallback] {StorageCollection~storageObjectSuccessCallback} Callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {StorageCollection~errorCallback} Callback invoked on error (deprecated use promises instead).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.postObject = function(storageObject, successCallback, errorCallback) {
    return this._postOrPutStorageObject(storageObject, true, successCallback, errorCallback);
  };

  /**
   * Updates an existing StorageObject in the collection.
   * @param storageObject {StorageObject} The StorageObject to update.
   * @param [successCallback] {StorageCollection~storageObjectSuccessCallback} Callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {StorageCollection~errorCallback} Callback invoked on error (deprecated use promises instead).
   * @return {Promise.<NetworkStorageObject|NetworkResponse>}
   */
  this.putObject = function(storageObject, successCallback, errorCallback) {
    return this._postOrPutStorageObject(storageObject, false, successCallback, errorCallback);
  };


  this._postOrPutStorageObject = function(storageObject, isPost, successCallback, errorCallback) {


    var headers = _backend.getHttpHeaders();
    headers[HEADERS.ORACLE_MOBILE_NAME] = encodeURI(storageObject.getDisplayName());
    headers[HEADERS.CONTENT_TYPE] = storageObject.contentType;


    var url = "storage/collections/" + storageCollection.id + "/objects";
    if(!isPost) {
      url += "/" + storageObject.id;

      if(storageObject._eTag != null) {
        headers[HEADERS.IF_MATCH] = storageObject._eTag;
      }
    }

    if(storageCollection.getUserIsolated() && storageCollection.getUserId() != null) {
      url += "?user=" + storageCollection.getUserId();
    }

    return platform.invokeService({
      method: isPost? HTTP_METHODS.POST : HTTP_METHODS.PUT,
      url: _backend.getPlatformUrl(url),
      headers: headers,
      data: storageObject.getPayload()
    }).then(invokeServiceSuccess,invokeServiceError);

    function invokeServiceSuccess(response) {
      var object = new StorageObject(storageCollection, response.data, utils, platform);

      if (successCallback) {
        successCallback(response.statusCode, object);
      }
      return new NetworkStorageObject(response.statusCode, object);
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  /**
   * Callback invoked after a successful operation.
   * @callback StorageCollection~storageCollectionSuccessCallback
   * @deprecated Use promises instead
   */

  /**
   * Checks the service if a StorageObject with the given ID exists in the collection.
   * @param id {String} The ID of the StorageObject to check.
   * @example id: "00e394532-9652-458b-9a82-d1a47cf1a0c7"
   * @param [successCallback] {StorageCollection~storageCollectionSuccessCallback} Callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {StorageCollection~errorCallback} Callback invoked on error (deprecated use promises instead).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.contains = function(id, successCallback, errorCallback) {
    var headers = _backend.getHttpHeaders({});

    var url = "storage/collections/" + storageCollection.id + "/objects/" + id;
    if(storageCollection.getUserIsolated() && storageCollection.getUserId() != null) {
      url += "?user=" + storageCollection.getUserId();
    }

    return platform.invokeService({
      method: HTTP_METHODS.HEAD,
      url: _backend.getPlatformUrl(url),
      headers: headers
    }).then(invokeServiceSuccess,invokeServiceError);

    function invokeServiceSuccess(response) {
      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

  /**
   * Deletes a StorageObject from a collection.
   * @param id {String} The ID of the StorageObject to delete.
   * @example id: "00e394532-9652-458b-9a82-d1a47cf1a0c7"
   * @param [successCallback] {StorageCollection~storageCollectionSuccessCallback} Callback invoked on success (deprecated use promises instead).
   * @param [errorCallback] {StorageCollection~errorCallback} Callback invoked on error (deprecated use promises instead).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   */
  this.deleteObject = function(id, successCallback, errorCallback) {

    var headers = _backend.getHttpHeaders({});
    headers[HEADERS.IF_MATCH] = "*";

    var url = "storage/collections/" + storageCollection.id + "/objects/" + id;
    if(storageCollection.getUserIsolated() && storageCollection.getUserId() != null) {
      url += "?user=" + storageCollection.getUserId();
    }

    return platform.invokeService({
      method: HTTP_METHODS.DELETE,
      url: _backend.getPlatformUrl(url),
      headers: headers
    }).then(invokeServiceSuccess,invokeServiceError);

    function invokeServiceSuccess(response) {
      if (successCallback) {
        successCallback(response.statusCode, response.data);
      }
      return response;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };
}


/**
 * Class that provides cloud-based storage capabilities. Callers should use
 * MobileBackend's [Storage()]{@link MobileBackend#Storage} property.
 * @constructor
 * @global
 */
function Storage(backend, utils, platform, logger) {

  var _backend = backend;
  var storage = this;

    /**
     * Callback invoked after successfully fetching a StorageCollection.
     * @callback Storage~getCollectionSuccessCallback
     * @param storageCollection {StorageCollection} The downloaded StorageCollection instance.
     * @deprecated Use promises instead
     */

    /**
     * Callback invoked on error.
     * @callback Storage~errorCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param message {String} The HTTP payload from the server, if available, or an error message.
     * @deprecated Use promises instead
     */

    /**
     * Returns a StorageCollection with the given name from the service associated with the user. Subsequent accesses to StorageObjects in the
     * StorageCollection will only return StorageObjects owned by the user.
     * @param name {String} The name of the StorageCollection.
     * @example name: "JSCollection"
     * @param userId {String} Optional, the ID of the user retrieved from the UI.
     * @example userId: "e8671189-585d-478e-b437-005b7632b8803"
     * @param [userIsolated] {Boolean} - indicate if collection is in isolated mode, used in combination with lazyLoad and userId.
     * This parameter is not required in case lazyLoad is not provided.
     * @param [lazyLoad] {Boolean} - indicate not to load collection metadata
     * @param [successCallback] {Storage~getCollectionSuccessCallback} Callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {Storage~errorCallback} Callback invoked on error (deprecated use promises instead).
     * @return {Promise.<StorageCollection|NetworkResponse>}
     */
  this.getCollection = function(name, userId, userIsolated, lazyLoad, successCallback, errorCallback) {
    if(typeof userIsolated === 'function'){
      errorCallback = lazyLoad;
      successCallback = userIsolated;
      lazyLoad = false;
      userIsolated = undefined;
    }

    var collection = new StorageCollection(name, utils.validateConfiguration(userId), userIsolated, _backend, utils, logger, platform);
    if(lazyLoad){
      return Promise.resolve(collection).then(invokeServiceSuccess, invokeServiceError);
    } else {
      return collection.loadMetadata().then(invokeServiceSuccess, invokeServiceError);
    }

    function invokeServiceSuccess(collection) {
      if(successCallback) {
        successCallback(collection);
      }
      return collection;
    }

    function invokeServiceError(response) {
      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };
}

/**
 * Class that provides notification capabilities. Callers should use
 * MobileBackend's [Notifications()]{@link MobileBackend#Notifications} property.
 * @constructor
 * @global
 */
function Notifications(backend, utils, platform, logger) {

  var _backend = backend;

  /**
   * Returns a string with device information used by [Notifications]{@link Notifications}
   * @returns {String} The device specific information for platform.
   * @example : "IOS,ANDROID"
   */
  this.getDevicePlatform = function (){
    var deviceType = (navigator.userAgent.match(/iPhone/i)) == "iPhone" ? "iPhone" : (navigator.userAgent.match(/iPad/i)) == "iPad" ? "iPad" : (navigator.userAgent.match(/iPod/i)) == "iPod" ? "iPod" : (navigator.userAgent.match(/Android/i)) == "Android" ? "Android" : "null";

    if(deviceType.substring(0,1) == 'i'){
      deviceType = "iOS"
    }
    else if(deviceType.substring(0,1) == 'A'){
      deviceType = "Android"
    }
    return deviceType.toUpperCase();
  };

  /**
   * Registers the current Cordova app running on the device for receiving push notifications.
   * @param deviceToken {String} Platform-specific device token.
   * @example deviceToken: "AxdkfjfDfkfkfkfjfFdjfjjf=", deviceToken is sent from device.
   * @param appId {String} Platform-specific application reverse domain identifier.
   * @example appId: "com.yourcompany.project"
   * @param appVersion {String} Platform-specific application version..
   * @example appVersion: "1.0.2"
   * @param [successCallback] {Notifications~successCallback} Optional callback invoked on success (deprecated).
   * @param [errorCallback] {Notifications~errorCallback} Optional callback invoked on failure (deprecated).
   * @return {Promise.<NetworkResponse|NetworkResponse>}
   *
   * @example <caption>Example usage of mcs.MobileBackend.getNotifications().registerForNotifications()</caption>
   mcs.MobileBackend.getNotifications()
   .registerForNotifications("YOUR_DEVICE_TOKEN", "com.oracle.mobile.cloud.OMCPushNotifications", "1.0.0")
   .then(registerSuccess, registerError);
   function registerSuccess(response){
      console.log(response.statusCode);// returns statusCode for this function.
    }
   function registerError(response){

    }
   */
  this.registerForNotifications = function(deviceToken, appId, appVersion, successCallback, errorCallback) {
    var notifications = this;

    var payload = null;

    var headers = _backend.getHttpHeaders({});
    headers[utils.HEADERS.CONTENT_TYPE] = utils.ACCEPT_TYPES.APPLICATION_JSON;


    if(typeof device == "undefined") {
      payload = {
        "notificationToken": deviceToken,
        "mobileClient": {
          "id": appId,
          "version": appVersion,
          "platform": notifications.getDevicePlatform()
        }
      }
    }
    else{
      payload = {
        "notificationToken": deviceToken,
        "mobileClient": {
          "id": appId,
          "version": appVersion,
          "platform": device.platform.toUpperCase()
        }
      }
    }

    return platform.invokeService({
      method: utils.HTTP_METHODS.POST,
      url: _backend.getPlatformUrl("devices/register"),
      headers: headers,
      data: JSON.stringify(payload)
    }).then(invokeServiceSuccess,invokeServiceError);

    function invokeServiceSuccess(response) {
      logger.info(  "Device registered for push notifications. " + response.statusCode);

      if (successCallback) {
        successCallback(response.statusCode);
      }
      return response;
    }

    function invokeServiceError(response) {
      logger.error("Device registration for push notifications failed! " + response.statusCode + ':' + JSON.stringify(response));

      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };

    /**
     * Deregisters the current Cordova app running on the device for receiving push notifications.
     * @param deviceToken {String} Platform-specific successCallback token.
     * @example deviceToken: "AxdkfjfDfkfkfkfjfFdjfjjf=", deviceToken is sent from device.
     * @param appId {String} Platform-specific application reverse domain identifier.
     * @example appId: "com.yourcompany.project"
     * @param [successCallback] {Notifications~successCallback} Optional callback invoked on success (deprecated use promises instead).
     * @param [errorCallback] {Notifications~errorCallback} Optional callback invoked on failure (deprecated use promises instead).
     * @return {Promise.<NetworkResponse|NetworkResponse>}
     *
     * @example <caption>Example usage of mcs.MobileBackend.getNotifications().deregisterForNotifications()</caption>
     mcs.MobileBackend.getNotifications()
     .deregisterForNotifications("YOUR_DEVICE_TOKEN", "com.oracle.mobile.cloud.OMCPushNotifications", "1.0.0")
     .then(deregisterSuccess, deregisterError);
     function deregisterSuccess(response){
        console.log(response.statusCode);// returns statusCode for this function.
      }
     function deregisterError(response){

    }
   */

  this.deregisterForNotifications = function(deviceToken, appId, successCallback, errorCallback) {
    var notifications = this;

    var payload = null;

    var headers = _backend.getHttpHeaders({});
    headers[utils.HEADERS.CONTENT_TYPE] = utils.ACCEPT_TYPES.APPLICATION_JSON;

    if(typeof device == "undefined") {
      payload = {
        "notificationToken": deviceToken,
        "mobileClient": {
          "id": appId,
          "platform": notifications.getDevicePlatform()
        }
      }
    }
    else{
      payload = {
        "notificationToken": deviceToken,
        "mobileClient": {
          "id": appId,
          "platform": device.platform.toUpperCase()
        }
      }
    }

    return platform.invokeService({
      method: utils.HTTP_METHODS.POST,
      url: _backend.getPlatformUrl("devices/deregister"),
      headers: headers,
      data: JSON.stringify(payload)
    }).then(invokeServiceSuccess,invokeServiceError);

    function invokeServiceSuccess(response) {
      logger.info("Device deregistered for push notifications succeeded. " + response.statusCode);

      if (successCallback) {
        successCallback(response.statusCode);
      }
      return response;
    }

    function invokeServiceError(response) {
      logger.error("Device deregistration for push notifications failed! " + response.statusCode);

      if(errorCallback) {
        errorCallback(response.statusCode, response.data);
      } else {
        return Promise.reject(response);
      }
    }
  };
}



/**
 * Class that provides caching and synchronization capabilities. Callers should use
 * MobileBackend's [synchronization]{@link MobileBackend#synchronization} property.
 * @constructor
 * @global
 */
function Synchronization(manager, backend, config, utils, platform, persistence) {

  var _this = this;
  var _config = config;

  this._persistence = persistence;

  /**
   * The [MobileBackend]{@link MobileBackend} object that this Synchronization instance belongs to.
   * @type {MobileBackend}
   * @readonly
   */
  this.backend = backend;

  var _endpoints = {};


  /**
   * Sets the device to offline mode, which is good for testing.
   * If the device is in real offline mode, then this setting will be ignored
   * @param isOffline whether to set the device online or offline.
   */
  this.setOfflineMode = manager._setOfflineMode;

  /**
   * Gets device network status which is currently being used by Synchronization.
   * @returns {Boolean}
     */
  this.isOnline = function(){
    return persistence.options.isOnline();
  };

  /**
   * Deletes all cached resources.
   */
  this.purge = function () {
    for(var apiName in _endpoints){
      if(_endpoints.hasOwnProperty(apiName)){
        var api = _endpoints[apiName];
        for(var path in api){
          if(api.hasOwnProperty(path)){
            api[path].purge();
          }
        }
      }
    }
  };

  /**
   * Returns a [MobileEndpoint]{@link MobileEndpoint} that provides access to an endpoint in a custom code API.
   * @param apiName The name of the custom code API
   * @param endpointPath The endpoint in the custom code API
   * @returns A MobileEndpoint object.
   */
  this.openEndpoint = function (apiName, endpointPath) {
    if (_endpoints[apiName] == null) {
      _endpoints[apiName] = {};
    }

    if (_endpoints[apiName][endpointPath] == null) {
      _endpoints[apiName][endpointPath] = new MobileEndpoint(this, apiName, endpointPath, utils, platform);
    }

    return _endpoints[apiName][endpointPath];
  };
}

Synchronization.prototype._run = function(callback){
  return persistence.process.run(callback);
};

Synchronization.prototype._runWithoutReadInBackground = function(callback){
  return persistence.process.runWithoutReadInBackground(callback);
};


function SyncProcessor(backend, apiName, endpointPath, resolvingOfflineUpdate, utils, persistence) {
  var HEADERS = utils.HEADERS;
  var RESOURCE_TYPES = utils.RESOURCE_TYPES;
  var _ = persistence.common;

  this.apiName = apiName;
  this.endpointPath = endpointPath;
  this.resolvingOfflineUpdate = resolvingOfflineUpdate;

  this.getHttpHeaders = function(requestHeaders){
    var headers = backend.getHttpHeaders(requestHeaders);
    headers[HEADERS.ORACLE_MOBILE_SYNC_AGENT] = true;
    return headers;
  };

  this.getType = function(responseHeaders, responseData){
    var type = SyncResourceType.file;
    var resourceType = responseHeaders[HEADERS.ORACLE_MOBILE_SYNC_RESOURCE_TYPE.toLowerCase()];
    if(resourceType != null) {
      if(resourceType === RESOURCE_TYPES.ITEM) {
        type = SyncResourceType.item;
      } else if(resourceType === RESOURCE_TYPES.COLLECTION) {
        type = SyncResourceType.collection;
      }
    } else {
      if(_.isString(responseData)){
        try
        {
          var json = JSON.parse(responseData);
          if(_.isArray(json)){
            type = SyncResourceType.collection;
          } else {
            type = SyncResourceType.item;
          }
        }
        catch(e)
        {
          type = SyncResourceType.file;
        }
      }
    }
    return type;
  };

  this.getUri = function(response, url){
    var location = response && response.headers ? response.headers[HEADERS.LOCATION.toLowerCase()] : null;
    if(location != null){
      return '/' + location;
    } else {
      var obj = null;
      if(response.data){
        if(typeof response.data === 'string'){
          obj = response.data != '' ? JSON.parse(response.data): null;
        } else {
          obj = response.data;
        }
      }
      if(obj && obj[persistence.options.module.URI_KEY]){
        var uri = obj[persistence.options.module.URI_KEY];
        delete obj[persistence.options.module.URI_KEY];
        return uri;
      } else {
        return persistence.options.parseURL(url).path;
      }
    }
  };

  this.createResource = function(method, url, statusCode, requestHeaders, responseHeaders, requestData, responseData) {

    var location = response.headers[HEADERS.LOCATION.toLowerCase()];
    if(location != null) {
      location = '/' + location;
    } else {
      location = url;
    }

    var type = SyncResourceType.file;
    var resourceType = responseHeaders[HEADERS.ORACLE_MOBILE_SYNC_RESOURCE_TYPE.toLowerCase()];
    if(resourceType != null) {
      if(resourceType == RESOURCE_TYPES.ITEM) {
        type = SyncResourceType.item;
      } else if(resourceType == RESOURCE_TYPES.COLLECTION) {
        type = SyncResourceType.collection;
      }
    } else {
      if(_.isString(responseData)){
        try
        {
          var json = JSON.parse(responseData);
          if(_.isArray(json)){
            type = SyncResourceType.collection;
          } else {
            type = SyncResourceType.item;
          }
        }
        catch(e)
        {
          type = SyncResourceType.file;
        }
      }
    }

    return null;
  }

}



function GetProcessor(backend,  apiName, endpointPath, platform, utils, persistence) {

  SyncProcessor.call(this, backend, apiName, endpointPath, false, utils, persistence);

  this.performRequest = function (url, requestHeaders, fetchFromService) {
    var processor = this;

    var headers = processor.getHttpHeaders(requestHeaders);
    return platform.invokeService({
      method: utils.HTTP_METHODS.GET,
      url: url,
      headers: headers
    }).then(success);

    function success(response) {
      return {
        uri: processor.getUri(response, url),
        data: response.data
      };
    }
  }
}

GetProcessor.prototype = Object.create(SyncProcessor.prototype);
GetProcessor.prototype.constructor = GetProcessor;


function PutProcessor(backend, apiName, endpointPath, platform, utils, persistence) {

  SyncProcessor.call(this, backend, apiName, endpointPath, true, utils, persistence);

  this.performRequest = function(url, requestHeaders, requestData) {
    var processor = this;

    var headers = processor.getHttpHeaders(requestHeaders);

    return platform.invokeService({
      method: utils.HTTP_METHODS.PUT,
      url: url,
      headers: headers,
      data: requestData
    }).then(success);

    function success(response) {
      return {
        uri: processor.getUri(response, url),
        data: response.data
      };
    }
  };
}

PutProcessor.prototype = Object.create(SyncProcessor.prototype);
PutProcessor.prototype.constructor = PutProcessor;



function PostProcessor(backend, apiName, endpointPath, platform, utils, persistence) {

  SyncProcessor.call(this, backend, apiName, endpointPath, true, utils, persistence);

  this.performRequest = function(url, requestHeaders, requestData) {
    var processor = this;

    var headers = processor.getHttpHeaders(requestHeaders);

    return platform.invokeService({
      method: utils.HTTP_METHODS.POST,
      url: url,
      headers: headers,
      data: requestData
    }).then(success);

    function success(response) {
      return {
        uri: processor.getUri(response, url),
        data: response.data
      };
    }
  };
}

PostProcessor.prototype = Object.create(SyncProcessor.prototype);
PostProcessor.prototype.constructor = PostProcessor;




function PatchProcessor(backend, apiName, endpointPath, platform, utils, persistence) {

  SyncProcessor.call(this, backend, apiName, endpointPath, true, utils, persistence);

  this.performRequest = function (url, requestHeaders, requestData) {

    var processor = this;

    var headers = processor.synchronization.backend.getHttpHeaders(requestHeaders);
    headers["Accept-Encoding"] = "gzip";
    headers["Oracle-Mobile-Sync-Agent"] = true;

    return platform.invokeService({
      method: utils.HTTP_METHODS.PATCH,
      url: url,
      headers: headers,
      data: requestData
    }).then(success);

    function success(response) {
      return {
        uri: processor.getUri(response, url),
        data: response.data
      };
    }
  }
}


PatchProcessor.prototype = Object.create(SyncProcessor.prototype);
PatchProcessor.prototype.constructor = PatchProcessor;


function DeleteProcessor(backend, apiName, endpointPath, platform, utils, persistence) {

  SyncProcessor.call(this, backend, apiName, endpointPath, true, utils, persistence);

  this.performRequest = function(url) {

    var processor = this;

    var headers = processor.getHttpHeaders({});

    return platform.invokeService({
      method: utils.HTTP_METHODS.DELETE,
      url: url,
      headers: headers});
  }
}

DeleteProcessor.prototype = Object.create(SyncProcessor.prototype);
DeleteProcessor.prototype.constructor = DeleteProcessor;


/**
 * Base class for MobileObject, MobileCollection and MobileFile.
 * @abstract
 * @constructor
 * @global
 */
function MobileResource(endpoint, uri) {

  if (this.constructor === MobileResource) {
    throw new Error("Can't instantiate abstract class!");
  }

  var _uri = uri;
  var _endpoint = endpoint;

  this._getEndpoint = function(){
    return _endpoint;
  };

  this._getMcsId = function(){
    return _uri ? _uri.substring(_uri.lastIndexOf('/') + 1, _uri.length) : null;
  };

  this._getMcsURI = function(){
    return _uri;
  };
}

/**
 * Class that exposes fluent APIs for fetching objects from an API endpoint.
 * @constructor
 * @global
 */
function FetchCollectionBuilder(endpoint, json){

  var _endpoint = endpoint;

  var _fetchFromService = false;
  var _offset = -1;
  var _limit = -1;
  var _fetchAll = false;
  var _withParams = {};
  var _withHeaders = {};

  /**
   * Executes the fetch and returns the results.
   * @return {Promise.<MobileObjectCollection|NetworkResponse>}
   */
  this.execute = function(){
    return _endpoint._executeFetchObjects(_withHeaders, _withParams, _fetchAll, _offset, _limit, _fetchFromService);
  };
}

/**
 * Class that represents an object returned by a custom code API.
 * @constructor
 * @global
 */
function MobileObject(endpoint, uri) {

  MobileResource.call(this, endpoint, uri);
  this._type = SyncResourceType.item;
}

MobileObject.prototype = Object.create(MobileResource.prototype);
MobileObject.prototype.constructor = MobileObject;

/**
 * Saves any changes to the object back to the service.
 * @param saveIfOffline {Boolean} If true will cache updates locally and sync them back to the service if the device is offline; if false will fail if the device is offline.
 * @return {Promise.<MobileObject|NetworkResponse>}
 */
MobileObject.prototype.save = function(saveIfOffline) {
  return this._getEndpoint()._save(this, saveIfOffline);
};

/**
 * Saves any changes to the object back to the service.
 * @param deleteIfOffline {Boolean} If true will cache the delete locally and sync back to the service if the device is offline; if false will fail if the device is offline.
 * @return {Promise.<Undefined|NetworkResponse>}
 */
MobileObject.prototype.delete = function(deleteIfOffline) {
  return this._getEndpoint()._delete(this, deleteIfOffline);
};


/**
 * Class that represents a collection of MobileObjects returned by a custom code API.
 * @constructor
 * @global
 */
function MobileObjectCollection(endpoint, uri) {

  MobileResource.call(this, endpoint, uri);

  this._type = SyncResourceType.item;

  var _objects = [];

  this.initialize = function (objects) {
    for(var idx in objects){
      if(objects.hasOwnProperty(idx)){
        var object = objects[idx];
        _objects.push(object);
      }
    }
    return this;
  };

  /**
   * The count of items in the collection
   * @type {number}
   * @readonly
   */
  this.getLength = function(){
    return _objects.length;
  };

  /**
   * Return specific object from collection.
   * @param idx {number} item position in collection.
   * @return {MobileResource}
   */
  this.getItem = function (idx){
    return _objects[idx];
  };

  /**
   * Return all objects from collection.
   * @return {Array<MobileResource>}
   */
  this.all = function (){
    return _objects;
  };

  /**
   * Run method per item
   * @param method {Function} method to run on item.
   */
  this.forEach = function(method){
    _objects.forEach(method);
  }
}

MobileObjectCollection.prototype = Object.create(MobileResource.prototype);
MobileObjectCollection.prototype.constructor = MobileObjectCollection;



/**
 * Class that represents an endpoint in a custom code API. Callers should use
 * [openEndpoint()]{@link Synchronization#openEndpoint} to create a new MobileEndpoint.
 * @constructor
 * @global
 */
function MobileEndpoint(synchronization, apiName, endpointPath, utils, platform) {
  var _this = this;

  var HEADERS = utils.HEADERS;
  var APPLICATION_JSON = utils.ACCEPT_TYPES.APPLICATION_JSON;

  var persistence = synchronization._persistence;

  this._backend = synchronization.backend;

  /**
   * The [Synchronization]{@link Synchronization} object that this MobileEndpoint instance belongs to.
   * @type {Synchronization}
   * @readonly
   */
  this.synchronization = synchronization;

  /**
   * The name of the custom code API.
   * @type {String}
   * @readonly
   */
  this.apiName = apiName;

  /**
   * The endpoint in the API.
   * @type {String}
   * @readonly
   */
  this.endpointPath = endpointPath;

  /**
   * Deletes all cached resources.
   */
  this.purge = function () {
    persistence.options.module.flush(_this._backend.getCustomCodeUrl(_this.apiName + "/" + _this.endpointPath));
  };

  /**
   * Creates a new MobileObject. The object is not uploaded to the service until [save()]{@link MobileObject#save} is invoked.
   * @returns A new MobileObject.
   */
  this.createObject = function(object) {
    object = object || {};
    object.__proto__ = new MobileObject(this, null);
    return object;
  };

    /**
     * Callback invoked after successfully fetching a MobileObject.
     * @callback MobileEndpoint~fetchObjectSuccessCallback
     * @param mobileObject {MobileObject} The downloaded MobileObject instance.
     * @deprecated Use promises instead
     */

    /**
     * Callback invoked on error.
     * @callback MobileEndpoint~errorCallback
     * @param statusCode {Number} Any HTTP status code returned from the server, if available.
     * @param headers {Array} The HTTP headers returned from the server, if available.
     * @param message {String} The HTTP payload from the server, if available, or an error message.
     * @deprecated Use promises instead
     */

    /**
     * Fetches an object from the API's endpoint.
     * @param id {String} The ID of the object.
     * @param fetchFromService {Boolean} If true will download from the service; if false will return any pinned object
     * and will trigger a background refresh.
     * @return {Promise.<MobileObject|NetworkResponse>}
     */
  this.fetchObject = function(id, fetchFromService) {
    var url = _this.apiName;
    if(_this.endpointPath && _this.endpointPath != ''){
      url += '/' + _this.endpointPath;
    }
    if(id && id != '') {
      url += '/' + id;
    }

    url = _this._backend.getCustomCodeUrl(url);

    var processor = new GetProcessor(_this._backend, _this.apiName, _this.endpointPath, platform, utils, persistence);
    var endpoint = this;

    var headers = {};
    headers[HEADERS.ACCEPT] = APPLICATION_JSON;

    return processor.performRequest(url, headers, fetchFromService).then(performRequestSuccess);

    function performRequestSuccess(resource){
      if(!resource.data || resource.data === ''){
        return Promise.reject(new NetworkResponse(404, 'Object not found in cache.'));
      } else {
        var object = resource.data;
        if(typeof object === 'string'){
          object = object != '' ? JSON.parse(object) : null;
        }
        object.__proto__ = new MobileObject(endpoint, resource.uri);

        return object;
      }
    }
  };

  this._save = function(mobileObject, saveIfOffline) {
    var endpoint = this;

    var isPost = !mobileObject._getMcsURI();

    var url = isPost ? _this._backend.getCustomCodeUrl(_this.apiName + "/" + _this.endpointPath) : _this._backend._baseUrl +  mobileObject._getMcsURI();

    var processor = isPost ?
      new PostProcessor(_this._backend, _this.apiName, _this.endpointPath, platform, utils, persistence) :
      new PutProcessor(_this._backend, _this.apiName, _this.endpointPath, platform, utils, persistence);

    var data = JSON.stringify(mobileObject);
    var headers = {};
    headers[HEADERS.ACCEPT] = APPLICATION_JSON;
    headers[HEADERS.CONTENT_TYPE] = APPLICATION_JSON;

    return processor.performRequest(url, headers, data).then(performRequestSuccess);

    function performRequestSuccess(resource){
      var object = resource.data;
      if(typeof object === 'string'){
        object = object != '' ? JSON.parse(object) : null;
      }
      endpoint._updateMobileObject(mobileObject, object);
      mobileObject.__proto__ = new MobileObject(endpoint, resource.uri);

      return mobileObject;
    }
  };

  this._delete = function(mobileObject, deleteIfOffline) {

    var processor = new DeleteProcessor(_this._backend, _this.apiName, _this.endpointPath, platform, utils, persistence);

    var endpoint = this;
    var url = _this._backend._baseUrl + mobileObject._getMcsURI();
    return processor.performRequest(url, {}).then(success);

    function success(){
      endpoint._updateMobileObject(mobileObject._syncResource);
      mobileObject._syncResource = null;
    }
  };
  this._reload = function(isFile, mobileResource, discardOfflineUpdates, reloadFromService, successCallback, errorCallback) {

    var endpoint = this;

    if (mobileResource._syncResource == null) {
      if(isFile) {
        mobileResource.data = null;
        mobileResource.contentType = null;
      } else {
        endpoint._updateMobileObject(mobileResource, {});
      }

      if (successCallback) {
        successCallback();
      }

      return;
    }

    if (discardOfflineUpdates == true) {

      _this.synchronization._persistenceManager.clearOfflineState(mobileResource.url, function() {
        endpoint._reloadFromCacheOrService(isFile, mobileResource, reloadFromService, successCallback, errorCallback);
      }, errorCallback);

    } else {
      endpoint._reloadFromCacheOrService(isFile, mobileResource, reloadFromService, successCallback, errorCallback);
    }
  };

  this._reloadFromCacheOrService = function(isFile, mobileResource, reloadFromService, successCallback, errorCallback) {

    var endpoint = this;
    if(reloadFromService != true) {
      _this.synchronization._persistenceManager.loadResource(mobileResource.url,
        function loadResourceSuccess(existingResource) {

          existingResource.loadCachedData(function(data) {

            if(isFile) {

              mobileResource.data = data;
              mobileResource.contentType = existingResource.responseHeaders[HEADERS.CONTENT_TYPE.toLowerCase()];

            } else {
              endpoint._updateMobileObject(mobileResource, data);
              mobileResource.__proto__ = new MobileObject(endpoint, existingResource);
              mobileResource._initialize();
            }

            if (successCallback) {
              successCallback(mobileResource);
            }
          }, errorCallback);

        }, errorCallback);

      return;
    }
    var processor = new GetProcessor(_this._backend, _this.apiName, _this.endpointPath, platform, utils, persistence);

    var headers = {};
    if(!isFile) {
      headers[HEADERS.ACCEPT] = APPLICATION_JSON;
    }

    var endpointParameters = null;

    processor.performRequest(url, headers, true, endpointParameters, function(resource) {
      resource.loadCachedData(function loadCachedDataSuccess(data) {

        if(isFile) {

          mobileResource._syncResource = resource;
          mobileResource.data = data;
          mobileResource.contentType = resource.responseHeaders[HEADERS.CONTENT_TYPE.toLowerCase()];

        } else {
          endpoint._updateMobileObject(mobileResource, data);
          mobileResource.__proto__ = new MobileObject(endpoint, resource);
          mobileResource._initialize();
        }

        if(successCallback != null) {
          successCallback(mobileObject);
        }

      }, errorCallback);
    }, errorCallback);
  };
  this._updateMobileObject = function(mobileObject, newObject) {
    for (var property in mobileObject) {
      if (mobileObject.hasOwnProperty(property)) {
        delete mobileObject[property];
      }
    }

    for (var property in newObject) {
      if (newObject.hasOwnProperty(property)) {
        mobileObject[property] = newObject[property];
      }
    }
  };

  this._executeFetchObjects = function(withHeaders, withParams, fetchAll, offset, limit, fetchFromService){
    var endpoint = this;

    var headers = _this._backend.getHttpHeaders(withHeaders);
    headers[HEADERS.ORACLE_MOBILE_SYNC_AGENT] = true;

    var request = {
      method: utils.HTTP_METHODS.GET,
      url: _this._backend.getCustomCodeUrl(_this.apiName + "/" + _this.endpointPath),
      headers: headers
    };
    return platform.invokeService(request).then(invokeServiceSuccess);

    function invokeServiceSuccess(response) {
      var data = response.data;
      if(typeof data === 'string'){
        data = data != '' ? JSON.parse(data) : null;
      }
      var objects = [];
      for(var idx in data.items){
        if(data.items.hasOwnProperty(idx)) {
          var object = data.items[idx];
          var uri = '/' + data.uris[idx];
          object.__proto__ = new MobileObject(endpoint, uri);
          objects.push(object);
        }
      }

      return new MobileObjectCollection(endpoint, /*syncResource*/null).initialize(objects);
    }
  };
}

/**
 * Method to fetch a collection of objects from the endpoint. If the collection exists in the cache, the cached copy is returned; otherwise it is downloaded from the service..
 * @return {FetchCollectionBuilder}
 */
MobileEndpoint.prototype.fetchObjects = function(){
  return new FetchCollectionBuilder(this);
};

var ConflictState = {
  noConflicts: 0,
    hasConflict: 1,
    hasError: 2
};

var OfflineState = {
  noOfflineUpdates: 0,
    createPending: 1,
    updatePending: 2,
    patchPending: 3,
    deletePending: 4
};

var PinState = {
  unpinned: 0,
    pinned: 1,
    pinnedAnciliary: 2
};

var SyncResourceType = {
  item: 0,
    collection: 1,
    file: 2
};

"use strict";

/**
 * MCS module.
 * @namespace mcs
 */
var mcs = {};

mcs._utils = new Utils();
mcs._logger = new Logger();

var sync = g.mcs && g.mcs._sync ? g.mcs._sync : undefined;

/**
 * The entry-point into the Oracle Mobile Cloud Service SDK. The MobileBackendManager has a singleton from which MobileBackend
 * objects can be accessed, which in turn provide access to Analytics, Storage, Auth and other capabilities.
 * @memberof mcs
 * @type {MobileBackendManager}
 */
mcs.mobileBackendManager = new MobileBackendManager(mcs._logger, mcs._utils, sync);

mcs.mobileBackendManager.platform = new BrowserPlatform(mcs.mobileBackendManager, mcs._logger, mcs._utils);


/**
 * The entry-point into the Oracle Mobile Cloud Service SDK. The MobileBackendManager has a singleton from which MobileBackend
 * objects can be accessed, which in turn provide access to Analytics, Storage, Auth and other capabilities.
 * @deprecated Replaced with {@link mcs.mobileBackendManager}
 * @memberof mcs
 * @type {MobileBackendManager}
 */
mcs.MobileBackendManager = mcs.mobileBackendManager;

/**
 * Class that holds an analytics event.
 * @type {AnalyticsEvent}
 */
mcs.AnalyticsEvent = AnalyticsEvent;

/**
 * Platform class for browser applications. Derives from [Platform]{@link Platform}.
 * @type {BrowserPlatform}
 */
mcs.BrowserPlatform = BrowserPlatform;


if(typeof CordovaPlatform !== 'undefined') {
  /**
   * Platform class for Cordova applications. Derives from [BrowserPlatform]{@link BrowserPlatform}.
   * @type {CordovaPlatform}
   */
  mcs.CordovaPlatform = CordovaPlatform;
}

/**
 * Class that provides network response details.
 * @type {NetworkResponse}
 */
mcs.NetworkResponse = NetworkResponse;

/**
 * Class that provides network response details.
 * @memberof mcs
 * @type {NetworkResponse}
 */
mcs.NetworkStorageObject = NetworkStorageObject;

/**
 * Class that represents a storage object resource that can be used to store data.
 * @memberof mcs
 * @type {StorageObject}
 */
mcs.StorageObject = StorageObject;

mcs.LOG_LEVEL = LOG_LEVEL;
mcs.AUTHORIZATION_TYPES = AUTHORIZATION_TYPES;

mcs.logLevel = LOG_LEVEL;



if (typeof define === 'function' && define.amd) {
  define([], mcs);
} else if (typeof exports === 'object') {
  module.exports = mcs;
} else {
  g.mcs = mcs;
}

console.log("exported");








}(this));
