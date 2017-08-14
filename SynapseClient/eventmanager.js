import React, { Component } from 'react';

import {
    Alert,
    AsyncStorage,
} from 'react-native';

var RequestManager = require('./requestmanager.js');

/*
 * Given an event id, disputes an event if it has not already been disputed.
 * Stores the event as disputed in AsyncStorage, and makes a backend request
 * to update the event as "Disputed" in the backend.
 */
var disputeEvent = function(eventID, userID, locationLat, locationLong) {
    var d = new Date().toUTCString();
    var r = {
        'requestType': 'POST',
        'requestUrl': '/event/dispute/',
        'requestParameters': JSON.stringify({event_id: eventID,
            user_id: userID,
            location_lat: locationLat,
            location_long: locationLong,
            time: d,
        })
    };
    RequestManager.makeRequest(r);
    // Alert.alert('Thanks for disputing this event. We\'ll update our records.');

}

/*
 * Given an event id, verifies an event if it has not already been verified.
 * Stores the event as verified in AsyncStorage, and makes a backend request
 * to update the event as "Verified" in the backend.
 */
var verifyEvent = function(eventID, userID, locationLat, locationLong) {
    // AsyncStorage.getItem("event_mod:" + eventID, (err, result) => {
    //     var d = new Date().toString();
    //     if (!result || result === "dispute") {
    //         AsyncStorage.setItem("event_mod:" + eventID, "verify", (err, result) => {
    //             var r = {'requestType': 'POST',
    //                      'requestUrl': '/event/verify/',
    //                      'requestParameters': JSON.stringify({event_id: eventID,
    //                                                           user_id: userID,
    //                                                           location_lat: locationLat,
    //                                                           location_long: locationLong,
    //                                                           time: d,
    //                                                          })};
    //             RequestManager.makeRequest(r)
    //             Alert.alert('Thanks for verifying this event. We\'ll update our records.');
    //         });
    //
    //     } else {
    //         Alert.alert('You have already verified this event!');
    //     }
    // });
    var d = new Date().toUTCString();
    var r = {
        'requestType': 'POST',
        'requestUrl': '/event/verify/',
        'requestParameters': JSON.stringify({
            event_id: eventID,
            user_id: userID,
            location_lat: locationLat,
            location_long: locationLong,
            time: d,
        })
    };
    RequestManager.makeRequest(r);
    // Alert.alert('Thanks for verifying this event. We\'ll update our records.');

}


exports.verifyEvent = verifyEvent;
exports.disputeEvent = disputeEvent;
