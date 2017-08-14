import React, { Component } from 'react';

import {
    Alert,
    AsyncStorage,
    NetInfo,
} from 'react-native';


// Initializes lock to handle concurrency issues with AsyncStorage
var AsyncLock = require('async-lock');
var lock = new AsyncLock();

// Because of the mcs sdk, a require is needed instead of import.
var mcs = require('./mcs-sdk/mcs');

AsyncStorage.setItem('requests', JSON.stringify([]));
// TODO: BEFORE COMMIT REVERT STAGING CHANGES
var mcs_config = {
  "logLevel": mcs.LOG_LEVEL.INFO,
  "logHTTP": true,
  "mobileBackends": {
    "synapse": {
      "default": true,
      "baseUrl": BASE_URL,
      "applicationKey": APPLICATION_KEY,
        "authorization": {
        "basicAuth": {
          "backendId": BACKEND_ID,
          "anonymousToken": ANONYMOUS_TOKEN
        }
      }
    }
  }
};

// Oracle MCS initialiation

mcs.mobileBackendManager.platform = new mcs.BrowserPlatform();
mcs.mobileBackendManager.setConfig(mcs_config);
var mcsBackend = mcs.mobileBackendManager.getMobileBackend("synapse");
if(mcsBackend != null){
  mcsBackend.setAuthenticationType("basicAuth");
}

function login(user, pass) {
    function failure(response, data) {
        console.warn(response);
    }
    function success(response, data) {
      processQueue();
    }
    mcsBackend.Authorization.authenticateAnonymous(success, failure);
}

// Initializes request queue in AsyncStorage if it doesn't already exist
console.log("Initializing RequestsManager in AsyncStorage");
lock.acquire('requests', (cb) => {
    AsyncStorage.getItem("requests", (err, result) => {
        if (!result) {
            var requestArray = [];
            var requestArrayString = JSON.stringify(requestArray);
            AsyncStorage.setItem("requests", requestArrayString, (err, result) => {
                cb();
            });
        } else {
            cb();
        }
    });
}, function (err, ret) {
});

// Assigns a callback for whenever network connectivity status changes
NetInfo.isConnected.addEventListener(
    'change',
    handleConnectivityChange
);

// List to track which requests are currently being processed
var processingList = [];
var processing;

// Requests URL
var API_URL = 'synapse';

/* * Takes in a request object, with the following fields:
 *    requestType: 'get', 'post'
 *    requestUrl: 'event/info/', 'event/info/all', '/event/verify/', '/event/dispute/', 'report/add'
 *    id: ID associated with the request
 *    requestParameters: (some combination of parameters for request)
 *    bounds: an array of lat and lon, [latSW, lonSW, latNE, lonNE]
 */
var makeRequest = function(request) {
    lock.acquire('requests', (cb) => {
        AsyncStorage.getItem("requests", (err, result) => {
            var requests = JSON.parse(result);
            requests.push(request);
            AsyncStorage.setItem("requests", JSON.stringify(requests), (err, result) => {
                cb(); // Allows other callbacks to aquire the lock

                // Each time a request is made, attempt to clear the queue
                NetInfo.isConnected.fetch().then(isConnected => {
                    if (isConnected) {
                      processQueue();
                    } else {
                      window.networkError();
                    }
                });
            });
        });
    }, function (err, ret) {
    });
};

/*
 * Callback to login and process queue whenever connectivity status changes to "connected"
 */
function handleConnectivityChange(isConnected) {
  if (isConnected) {
      login();
  }
}

/*
 * Loops through our AsyncStorage queue and processes all requests to server
 */
var processQueue = function() {
    lock.acquire('requests', (cb) => {
        AsyncStorage.getItem("requests", (err, result) => {
            var requests = JSON.parse(result);
            for (var i = 0; i < requests.length; i++) {
                var request = requests[i];

                // If request is currently being processed, don't try to complete it again
                if (processingList.indexOf(request) !== -1) {
                    return;
                }

                processingList.push(request);
                switch(request.requestUrl) {
                    case '/event/info/all':
                        refreshEventsRequest(request);
                        break;
                    case '/event/info/bounds/':
                        refreshEventsWithBoundsRequest(request);
                        break;
                    case '/report/add/':
                        postReportRequest(request);
                        break;
                    case '/event/info/':
                        refreshEventRequest(request);
                        break;
                    case '/event/verify/':
                        postVerifyOrDisputeRequest(request);
                        break;
                    case '/event/dispute/':
                        postVerifyOrDisputeRequest(request);
                        break;
                    default:
                        invalidRequest(request);
                }
            }
            cb();
        });
    }, function (err, ret) {
    });
};

/*
 * Makes a GET request to fetch one specific event stored in the database, and updates the map accordingly.
 */
var refreshEventRequest = function(request) {
  mcsBackend.CustomCode.invokeCustomCodeJSONRequest(
    API_URL + request.requestUrl + request.id, "GET", null,
    function(statusCode, response) {
        console.log(JSON.stringify(response));
        var eventString = "PROCESSED:" + request.requestUrl;
        window.emitter.emit(eventString, response.data[0]);
        markRequestAsProcessed(request);
    },
    function(statusCode, response){
      console.log("RequestManager; Request failed with error: " +  statusCode);
      var i = processingList.indexOf(request);
      processingList.splice(i, 1);  // Remove from processing list
    });
};
/*
 * Makes a GET request to fetch all events stored in the database, and updates the map accordingly.
 */
var refreshEventsRequest = function(request) {
  var eventString = "PROCESSING:" + request.requestUrl;
  window.emitter.emit(eventString);
  mcsBackend.CustomCode.invokeCustomCodeJSONRequest(
    API_URL + request.requestUrl, "GET", null,
    function(statusCode, response) {
      console.log(JSON.stringify(response));
      var eventString = "PROCESSED:" + request.requestUrl;
      window.emitter.emit(eventString, response.data);
      markRequestAsProcessed(request);
    },
    function(statusCode, response){
      console.log("RequestManager; Request failed with error: " +  statusCode);
      var eventString = "FAILED:" + request.requestUrl;
      window.emitter.emit(eventString);
      var i = processingList.indexOf(request);
      processingList.splice(i, 1);  // Remove from processing list
    });
};
/*
 * Makes a GET request to fetch events stored in the database within given bounds, and updates the map accordingly.
 */
var refreshEventsWithBoundsRequest = function(request) {
  var eventString = "PROCESSING:" + request.requestUrl;
  window.emitter.emit(eventString);
  mcsBackend.CustomCode.invokeCustomCodeJSONRequest(
    API_URL + request.requestUrl + request.bounds[0] + '/' + request.bounds[1] + '/' + request.bounds[2] + '/' + request.bounds[3], "GET", null,
    function(statusCode, response) {
      console.log(JSON.stringify(response));
      var eventString = "PROCESSED:" + request.requestUrl;
      window.emitter.emit(eventString, response.data);
      markRequestAsProcessed(request);
    },
    function(statusCode, response){
      console.log("RequestManager; Request failed with error: " +  statusCode);
      var eventString = "FAILED:" + request.requestUrl;
      window.emitter.emit(eventString);
      var i = processingList.indexOf(request);
      processingList.splice(i, 1);  // Remove from processing list
    });
};
/*
 * Makes a POST request to post a new report to the database.
 */
var postReportRequest = function(request) {
  console.log(request.requestParameters);
  mcsBackend.CustomCode.invokeCustomCodeJSONRequest(
    API_URL + request.requestUrl, "POST", JSON.parse(request.requestParameters),
    function(statusCode, response) {
      console.log(JSON.stringify(response));
      var eventString = "PROCESSED:" + request.requestUrl;
      console.log(eventString);
      window.emitter.emit(eventString, response);
      markRequestAsProcessed(request);
    },
    function(statusCode, response){
      console.log("RequestManager; Request failed with error: " +  statusCode);
      console.log(response);
      var i = processingList.indexOf(request);
      processingList.splice(i, 1);  // Remove from processing list
    });
};

/*
 * Makes a POST request to post a new report to the database.
 */
var postVerifyOrDisputeRequest = function(request) {
  console.log(request.requestParameters);
  mcsBackend.CustomCode.invokeCustomCodeJSONRequest(
    API_URL + request.requestUrl, "POST", JSON.parse(request.requestParameters),
    function(statusCode, response) {
      console.log(JSON.stringify(response));
      var eventString = "PROCESSED:" + request.requestUrl;
      console.log(eventString);
      window.emitter.emit(eventString, response);
      markRequestAsProcessed(request);
    },
    function(statusCode, response){
      console.log("RequestManager; Request failed with error: " +  statusCode);
      console.log(response);
      var i = processingList.indexOf(request);
      processingList.splice(i, 1);  // Remove from processing list
    });
};

/*
 * Makes a POST request to post a new report to the database.
 */
var invalidRequest = function(request) {
    Alert.alert("There was a systems error. Please try again later.");
};

/*
 * Function to give user an alert that they have no network connectivity, and that the app
 * will try to sync later.
 */
window.networkError = function() {
    Alert.alert("You don't have network connectivity! We'll try to update later.");
};

/*
 * Removes a specified request from the processingList and the requests queue. This ensures
 * that no request is ever processed twice.
 */
var markRequestAsProcessed = function(request) {
    lock.acquire('requests', (cb) => {
        AsyncStorage.getItem("requests", (err, result) => {
            var requests = JSON.parse(result);
            var j = requests.indexOf(request);
            requests.splice(j, 1);
            AsyncStorage.setItem("requests", JSON.stringify(requests), (err, result) => {
                var i = processingList.indexOf(request);
                processingList.splice(i, 1);  // Remove from processing list
                cb();
            });
        });

    }, function(err, ret) {
    });
};

exports.makeRequest = makeRequest;
