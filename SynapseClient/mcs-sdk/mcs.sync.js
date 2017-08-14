/**
* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved.
 * Oracle Mobile Cloud Service Sync JavaScript SDK, Release: 16.4.5.0, E76062-04
*/





(function(g){


// disable RequireJS and AMD
var _define, _exports;
if(typeof define === 'function' && define.amd){
  _define = define;
  define = undefined;
} else if(typeof exports === 'object'){
  _exports = exports;
  exports = undefined;
}

/**
 * LokiJS
 * @author Joe Minichino <joe.minichino@gmail.com>
 * @version 1.4.1
 * A lightweight document oriented javascript database
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser globals
    root.loki = factory();
  }
}(this, function () {

  return (function () {
    'use strict';

    var hasOwnProperty = Object.prototype.hasOwnProperty;

    var Utils = {
      copyProperties: function (src, dest) {
        var prop;
        for (prop in src) {
          dest[prop] = src[prop];
        }
      },
      // used to recursively scan hierarchical transform step object for param substitution
      resolveTransformObject: function (subObj, params, depth) {
        var prop,
          pname;

        if (typeof depth !== 'number') {
          depth = 0;
        }

        if (++depth >= 10) return subObj;

        for (prop in subObj) {
          if (typeof subObj[prop] === 'string' && subObj[prop].indexOf("[%lktxp]") === 0) {
            pname = subObj[prop].substring(8);
            if (params.hasOwnProperty(pname)) {
              subObj[prop] = params[pname];
            }
          } else if (typeof subObj[prop] === "object") {
            subObj[prop] = Utils.resolveTransformObject(subObj[prop], params, depth);
          }
        }

        return subObj;
      },
      // top level utility to resolve an entire (single) transform (array of steps) for parameter substitution
      resolveTransformParams: function (transform, params) {
        var idx,
          clonedStep,
          resolvedTransform = [];

        if (typeof params === 'undefined') return transform;

        // iterate all steps in the transform array
        for (idx = 0; idx < transform.length; idx++) {
          // clone transform so our scan and replace can operate directly on cloned transform
          clonedStep = JSON.parse(JSON.stringify(transform[idx]));
          resolvedTransform.push(Utils.resolveTransformObject(clonedStep, params));
        }

        return resolvedTransform;
      }
    };

    /** Helper function for determining 'less-than' conditions for ops, sorting, and binary indices.
     *     In the future we might want $lt and $gt ops to use their own functionality/helper.
     *     Since binary indices on a property might need to index [12, NaN, new Date(), Infinity], we
     *     need this function (as well as gtHelper) to always ensure one value is LT, GT, or EQ to another.
     */
    function ltHelper(prop1, prop2, equal) {
      var cv1, cv2;

      // 'falsy' and Boolean handling
      if (!prop1 || !prop2 || prop1 === true || prop2 === true) {
        if ((prop1 === true || prop1 === false) && (prop2 === true || prop2 === false)) {
          if (equal) {
            return prop1 === prop2;
          } else {
            if (prop1) {
              return false;
            } else {
              return prop2;
            }
          }
        }

        if (prop2 === undefined || prop2 === null || prop1 === true || prop2 === false) {
          return equal;
        }
        if (prop1 === undefined || prop1 === null || prop1 === false || prop2 === true) {
          return true;
        }
      }

      if (prop1 === prop2) {
        return equal;
      }

      if (prop1 < prop2) {
        return true;
      }

      if (prop1 > prop2) {
        return false;
      }

      // not strict equal nor less than nor gt so must be mixed types, convert to string and use that to compare
      cv1 = prop1.toString();
      cv2 = prop2.toString();

      if (cv1 == cv2) {
        return equal;
      }

      if (cv1 < cv2) {
        return true;
      }

      return false;
    }

    function gtHelper(prop1, prop2, equal) {
      var cv1, cv2;

      // 'falsy' and Boolean handling
      if (!prop1 || !prop2 || prop1 === true || prop2 === true) {
        if ((prop1 === true || prop1 === false) && (prop2 === true || prop2 === false)) {
          if (equal) {
            return prop1 === prop2;
          } else {
            if (prop1) {
              return !prop2;
            } else {
              return false;
            }
          }
        }

        if (prop1 === undefined || prop1 === null || prop1 === false || prop2 === true) {
          return equal;
        }
        if (prop2 === undefined || prop2 === null || prop1 === true || prop2 === false) {
          return true;
        }
      }

      if (prop1 === prop2) {
        return equal;
      }

      if (prop1 > prop2) {
        return true;
      }

      if (prop1 < prop2) {
        return false;
      }

      // not strict equal nor less than nor gt so must be mixed types, convert to string and use that to compare
      cv1 = prop1.toString();
      cv2 = prop2.toString();

      if (cv1 == cv2) {
        return equal;
      }

      if (cv1 > cv2) {
        return true;
      }

      return false;
    }

    function sortHelper(prop1, prop2, desc) {
      if (prop1 === prop2) {
        return 0;
      }

      if (ltHelper(prop1, prop2, false)) {
        return (desc) ? (1) : (-1);
      }

      if (gtHelper(prop1, prop2, false)) {
        return (desc) ? (-1) : (1);
      }

      // not lt, not gt so implied equality-- date compatible
      return 0;
    }

    /**
     * compoundeval() - helper function for compoundsort(), performing individual object comparisons
     *
     * @param {array} properties - array of property names, in order, by which to evaluate sort order
     * @param {object} obj1 - first object to compare
     * @param {object} obj2 - second object to compare
     * @returns {integer} 0, -1, or 1 to designate if identical (sortwise) or which should be first
     */
    function compoundeval(properties, obj1, obj2) {
      var res = 0;
      var prop, field;
      for (var i = 0, len = properties.length; i < len; i++) {
        prop = properties[i];
        field = prop[0];
        res = sortHelper(obj1[field], obj2[field], prop[1]);
        if (res !== 0) {
          return res;
        }
      }
      return 0;
    }

    /**
     * dotSubScan - helper function used for dot notation queries.
     *
     * @param {object} root - object to traverse
     * @param {array} paths - array of properties to drill into
     * @param {function} fun - evaluation function to test with
     * @param {any} value - comparative value to also pass to (compare) fun
     */
    function dotSubScan(root, paths, fun, value) {
      var path = paths[0];
      if (typeof root === 'undefined' || root === null || !root.hasOwnProperty(path)) {
        return false;
      }

      var valueFound = false;
      var element = root[path];
      if (Array.isArray(element)) {
        var index;
        for (index in element) {
          valueFound = valueFound || dotSubScan(element[index], paths.slice(1, paths.length), fun, value);
          if (valueFound === true) {
            break;
          }
        }
      } else if (typeof element === 'object') {
        valueFound = dotSubScan(element, paths.slice(1, paths.length), fun, value);
      } else {
        valueFound = fun(element, value);
      }

      return valueFound;
    }

    function containsCheckFn(a) {
      if (typeof a === 'string' || Array.isArray(a)) {
        return function (b) {
          return a.indexOf(b) !== -1;
        };
      } else if (typeof a === 'object' && a !== null) {
        return function (b) {
          return hasOwnProperty.call(a, b);
        };
      }
      return null;
    }

    function doQueryOp(val, op) {
      for (var p in op) {
        if (hasOwnProperty.call(op, p)) {
          return LokiOps[p](val, op[p]);
        }
      }
      return false;
    }

    var LokiOps = {
      // comparison operators
      // a is the value in the collection
      // b is the query value
      $eq: function (a, b) {
        return a === b;
      },

      // abstract/loose equality
      $aeq: function (a, b) {
        return a == b;
      },

      $ne: function (a, b) {
        // ecma 5 safe test for NaN
        if (b !== b) {
          // ecma 5 test value is not NaN
          return (a === a);
        }

        return a !== b;
      },

      $dteq: function (a, b) {
        if (ltHelper(a, b, false)) {
          return false;
        }
        return !gtHelper(a, b, false);
      },

      $gt: function (a, b) {
        return gtHelper(a, b, false);
      },

      $gte: function (a, b) {
        return gtHelper(a, b, true);
      },

      $lt: function (a, b) {
        return ltHelper(a, b, false);
      },

      $lte: function (a, b) {
        return ltHelper(a, b, true);
      },

      $in: function (a, b) {
        return b.indexOf(a) !== -1;
      },

      $nin: function (a, b) {
        return b.indexOf(a) === -1;
      },

      $keyin: function (a, b) {
        return a in b;
      },

      $nkeyin: function (a, b) {
        return !(a in b);
      },

      $definedin: function (a, b) {
        return b[a] !== undefined;
      },

      $undefinedin: function (a, b) {
        return b[a] === undefined;
      },

      $regex: function (a, b) {
        return b.test(a);
      },

      $containsString: function (a, b) {
        return (typeof a === 'string') && (a.indexOf(b) !== -1);
      },

      $containsNone: function (a, b) {
        return !LokiOps.$containsAny(a, b);
      },

      $containsAny: function (a, b) {
        var checkFn = containsCheckFn(a);
        if (checkFn !== null) {
          return (Array.isArray(b)) ? (b.some(checkFn)) : (checkFn(b));
        }
        return false;
      },

      $contains: function (a, b) {
        var checkFn = containsCheckFn(a);
        if (checkFn !== null) {
          return (Array.isArray(b)) ? (b.every(checkFn)) : (checkFn(b));
        }
        return false;
      },

      $type: function (a, b) {
        var type = typeof a;
        if (type === 'object') {
          if (Array.isArray(a)) {
            type = 'array';
          } else if (a instanceof Date) {
            type = 'date';
          }
        }
        return (typeof b !== 'object') ? (type === b) : doQueryOp(type, b);
      },

      $size: function (a, b) {
        if (Array.isArray(a)) {
          return (typeof b !== 'object') ? (a.length === b) : doQueryOp(a.length, b);
        }
        return false;
      },

      $len: function (a, b) {
        if (typeof a === 'string') {
          return (typeof b !== 'object') ? (a.length === b) : doQueryOp(a.length, b);
        }
        return false;
      },

      $where: function (a, b) {
        return b(a) === true;
      },

      // field-level logical operators
      // a is the value in the collection
      // b is the nested query operation (for '$not')
      //   or an array of nested query operations (for '$and' and '$or')
      $not: function (a, b) {
        return !doQueryOp(a, b);
      },

      $and: function (a, b) {
        for (var idx = 0, len = b.length; idx < len; idx += 1) {
          if (!doQueryOp(a, b[idx])) {
            return false;
          }
        }
        return true;
      },

      $or: function (a, b) {
        for (var idx = 0, len = b.length; idx < len; idx += 1) {
          if (doQueryOp(a, b[idx])) {
            return true;
          }
        }
        return false;
      }
    };

    // making indexing opt-in... our range function knows how to deal with these ops :
    var indexedOpsList = ['$eq', '$aeq', '$dteq', '$gt', '$gte', '$lt', '$lte'];

    function clone(data, method) {
      var cloneMethod = method || 'parse-stringify',
        cloned;

      switch (cloneMethod) {
      case "parse-stringify":
        cloned = JSON.parse(JSON.stringify(data));
        break;
      case "jquery-extend-deep":
        cloned = jQuery.extend(true, {}, data);
        break;
      case "shallow":
        cloned = Object.create(data.prototype || null);
        Object.keys(data).map(function (i) {
          cloned[i] = data[i];
        });
        break;
      default:
        break;
      }

      //if (cloneMethod === 'parse-stringify') {
      //  cloned = JSON.parse(JSON.stringify(data));
      //}
      return cloned;
    }

    function cloneObjectArray(objarray, method) {
      var i,
        result = [];

      if (method == "parse-stringify") {
        return clone(objarray, method);
      }

      i = objarray.length - 1;

      for (; i <= 0; i--) {
        result.push(clone(objarray[i], method));
      }

      return result;
    }

    function localStorageAvailable() {
      try {
        return (window && window.localStorage !== undefined && window.localStorage !== null);
      } catch (e) {
        return false;
      }
    }


    /**
     * LokiEventEmitter is a minimalist version of EventEmitter. It enables any
     * constructor that inherits EventEmitter to emit events and trigger
     * listeners that have been added to the event through the on(event, callback) method
     *
     * @constructor LokiEventEmitter
     */
    function LokiEventEmitter() {}

    /**
     * @prop {hashmap} events - a hashmap, with each property being an array of callbacks
     * @memberof LokiEventEmitter
     */
    LokiEventEmitter.prototype.events = {};

    /**
     * @prop {boolean} asyncListeners - boolean determines whether or not the callbacks associated with each event
     * should happen in an async fashion or not
     * Default is false, which means events are synchronous
     * @memberof LokiEventEmitter
     */
    LokiEventEmitter.prototype.asyncListeners = false;

    /**
     * on(eventName, listener) - adds a listener to the queue of callbacks associated to an event
     * @param {string} eventName - the name of the event to listen to
     * @param {function} listener - callback function of listener to attach
     * @returns {int} the index of the callback in the array of listeners for a particular event
     * @memberof LokiEventEmitter
     */
    LokiEventEmitter.prototype.on = function (eventName, listener) {
      var event = this.events[eventName];
      if (!event) {
        event = this.events[eventName] = [];
      }
      event.push(listener);
      return listener;
    };

    /**
     * emit(eventName, data) - emits a particular event
     * with the option of passing optional parameters which are going to be processed by the callback
     * provided signatures match (i.e. if passing emit(event, arg0, arg1) the listener should take two parameters)
     * @param {string} eventName - the name of the event
     * @param {object=} data - optional object passed with the event
     * @memberof LokiEventEmitter
     */
    LokiEventEmitter.prototype.emit = function (eventName, data) {
      var self = this;
      if (eventName && this.events[eventName]) {
        this.events[eventName].forEach(function (listener) {
          if (self.asyncListeners) {
            setTimeout(function () {
              listener(data);
            }, 1);
          } else {
            listener(data);
          }

        });
      } else {
        throw new Error('No event ' + eventName + ' defined');
      }
    };

    /**
     * removeListener() - removes the listener at position 'index' from the event 'eventName'
     * @param {string} eventName - the name of the event which the listener is attached to
     * @param {function} listener - the listener callback function to remove from emitter
     * @memberof LokiEventEmitter
     */
    LokiEventEmitter.prototype.removeListener = function (eventName, listener) {
      if (this.events[eventName]) {
        var listeners = this.events[eventName];
        listeners.splice(listeners.indexOf(listener), 1);
      }
    };

    /**
     * Loki: The main database class
     * @constructor Loki
     * @implements LokiEventEmitter
     * @param {string} filename - name of the file to be saved to
     * @param {object=} options - (Optional) config options object
     * @param {string} options.env - override environment detection as 'NODEJS', 'BROWSER', 'CORDOVA'
     * @param {boolean} options.verbose - enable console output (default is 'false')
     * @param {boolean} options.autosave - enables autosave
     * @param {int} options.autosaveInterval - time interval (in milliseconds) between saves (if dirty)
     * @param {boolean} options.autoload - enables autoload on loki instantiation
     * @param {function} options.autoloadCallback - user callback called after database load
     * @param {adapter} options.adapter - an instance of a loki persistence adapter
     */
    function Loki(filename, options) {
      this.filename = filename || 'loki.db';
      this.collections = [];

      // persist version of code which created the database to the database.
      // could use for upgrade scenarios
      this.databaseVersion = 1.1;
      this.engineVersion = 1.1;

      // autosave support (disabled by default)
      // pass autosave: true, autosaveInterval: 6000 in options to set 6 second autosave
      this.autosave = false;
      this.autosaveInterval = 5000;
      this.autosaveHandle = null;

      this.options = {};

      // currently keeping persistenceMethod and persistenceAdapter as loki level properties that
      // will not or cannot be deserialized.  You are required to configure persistence every time
      // you instantiate a loki object (or use default environment detection) in order to load the database anyways.

      // persistenceMethod could be 'fs', 'localStorage', or 'adapter'
      // this is optional option param, otherwise environment detection will be used
      // if user passes their own adapter we will force this method to 'adapter' later, so no need to pass method option.
      this.persistenceMethod = null;

      // retain reference to optional (non-serializable) persistenceAdapter 'instance'
      this.persistenceAdapter = null;

      // enable console output if verbose flag is set (disabled by default)
      this.verbose = options && options.hasOwnProperty('verbose') ? options.verbose : false;

      this.events = {
        'init': [],
        'loaded': [],
        'flushChanges': [],
        'close': [],
        'changes': [],
        'warning': []
      };

      var getENV = function () {
        // if (typeof global !== 'undefined' && (global.android || global.NSObject)) {
        //   //If no adapter is set use the default nativescript adapter
        //   if (!options.adapter) {
        //     var LokiNativescriptAdapter = require('./loki-nativescript-adapter');
        //     options.adapter=new LokiNativescriptAdapter();
        //   }
        //   return 'NATIVESCRIPT'; //nativescript
        // }

        if (typeof window === 'undefined') {
          return 'NODEJS';
        }

        if (typeof global !== 'undefined' && global.window) {
          return 'NODEJS'; //node-webkit
        }

        if (typeof document !== 'undefined') {
          if (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1) {
            return 'CORDOVA';
          }
          return 'BROWSER';
        }
        return 'CORDOVA';
      };

      // refactored environment detection due to invalid detection for browser environments.
      // if they do not specify an options.env we want to detect env rather than default to nodejs.
      // currently keeping two properties for similar thing (options.env and options.persistenceMethod)
      //   might want to review whether we can consolidate.
      if (options && options.hasOwnProperty('env')) {
        this.ENV = options.env;
      } else {
        this.ENV = getENV();
      }

      // not sure if this is necessary now that i have refactored the line above
      if (this.ENV === 'undefined') {
        this.ENV = 'NODEJS';
      }

      //if (typeof (options) !== 'undefined') {
      this.configureOptions(options, true);
      //}

      this.on('init', this.clearChanges);

    }

    // db class is an EventEmitter
    Loki.prototype = new LokiEventEmitter();

    // experimental support for browserify's abstract syntax scan to pick up dependency of indexed adapter.
    // Hopefully, once this hits npm a browserify require of lokijs should scan the main file and detect this indexed adapter reference.
    Loki.prototype.getIndexedAdapter = function () {
      var adapter;

      if (typeof require === 'function') {
        adapter = require("./loki-indexed-adapter.js");
      }

      return adapter;
    };


    /**
     * Allows reconfiguring database options
     *
     * @param {object} options - configuration options to apply to loki db object
     * @param {string} options.env - override environment detection as 'NODEJS', 'BROWSER', 'CORDOVA'
     * @param {boolean} options.verbose - enable console output (default is 'false')
     * @param {boolean} options.autosave - enables autosave
     * @param {int} options.autosaveInterval - time interval (in milliseconds) between saves (if dirty)
     * @param {boolean} options.autoload - enables autoload on loki instantiation
     * @param {function} options.autoloadCallback - user callback called after database load
     * @param {adapter} options.adapter - an instance of a loki persistence adapter
     * @param {boolean} initialConfig - (internal) true is passed when loki ctor is invoking
     * @memberof Loki
     */
    Loki.prototype.configureOptions = function (options, initialConfig) {
      var defaultPersistence = {
          'NODEJS': 'fs',
          'BROWSER': 'localStorage',
          'CORDOVA': 'localStorage'
        },
        persistenceMethods = {
          'fs': LokiFsAdapter,
          'localStorage': LokiLocalStorageAdapter
        };

      this.options = {};

      this.persistenceMethod = null;
      // retain reference to optional persistence adapter 'instance'
      // currently keeping outside options because it can't be serialized
      this.persistenceAdapter = null;

      // process the options
      if (typeof (options) !== 'undefined') {
        this.options = options;


        if (this.options.hasOwnProperty('persistenceMethod')) {
          // check if the specified persistence method is known
          if (typeof (persistenceMethods[options.persistenceMethod]) == 'function') {
            this.persistenceMethod = options.persistenceMethod;
            this.persistenceAdapter = new persistenceMethods[options.persistenceMethod]();
          }
          // should be throw an error here, or just fall back to defaults ??
        }

        // if user passes adapter, set persistence mode to adapter and retain persistence adapter instance
        if (this.options.hasOwnProperty('adapter')) {
          this.persistenceMethod = 'adapter';
          this.persistenceAdapter = options.adapter;
          this.options.adapter = null;
        }


        // if they want to load database on loki instantiation, now is a good time to load... after adapter set and before possible autosave initiation
        if (options.autoload && initialConfig) {
          // for autoload, let the constructor complete before firing callback
          var self = this;
          setTimeout(function () {
            self.loadDatabase(options, options.autoloadCallback);
          }, 1);
        }

        if (this.options.hasOwnProperty('autosaveInterval')) {
          this.autosaveDisable();
          this.autosaveInterval = parseInt(this.options.autosaveInterval, 10);
        }

        if (this.options.hasOwnProperty('autosave') && this.options.autosave) {
          this.autosaveDisable();
          this.autosave = true;

          if (this.options.hasOwnProperty('autosaveCallback')) {
            this.autosaveEnable(options, options.autosaveCallback);
          } else {
            this.autosaveEnable();
          }
        }
      } // end of options processing

      // if by now there is no adapter specified by user nor derived from persistenceMethod: use sensible defaults
      if (this.persistenceAdapter === null) {
        this.persistenceMethod = defaultPersistence[this.ENV];
        if (this.persistenceMethod) {
          this.persistenceAdapter = new persistenceMethods[this.persistenceMethod]();
        }
      }

    };

    /**
     * Shorthand method for quickly creating and populating an anonymous collection.
     *    This collection is not referenced internally so upon losing scope it will be garbage collected.
     *
     * @example
     * var results = new loki().anonym(myDocArray).find({'age': {'$gt': 30} });
     *
     * @param {Array} docs - document array to initialize the anonymous collection with
     * @param {object} options - configuration object, see {@link Loki#addCollection} options
     * @returns {Collection} New collection which you can query or chain
     * @memberof Loki
     */
    Loki.prototype.anonym = function (docs, options) {
      var collection = new Collection('anonym', options);
      collection.insert(docs);

      if (this.verbose)
        collection.console = console;

      return collection;
    };

    /**
     * Adds a collection to the database.
     * @param {string} name - name of collection to add
     * @param {object=} options - (optional) options to configure collection with.
     * @param {array} options.unique - array of property names to define unique constraints for
     * @param {array} options.exact - array of property names to define exact constraints for
     * @param {array} options.indices - array property names to define binary indexes for
     * @param {boolean} options.asyncListeners - default is false
     * @param {boolean} options.disableChangesApi - default is true
     * @param {boolean} options.autoupdate - use Object.observe to update objects automatically (default: false)
     * @param {boolean} options.clone - specify whether inserts and queries clone to/from user
     * @param {string} options.cloneMethod - 'parse-stringify' (default), 'jquery-extend-deep', 'shallow'
     * @param {int} options.ttlInterval - time interval for clearing out 'aged' documents; not set by default.
     * @returns {Collection} a reference to the collection which was just added
     * @memberof Loki
     */
    Loki.prototype.addCollection = function (name, options) {
      var collection = new Collection(name, options);
      this.collections.push(collection);

      if (this.verbose)
        collection.console = console;

      return collection;
    };

    Loki.prototype.loadCollection = function (collection) {
      if (!collection.name) {
        throw new Error('Collection must have a name property to be loaded');
      }
      this.collections.push(collection);
    };

    /**
     * Retrieves reference to a collection by name.
     * @param {string} collectionName - name of collection to look up
     * @returns {Collection} Reference to collection in database by that name, or null if not found
     * @memberof Loki
     */
    Loki.prototype.getCollection = function (collectionName) {
      var i,
        len = this.collections.length;

      for (i = 0; i < len; i += 1) {
        if (this.collections[i].name === collectionName) {
          return this.collections[i];
        }
      }

      // no such collection
      this.emit('warning', 'collection ' + collectionName + ' not found');
      return null;
    };

    Loki.prototype.listCollections = function () {

      var i = this.collections.length,
        colls = [];

      while (i--) {
        colls.push({
          name: this.collections[i].name,
          type: this.collections[i].objType,
          count: this.collections[i].data.length
        });
      }
      return colls;
    };

    /**
     * Removes a collection from the database.
     * @param {string} collectionName - name of collection to remove
     * @memberof Loki
     */
    Loki.prototype.removeCollection = function (collectionName) {
      var i,
        len = this.collections.length;

      for (i = 0; i < len; i += 1) {
        if (this.collections[i].name === collectionName) {
          var tmpcol = new Collection(collectionName, {});
          var curcol = this.collections[i];
          for (var prop in curcol) {
            if (curcol.hasOwnProperty(prop) && tmpcol.hasOwnProperty(prop)) {
              curcol[prop] = tmpcol[prop];
            }
          }
          this.collections.splice(i, 1);
          return;
        }
      }
    };

    Loki.prototype.getName = function () {
      return this.name;
    };

    /**
     * serializeReplacer - used to prevent certain properties from being serialized
     *
     */
    Loki.prototype.serializeReplacer = function (key, value) {
      switch (key) {
      case 'autosaveHandle':
      case 'persistenceAdapter':
      case 'constraints':
        return null;
      default:
        return value;
      }
    };

    /**
     * Serialize database to a string which can be loaded via {@link Loki#loadJSON}
     *
     * @returns {string} Stringified representation of the loki database.
     * @memberof Loki
     */
    Loki.prototype.serialize = function () {
      return JSON.stringify(this, this.serializeReplacer);
    };
    // alias of serialize
    Loki.prototype.toJson = Loki.prototype.serialize;

    /**
     * Inflates a loki database from a serialized JSON string
     *
     * @param {string} serializedDb - a serialized loki database string
     * @param {object} options - apply or override collection level settings
     * @memberof Loki
     */
    Loki.prototype.loadJSON = function (serializedDb, options) {
      var dbObject;
      if (serializedDb.length === 0) {
        dbObject = {};
      } else {
        dbObject = JSON.parse(serializedDb);
      }

      this.loadJSONObject(dbObject, options);
    };

    /**
     * Inflates a loki database from a JS object
     *
     * @param {object} dbObject - a serialized loki database string
     * @param {object} options - apply or override collection level settings
     * @memberof Loki
     */
    Loki.prototype.loadJSONObject = function (dbObject, options) {
      var i = 0,
        len = dbObject.collections ? dbObject.collections.length : 0,
        coll,
        copyColl,
        clen,
        j;

      this.name = dbObject.name;

      // restore database version
      this.databaseVersion = 1.0;
      if (dbObject.hasOwnProperty('databaseVersion')) {
        this.databaseVersion = dbObject.databaseVersion;
      }

      this.collections = [];

      for (i; i < len; i += 1) {
        coll = dbObject.collections[i];
        copyColl = this.addCollection(coll.name);

        copyColl.transactional = coll.transactional;
        copyColl.asyncListeners = coll.asyncListeners;
        copyColl.disableChangesApi = coll.disableChangesApi;
        copyColl.cloneObjects = coll.cloneObjects;
        copyColl.cloneMethod = coll.cloneMethod || "parse-stringify";
        copyColl.autoupdate = coll.autoupdate;

        // load each element individually
        clen = coll.data.length;
        j = 0;
        if (options && options.hasOwnProperty(coll.name)) {

          var loader = options[coll.name].inflate ? options[coll.name].inflate : Utils.copyProperties;

          for (j; j < clen; j++) {
            var collObj = new(options[coll.name].proto)();
            loader(coll.data[j], collObj);
            copyColl.data[j] = collObj;
            copyColl.addAutoUpdateObserver(collObj);
          }
        } else {

          for (j; j < clen; j++) {
            copyColl.data[j] = coll.data[j];
            copyColl.addAutoUpdateObserver(copyColl.data[j]);
          }
        }

        copyColl.maxId = (coll.data.length === 0) ? 0 : coll.maxId;
        copyColl.idIndex = coll.idIndex;
        if (typeof (coll.binaryIndices) !== 'undefined') {
          copyColl.binaryIndices = coll.binaryIndices;
        }
        if (typeof coll.transforms !== 'undefined') {
          copyColl.transforms = coll.transforms;
        }

        copyColl.ensureId();

        // regenerate unique indexes
        copyColl.uniqueNames = [];
        if (coll.hasOwnProperty("uniqueNames")) {
          copyColl.uniqueNames = coll.uniqueNames;
          for (j = 0; j < copyColl.uniqueNames.length; j++) {
            copyColl.ensureUniqueIndex(copyColl.uniqueNames[j]);
          }
        }

        // in case they are loading a database created before we added dynamic views, handle undefined
        if (typeof (coll.DynamicViews) === 'undefined') continue;

        // reinflate DynamicViews and attached Resultsets
        for (var idx = 0; idx < coll.DynamicViews.length; idx++) {
          var colldv = coll.DynamicViews[idx];

          var dv = copyColl.addDynamicView(colldv.name, colldv.options);
          dv.resultdata = colldv.resultdata;
          dv.resultsdirty = colldv.resultsdirty;
          dv.filterPipeline = colldv.filterPipeline;

          dv.sortCriteria = colldv.sortCriteria;
          dv.sortFunction = null;

          dv.sortDirty = colldv.sortDirty;
          dv.resultset.filteredrows = colldv.resultset.filteredrows;
          dv.resultset.searchIsChained = colldv.resultset.searchIsChained;
          dv.resultset.filterInitialized = colldv.resultset.filterInitialized;

          dv.rematerialize({
            removeWhereFilters: true
          });
        }
      }
    };

    /**
     * Emits the close event. In autosave scenarios, if the database is dirty, this will save and disable timer.
     * Does not actually destroy the db.
     *
     * @param {function=} callback - (Optional) if supplied will be registered with close event before emitting.
     * @memberof Loki
     */
    Loki.prototype.close = function (callback) {
      // for autosave scenarios, we will let close perform final save (if dirty)
      // For web use, you might call from window.onbeforeunload to shutdown database, saving pending changes
      if (this.autosave) {
        this.autosaveDisable();
        if (this.autosaveDirty()) {
          this.saveDatabase(callback);
          callback = undefined;
        }
      }

      if (callback) {
        this.on('close', callback);
      }
      this.emit('close');
    };

    /**-------------------------+
    | Changes API               |
    +--------------------------*/

    /**
     * The Changes API enables the tracking the changes occurred in the collections since the beginning of the session,
     * so it's possible to create a differential dataset for synchronization purposes (possibly to a remote db)
     */

    /**
     * (Changes API) : takes all the changes stored in each
     * collection and creates a single array for the entire database. If an array of names
     * of collections is passed then only the included collections will be tracked.
     *
     * @param {array=} optional array of collection names. No arg means all collections are processed.
     * @returns {array} array of changes
     * @see private method createChange() in Collection
     * @memberof Loki
     */
    Loki.prototype.generateChangesNotification = function (arrayOfCollectionNames) {
      function getCollName(coll) {
        return coll.name;
      }
      var changes = [],
        selectedCollections = arrayOfCollectionNames || this.collections.map(getCollName);

      this.collections.forEach(function (coll) {
        if (selectedCollections.indexOf(getCollName(coll)) !== -1) {
          changes = changes.concat(coll.getChanges());
        }
      });
      return changes;
    };

    /**
     * (Changes API) - stringify changes for network transmission
     * @returns {string} string representation of the changes
     * @memberof Loki
     */
    Loki.prototype.serializeChanges = function (collectionNamesArray) {
      return JSON.stringify(this.generateChangesNotification(collectionNamesArray));
    };

    /**
     * (Changes API) : clears all the changes in all collections.
     * @memberof Loki
     */
    Loki.prototype.clearChanges = function () {
      this.collections.forEach(function (coll) {
        if (coll.flushChanges) {
          coll.flushChanges();
        }
      });
    };

    /*------------------+
    | PERSISTENCE       |
    -------------------*/


    /** there are two build in persistence adapters for internal use
     * fs             for use in Nodejs type environments
     * localStorage   for use in browser environment
     * defined as helper classes here so its easy and clean to use
     */

    /**
     * A loki persistence adapter which persists using node fs module
     * @constructor LokiFsAdapter
     */
    function LokiFsAdapter() {
      this.fs = require('fs');
    }

    /**
     * loadDatabase() - Load data from file, will throw an error if the file does not exist
     * @param {string} dbname - the filename of the database to load
     * @param {function} callback - the callback to handle the result
     * @memberof LokiFsAdapter
     */
    LokiFsAdapter.prototype.loadDatabase = function loadDatabase(dbname, callback) {
      this.fs.readFile(dbname, {
        encoding: 'utf8'
      }, function readFileCallback(err, data) {
        if (err) {
          callback(new Error(err));
        } else {
          callback(data);
        }
      });
    };

    /**
     * saveDatabase() - save data to file, will throw an error if the file can't be saved
     * might want to expand this to avoid dataloss on partial save
     * @param {string} dbname - the filename of the database to load
     * @param {function} callback - the callback to handle the result
     * @memberof LokiFsAdapter
     */
    LokiFsAdapter.prototype.saveDatabase = function saveDatabase(dbname, dbstring, callback) {
      this.fs.writeFile(dbname, dbstring, callback);
    };

    /**
     * deleteDatabase() - delete the database file, will throw an error if the
     * file can't be deleted
     * @param {string} dbname - the filename of the database to delete
     * @param {function} callback - the callback to handle the result
     * @memberof LokiFsAdapter
     */
    LokiFsAdapter.prototype.deleteDatabase = function deleteDatabase(dbname, callback) {
      this.fs.unlink(dbname, function deleteDatabaseCallback(err) {
        if (err) {
          callback(new Error(err));
        } else {
          callback();
        }
      });
    };


    /**
     * A loki persistence adapter which persists to web browser's local storage object
     * @constructor LokiLocalStorageAdapter
     */
    function LokiLocalStorageAdapter() {}

    /**
     * loadDatabase() - Load data from localstorage
     * @param {string} dbname - the name of the database to load
     * @param {function} callback - the callback to handle the result
     * @memberof LokiLocalStorageAdapter
     */
    LokiLocalStorageAdapter.prototype.loadDatabase = function loadDatabase(dbname, callback) {
      if (localStorageAvailable()) {
        callback(localStorage.getItem(dbname));
      } else {
        callback(new Error('localStorage is not available'));
      }
    };

    /**
     * saveDatabase() - save data to localstorage, will throw an error if the file can't be saved
     * might want to expand this to avoid dataloss on partial save
     * @param {string} dbname - the filename of the database to load
     * @param {function} callback - the callback to handle the result
     * @memberof LokiLocalStorageAdapter
     */
    LokiLocalStorageAdapter.prototype.saveDatabase = function saveDatabase(dbname, dbstring, callback) {
      if (localStorageAvailable()) {
        localStorage.setItem(dbname, dbstring);
        callback(null);
      } else {
        callback(new Error('localStorage is not available'));
      }
    };

    /**
     * deleteDatabase() - delete the database from localstorage, will throw an error if it
     * can't be deleted
     * @param {string} dbname - the filename of the database to delete
     * @param {function} callback - the callback to handle the result
     * @memberof LokiLocalStorageAdapter
     */
    LokiLocalStorageAdapter.prototype.deleteDatabase = function deleteDatabase(dbname, callback) {
      if (localStorageAvailable()) {
        localStorage.removeItem(dbname);
        callback(null);
      } else {
        callback(new Error('localStorage is not available'));
      }
    };

    /**
     * Handles loading from file system, local storage, or adapter (indexeddb)
     *    This method utilizes loki configuration options (if provided) to determine which
     *    persistence method to use, or environment detection (if configuration was not provided).
     *
     * @param {object} options - not currently used (remove or allow overrides?)
     * @param {function=} callback - (Optional) user supplied async callback / error handler
     * @memberof Loki
     */
    Loki.prototype.loadDatabase = function (options, callback) {
      var cFun = callback || function (err, data) {
          if (err) {
            throw err;
          }
        },
        self = this;

      // the persistenceAdapter should be present if all is ok, but check to be sure.
      if (this.persistenceAdapter !== null) {

        this.persistenceAdapter.loadDatabase(this.filename, function loadDatabaseCallback(dbString) {
          if (typeof (dbString) === 'string') {
            var parseSuccess = false;
            try {
              self.loadJSON(dbString, options || {});
              parseSuccess = true;
            } catch (err) {
              cFun(err);
            }
            if (parseSuccess) {
              cFun(null);
              self.emit('loaded', 'database ' + self.filename + ' loaded');
            }
          } else {
            // if adapter has returned an js object (other than null or error) attempt to load from JSON object
            if (typeof (dbString) === "object" && dbString !== null && !(dbString instanceof Error)) {
              self.loadJSONObject(dbString, options || {});
              cFun(null); // return null on success
              self.emit('loaded', 'database ' + self.filename + ' loaded');
            } else {
              // error from adapter (either null or instance of error), pass on to 'user' callback
              cFun(dbString);
            }
          }
        });

      } else {
        cFun(new Error('persistenceAdapter not configured'));
      }
    };

    /**
     * Handles saving to file system, local storage, or adapter (indexeddb)
     *    This method utilizes loki configuration options (if provided) to determine which
     *    persistence method to use, or environment detection (if configuration was not provided).
     *
     * @param {function=} callback - (Optional) user supplied async callback / error handler
     * @memberof Loki
     */
    Loki.prototype.saveDatabase = function (callback) {
      var cFun = callback || function (err) {
          if (err) {
            throw err;
          }
          return;
        },
        self = this;

      // the persistenceAdapter should be present if all is ok, but check to be sure.
      if (this.persistenceAdapter !== null) {
        // check if the adapter is requesting (and supports) a 'reference' mode export
        if (this.persistenceAdapter.mode === "reference" && typeof this.persistenceAdapter.exportDatabase === "function") {
          // filename may seem redundant but loadDatabase will need to expect this same filename
          this.persistenceAdapter.exportDatabase(this.filename, this, function exportDatabaseCallback(err) {
            self.autosaveClearFlags();
            cFun(err);
          });
        }
        // otherwise just pass the serialized database to adapter
        else {
          this.persistenceAdapter.saveDatabase(this.filename, self.serialize(), function saveDatabasecallback(err) {
            self.autosaveClearFlags();
            cFun(err);
          });
        }
      } else {
        cFun(new Error('persistenceAdapter not configured'));
      }
    };

    // alias
    Loki.prototype.save = Loki.prototype.saveDatabase;

    /**
     * Handles deleting a database from file system, local
     *    storage, or adapter (indexeddb)
     *    This method utilizes loki configuration options (if provided) to determine which
     *    persistence method to use, or environment detection (if configuration was not provided).
     *
     * @param {object} options - not currently used (remove or allow overrides?)
     * @param {function=} callback - (Optional) user supplied async callback / error handler
     * @memberof Loki
     */
    Loki.prototype.deleteDatabase = function (options, callback) {
      var cFun = callback || function (err, data) {
        if (err) {
          throw err;
        }
      };

      // the persistenceAdapter should be present if all is ok, but check to be sure.
      if (this.persistenceAdapter !== null) {
        this.persistenceAdapter.deleteDatabase(this.filename, function deleteDatabaseCallback(err) {
          cFun(err);
        });
      } else {
        cFun(new Error('persistenceAdapter not configured'));
      }
    };

    /**
     * autosaveDirty - check whether any collections are 'dirty' meaning we need to save (entire) database
     *
     * @returns {boolean} - true if database has changed since last autosave, false if not.
     */
    Loki.prototype.autosaveDirty = function () {
      for (var idx = 0; idx < this.collections.length; idx++) {
        if (this.collections[idx].dirty) {
          return true;
        }
      }

      return false;
    };

    /**
     * autosaveClearFlags - resets dirty flags on all collections.
     *    Called from saveDatabase() after db is saved.
     *
     */
    Loki.prototype.autosaveClearFlags = function () {
      for (var idx = 0; idx < this.collections.length; idx++) {
        this.collections[idx].dirty = false;
      }
    };

    /**
     * autosaveEnable - begin a javascript interval to periodically save the database.
     *
     * @param {object} options - not currently used (remove or allow overrides?)
     * @param {function=} callback - (Optional) user supplied async callback
     */
    Loki.prototype.autosaveEnable = function (options, callback) {
      this.autosave = true;

      var delay = 5000,
        self = this;

      if (typeof (this.autosaveInterval) !== 'undefined' && this.autosaveInterval !== null) {
        delay = this.autosaveInterval;
      }

      this.autosaveHandle = setInterval(function autosaveHandleInterval() {
        // use of dirty flag will need to be hierarchical since mods are done at collection level with no visibility of 'db'
        // so next step will be to implement collection level dirty flags set on insert/update/remove
        // along with loki level isdirty() function which iterates all collections to see if any are dirty

        if (self.autosaveDirty()) {
          self.saveDatabase(callback);
        }
      }, delay);
    };

    /**
     * autosaveDisable - stop the autosave interval timer.
     *
     */
    Loki.prototype.autosaveDisable = function () {
      if (typeof (this.autosaveHandle) !== 'undefined' && this.autosaveHandle !== null) {
        clearInterval(this.autosaveHandle);
        this.autosaveHandle = null;
      }
    };


    /**
     * Resultset class allowing chainable queries.  Intended to be instanced internally.
     *    Collection.find(), Collection.where(), and Collection.chain() instantiate this.
     *
     * @example
     *    mycollection.chain()
     *      .find({ 'doors' : 4 })
     *      .where(function(obj) { return obj.name === 'Toyota' })
     *      .data();
     *
     * @constructor Resultset
     * @param {Collection} collection - The collection which this Resultset will query against.
     * @param {Object=} options - Object containing one or more options.
     * @param {string} options.queryObj - Optional mongo-style query object to initialize resultset with.
     * @param {function} options.queryFunc - Optional javascript filter function to initialize resultset with.
     * @param {bool} options.firstOnly - Optional boolean used by collection.findOne().
     */
    function Resultset(collection, options) {
      options = options || {};

      options.queryObj = options.queryObj || null;
      options.queryFunc = options.queryFunc || null;
      options.firstOnly = options.firstOnly || false;

      // retain reference to collection we are querying against
      this.collection = collection;

      // if chain() instantiates with null queryObj and queryFunc, so we will keep flag for later
      this.searchIsChained = (!options.queryObj && !options.queryFunc);
      this.filteredrows = [];
      this.filterInitialized = false;

      // if user supplied initial queryObj or queryFunc, apply it
      if (typeof (options.queryObj) !== "undefined" && options.queryObj !== null) {
        return this.find(options.queryObj, options.firstOnly);
      }
      if (typeof (options.queryFunc) !== "undefined" && options.queryFunc !== null) {
        return this.where(options.queryFunc);
      }

      // otherwise return unfiltered Resultset for future filtering
      return this;
    }

    /**
     * reset() - Reset the resultset to its initial state.
     *
     * @returns {Resultset} Reference to this resultset, for future chain operations.
     */
    Resultset.prototype.reset = function () {
      if (this.filteredrows.length > 0) {
        this.filteredrows = [];
      }
      this.filterInitialized = false;
      return this;
    };

    /**
     * toJSON() - Override of toJSON to avoid circular references
     *
     */
    Resultset.prototype.toJSON = function () {
      var copy = this.copy();
      copy.collection = null;
      return copy;
    };

    /**
     * Allows you to limit the number of documents passed to next chain operation.
     *    A resultset copy() is made to avoid altering original resultset.
     *
     * @param {int} qty - The number of documents to return.
     * @returns {Resultset} Returns a copy of the resultset, limited by qty, for subsequent chain ops.
     * @memberof Resultset
     */
    Resultset.prototype.limit = function (qty) {
      // if this is chained resultset with no filters applied, we need to populate filteredrows first
      if (this.searchIsChained && !this.filterInitialized && this.filteredrows.length === 0) {
        this.filteredrows = this.collection.prepareFullDocIndex();
      }

      var rscopy = new Resultset(this.collection);
      rscopy.filteredrows = this.filteredrows.slice(0, qty);
      rscopy.filterInitialized = true;
      return rscopy;
    };

    /**
     * Used for skipping 'pos' number of documents in the resultset.
     *
     * @param {int} pos - Number of documents to skip; all preceding documents are filtered out.
     * @returns {Resultset} Returns a copy of the resultset, containing docs starting at 'pos' for subsequent chain ops.
     * @memberof Resultset
     */
    Resultset.prototype.offset = function (pos) {
      // if this is chained resultset with no filters applied, we need to populate filteredrows first
      if (this.searchIsChained && !this.filterInitialized && this.filteredrows.length === 0) {
        this.filteredrows = this.collection.prepareFullDocIndex();
      }

      var rscopy = new Resultset(this.collection);
      rscopy.filteredrows = this.filteredrows.slice(pos);
      rscopy.filterInitialized = true;
      return rscopy;
    };

    /**
     * copy() - To support reuse of resultset in branched query situations.
     *
     * @returns {Resultset} Returns a copy of the resultset (set) but the underlying document references will be the same.
     * @memberof Resultset
     */
    Resultset.prototype.copy = function () {
      var result = new Resultset(this.collection);

      if (this.filteredrows.length > 0) {
        result.filteredrows = this.filteredrows.slice();
      }
      result.filterInitialized = this.filterInitialized;

      return result;
    };

    /**
     * Alias of copy()
     * @memberof Resultset
     */
    Resultset.prototype.branch = Resultset.prototype.copy;

    /**
     * transform() - executes a named collection transform or raw array of transform steps against the resultset.
     *
     * @param transform {(string|array)} - name of collection transform or raw transform array
     * @param parameters {object=} - (Optional) object property hash of parameters, if the transform requires them.
     * @returns {Resultset} either (this) resultset or a clone of of this resultset (depending on steps)
     * @memberof Resultset
     */
    Resultset.prototype.transform = function (transform, parameters) {
      var idx,
        step,
        rs = this;

      // if transform is name, then do lookup first
      if (typeof transform === 'string') {
        if (this.collection.transforms.hasOwnProperty(transform)) {
          transform = this.collection.transforms[transform];
        }
      }

      // either they passed in raw transform array or we looked it up, so process
      if (typeof transform !== 'object' || !Array.isArray(transform)) {
        throw new Error("Invalid transform");
      }

      if (typeof parameters !== 'undefined') {
        transform = Utils.resolveTransformParams(transform, parameters);
      }

      for (idx = 0; idx < transform.length; idx++) {
        step = transform[idx];

        switch (step.type) {
        case "find":
          rs.find(step.value);
          break;
        case "where":
          rs.where(step.value);
          break;
        case "simplesort":
          rs.simplesort(step.property, step.desc);
          break;
        case "compoundsort":
          rs.compoundsort(step.value);
          break;
        case "sort":
          rs.sort(step.value);
          break;
        case "limit":
          rs = rs.limit(step.value);
          break; // limit makes copy so update reference
        case "offset":
          rs = rs.offset(step.value);
          break; // offset makes copy so update reference
        case "map":
          rs = rs.map(step.value);
          break;
        case "eqJoin":
          rs = rs.eqJoin(step.joinData, step.leftJoinKey, step.rightJoinKey, step.mapFun);
          break;
          // following cases break chain by returning array data so make any of these last in transform steps
        case "mapReduce":
          rs = rs.mapReduce(step.mapFunction, step.reduceFunction);
          break;
          // following cases update documents in current filtered resultset (use carefully)
        case "update":
          rs.update(step.value);
          break;
        case "remove":
          rs.remove();
          break;
        default:
          break;
        }
      }

      return rs;
    };

    /**
     * User supplied compare function is provided two documents to compare. (chainable)
     * @example
     *    rslt.sort(function(obj1, obj2) {
     *      if (obj1.name === obj2.name) return 0;
     *      if (obj1.name > obj2.name) return 1;
     *      if (obj1.name < obj2.name) return -1;
     *    });
     *
     * @param {function} comparefun - A javascript compare function used for sorting.
     * @returns {Resultset} Reference to this resultset, sorted, for future chain operations.
     * @memberof Resultset
     */
    Resultset.prototype.sort = function (comparefun) {
      // if this is chained resultset with no filters applied, just we need to populate filteredrows first
      if (this.searchIsChained && !this.filterInitialized && this.filteredrows.length === 0) {
        this.filteredrows = this.collection.prepareFullDocIndex();
      }

      var wrappedComparer =
        (function (userComparer, data) {
          return function (a, b) {
            return userComparer(data[a], data[b]);
          };
        })(comparefun, this.collection.data);

      this.filteredrows.sort(wrappedComparer);

      return this;
    };

    /**
     * Simpler, loose evaluation for user to sort based on a property name. (chainable).
     *    Sorting based on the same lt/gt helper functions used for binary indices.
     *
     * @param {string} propname - name of property to sort by.
     * @param {bool=} isdesc - (Optional) If true, the property will be sorted in descending order
     * @returns {Resultset} Reference to this resultset, sorted, for future chain operations.
     * @memberof Resultset
     */
    Resultset.prototype.simplesort = function (propname, isdesc) {
      // if this is chained resultset with no filters applied, just we need to populate filteredrows first
      if (this.searchIsChained && !this.filterInitialized && this.filteredrows.length === 0) {
        this.filteredrows = this.collection.prepareFullDocIndex();
      }

      if (typeof (isdesc) === 'undefined') {
        isdesc = false;
      }

      var wrappedComparer =
        (function (prop, desc, data) {
          return function (a, b) {
            return sortHelper(data[a][prop], data[b][prop], desc);
          };
        })(propname, isdesc, this.collection.data);

      this.filteredrows.sort(wrappedComparer);

      return this;
    };

    /**
     * Allows sorting a resultset based on multiple columns.
     * @example
     * // to sort by age and then name (both ascending)
     * rs.compoundsort(['age', 'name']);
     * // to sort by age (ascending) and then by name (descending)
     * rs.compoundsort(['age', ['name', true]);
     *
     * @param {array} properties - array of property names or subarray of [propertyname, isdesc] used evaluate sort order
     * @returns {Resultset} Reference to this resultset, sorted, for future chain operations.
     * @memberof Resultset
     */
    Resultset.prototype.compoundsort = function (properties) {
      if (properties.length === 0) {
        throw new Error("Invalid call to compoundsort, need at least one property");
      }

      var prop;
      if (properties.length === 1) {
        prop = properties[0];
        if (Array.isArray(prop)) {
          return this.simplesort(prop[0], prop[1]);
        }
        return this.simplesort(prop, false);
      }

      // unify the structure of 'properties' to avoid checking it repeatedly while sorting
      for (var i = 0, len = properties.length; i < len; i += 1) {
        prop = properties[i];
        if (!Array.isArray(prop)) {
          properties[i] = [prop, false];
        }
      }

      // if this is chained resultset with no filters applied, just we need to populate filteredrows first
      if (this.searchIsChained && !this.filterInitialized && this.filteredrows.length === 0) {
        this.filteredrows = this.collection.prepareFullDocIndex();
      }

      var wrappedComparer =
        (function (props, data) {
          return function (a, b) {
            return compoundeval(props, data[a], data[b]);
          };
        })(properties, this.collection.data);

      this.filteredrows.sort(wrappedComparer);

      return this;
    };

    /**
     * calculateRange() - Binary Search utility method to find range/segment of values matching criteria.
     *    this is used for collection.find() and first find filter of resultset/dynview
     *    slightly different than get() binary search in that get() hones in on 1 value,
     *    but we have to hone in on many (range)
     * @param {string} op - operation, such as $eq
     * @param {string} prop - name of property to calculate range for
     * @param {object} val - value to use for range calculation.
     * @returns {array} [start, end] index array positions
     */
    Resultset.prototype.calculateRange = function (op, prop, val) {
      var rcd = this.collection.data;
      var index = this.collection.binaryIndices[prop].values;
      var min = 0;
      var max = index.length - 1;
      var mid = 0;

      // when no documents are in collection, return empty range condition
      if (rcd.length === 0) {
        return [0, -1];
      }

      var minVal = rcd[index[min]][prop];
      var maxVal = rcd[index[max]][prop];

      // if value falls outside of our range return [0, -1] to designate no results
      switch (op) {
      case '$eq':
      case '$aeq':
        if (ltHelper(val, minVal, false) || gtHelper(val, maxVal, false)) {
          return [0, -1];
        }
        break;
      case '$dteq':
        if (ltHelper(val, minVal, false) || gtHelper(val, maxVal, false)) {
          return [0, -1];
        }
        break;
      case '$gt':
        if (gtHelper(val, maxVal, true)) {
          return [0, -1];
        }
        break;
      case '$gte':
        if (gtHelper(val, maxVal, false)) {
          return [0, -1];
        }
        break;
      case '$lt':
        if (ltHelper(val, minVal, true)) {
          return [0, -1];
        }
        if (ltHelper(maxVal, val, false)) {
          return [0, rcd.length - 1];
        }
        break;
      case '$lte':
        if (ltHelper(val, minVal, false)) {
          return [0, -1];
        }
        if (ltHelper(maxVal, val, true)) {
          return [0, rcd.length - 1];
        }
        break;
      }

      // hone in on start position of value
      while (min < max) {
        mid = (min + max) >> 1;

        if (ltHelper(rcd[index[mid]][prop], val, false)) {
          min = mid + 1;
        } else {
          max = mid;
        }
      }

      var lbound = min;

      // do not reset min, as the upper bound cannot be prior to the found low bound
      max = index.length - 1;

      // hone in on end position of value
      while (min < max) {
        mid = (min + max) >> 1;

        if (ltHelper(val, rcd[index[mid]][prop], false)) {
          max = mid;
        } else {
          min = mid + 1;
        }
      }

      var ubound = max;

      var lval = rcd[index[lbound]][prop];
      var uval = rcd[index[ubound]][prop];

      switch (op) {
      case '$eq':
        if (lval !== val) {
          return [0, -1];
        }
        if (uval !== val) {
          ubound--;
        }

        return [lbound, ubound];
      case '$dteq':
        if (lval > val || lval < val) {
          return [0, -1];
        }
        if (uval > val || uval < val) {
          ubound--;
        }

        return [lbound, ubound];


      case '$gt':
        if (ltHelper(uval, val, true)) {
          return [0, -1];
        }

        return [ubound, rcd.length - 1];

      case '$gte':
        if (ltHelper(lval, val, false)) {
          return [0, -1];
        }

        return [lbound, rcd.length - 1];

      case '$lt':
        if (lbound === 0 && ltHelper(lval, val, false)) {
          return [0, 0];
        }
        return [0, lbound - 1];

      case '$lte':
        if (uval !== val) {
          ubound--;
        }

        if (ubound === 0 && ltHelper(uval, val, false)) {
          return [0, 0];
        }
        return [0, ubound];

      default:
        return [0, rcd.length - 1];
      }
    };

    /**
     * findOr() - oversee the operation of OR'ed query expressions.
     *    OR'ed expression evaluation runs each expression individually against the full collection,
     *    and finally does a set OR on each expression's results.
     *    Each evaluation can utilize a binary index to prevent multiple linear array scans.
     *
     * @param {array} expressionArray - array of expressions
     * @returns {Resultset} this resultset for further chain ops.
     */
    Resultset.prototype.findOr = function (expressionArray) {
      var fr = null,
        fri = 0,
        frlen = 0,
        docset = [],
        idxset = [],
        idx = 0,
        origCount = this.count();

      // If filter is already initialized, then we query against only those items already in filter.
      // This means no index utilization for fields, so hopefully its filtered to a smallish filteredrows.
      for (var ei = 0, elen = expressionArray.length; ei < elen; ei++) {
        // we need to branch existing query to run each filter separately and combine results
        fr = this.branch().find(expressionArray[ei]).filteredrows;
        frlen = fr.length;
        // if the find operation did not reduce the initial set, then the initial set is the actual result
        if (frlen === origCount) {
          return this;
        }

        // add any document 'hits'
        for (fri = 0; fri < frlen; fri++) {
          idx = fr[fri];
          if (idxset[idx] === undefined) {
            idxset[idx] = true;
            docset.push(idx);
          }
        }
      }

      this.filteredrows = docset;
      this.filterInitialized = true;

      return this;
    };
    Resultset.prototype.$or = Resultset.prototype.findOr;

    /**
     * findAnd() - oversee the operation of AND'ed query expressions.
     *    AND'ed expression evaluation runs each expression progressively against the full collection,
     *    internally utilizing existing chained resultset functionality.
     *    Only the first filter can utilize a binary index.
     *
     * @param {array} expressionArray - array of expressions
     * @returns {Resultset} this resultset for further chain ops.
     */
    Resultset.prototype.findAnd = function (expressionArray) {
      // we have already implementing method chaining in this (our Resultset class)
      // so lets just progressively apply user supplied and filters
      for (var i = 0, len = expressionArray.length; i < len; i++) {
        if (this.count() === 0) {
          return this;
        }
        this.find(expressionArray[i]);
      }
      return this;
    };
    Resultset.prototype.$and = Resultset.prototype.findAnd;

    /**
     * Used for querying via a mongo-style query object.
     *
     * @param {object} query - A mongo-style query object used for filtering current results.
     * @param {boolean=} firstOnly - (Optional) Used by collection.findOne()
     * @returns {Resultset} this resultset for further chain ops.
     * @memberof Resultset
     */
    Resultset.prototype.find = function (query, firstOnly) {
      if (this.collection.data.length === 0) {
        if (this.searchIsChained) {
          this.filteredrows = [];
          this.filterInitialized = true;
          return this;
        }
        return [];
      }

      var queryObject = query || 'getAll',
        p,
        property,
        queryObjectOp,
        operator,
        value,
        key,
        searchByIndex = false,
        result = [],
        index = null;

      // if this was note invoked via findOne()
      firstOnly = firstOnly || false;

      if (typeof queryObject === 'object') {
        for (p in queryObject) {
          if (hasOwnProperty.call(queryObject, p)) {
            property = p;
            queryObjectOp = queryObject[p];
            break;
          }
        }
      }

      // apply no filters if they want all
      if (!property || queryObject === 'getAll') {
        // Chained queries can just do coll.chain().data() but let's
        // be versatile and allow this also coll.chain().find().data()

        // If a chained search, simply leave everything as-is.
        // Note: If no filter at this point, it will be properly
        // created by the follow-up queries or sorts that need it.
        // If not chained, then return the collection data array copy.
        return (this.searchIsChained) ? (this) : (this.collection.data.slice());
      }

      // injecting $and and $or expression tree evaluation here.
      if (property === '$and' || property === '$or') {
        if (this.searchIsChained) {
          this[property](queryObjectOp);

          // for chained find with firstonly,
          if (firstOnly && this.filteredrows.length > 1) {
            this.filteredrows = this.filteredrows.slice(0, 1);
          }

          return this;
        } else {
          // our $and operation internally chains filters
          result = this.collection.chain()[property](queryObjectOp).data();

          // if this was coll.findOne() return first object or empty array if null
          // since this is invoked from a constructor we can't return null, so we will
          // make null in coll.findOne();
          if (firstOnly) {
            return (result.length === 0) ? ([]) : (result[0]);
          }

          // not first only return all results
          return result;
        }
      }

      // see if query object is in shorthand mode (assuming eq operator)
      if (queryObjectOp === null || (typeof queryObjectOp !== 'object' || queryObjectOp instanceof Date)) {
        operator = '$eq';
        value = queryObjectOp;
      } else if (typeof queryObjectOp === 'object') {
        for (key in queryObjectOp) {
          if (hasOwnProperty.call(queryObjectOp, key)) {
            operator = key;
            value = queryObjectOp[key];
            break;
          }
        }
      } else {
        throw new Error('Do not know what you want to do.');
      }

      // for regex ops, precompile
      if (operator === '$regex') {
        if (Array.isArray(value)) {
          value = new RegExp(value[0], value[1]);
        } else if (!(value instanceof RegExp)) {
          value = new RegExp(value);
        }
      }

      // if user is deep querying the object such as find('name.first': 'odin')
      var usingDotNotation = (property.indexOf('.') !== -1);

      // if an index exists for the property being queried against, use it
      // for now only enabling for non-chained query (who's set of docs matches index)
      // or chained queries where it is the first filter applied and prop is indexed
      var doIndexCheck = !usingDotNotation &&
        (!this.searchIsChained || !this.filterInitialized);

      if (doIndexCheck && this.collection.binaryIndices[property] &&
        indexedOpsList.indexOf(operator) !== -1) {
        // this is where our lazy index rebuilding will take place
        // basically we will leave all indexes dirty until we need them
        // so here we will rebuild only the index tied to this property
        // ensureIndex() will only rebuild if flagged as dirty since we are not passing force=true param
        this.collection.ensureIndex(property);

        searchByIndex = true;
        index = this.collection.binaryIndices[property];
      }

      // the comparison function
      var fun = LokiOps[operator];

      // "shortcut" for collection data
      var t = this.collection.data;
      // filter data length
      var i = 0;

      // Query executed differently depending on :
      //    - whether it is chained or not
      //    - whether the property being queried has an index defined
      //    - if chained, we handle first pass differently for initial filteredrows[] population
      //
      // For performance reasons, each case has its own if block to minimize in-loop calculations

      // If not a chained query, bypass filteredrows and work directly against data
      if (!this.searchIsChained) {
        if (!searchByIndex) {
          i = t.length;

          if (firstOnly) {
            if (usingDotNotation) {
              property = property.split('.');
              while (i--) {
                if (dotSubScan(t[i], property, fun, value)) {
                  return (t[i]);
                }
              }
            } else {
              while (i--) {
                if (fun(t[i][property], value)) {
                  return (t[i]);
                }
              }
            }

            return [];
          }

          // if using dot notation then treat property as keypath such as 'name.first'.
          // currently supporting dot notation for non-indexed conditions only
          if (usingDotNotation) {
            property = property.split('.');
            while (i--) {
              if (dotSubScan(t[i], property, fun, value)) {
                result.push(t[i]);
              }
            }
          } else {
            while (i--) {
              if (fun(t[i][property], value)) {
                result.push(t[i]);
              }
            }
          }
        } else {
          // searching by binary index via calculateRange() utility method
          var seg = this.calculateRange(operator, property, value);

          // not chained so this 'find' was designated in Resultset constructor
          // so return object itself
          if (firstOnly) {
            if (seg[1] !== -1) {
              return t[index.values[seg[0]]];
            }
            return [];
          }

          for (i = seg[0]; i <= seg[1]; i++) {
            result.push(t[index.values[i]]);
          }
        }

        // not a chained query so return result as data[]
        return result;
      }


      // Otherwise this is a chained query

      var filter, rowIdx = 0;

      // If the filteredrows[] is already initialized, use it
      if (this.filterInitialized) {
        filter = this.filteredrows;
        i = filter.length;

        // currently supporting dot notation for non-indexed conditions only
        if (usingDotNotation) {
          property = property.split('.');
          while (i--) {
            rowIdx = filter[i];
            if (dotSubScan(t[rowIdx], property, fun, value)) {
              result.push(rowIdx);
            }
          }
        } else {
          while (i--) {
            rowIdx = filter[i];
            if (fun(t[rowIdx][property], value)) {
              result.push(rowIdx);
            }
          }
        }
      }
      // first chained query so work against data[] but put results in filteredrows
      else {
        // if not searching by index
        if (!searchByIndex) {
          i = t.length;

          if (usingDotNotation) {
            property = property.split('.');
            while (i--) {
              if (dotSubScan(t[i], property, fun, value)) {
                result.push(i);
              }
            }
          } else {
            while (i--) {
              if (fun(t[i][property], value)) {
                result.push(i);
              }
            }
          }
        } else {
          // search by index
          var segm = this.calculateRange(operator, property, value);

          for (i = segm[0]; i <= segm[1]; i++) {
            result.push(index.values[i]);
          }
        }

        this.filterInitialized = true; // next time work against filteredrows[]
      }

      this.filteredrows = result;
      return this;
    };


    /**
     * where() - Used for filtering via a javascript filter function.
     *
     * @param {function} fun - A javascript function used for filtering current results by.
     * @returns {Resultset} this resultset for further chain ops.
     * @memberof Resultset
     */
    Resultset.prototype.where = function (fun) {
      var viewFunction,
        result = [];

      if ('function' === typeof fun) {
        viewFunction = fun;
      } else {
        throw new TypeError('Argument is not a stored view or a function');
      }
      try {
        // if not a chained query then run directly against data[] and return object []
        if (!this.searchIsChained) {
          var i = this.collection.data.length;

          while (i--) {
            if (viewFunction(this.collection.data[i]) === true) {
              result.push(this.collection.data[i]);
            }
          }

          // not a chained query so returning result as data[]
          return result;
        }
        // else chained query, so run against filteredrows
        else {
          // If the filteredrows[] is already initialized, use it
          if (this.filterInitialized) {
            var j = this.filteredrows.length;

            while (j--) {
              if (viewFunction(this.collection.data[this.filteredrows[j]]) === true) {
                result.push(this.filteredrows[j]);
              }
            }

            this.filteredrows = result;

            return this;
          }
          // otherwise this is initial chained op, work against data, push into filteredrows[]
          else {
            var k = this.collection.data.length;

            while (k--) {
              if (viewFunction(this.collection.data[k]) === true) {
                result.push(k);
              }
            }

            this.filteredrows = result;
            this.filterInitialized = true;

            return this;
          }
        }
      } catch (err) {
        throw err;
      }
    };

    /**
     * count() - returns the number of documents in the resultset.
     *
     * @returns {number} The number of documents in the resultset.
     * @memberof Resultset
     */
    Resultset.prototype.count = function () {
      if (this.searchIsChained && this.filterInitialized) {
        return this.filteredrows.length;
      }
      return this.collection.count();
    };

    /**
     * Terminates the chain and returns array of filtered documents
     *
     * @param {object=} options - allows specifying 'forceClones' and 'forceCloneMethod' options.
     * @param {boolean} options.forceClones - Allows forcing the return of cloned objects even when
     *        the collection is not configured for clone object.
     * @param {string} options.forceCloneMethod - Allows overriding the default or collection specified cloning method.
     *        Possible values include 'parse-stringify', 'jquery-extend-deep', and 'shallow'
     *
     * @returns {array} Array of documents in the resultset
     * @memberof Resultset
     */
    Resultset.prototype.data = function (options) {
      var result = [],
        data = this.collection.data,
        len,
        i,
        method;

      options = options || {};

      // if this is chained resultset with no filters applied, just return collection.data
      if (this.searchIsChained && !this.filterInitialized) {
        if (this.filteredrows.length === 0) {
          // determine whether we need to clone objects or not
          if (this.collection.cloneObjects || options.forceClones) {
            len = data.length;
            method = options.forceCloneMethod || this.collection.cloneMethod;

            for (i = 0; i < len; i++) {
              result.push(clone(data[i], method));
            }
            return result;
          }
          // otherwise we are not cloning so return sliced array with same object references
          else {
            return data.slice();
          }
        } else {
          // filteredrows must have been set manually, so use it
          this.filterInitialized = true;
        }
      }

      var fr = this.filteredrows;
      len = fr.length;

      if (this.collection.cloneObjects || options.forceClones) {
        method = options.forceCloneMethod || this.collection.cloneMethod;
        for (i = 0; i < len; i++) {
          result.push(clone(data[fr[i]], method));
        }
      } else {
        for (i = 0; i < len; i++) {
          result.push(data[fr[i]]);
        }
      }
      return result;
    };

    /**
     * Used to run an update operation on all documents currently in the resultset.
     *
     * @param {function} updateFunction - User supplied updateFunction(obj) will be executed for each document object.
     * @returns {Resultset} this resultset for further chain ops.
     * @memberof Resultset
     */
    Resultset.prototype.update = function (updateFunction) {

      if (typeof (updateFunction) !== "function") {
        throw new TypeError('Argument is not a function');
      }

      // if this is chained resultset with no filters applied, we need to populate filteredrows first
      if (this.searchIsChained && !this.filterInitialized && this.filteredrows.length === 0) {
        this.filteredrows = this.collection.prepareFullDocIndex();
      }

      var len = this.filteredrows.length,
        rcd = this.collection.data;

      for (var idx = 0; idx < len; idx++) {
        // pass in each document object currently in resultset to user supplied updateFunction
        updateFunction(rcd[this.filteredrows[idx]]);

        // notify collection we have changed this object so it can update meta and allow DynamicViews to re-evaluate
        this.collection.update(rcd[this.filteredrows[idx]]);
      }

      return this;
    };

    /**
     * Removes all document objects which are currently in resultset from collection (as well as resultset)
     *
     * @returns {Resultset} this (empty) resultset for further chain ops.
     * @memberof Resultset
     */
    Resultset.prototype.remove = function () {

      // if this is chained resultset with no filters applied, we need to populate filteredrows first
      if (this.searchIsChained && !this.filterInitialized && this.filteredrows.length === 0) {
        this.filteredrows = this.collection.prepareFullDocIndex();
      }

      this.collection.remove(this.data());

      this.filteredrows = [];

      return this;
    };

    /**
     * data transformation via user supplied functions
     *
     * @param {function} mapFunction - this function accepts a single document for you to transform and return
     * @param {function} reduceFunction - this function accepts many (array of map outputs) and returns single value
     * @returns {value} The output of your reduceFunction
     * @memberof Resultset
     */
    Resultset.prototype.mapReduce = function (mapFunction, reduceFunction) {
      try {
        return reduceFunction(this.data().map(mapFunction));
      } catch (err) {
        throw err;
      }
    };

    /**
     * eqJoin() - Left joining two sets of data. Join keys can be defined or calculated properties
     * eqJoin expects the right join key values to be unique.  Otherwise left data will be joined on the last joinData object with that key
     * @param {Array} joinData - Data array to join to.
     * @param {(string|function)} leftJoinKey - Property name in this result set to join on or a function to produce a value to join on
     * @param {(string|function)} rightJoinKey - Property name in the joinData to join on or a function to produce a value to join on
     * @param {function=} mapFun - (Optional) A function that receives each matching pair and maps them into output objects - function(left,right){return joinedObject}
     * @returns {Resultset} A resultset with data in the format [{left: leftObj, right: rightObj}]
     * @memberof Resultset
     */
    Resultset.prototype.eqJoin = function (joinData, leftJoinKey, rightJoinKey, mapFun) {

      var leftData = [],
        leftDataLength,
        rightData = [],
        rightDataLength,
        key,
        result = [],
        leftKeyisFunction = typeof leftJoinKey === 'function',
        rightKeyisFunction = typeof rightJoinKey === 'function',
        joinMap = {};

      //get the left data
      leftData = this.data();
      leftDataLength = leftData.length;

      //get the right data
      if (joinData instanceof Resultset) {
        rightData = joinData.data();
      } else if (Array.isArray(joinData)) {
        rightData = joinData;
      } else {
        throw new TypeError('joinData needs to be an array or result set');
      }
      rightDataLength = rightData.length;

      //construct a lookup table

      for (var i = 0; i < rightDataLength; i++) {
        key = rightKeyisFunction ? rightJoinKey(rightData[i]) : rightData[i][rightJoinKey];
        joinMap[key] = rightData[i];
      }

      if (!mapFun) {
        mapFun = function (left, right) {
          return {
            left: left,
            right: right
          };
        };
      }

      //Run map function over each object in the resultset
      for (var j = 0; j < leftDataLength; j++) {
        key = leftKeyisFunction ? leftJoinKey(leftData[j]) : leftData[j][leftJoinKey];
        result.push(mapFun(leftData[j], joinMap[key] || {}));
      }

      //return return a new resultset with no filters
      this.collection = new Collection('joinData');
      this.collection.insert(result);
      this.filteredrows = [];
      this.filterInitialized = false;

      return this;
    };

    Resultset.prototype.map = function (mapFun) {
      var data = this.data().map(mapFun);
      //return return a new resultset with no filters
      this.collection = new Collection('mappedData');
      this.collection.insert(data);
      this.filteredrows = [];
      this.filterInitialized = false;

      return this;
    };

    /**
     * DynamicView class is a versatile 'live' view class which can have filters and sorts applied.
     *    Collection.addDynamicView(name) instantiates this DynamicView object and notifies it
     *    whenever documents are add/updated/removed so it can remain up-to-date. (chainable)
     *
     * @example
     * var mydv = mycollection.addDynamicView('test');  // default is non-persistent
     * mydv.applyFind({ 'doors' : 4 });
     * mydv.applyWhere(function(obj) { return obj.name === 'Toyota'; });
     * var results = mydv.data();
     *
     * @constructor DynamicView
     * @implements LokiEventEmitter
     * @param {Collection} collection - A reference to the collection to work against
     * @param {string} name - The name of this dynamic view
     * @param {object=} options - (Optional) Pass in object with 'persistent' and/or 'sortPriority' options.
     * @param {boolean} options.persistent - indicates if view is to main internal results array in 'resultdata'
     * @param {string} options.sortPriority - 'passive' (sorts performed on call to data) or 'active' (after updates)
     * @param {number} options.minRebuildInterval - minimum rebuild interval (need clarification to docs here)
     * @see {@link Collection#addDynamicView} to construct instances of DynamicView
     */
    function DynamicView(collection, name, options) {
      this.collection = collection;
      this.name = name;
      this.rebuildPending = false;
      this.options = options || {};

      if (!this.options.hasOwnProperty('persistent')) {
        this.options.persistent = false;
      }

      // 'persistentSortPriority':
      // 'passive' will defer the sort phase until they call data(). (most efficient overall)
      // 'active' will sort async whenever next idle. (prioritizes read speeds)
      if (!this.options.hasOwnProperty('sortPriority')) {
        this.options.sortPriority = 'passive';
      }

      if (!this.options.hasOwnProperty('minRebuildInterval')) {
        this.options.minRebuildInterval = 1;
      }

      this.resultset = new Resultset(collection);
      this.resultdata = [];
      this.resultsdirty = false;

      this.cachedresultset = null;

      // keep ordered filter pipeline
      this.filterPipeline = [];

      // sorting member variables
      // we only support one active search, applied using applySort() or applySimpleSort()
      this.sortFunction = null;
      this.sortCriteria = null;
      this.sortDirty = false;

      // for now just have 1 event for when we finally rebuilt lazy view
      // once we refactor transactions, i will tie in certain transactional events

      this.events = {
        'rebuild': []
      };
    }

    DynamicView.prototype = new LokiEventEmitter();


    /**
     * rematerialize() - intended for use immediately after deserialization (loading)
     *    This will clear out and reapply filterPipeline ops, recreating the view.
     *    Since where filters do not persist correctly, this method allows
     *    restoring the view to state where user can re-apply those where filters.
     *
     * @param {Object=} options - (Optional) allows specification of 'removeWhereFilters' option
     * @returns {DynamicView} This dynamic view for further chained ops.
     * @memberof DynamicView
     * @fires DynamicView.rebuild
     */
    DynamicView.prototype.rematerialize = function (options) {
      var fpl,
        fpi,
        idx;

      options = options || {};

      this.resultdata = [];
      this.resultsdirty = true;
      this.resultset = new Resultset(this.collection);

      if (this.sortFunction || this.sortCriteria) {
        this.sortDirty = true;
      }

      if (options.hasOwnProperty('removeWhereFilters')) {
        // for each view see if it had any where filters applied... since they don't
        // serialize those functions lets remove those invalid filters
        fpl = this.filterPipeline.length;
        fpi = fpl;
        while (fpi--) {
          if (this.filterPipeline[fpi].type === 'where') {
            if (fpi !== this.filterPipeline.length - 1) {
              this.filterPipeline[fpi] = this.filterPipeline[this.filterPipeline.length - 1];
            }

            this.filterPipeline.length--;
          }
        }
      }

      // back up old filter pipeline, clear filter pipeline, and reapply pipeline ops
      var ofp = this.filterPipeline;
      this.filterPipeline = [];

      // now re-apply 'find' filterPipeline ops
      fpl = ofp.length;
      for (idx = 0; idx < fpl; idx++) {
        this.applyFind(ofp[idx].val);
      }

      // during creation of unit tests, i will remove this forced refresh and leave lazy
      this.data();

      // emit rebuild event in case user wants to be notified
      this.emit('rebuild', this);

      return this;
    };

    /**
     * branchResultset() - Makes a copy of the internal resultset for branched queries.
     *    Unlike this dynamic view, the branched resultset will not be 'live' updated,
     *    so your branched query should be immediately resolved and not held for future evaluation.
     *
     * @param {(string|array=)} transform - Optional name of collection transform, or an array of transform steps
     * @param {object=} parameters - optional parameters (if optional transform requires them)
     * @returns {Resultset} A copy of the internal resultset for branched queries.
     * @memberof DynamicView
     */
    DynamicView.prototype.branchResultset = function (transform, parameters) {
      var rs = this.resultset.branch();

      if (typeof transform === 'undefined') {
        return rs;
      }

      return rs.transform(transform, parameters);
    };

    /**
     * toJSON() - Override of toJSON to avoid circular references
     *
     */
    DynamicView.prototype.toJSON = function () {
      var copy = new DynamicView(this.collection, this.name, this.options);

      copy.resultset = this.resultset;
      copy.resultdata = []; // let's not save data (copy) to minimize size
      copy.resultsdirty = true;
      copy.filterPipeline = this.filterPipeline;
      copy.sortFunction = this.sortFunction;
      copy.sortCriteria = this.sortCriteria;
      copy.sortDirty = this.sortDirty;

      // avoid circular reference, reapply in db.loadJSON()
      copy.collection = null;

      return copy;
    };

    /**
     * removeFilters() - Used to clear pipeline and reset dynamic view to initial state.
     *     Existing options should be retained.
     * @memberof DynamicView
     */
    DynamicView.prototype.removeFilters = function () {
      this.rebuildPending = false;
      this.resultset.reset();
      this.resultdata = [];
      this.resultsdirty = false;

      this.cachedresultset = null;

      // keep ordered filter pipeline
      this.filterPipeline = [];

      // sorting member variables
      // we only support one active search, applied using applySort() or applySimpleSort()
      this.sortFunction = null;
      this.sortCriteria = null;
      this.sortDirty = false;
    };

    /**
     * applySort() - Used to apply a sort to the dynamic view
     * @example
     * dv.applySort(function(obj1, obj2) {
     *   if (obj1.name === obj2.name) return 0;
     *   if (obj1.name > obj2.name) return 1;
     *   if (obj1.name < obj2.name) return -1;
     * });
     *
     * @param {function} comparefun - a javascript compare function used for sorting
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     * @memberof DynamicView
     */
    DynamicView.prototype.applySort = function (comparefun) {
      this.sortFunction = comparefun;
      this.sortCriteria = null;

      this.queueSortPhase();

      return this;
    };

    /**
     * applySimpleSort() - Used to specify a property used for view translation.
     * @example
     * dv.applySimpleSort("name");
     *
     * @param {string} propname - Name of property by which to sort.
     * @param {boolean=} isdesc - (Optional) If true, the sort will be in descending order.
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     * @memberof DynamicView
     */
    DynamicView.prototype.applySimpleSort = function (propname, isdesc) {
      this.sortCriteria = [
        [propname, isdesc || false]
      ];
      this.sortFunction = null;

      this.queueSortPhase();

      return this;
    };

    /**
     * applySortCriteria() - Allows sorting a resultset based on multiple columns.
     * @example
     * // to sort by age and then name (both ascending)
     * dv.applySortCriteria(['age', 'name']);
     * // to sort by age (ascending) and then by name (descending)
     * dv.applySortCriteria(['age', ['name', true]);
     * // to sort by age (descending) and then by name (descending)
     * dv.applySortCriteria(['age', true], ['name', true]);
     *
     * @param {array} properties - array of property names or subarray of [propertyname, isdesc] used evaluate sort order
     * @returns {DynamicView} Reference to this DynamicView, sorted, for future chain operations.
     * @memberof DynamicView
     */
    DynamicView.prototype.applySortCriteria = function (criteria) {
      this.sortCriteria = criteria;
      this.sortFunction = null;

      this.queueSortPhase();

      return this;
    };

    /**
     * startTransaction() - marks the beginning of a transaction.
     *
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     */
    DynamicView.prototype.startTransaction = function () {
      this.cachedresultset = this.resultset.copy();

      return this;
    };

    /**
     * commit() - commits a transaction.
     *
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     */
    DynamicView.prototype.commit = function () {
      this.cachedresultset = null;

      return this;
    };

    /**
     * rollback() - rolls back a transaction.
     *
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     */
    DynamicView.prototype.rollback = function () {
      this.resultset = this.cachedresultset;

      if (this.options.persistent) {
        // for now just rebuild the persistent dynamic view data in this worst case scenario
        // (a persistent view utilizing transactions which get rolled back), we already know the filter so not too bad.
        this.resultdata = this.resultset.data();

        this.emit('rebuild', this);
      }

      return this;
    };


    /**
     * Implementation detail.
     * _indexOfFilterWithId() - Find the index of a filter in the pipeline, by that filter's ID.
     *
     * @param {(string|number)} uid - The unique ID of the filter.
     * @returns {number}: index of the referenced filter in the pipeline; -1 if not found.
     */
    DynamicView.prototype._indexOfFilterWithId = function (uid) {
      if (typeof uid === 'string' || typeof uid === 'number') {
        for (var idx = 0, len = this.filterPipeline.length; idx < len; idx += 1) {
          if (uid === this.filterPipeline[idx].uid) {
            return idx;
          }
        }
      }
      return -1;
    };

    /**
     * Implementation detail.
     * _addFilter() - Add the filter object to the end of view's filter pipeline and apply the filter to the resultset.
     *
     * @param {object} filter - The filter object. Refer to applyFilter() for extra details.
     */
    DynamicView.prototype._addFilter = function (filter) {
      this.filterPipeline.push(filter);
      this.resultset[filter.type](filter.val);
    };

    /**
     * reapplyFilters() - Reapply all the filters in the current pipeline.
     *
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     */
    DynamicView.prototype.reapplyFilters = function () {
      this.resultset.reset();

      this.cachedresultset = null;
      if (this.options.persistent) {
        this.resultdata = [];
        this.resultsdirty = true;
      }

      var filters = this.filterPipeline;
      this.filterPipeline = [];

      for (var idx = 0, len = filters.length; idx < len; idx += 1) {
        this._addFilter(filters[idx]);
      }

      if (this.sortFunction || this.sortCriteria) {
        this.queueSortPhase();
      } else {
        this.queueRebuildEvent();
      }

      return this;
    };

    /**
     * applyFilter() - Adds or updates a filter in the DynamicView filter pipeline
     *
     * @param {object} filter - A filter object to add to the pipeline.
     *    The object is in the format { 'type': filter_type, 'val', filter_param, 'uid', optional_filter_id }
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     * @memberof DynamicView
     */
    DynamicView.prototype.applyFilter = function (filter) {
      var idx = this._indexOfFilterWithId(filter.uid);
      if (idx >= 0) {
        this.filterPipeline[idx] = filter;
        return this.reapplyFilters();
      }

      this.cachedresultset = null;
      if (this.options.persistent) {
        this.resultdata = [];
        this.resultsdirty = true;
      }

      this._addFilter(filter);

      if (this.sortFunction || this.sortCriteria) {
        this.queueSortPhase();
      } else {
        this.queueRebuildEvent();
      }

      return this;
    };

    /**
     * applyFind() - Adds or updates a mongo-style query option in the DynamicView filter pipeline
     *
     * @param {object} query - A mongo-style query object to apply to pipeline
     * @param {(string|number)=} uid - Optional: The unique ID of this filter, to reference it in the future.
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     * @memberof DynamicView
     */
    DynamicView.prototype.applyFind = function (query, uid) {
      this.applyFilter({
        type: 'find',
        val: query,
        uid: uid
      });
      return this;
    };

    /**
     * applyWhere() - Adds or updates a javascript filter function in the DynamicView filter pipeline
     *
     * @param {function} fun - A javascript filter function to apply to pipeline
     * @param {(string|number)=} uid - Optional: The unique ID of this filter, to reference it in the future.
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     * @memberof DynamicView
     */
    DynamicView.prototype.applyWhere = function (fun, uid) {
      this.applyFilter({
        type: 'where',
        val: fun,
        uid: uid
      });
      return this;
    };

    /**
     * removeFilter() - Remove the specified filter from the DynamicView filter pipeline
     *
     * @param {(string|number)} uid - The unique ID of the filter to be removed.
     * @returns {DynamicView} this DynamicView object, for further chain ops.
     * @memberof DynamicView
     */
    DynamicView.prototype.removeFilter = function (uid) {
      var idx = this._indexOfFilterWithId(uid);
      if (idx < 0) {
        throw new Error("Dynamic view does not contain a filter with ID: " + uid);
      }

      this.filterPipeline.splice(idx, 1);
      this.reapplyFilters();
      return this;
    };

    /**
     * count() - returns the number of documents representing the current DynamicView contents.
     *
     * @returns {number} The number of documents representing the current DynamicView contents.
     * @memberof DynamicView
     */
    DynamicView.prototype.count = function () {
      if (this.options.persistent) {
        return this.resultdata.length;
      }
      return this.resultset.count();
    };

    /**
     * data() - resolves and pending filtering and sorting, then returns document array as result.
     *
     * @returns {array} An array of documents representing the current DynamicView contents.
     * @memberof DynamicView
     */
    DynamicView.prototype.data = function () {
      // using final sort phase as 'catch all' for a few use cases which require full rebuild
      if (this.sortDirty || this.resultsdirty) {
        this.performSortPhase({
          suppressRebuildEvent: true
        });
      }
      return (this.options.persistent) ? (this.resultdata) : (this.resultset.data());
    };

    /**
     * queueRebuildEvent() - When the view is not sorted we may still wish to be notified of rebuild events.
     *     This event will throttle and queue a single rebuild event when batches of updates affect the view.
     */
    DynamicView.prototype.queueRebuildEvent = function () {
      if (this.rebuildPending) {
        return;
      }
      this.rebuildPending = true;

      var self = this;
      setTimeout(function () {
        if (self.rebuildPending) {
          self.rebuildPending = false;
          self.emit('rebuild', self);
        }
      }, this.options.minRebuildInterval);
    };

    /**
     * queueSortPhase : If the view is sorted we will throttle sorting to either :
     *    (1) passive - when the user calls data(), or
     *    (2) active - once they stop updating and yield js thread control
     */
    DynamicView.prototype.queueSortPhase = function () {
      // already queued? exit without queuing again
      if (this.sortDirty) {
        return;
      }
      this.sortDirty = true;

      var self = this;
      if (this.options.sortPriority === "active") {
        // active sorting... once they are done and yield js thread, run async performSortPhase()
        setTimeout(function () {
          self.performSortPhase();
        }, this.options.minRebuildInterval);
      } else {
        // must be passive sorting... since not calling performSortPhase (until data call), lets use queueRebuildEvent to
        // potentially notify user that data has changed.
        this.queueRebuildEvent();
      }
    };

    /**
     * performSortPhase() - invoked synchronously or asynchronously to perform final sort phase (if needed)
     *
     */
    DynamicView.prototype.performSortPhase = function (options) {
      // async call to this may have been pre-empted by synchronous call to data before async could fire
      if (!this.sortDirty && !this.resultsdirty) {
        return;
      }

      options = options || {};

      if (this.sortDirty) {
        if (this.sortFunction) {
          this.resultset.sort(this.sortFunction);
        } else if (this.sortCriteria) {
          this.resultset.compoundsort(this.sortCriteria);
        }

        this.sortDirty = false;
      }

      if (this.options.persistent) {
        // persistent view, rebuild local resultdata array
        this.resultdata = this.resultset.data();
        this.resultsdirty = false;
      }

      if (!options.suppressRebuildEvent) {
        this.emit('rebuild', this);
      }
    };

    /**
     * evaluateDocument() - internal method for (re)evaluating document inclusion.
     *    Called by : collection.insert() and collection.update().
     *
     * @param {int} objIndex - index of document to (re)run through filter pipeline.
     * @param {bool} isNew - true if the document was just added to the collection.
     */
    DynamicView.prototype.evaluateDocument = function (objIndex, isNew) {
      // if no filter applied yet, the result 'set' should remain 'everything'
      if (!this.resultset.filterInitialized) {
        if (this.options.persistent) {
          this.resultdata = this.resultset.data();
        }
        // need to re-sort to sort new document
        if (this.sortFunction || this.sortCriteria) {
          this.queueSortPhase();
        } else {
          this.queueRebuildEvent();
        }
        return;
      }

      var ofr = this.resultset.filteredrows;
      var oldPos = (isNew) ? (-1) : (ofr.indexOf(+objIndex));
      var oldlen = ofr.length;

      // creating a 1-element resultset to run filter chain ops on to see if that doc passes filters;
      // mostly efficient algorithm, slight stack overhead price (this function is called on inserts and updates)
      var evalResultset = new Resultset(this.collection);
      evalResultset.filteredrows = [objIndex];
      evalResultset.filterInitialized = true;
      var filter;
      for (var idx = 0, len = this.filterPipeline.length; idx < len; idx++) {
        filter = this.filterPipeline[idx];
        evalResultset[filter.type](filter.val);
      }

      // not a true position, but -1 if not pass our filter(s), 0 if passed filter(s)
      var newPos = (evalResultset.filteredrows.length === 0) ? -1 : 0;

      // wasn't in old, shouldn't be now... do nothing
      if (oldPos === -1 && newPos === -1) return;

      // wasn't in resultset, should be now... add
      if (oldPos === -1 && newPos !== -1) {
        ofr.push(objIndex);

        if (this.options.persistent) {
          this.resultdata.push(this.collection.data[objIndex]);
        }

        // need to re-sort to sort new document
        if (this.sortFunction || this.sortCriteria) {
          this.queueSortPhase();
        } else {
          this.queueRebuildEvent();
        }

        return;
      }

      // was in resultset, shouldn't be now... delete
      if (oldPos !== -1 && newPos === -1) {
        if (oldPos < oldlen - 1) {
          // http://dvolvr.davidwaterston.com/2013/06/09/restating-the-obvious-the-fastest-way-to-truncate-an-array-in-javascript/comment-page-1/
          ofr[oldPos] = ofr[oldlen - 1];
          ofr.length = oldlen - 1;

          if (this.options.persistent) {
            this.resultdata[oldPos] = this.resultdata[oldlen - 1];
            this.resultdata.length = oldlen - 1;
          }
        } else {
          ofr.length = oldlen - 1;

          if (this.options.persistent) {
            this.resultdata.length = oldlen - 1;
          }
        }

        // in case changes to data altered a sort column
        if (this.sortFunction || this.sortCriteria) {
          this.queueSortPhase();
        } else {
          this.queueRebuildEvent();
        }

        return;
      }

      // was in resultset, should still be now... (update persistent only?)
      if (oldPos !== -1 && newPos !== -1) {
        if (this.options.persistent) {
          // in case document changed, replace persistent view data with the latest collection.data document
          this.resultdata[oldPos] = this.collection.data[objIndex];
        }

        // in case changes to data altered a sort column
        if (this.sortFunction || this.sortCriteria) {
          this.queueSortPhase();
        } else {
          this.queueRebuildEvent();
        }

        return;
      }
    };

    /**
     * removeDocument() - internal function called on collection.delete()
     */
    DynamicView.prototype.removeDocument = function (objIndex) {
      // if no filter applied yet, the result 'set' should remain 'everything'
      if (!this.resultset.filterInitialized) {
        if (this.options.persistent) {
          this.resultdata = this.resultset.data();
        }
        // in case changes to data altered a sort column
        if (this.sortFunction || this.sortCriteria) {
          this.queueSortPhase();
        } else {
          this.queueRebuildEvent();
        }
        return;
      }

      var ofr = this.resultset.filteredrows;
      var oldPos = ofr.indexOf(+objIndex);
      var oldlen = ofr.length;
      var idx;

      if (oldPos !== -1) {
        // if not last row in resultdata, swap last to hole and truncate last row
        if (oldPos < oldlen - 1) {
          ofr[oldPos] = ofr[oldlen - 1];
          ofr.length = oldlen - 1;

          if (this.options.persistent) {
            this.resultdata[oldPos] = this.resultdata[oldlen - 1];
            this.resultdata.length = oldlen - 1;
          }
        }
        // last row, so just truncate last row
        else {
          ofr.length = oldlen - 1;

          if (this.options.persistent) {
            this.resultdata.length = oldlen - 1;
          }
        }

        // in case changes to data altered a sort column
        if (this.sortFunction || this.sortCriteria) {
          this.queueSortPhase();
        } else {
          this.queueRebuildEvent();
        }
      }

      // since we are using filteredrows to store data array positions
      // if they remove a document (whether in our view or not),
      // we need to adjust array positions -1 for all document array references after that position
      oldlen = ofr.length;
      for (idx = 0; idx < oldlen; idx++) {
        if (ofr[idx] > objIndex) {
          ofr[idx]--;
        }
      }
    };

    /**
     * mapReduce() - data transformation via user supplied functions
     *
     * @param {function} mapFunction - this function accepts a single document for you to transform and return
     * @param {function} reduceFunction - this function accepts many (array of map outputs) and returns single value
     * @returns The output of your reduceFunction
     * @memberof DynamicView
     */
    DynamicView.prototype.mapReduce = function (mapFunction, reduceFunction) {
      try {
        return reduceFunction(this.data().map(mapFunction));
      } catch (err) {
        throw err;
      }
    };


    /**
     * Collection class that handles documents of same type
     * @constructor Collection
     * @implements LokiEventEmitter
     * @param {string} name - collection name
     * @param {(array|object)=} options - (optional) array of property names to be indicized OR a configuration object
     * @param {array} options.unique - array of property names to define unique constraints for
     * @param {array} options.exact - array of property names to define exact constraints for
     * @param {array} options.indices - array property names to define binary indexes for
     * @param {boolean} options.asyncListeners - default is false
     * @param {boolean} options.disableChangesApi - default is true
     * @param {boolean} options.autoupdate - use Object.observe to update objects automatically (default: false)
     * @param {boolean} options.clone - specify whether inserts and queries clone to/from user
     * @param {string} options.cloneMethod - 'parse-stringify' (default), 'jquery-extend-deep', 'shallow'
     * @param {int} options.ttlInterval - time interval for clearing out 'aged' documents; not set by default.
     * @see {@link Loki#addCollection} for normal creation of collections
     */
    function Collection(name, options) {
      // the name of the collection

      this.name = name;
      // the data held by the collection
      this.data = [];
      this.idIndex = []; // index of id
      this.binaryIndices = {}; // user defined indexes
      this.constraints = {
        unique: {},
        exact: {}
      };

      // unique contraints contain duplicate object references, so they are not persisted.
      // we will keep track of properties which have unique contraint applied here, and regenerate on load
      this.uniqueNames = [];

      // transforms will be used to store frequently used query chains as a series of steps
      // which itself can be stored along with the database.
      this.transforms = {};

      // the object type of the collection
      this.objType = name;

      // in autosave scenarios we will use collection level dirty flags to determine whether save is needed.
      // currently, if any collection is dirty we will autosave the whole database if autosave is configured.
      // defaulting to true since this is called from addCollection and adding a collection should trigger save
      this.dirty = true;

      // private holders for cached data
      this.cachedIndex = null;
      this.cachedBinaryIndex = null;
      this.cachedData = null;
      var self = this;

      /* OPTIONS */
      options = options || {};

      // exact match and unique constraints
      if (options.hasOwnProperty('unique')) {
        if (!Array.isArray(options.unique)) {
          options.unique = [options.unique];
        }
        options.unique.forEach(function (prop) {
          self.uniqueNames.push(prop); // used to regenerate on subsequent database loads
          self.constraints.unique[prop] = new UniqueIndex(prop);
        });
      }

      if (options.hasOwnProperty('exact')) {
        options.exact.forEach(function (prop) {
          self.constraints.exact[prop] = new ExactIndex(prop);
        });
      }

      // is collection transactional
      this.transactional = options.hasOwnProperty('transactional') ? options.transactional : false;

      // options to clone objects when inserting them
      this.cloneObjects = options.hasOwnProperty('clone') ? options.clone : false;

      // default clone method (if enabled) is parse-stringify
      this.cloneMethod = options.hasOwnProperty('cloneMethod') ? options.cloneMethod : "parse-stringify";

      // option to make event listeners async, default is sync
      this.asyncListeners = options.hasOwnProperty('asyncListeners') ? options.asyncListeners : false;

      // disable track changes
      this.disableChangesApi = options.hasOwnProperty('disableChangesApi') ? options.disableChangesApi : true;

      // option to observe objects and update them automatically, ignored if Object.observe is not supported
      this.autoupdate = options.hasOwnProperty('autoupdate') ? options.autoupdate : false;

      //option to activate a cleaner daemon - clears "aged" documents at set intervals.
      this.ttl = {
        age: null,
        ttlInterval: null,
        daemon: null
      };
      this.setTTL(options.ttl || -1, options.ttlInterval);

      // currentMaxId - change manually at your own peril!
      this.maxId = 0;

      this.DynamicViews = [];

      // events
      this.events = {
        'insert': [],
        'update': [],
        'pre-insert': [],
        'pre-update': [],
        'close': [],
        'flushbuffer': [],
        'error': [],
        'delete': [],
        'warning': []
      };

      // changes are tracked by collection and aggregated by the db
      this.changes = [];

      // initialize the id index
      this.ensureId();
      var indices = [];
      // initialize optional user-supplied indices array ['age', 'lname', 'zip']
      if (options && options.indices) {
        if (Object.prototype.toString.call(options.indices) === '[object Array]') {
          indices = options.indices;
        } else if (typeof options.indices === 'string') {
          indices = [options.indices];
        } else {
          throw new TypeError('Indices needs to be a string or an array of strings');
        }
      }

      for (var idx = 0; idx < indices.length; idx++) {
        this.ensureIndex(indices[idx]);
      }

      function observerCallback(changes) {

        var changedObjects = typeof Set === 'function' ? new Set() : [];

        if (!changedObjects.add)
          changedObjects.add = function (object) {
            if (this.indexOf(object) === -1)
              this.push(object);
            return this;
          };

        changes.forEach(function (change) {
          changedObjects.add(change.object);
        });

        changedObjects.forEach(function (object) {
          if (!hasOwnProperty.call(object, '$loki'))
            return self.removeAutoUpdateObserver(object);
          try {
            self.update(object);
          } catch (err) {}
        });
      }

      this.observerCallback = observerCallback;

      /*
       * This method creates a clone of the current status of an object and associates operation and collection name,
       * so the parent db can aggregate and generate a changes object for the entire db
       */
      function createChange(name, op, obj) {
        self.changes.push({
          name: name,
          operation: op,
          obj: JSON.parse(JSON.stringify(obj))
        });
      }

      // clear all the changes
      function flushChanges() {
        self.changes = [];
      }

      this.getChanges = function () {
        return self.changes;
      };

      this.flushChanges = flushChanges;

      /**
       * If the changes API is disabled make sure only metadata is added without re-evaluating everytime if the changesApi is enabled
       */
      function insertMeta(obj) {
        if (!obj) {
          return;
        }
        if (!obj.meta) {
          obj.meta = {};
        }

        obj.meta.created = (new Date()).getTime();
        obj.meta.revision = 0;
      }

      function updateMeta(obj) {
        if (!obj) {
          return;
        }
        obj.meta.updated = (new Date()).getTime();
        obj.meta.revision += 1;
      }

      function createInsertChange(obj) {
        createChange(self.name, 'I', obj);
      }

      function createUpdateChange(obj) {
        createChange(self.name, 'U', obj);
      }

      function insertMetaWithChange(obj) {
        insertMeta(obj);
        createInsertChange(obj);
      }

      function updateMetaWithChange(obj) {
        updateMeta(obj);
        createUpdateChange(obj);
      }


      /* assign correct handler based on ChangesAPI flag */
      var insertHandler, updateHandler;

      function setHandlers() {
        insertHandler = self.disableChangesApi ? insertMeta : insertMetaWithChange;
        updateHandler = self.disableChangesApi ? updateMeta : updateMetaWithChange;
      }

      setHandlers();

      this.setChangesApi = function (enabled) {
        self.disableChangesApi = !enabled;
        setHandlers();
      };
      /**
       * built-in events
       */
      this.on('insert', function insertCallback(obj) {
        insertHandler(obj);
      });

      this.on('update', function updateCallback(obj) {
        updateHandler(obj);
      });

      this.on('delete', function deleteCallback(obj) {
        if (!self.disableChangesApi) {
          createChange(self.name, 'R', obj);
        }
      });

      this.on('warning', function (warning) {
        self.console.warn(warning);
      });
      // for de-serialization purposes
      flushChanges();
    }

    Collection.prototype = new LokiEventEmitter();

    Collection.prototype.console = {
      log: function () {},
      warn: function () {},
      error: function () {},
    };

    Collection.prototype.addAutoUpdateObserver = function (object) {
      if (!this.autoupdate || typeof Object.observe !== 'function')
        return;

      Object.observe(object, this.observerCallback, ['add', 'update', 'delete', 'reconfigure', 'setPrototype']);
    };

    Collection.prototype.removeAutoUpdateObserver = function (object) {
      if (!this.autoupdate || typeof Object.observe !== 'function')
        return;

      Object.unobserve(object, this.observerCallback);
    };

    /**
     * Adds a named collection transform to the collection
     * @param {string} name - name to associate with transform
     * @param {array} transform - an array of transformation 'step' objects to save into the collection
     * @memberof Collection
     */
    Collection.prototype.addTransform = function (name, transform) {
      if (this.transforms.hasOwnProperty(name)) {
        throw new Error("a transform by that name already exists");
      }

      this.transforms[name] = transform;
    };

    /**
     * Updates a named collection transform to the collection
     * @param {string} name - name to associate with transform
     * @param {object} transform - a transformation object to save into collection
     * @memberof Collection
     */
    Collection.prototype.setTransform = function (name, transform) {
      this.transforms[name] = transform;
    };

    /**
     * Removes a named collection transform from the collection
     * @param {string} name - name of collection transform to remove
     * @memberof Collection
     */
    Collection.prototype.removeTransform = function (name) {
      delete this.transforms[name];
    };

    Collection.prototype.byExample = function (template) {
      var k, obj, query;
      query = [];
      for (k in template) {
        if (!template.hasOwnProperty(k)) continue;
        query.push((
          obj = {},
          obj[k] = template[k],
          obj
        ));
      }
      return {
        '$and': query
      };
    };

    Collection.prototype.findObject = function (template) {
      return this.findOne(this.byExample(template));
    };

    Collection.prototype.findObjects = function (template) {
      return this.find(this.byExample(template));
    };

    /*----------------------------+
    | TTL daemon                  |
    +----------------------------*/
    Collection.prototype.ttlDaemonFuncGen = function () {
      var collection = this;
      var age = this.ttl.age;
      return function ttlDaemon() {
        var now = Date.now();
        var toRemove = collection.chain().where(function daemonFilter(member) {
          var timestamp = member.meta.updated || member.meta.created;
          var diff = now - timestamp;
          return age < diff;
        });
        toRemove.remove();
      };
    };

    Collection.prototype.setTTL = function (age, interval) {
      if (age < 0) {
        clearInterval(this.ttl.daemon);
      } else {
        this.ttl.age = age;
        this.ttl.ttlInterval = interval;
        this.ttl.daemon = setInterval(this.ttlDaemonFuncGen(), interval);
      }
    };

    /*----------------------------+
    | INDEXING                    |
    +----------------------------*/

    /**
     * create a row filter that covers all documents in the collection
     */
    Collection.prototype.prepareFullDocIndex = function () {
      var len = this.data.length;
      var indexes = new Array(len);
      for (var i = 0; i < len; i += 1) {
        indexes[i] = i;
      }
      return indexes;
    };

    /**
     * Ensure binary index on a certain field
     * @param {string} property - name of property to create binary index on
     * @param {boolean=} force - (Optional) flag indicating whether to construct index immediately
     * @memberof Collection
     */
    Collection.prototype.ensureIndex = function (property, force) {
      // optional parameter to force rebuild whether flagged as dirty or not
      if (typeof (force) === 'undefined') {
        force = false;
      }

      if (property === null || property === undefined) {
        throw new Error('Attempting to set index without an associated property');
      }

      if (this.binaryIndices[property] && !force) {
        if (!this.binaryIndices[property].dirty) return;
      }

      var index = {
        'name': property,
        'dirty': true,
        'values': this.prepareFullDocIndex()
      };
      this.binaryIndices[property] = index;

      var wrappedComparer =
        (function (p, data) {
          return function (a, b) {
            var objAp = data[a][p],
              objBp = data[b][p];
            if (objAp !== objBp) {
              if (ltHelper(objAp, objBp, false)) return -1;
              if (gtHelper(objAp, objBp, false)) return 1;
            }
            return 0;
          };
        })(property, this.data);

      index.values.sort(wrappedComparer);
      index.dirty = false;

      this.dirty = true; // for autosave scenarios
    };

    Collection.prototype.getSequencedIndexValues = function (property) {
      var idx, idxvals = this.binaryIndices[property].values;
      var result = "";

      for (idx = 0; idx < idxvals.length; idx++) {
        result += " [" + idx + "] " + this.data[idxvals[idx]][property];
      }

      return result;
    };

    Collection.prototype.ensureUniqueIndex = function (field) {
      var index = this.constraints.unique[field];
      if (!index) {
        // keep track of new unique index for regenerate after database (re)load.
        if (this.uniqueNames.indexOf(field) == -1) {
          this.uniqueNames.push(field);
        }
      }

      // if index already existed, (re)loading it will likely cause collisions, rebuild always
      this.constraints.unique[field] = index = new UniqueIndex(field);
      this.data.forEach(function (obj) {
        index.set(obj);
      });
      return index;
    };

    /**
     * Ensure all binary indices
     */
    Collection.prototype.ensureAllIndexes = function (force) {
      var key, bIndices = this.binaryIndices;
      for (key in bIndices) {
        if (hasOwnProperty.call(bIndices, key)) {
          this.ensureIndex(key, force);
        }
      }
    };

    Collection.prototype.flagBinaryIndexesDirty = function () {
      var key, bIndices = this.binaryIndices;
      for (key in bIndices) {
        if (hasOwnProperty.call(bIndices, key)) {
          bIndices[key].dirty = true;
        }
      }
    };

    Collection.prototype.flagBinaryIndexDirty = function (index) {
      if (this.binaryIndices[index])
        this.binaryIndices[index].dirty = true;
    };

    /**
     * Quickly determine number of documents in collection (or query)
     * @param {object=} query - (optional) query object to count results of
     * @returns {number} number of documents in the collection
     * @memberof Collection
     */
    Collection.prototype.count = function (query) {
      if (!query) {
        return this.data.length;
      }

      return this.chain().find(query).filteredrows.length;
    };

    /**
     * Rebuild idIndex
     */
    Collection.prototype.ensureId = function () {
      var len = this.data.length,
        i = 0;

      this.idIndex = [];
      for (i; i < len; i += 1) {
        this.idIndex.push(this.data[i].$loki);
      }
    };

    /**
     * Rebuild idIndex async with callback - useful for background syncing with a remote server
     */
    Collection.prototype.ensureIdAsync = function (callback) {
      this.async(function () {
        this.ensureId();
      }, callback);
    };

    /**
     * Add a dynamic view to the collection
     * @param {string} name - name of dynamic view to add
     * @param {object=} options - (optional) options to configure dynamic view with
     * @param {boolean} options.persistent - indicates if view is to main internal results array in 'resultdata'
     * @param {string} options.sortPriority - 'passive' (sorts performed on call to data) or 'active' (after updates)
     * @param {number} options.minRebuildInterval - minimum rebuild interval (need clarification to docs here)
     * @returns {DynamicView} reference to the dynamic view added
     * @memberof Collection
     **/

    Collection.prototype.addDynamicView = function (name, options) {
      var dv = new DynamicView(this, name, options);
      this.DynamicViews.push(dv);

      return dv;
    };

    /**
     * Remove a dynamic view from the collection
     * @param {string} name - name of dynamic view to remove
     * @memberof Collection
     **/
    Collection.prototype.removeDynamicView = function (name) {
      for (var idx = 0; idx < this.DynamicViews.length; idx++) {
        if (this.DynamicViews[idx].name === name) {
          this.DynamicViews.splice(idx, 1);
        }
      }
    };

    /**
     * Look up dynamic view reference from within the collection
     * @param {string} name - name of dynamic view to retrieve reference of
     * @returns {DynamicView} A reference to the dynamic view with that name
     * @memberof Collection
     **/
    Collection.prototype.getDynamicView = function (name) {
      for (var idx = 0; idx < this.DynamicViews.length; idx++) {
        if (this.DynamicViews[idx].name === name) {
          return this.DynamicViews[idx];
        }
      }

      return null;
    };

    /**
     * find and update: pass a filtering function to select elements to be updated
     * and apply the updatefunctino to those elements iteratively
     * @param {function} filterFunction - filter function whose results will execute update
     * @param {function} updateFunction - update function to run against filtered documents
     * @memberof Collection
     */
    Collection.prototype.findAndUpdate = function (filterFunction, updateFunction) {
      var results = this.where(filterFunction),
        i = 0,
        obj;
      try {
        for (i; i < results.length; i++) {
          obj = updateFunction(results[i]);
          this.update(obj);
        }

      } catch (err) {
        this.rollback();
        this.console.error(err.message);
      }
    };

    /**
     * Adds object(s) to collection, ensure object(s) have meta properties, clone it if necessary, etc.
     * @param {(object|array)} doc - the document (or array of documents) to be inserted
     * @returns {(object|array)} document or documents inserted
     * @memberof Collection
     */
    Collection.prototype.insert = function (doc) {
      if (!Array.isArray(doc)) {
        return this.insertOne(doc);
      }

      // holder to the clone of the object inserted if collections is set to clone objects
      var obj;
      var results = [];
      for (var i = 0, len = doc.length; i < len; i++) {
        obj = this.insertOne(doc[i]);
        if (!obj) {
          return undefined;
        }
        results.push(obj);
      }
      return results.length === 1 ? results[0] : results;
    };

    /**
     * Adds a single object, ensures it has meta properties, clone it if necessary, etc.
     * @param {object} doc - the document to be inserted
     * @returns {object} document or 'undefined' if there was a problem inserting it
     * @memberof Collection
     */
    Collection.prototype.insertOne = function (doc) {
      var err = null;
      if (typeof doc !== 'object') {
        err = new TypeError('Document needs to be an object');
      } else if (doc === null) {
        err = new TypeError('Object cannot be null');
      }

      if (err !== null) {
        this.emit('error', err);
        throw err;
      }

      // if configured to clone, do so now... otherwise just use same obj reference
      var obj = this.cloneObjects ? clone(doc, this.cloneMethod) : doc;

      if (typeof obj.meta === 'undefined') {
        obj.meta = {
          revision: 0,
          created: 0
        };
      }

      this.emit('pre-insert', obj);
      if (!this.add(obj)) {
        return undefined;
      }

      this.addAutoUpdateObserver(obj);
      this.emit('insert', obj);
      return obj;
    };

    /**
     * Empties the collection.
     * @memberof Collection
     */
    Collection.prototype.clear = function () {
      this.data = [];
      this.idIndex = [];
      this.binaryIndices = {};
      this.cachedIndex = null;
      this.cachedBinaryIndex = null;
      this.cachedData = null;
      this.maxId = 0;
      this.DynamicViews = [];
      this.dirty = true;
    };

    /**
     * Updates an object and notifies collection that the document has changed.
     * @param {object} doc - document to update within the collection
     * @memberof Collection
     */
    Collection.prototype.update = function (doc) {
      this.flagBinaryIndexesDirty();

      if (Array.isArray(doc)) {
        var k = 0,
          len = doc.length;
        for (k; k < len; k += 1) {
          this.update(doc[k]);
        }
        return;
      }

      // verify object is a properly formed document
      if (!hasOwnProperty.call(doc, '$loki')) {
        throw new Error('Trying to update unsynced document. Please save the document first by using insert() or addMany()');
      }
      try {
        this.startTransaction();
        var arr = this.get(doc.$loki, true),
          obj,
          position,
          self = this;

        obj = arr[0]; // -internal- obj ref
        position = arr[1]; // position in data array

        if (!arr) {
          throw new Error('Trying to update a document not in collection.');
        }
        this.emit('pre-update', doc);

        Object.keys(this.constraints.unique).forEach(function (key) {
          self.constraints.unique[key].update(obj, doc);
        });

        // operate the update
        this.data[position] = doc;

        if (obj !== doc) {
          this.addAutoUpdateObserver(doc);
        }

        // now that we can efficiently determine the data[] position of newly added document,
        // submit it for all registered DynamicViews to evaluate for inclusion/exclusion
        for (var idx = 0; idx < this.DynamicViews.length; idx++) {
          this.DynamicViews[idx].evaluateDocument(position, false);
        }

        this.idIndex[position] = obj.$loki;

        this.commit();
        this.dirty = true; // for autosave scenarios
        this.emit('update', doc);
        return doc;
      } catch (err) {
        this.rollback();
        this.console.error(err.message);
        this.emit('error', err);
        throw (err); // re-throw error so user does not think it succeeded
      }
    };

    /**
     * Add object to collection
     */
    Collection.prototype.add = function (obj) {
      // if parameter isn't object exit with throw
      if ('object' !== typeof obj) {
        throw new TypeError('Object being added needs to be an object');
      }
      // if object you are adding already has id column it is either already in the collection
      // or the object is carrying its own 'id' property.  If it also has a meta property,
      // then this is already in collection so throw error, otherwise rename to originalId and continue adding.
      if (typeof (obj.$loki) !== 'undefined') {
        throw new Error('Document is already in collection, please use update()');
      }

      this.flagBinaryIndexesDirty();

      /*
       * try adding object to collection
       */
      try {
        this.startTransaction();
        this.maxId++;

        if (isNaN(this.maxId)) {
          this.maxId = (this.data[this.data.length - 1].$loki + 1);
        }

        obj.$loki = this.maxId;
        obj.meta.version = 0;

        var key, constrUnique = this.constraints.unique;
        for (key in constrUnique) {
          if (hasOwnProperty.call(constrUnique, key)) {
            constrUnique[key].set(obj);
          }
        }

        // add new obj id to idIndex
        this.idIndex.push(obj.$loki);

        // add the object
        this.data.push(obj);

        // now that we can efficiently determine the data[] position of newly added document,
        // submit it for all registered DynamicViews to evaluate for inclusion/exclusion
        var addedPos = this.data.length - 1;
        var dvlen = this.DynamicViews.length;
        for (var i = 0; i < dvlen; i++) {
          this.DynamicViews[i].evaluateDocument(addedPos, true);
        }

        this.commit();
        this.dirty = true; // for autosave scenarios

        return (this.cloneObjects) ? (clone(obj, this.cloneMethod)) : (obj);
      } catch (err) {
        this.rollback();
        this.console.error(err.message);
        this.emit('error', err);
        throw (err); // re-throw error so user does not think it succeeded
      }
    };


    /**
     * Remove all documents matching supplied filter object
     * @param {object} query - query object to filter on
     * @memberof Collection
     */
    Collection.prototype.removeWhere = function (query) {
      var list;
      if (typeof query === 'function') {
        list = this.data.filter(query);
      } else {
        list = new Resultset(this, {
          queryObj: query
        });
      }
      this.remove(list);
    };

    Collection.prototype.removeDataOnly = function () {
      this.remove(this.data.slice());
    };

    /**
     * Remove a document from the collection
     * @param {object} doc - document to remove from collection
     * @memberof Collection
     */
    Collection.prototype.remove = function (doc) {
      if (typeof doc === 'number') {
        doc = this.get(doc);
      }

      if ('object' !== typeof doc) {
        throw new Error('Parameter is not an object');
      }
      if (Array.isArray(doc)) {
        var k = 0,
          len = doc.length;
        for (k; k < len; k += 1) {
          this.remove(doc[k]);
        }
        return;
      }

      if (!hasOwnProperty.call(doc, '$loki')) {
        throw new Error('Object is not a document stored in the collection');
      }

      this.flagBinaryIndexesDirty();

      try {
        this.startTransaction();
        var arr = this.get(doc.$loki, true),
          // obj = arr[0],
          position = arr[1];
        var self = this;
        Object.keys(this.constraints.unique).forEach(function (key) {
          if (doc[key] !== null && typeof doc[key] !== 'undefined') {
            self.constraints.unique[key].remove(doc[key]);
          }
        });
        // now that we can efficiently determine the data[] position of newly added document,
        // submit it for all registered DynamicViews to remove
        for (var idx = 0; idx < this.DynamicViews.length; idx++) {
          this.DynamicViews[idx].removeDocument(position);
        }

        this.data.splice(position, 1);
        this.removeAutoUpdateObserver(doc);

        // remove id from idIndex
        this.idIndex.splice(position, 1);

        this.commit();
        this.dirty = true; // for autosave scenarios
        this.emit('delete', arr[0]);
        delete doc.$loki;
        delete doc.meta;
        return doc;

      } catch (err) {
        this.rollback();
        this.console.error(err.message);
        this.emit('error', err);
        return null;
      }
    };

    /*---------------------+
    | Finding methods     |
    +----------------------*/

    /**
     * Get by Id - faster than other methods because of the searching algorithm
     * @param {int} id - $loki id of document you want to retrieve
     * @param {boolean} returnPosition - if 'true' we will return [object, position]
     * @returns {(object|array|null)} Object reference if document was found, null if not,
     *     or an array if 'returnPosition' was passed.
     * @memberof Collection
     */
    Collection.prototype.get = function (id, returnPosition) {
      var retpos = returnPosition || false,
        data = this.idIndex,
        max = data.length - 1,
        min = 0,
        mid = (min + max) >> 1;

      id = typeof id === 'number' ? id : parseInt(id, 10);

      if (isNaN(id)) {
        throw new TypeError('Passed id is not an integer');
      }

      while (data[min] < data[max]) {
        mid = (min + max) >> 1;

        if (data[mid] < id) {
          min = mid + 1;
        } else {
          max = mid;
        }
      }

      if (max === min && data[min] === id) {
        if (retpos) {
          return [this.data[min], min];
        }
        return this.data[min];
      }
      return null;

    };

    /**
     * Retrieve doc by Unique index
     * @param {string} field - name of uniquely indexed property to use when doing lookup
     * @param {value} value - unique value to search for
     * @returns {object} document matching the value passed
     * @memberof Collection
     */
    Collection.prototype.by = function (field, value) {
      var self;
      if (value === undefined) {
        self = this;
        return function (value) {
          return self.by(field, value);
        };
      }

      var result = this.constraints.unique[field].get(value);
      if (!this.cloneObjects) {
        return result;
      } else {
        return clone(result, this.cloneMethod);
      }
    };

    /**
     * Find one object by index property, by property equal to value
     * @param {object} query - query object used to perform search with
     * @returns {(object|null)} First matching document, or null if none
     * @memberof Collection
     */
    Collection.prototype.findOne = function (query) {
      // Instantiate Resultset and exec find op passing firstOnly = true param
      var result = new Resultset(this, {
        queryObj: query,
        firstOnly: true
      });
      if (Array.isArray(result) && result.length === 0) {
        return null;
      } else {
        if (!this.cloneObjects) {
          return result;
        } else {
          return clone(result, this.cloneMethod);
        }
      }
    };

    /**
     * Chain method, used for beginning a series of chained find() and/or view() operations
     * on a collection.
     *
     * @param {array} transform - Ordered array of transform step objects similar to chain
     * @param {object} parameters - Object containing properties representing parameters to substitute
     * @returns {Resultset} (this) resultset, or data array if any map or join functions where called
     * @memberof Collection
     */
    Collection.prototype.chain = function (transform, parameters) {
      var rs = new Resultset(this);

      if (typeof transform === 'undefined') {
        return rs;
      }

      return rs.transform(transform, parameters);
    };

    /**
     * Find method, api is similar to mongodb.
     * for more complex queries use [chain()]{@link Collection#chain} or [where()]{@link Collection#where}.
     * @example {@tutorial Query Examples}
     * @param {object} query - 'mongo-like' query object
     * @returns {array} Array of matching documents
     * @memberof Collection
     */
    Collection.prototype.find = function (query) {
      if (typeof (query) === 'undefined') {
        query = 'getAll';
      }

      var results = new Resultset(this, {
        queryObj: query
      });
      if (!this.cloneObjects) {
        return results;
      } else {
        return cloneObjectArray(results, this.cloneMethod);
      }
    };

    /**
     * Find object by unindexed field by property equal to value,
     * simply iterates and returns the first element matching the query
     */
    Collection.prototype.findOneUnindexed = function (prop, value) {
      var i = this.data.length,
        doc;
      while (i--) {
        if (this.data[i][prop] === value) {
          doc = this.data[i];
          return doc;
        }
      }
      return null;
    };

    /**
     * Transaction methods
     */

    /** start the transation */
    Collection.prototype.startTransaction = function () {
      if (this.transactional) {
        this.cachedData = clone(this.data, this.cloneMethod);
        this.cachedIndex = this.idIndex;
        this.cachedBinaryIndex = this.binaryIndices;

        // propagate startTransaction to dynamic views
        for (var idx = 0; idx < this.DynamicViews.length; idx++) {
          this.DynamicViews[idx].startTransaction();
        }
      }
    };

    /** commit the transation */
    Collection.prototype.commit = function () {
      if (this.transactional) {
        this.cachedData = null;
        this.cachedIndex = null;
        this.cachedBinaryIndex = null;

        // propagate commit to dynamic views
        for (var idx = 0; idx < this.DynamicViews.length; idx++) {
          this.DynamicViews[idx].commit();
        }
      }
    };

    /** roll back the transation */
    Collection.prototype.rollback = function () {
      if (this.transactional) {
        if (this.cachedData !== null && this.cachedIndex !== null) {
          this.data = this.cachedData;
          this.idIndex = this.cachedIndex;
          this.binaryIndices = this.cachedBinaryIndex;
        }

        // propagate rollback to dynamic views
        for (var idx = 0; idx < this.DynamicViews.length; idx++) {
          this.DynamicViews[idx].rollback();
        }
      }
    };

    // async executor. This is only to enable callbacks at the end of the execution.
    Collection.prototype.async = function (fun, callback) {
      setTimeout(function () {
        if (typeof fun === 'function') {
          fun();
          callback();
        } else {
          throw new TypeError('Argument passed for async execution is not a function');
        }
      }, 0);
    };

    /**
     * Query the collection by supplying a javascript filter function.
     * @example
     * var results = coll.where(function(obj) {
     *   return obj.legs === 8;
     * });
     *
     * @param {function} fun - filter function to run against all collection docs
     * @returns {array} all documents which pass your filter function
     * @memberof Collection
     */
    Collection.prototype.where = function (fun) {
      var results = new Resultset(this, {
        queryFunc: fun
      });
      if (!this.cloneObjects) {
        return results;
      } else {
        return cloneObjectArray(results, this.cloneMethod);
      }
    };

    /**
     * Map Reduce operation
     *
     * @param {function} mapFunction - function to use as map function
     * @param {function} reduceFunction - function to use as reduce function
     * @returns {data} The result of your mapReduce operation
     * @memberof Collection
     */
    Collection.prototype.mapReduce = function (mapFunction, reduceFunction) {
      try {
        return reduceFunction(this.data.map(mapFunction));
      } catch (err) {
        throw err;
      }
    };

    /**
     * Join two collections on specified properties
     *
     * @param {array} joinData - array of documents to 'join' to this collection
     * @param {string} leftJoinProp - property name in collection
     * @param {string} rightJoinProp - property name in joinData
     * @param {function=} mapFun - (Optional) map function to use
     * @returns {Resultset} Result of the mapping operation
     * @memberof Collection
     */
    Collection.prototype.eqJoin = function (joinData, leftJoinProp, rightJoinProp, mapFun) {
      // logic in Resultset class
      return new Resultset(this).eqJoin(joinData, leftJoinProp, rightJoinProp, mapFun);
    };

    /* ------ STAGING API -------- */
    /**
     * stages: a map of uniquely identified 'stages', which hold copies of objects to be
     * manipulated without affecting the data in the original collection
     */
    Collection.prototype.stages = {};

    /**
     * (Staging API) create a stage and/or retrieve it
     * @memberof Collection
     */
    Collection.prototype.getStage = function (name) {
      if (!this.stages[name]) {
        this.stages[name] = {};
      }
      return this.stages[name];
    };
    /**
     * a collection of objects recording the changes applied through a commmitStage
     */
    Collection.prototype.commitLog = [];

    /**
     * (Staging API) create a copy of an object and insert it into a stage
     * @memberof Collection
     */
    Collection.prototype.stage = function (stageName, obj) {
      var copy = JSON.parse(JSON.stringify(obj));
      this.getStage(stageName)[obj.$loki] = copy;
      return copy;
    };

    /**
     * (Staging API) re-attach all objects to the original collection, so indexes and views can be rebuilt
     * then create a message to be inserted in the commitlog
     * @param {string} stageName - name of stage
     * @param {string} message
     * @memberof Collection
     */
    Collection.prototype.commitStage = function (stageName, message) {
      var stage = this.getStage(stageName),
        prop,
        timestamp = new Date().getTime();

      for (prop in stage) {

        this.update(stage[prop]);
        this.commitLog.push({
          timestamp: timestamp,
          message: message,
          data: JSON.parse(JSON.stringify(stage[prop]))
        });
      }
      this.stages[stageName] = {};
    };

    Collection.prototype.no_op = function () {
      return;
    };

    /**
     * @memberof Collection
     */
    Collection.prototype.extract = function (field) {
      var i = 0,
        len = this.data.length,
        isDotNotation = isDeepProperty(field),
        result = [];
      for (i; i < len; i += 1) {
        result.push(deepProperty(this.data[i], field, isDotNotation));
      }
      return result;
    };

    /**
     * @memberof Collection
     */
    Collection.prototype.max = function (field) {
      return Math.max.apply(null, this.extract(field));
    };

    /**
     * @memberof Collection
     */
    Collection.prototype.min = function (field) {
      return Math.min.apply(null, this.extract(field));
    };

    /**
     * @memberof Collection
     */
    Collection.prototype.maxRecord = function (field) {
      var i = 0,
        len = this.data.length,
        deep = isDeepProperty(field),
        result = {
          index: 0,
          value: undefined
        },
        max;

      for (i; i < len; i += 1) {
        if (max !== undefined) {
          if (max < deepProperty(this.data[i], field, deep)) {
            max = deepProperty(this.data[i], field, deep);
            result.index = this.data[i].$loki;
          }
        } else {
          max = deepProperty(this.data[i], field, deep);
          result.index = this.data[i].$loki;
        }
      }
      result.value = max;
      return result;
    };

    /**
     * @memberof Collection
     */
    Collection.prototype.minRecord = function (field) {
      var i = 0,
        len = this.data.length,
        deep = isDeepProperty(field),
        result = {
          index: 0,
          value: undefined
        },
        min;

      for (i; i < len; i += 1) {
        if (min !== undefined) {
          if (min > deepProperty(this.data[i], field, deep)) {
            min = deepProperty(this.data[i], field, deep);
            result.index = this.data[i].$loki;
          }
        } else {
          min = deepProperty(this.data[i], field, deep);
          result.index = this.data[i].$loki;
        }
      }
      result.value = min;
      return result;
    };

    /**
     * @memberof Collection
     */
    Collection.prototype.extractNumerical = function (field) {
      return this.extract(field).map(parseBase10).filter(Number).filter(function (n) {
        return !(isNaN(n));
      });
    };

    /**
     * Calculates the average numerical value of a property
     *
     * @param {string} field - name of property in docs to average
     * @returns {number} average of property in all docs in the collection
     * @memberof Collection
     */
    Collection.prototype.avg = function (field) {
      return average(this.extractNumerical(field));
    };

    /**
     * Calculate standard deviation of a field
     * @memberof Collection
     * @param {string} field
     */
    Collection.prototype.stdDev = function (field) {
      return standardDeviation(this.extractNumerical(field));
    };

    /**
     * @memberof Collection
     * @param {string} field
     */
    Collection.prototype.mode = function (field) {
      var dict = {},
        data = this.extract(field);
      data.forEach(function (obj) {
        if (dict[obj]) {
          dict[obj] += 1;
        } else {
          dict[obj] = 1;
        }
      });
      var max,
        prop, mode;
      for (prop in dict) {
        if (max) {
          if (max < dict[prop]) {
            mode = prop;
          }
        } else {
          mode = prop;
          max = dict[prop];
        }
      }
      return mode;
    };

    /**
     * @memberof Collection
     * @param {string} field - property name
     */
    Collection.prototype.median = function (field) {
      var values = this.extractNumerical(field);
      values.sort(sub);

      var half = Math.floor(values.length / 2);

      if (values.length % 2) {
        return values[half];
      } else {
        return (values[half - 1] + values[half]) / 2.0;
      }
    };

    /**
     * General utils, including statistical functions
     */
    function isDeepProperty(field) {
      return field.indexOf('.') !== -1;
    }

    function parseBase10(num) {
      return parseFloat(num, 10);
    }

    function isNotUndefined(obj) {
      return obj !== undefined;
    }

    function add(a, b) {
      return a + b;
    }

    function sub(a, b) {
      return a - b;
    }

    function median(values) {
      values.sort(sub);
      var half = Math.floor(values.length / 2);
      return (values.length % 2) ? values[half] : ((values[half - 1] + values[half]) / 2.0);
    }

    function average(array) {
      return (array.reduce(add, 0)) / array.length;
    }

    function standardDeviation(values) {
      var avg = average(values);
      var squareDiffs = values.map(function (value) {
        var diff = value - avg;
        var sqrDiff = diff * diff;
        return sqrDiff;
      });

      var avgSquareDiff = average(squareDiffs);

      var stdDev = Math.sqrt(avgSquareDiff);
      return stdDev;
    }

    function deepProperty(obj, property, isDeep) {
      if (isDeep === false) {
        // pass without processing
        return obj[property];
      }
      var pieces = property.split('.'),
        root = obj;
      while (pieces.length > 0) {
        root = root[pieces.shift()];
      }
      return root;
    }

    function binarySearch(array, item, fun) {
      var lo = 0,
        hi = array.length,
        compared,
        mid;
      while (lo < hi) {
        mid = (lo + hi) >> 1;
        compared = fun.apply(null, [item, array[mid]]);
        if (compared === 0) {
          return {
            found: true,
            index: mid
          };
        } else if (compared < 0) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }
      return {
        found: false,
        index: hi
      };
    }

    function BSonSort(fun) {
      return function (array, item) {
        return binarySearch(array, item, fun);
      };
    }

    function KeyValueStore() {}

    KeyValueStore.prototype = {
      keys: [],
      values: [],
      sort: function (a, b) {
        return (a < b) ? -1 : ((a > b) ? 1 : 0);
      },
      setSort: function (fun) {
        this.bs = new BSonSort(fun);
      },
      bs: function () {
        return new BSonSort(this.sort);
      },
      set: function (key, value) {
        var pos = this.bs(this.keys, key);
        if (pos.found) {
          this.values[pos.index] = value;
        } else {
          this.keys.splice(pos.index, 0, key);
          this.values.splice(pos.index, 0, value);
        }
      },
      get: function (key) {
        return this.values[binarySearch(this.keys, key, this.sort).index];
      }
    };

    function UniqueIndex(uniqueField) {
      this.field = uniqueField;
      this.keyMap = {};
      this.lokiMap = {};
    }
    UniqueIndex.prototype.keyMap = {};
    UniqueIndex.prototype.lokiMap = {};
    UniqueIndex.prototype.set = function (obj) {
      var fieldValue = obj[this.field];
      if (fieldValue !== null && typeof (fieldValue) !== 'undefined') {
        if (this.keyMap[fieldValue]) {
          throw new Error('Duplicate key for property ' + this.field + ': ' + fieldValue);
        } else {
          this.keyMap[fieldValue] = obj;
          this.lokiMap[obj.$loki] = fieldValue;
        }
      }
    };
    UniqueIndex.prototype.get = function (key) {
      return this.keyMap[key];
    };

    UniqueIndex.prototype.byId = function (id) {
      return this.keyMap[this.lokiMap[id]];
    };
    /**
     * Updates a document's unique index given an updated object.
     * @param  {Object} obj Original document object
     * @param  {Object} doc New document object (likely the same as obj)
     */
    UniqueIndex.prototype.update = function (obj, doc) {
      if (this.lokiMap[obj.$loki] !== doc[this.field]) {
        var old = this.lokiMap[obj.$loki];
        this.set(doc);
        // make the old key fail bool test, while avoiding the use of delete (mem-leak prone)
        this.keyMap[old] = undefined;
      } else {
        this.keyMap[obj[this.field]] = doc;
      }
    };
    UniqueIndex.prototype.remove = function (key) {
      var obj = this.keyMap[key];
      if (obj !== null && typeof obj !== 'undefined') {
        this.keyMap[key] = undefined;
        this.lokiMap[obj.$loki] = undefined;
      } else {
        throw new Error('Key is not in unique index: ' + this.field);
      }
    };
    UniqueIndex.prototype.clear = function () {
      this.keyMap = {};
      this.lokiMap = {};
    };

    function ExactIndex(exactField) {
      this.index = {};
      this.field = exactField;
    }

    // add the value you want returned to the key in the index
    ExactIndex.prototype = {
      set: function add(key, val) {
        if (this.index[key]) {
          this.index[key].push(val);
        } else {
          this.index[key] = [val];
        }
      },

      // remove the value from the index, if the value was the last one, remove the key
      remove: function remove(key, val) {
        var idxSet = this.index[key];
        for (var i in idxSet) {
          if (idxSet[i] == val) {
            idxSet.splice(i, 1);
          }
        }
        if (idxSet.length < 1) {
          this.index[key] = undefined;
        }
      },

      // get the values related to the key, could be more than one
      get: function get(key) {
        return this.index[key];
      },

      // clear will zap the index
      clear: function clear(key) {
        this.index = {};
      }
    };

    function SortedIndex(sortedField) {
      this.field = sortedField;
    }

    SortedIndex.prototype = {
      keys: [],
      values: [],
      // set the default sort
      sort: function (a, b) {
        return (a < b) ? -1 : ((a > b) ? 1 : 0);
      },
      bs: function () {
        return new BSonSort(this.sort);
      },
      // and allow override of the default sort
      setSort: function (fun) {
        this.bs = new BSonSort(fun);
      },
      // add the value you want returned  to the key in the index
      set: function (key, value) {
        var pos = binarySearch(this.keys, key, this.sort);
        if (pos.found) {
          this.values[pos.index].push(value);
        } else {
          this.keys.splice(pos.index, 0, key);
          this.values.splice(pos.index, 0, [value]);
        }
      },
      // get all values which have a key == the given key
      get: function (key) {
        var bsr = binarySearch(this.keys, key, this.sort);
        if (bsr.found) {
          return this.values[bsr.index];
        } else {
          return [];
        }
      },
      // get all values which have a key < the given key
      getLt: function (key) {
        var bsr = binarySearch(this.keys, key, this.sort);
        var pos = bsr.index;
        if (bsr.found) pos--;
        return this.getAll(key, 0, pos);
      },
      // get all values which have a key > the given key
      getGt: function (key) {
        var bsr = binarySearch(this.keys, key, this.sort);
        var pos = bsr.index;
        if (bsr.found) pos++;
        return this.getAll(key, pos, this.keys.length);
      },

      // get all vals from start to end
      getAll: function (key, start, end) {
        var results = [];
        for (var i = start; i < end; i++) {
          results = results.concat(this.values[i]);
        }
        return results;
      },
      // just in case someone wants to do something smart with ranges
      getPos: function (key) {
        return binarySearch(this.keys, key, this.sort);
      },
      // remove the value from the index, if the value was the last one, remove the key
      remove: function (key, value) {
        var pos = binarySearch(this.keys, key, this.sort).index;
        var idxSet = this.values[pos];
        for (var i in idxSet) {
          if (idxSet[i] == value) idxSet.splice(i, 1);
        }
        if (idxSet.length < 1) {
          this.keys.splice(pos, 1);
          this.values.splice(pos, 1);
        }
      },
      // clear will zap the index
      clear: function () {
        this.keys = [];
        this.values = [];
      }
    };


    Loki.LokiOps = LokiOps;
    Loki.Collection = Collection;
    Loki.KeyValueStore = KeyValueStore;
    Loki.persistenceAdapters = {
      fs: LokiFsAdapter,
      localStorage: LokiLocalStorageAdapter
    };
    return Loki;
  }());

}));

/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   3.2.1
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$vertxNext;
    var lib$es6$promise$asap$$customSchedulerFn;

    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        if (lib$es6$promise$asap$$customSchedulerFn) {
          lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
        } else {
          lib$es6$promise$asap$$scheduleFlush();
        }
      }
    }

    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
      lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
    }

    function lib$es6$promise$asap$$setAsap(asapFn) {
      lib$es6$promise$asap$$asap = asapFn;
    }

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // see https://github.com/cujojs/when/issues/410 for details
      return function() {
        process.nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertx() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertx();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }
    function lib$es6$promise$then$$then(onFulfillment, onRejection) {
      var parent = this;

      var child = new this.constructor(lib$es6$promise$$internal$$noop);

      if (child[lib$es6$promise$$internal$$PROMISE_ID] === undefined) {
        lib$es6$promise$$internal$$makePromise(child);
      }

      var state = parent._state;

      if (state) {
        var callback = arguments[state - 1];
        lib$es6$promise$asap$$asap(function(){
          lib$es6$promise$$internal$$invokeCallback(state, child, callback, parent._result);
        });
      } else {
        lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
      }

      return child;
    }
    var lib$es6$promise$then$$default = lib$es6$promise$then$$then;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    var lib$es6$promise$$internal$$PROMISE_ID = Math.random().toString(36).substring(16);

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFulfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$asap(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable, then) {
      if (maybeThenable.constructor === promise.constructor &&
          then === lib$es6$promise$then$$default &&
          constructor.resolve === lib$es6$promise$promise$resolve$$default) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFulfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value, lib$es6$promise$$internal$$getThen(value));
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    var lib$es6$promise$$internal$$id = 0;
    function lib$es6$promise$$internal$$nextId() {
      return lib$es6$promise$$internal$$id++;
    }

    function lib$es6$promise$$internal$$makePromise(promise) {
      promise[lib$es6$promise$$internal$$PROMISE_ID] = lib$es6$promise$$internal$$id++;
      promise._state = undefined;
      promise._result = undefined;
      promise._subscribers = [];
    }

    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      if (!lib$es6$promise$utils$$isArray(entries)) {
        return new Constructor(function(resolve, reject) {
          reject(new TypeError('You must pass an array to race.'));
        });
      } else {
        return new Constructor(function(resolve, reject) {
          var length = entries.length;
          for (var i = 0; i < length; i++) {
            Constructor.resolve(entries[i]).then(resolve, reject);
          }
        });
      }
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;


    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this[lib$es6$promise$$internal$$PROMISE_ID] = lib$es6$promise$$internal$$nextId();
      this._result = this._state = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        typeof resolver !== 'function' && lib$es6$promise$promise$$needsResolver();
        this instanceof lib$es6$promise$promise$$Promise ? lib$es6$promise$$internal$$initializePromise(this, resolver) : lib$es6$promise$promise$$needsNew();
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: lib$es6$promise$then$$default,

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;
    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!this.promise[lib$es6$promise$$internal$$PROMISE_ID]) {
        lib$es6$promise$$internal$$makePromise(this.promise);
      }

      if (Array.isArray(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._result = new Array(this.length);

        if (this.length === 0) {
          lib$es6$promise$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(this.promise, lib$es6$promise$enumerator$$validationError());
      }
    }

    function lib$es6$promise$enumerator$$validationError() {
      return new Error('Array Methods must be provided an Array');
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var input   = this._input;

      for (var i = 0; this._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      var resolve = c.resolve;

      if (resolve === lib$es6$promise$promise$resolve$$default) {
        var then = lib$es6$promise$$internal$$getThen(entry);

        if (then === lib$es6$promise$then$$default &&
            entry._state !== lib$es6$promise$$internal$$PENDING) {
          this._settledAt(entry._state, i, entry._result);
        } else if (typeof then !== 'function') {
          this._remaining--;
          this._result[i] = entry;
        } else if (c === lib$es6$promise$promise$$default) {
          var promise = new c(lib$es6$promise$$internal$$noop);
          lib$es6$promise$$internal$$handleMaybeThenable(promise, entry, then);
          this._willSettleAt(promise, i);
        } else {
          this._willSettleAt(new c(function(resolve) { resolve(entry); }), i);
        }
      } else {
        this._willSettleAt(resolve(entry), i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        this._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          this._result[i] = value;
        }
      }

      if (this._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, this._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
// L.Pelov - this works in all situations and in the browsers since IE9+
// http://blog.stevenlevithan.com/archives/parseuri
function parseUri(str) {
    var o = parseUri.options,
        m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
};

parseUri.options = {
    strictMode: false,
    key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
    q: {
        name: "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

/**
 * https://github.com/pillarjs/path-to-regexp
 * MIT License
 *
 * L.Pelov - Oracle A-Team, transformed the code to work in the browser!
 * @version 1.5.3
 */

// polyfills
var toString = Object.prototype.toString;
var isarray = Array.isArray || function (a) {
    return toString.call(a) === '[object Array]';
  };


/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string} str
 * @return {!Array}
 */
function parse (str) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    var next = str[index]
    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var modifier = res[6]
    var asterisk = res[7]

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var partial = prefix != null && next != null && next !== prefix
    var repeat = modifier === '+' || modifier === '*'
    var optional = modifier === '?' || modifier === '*'
    var delimiter = res[2] || '/'
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?')

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      partial: partial,
      asterisk: !!asterisk,
      pattern: escapeGroup(pattern)
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {string}             str
 * @return {!function(Object=, Object=)}
 */
function compile (str) {
  return tokensToFunction(parse(str))
}

/**
 * Prettier encoding of URI path segments.
 *
 * @param  {string}
 * @return {string}
 */
function encodeURIComponentPretty (str) {
  return encodeURI(str).replace(/[\/?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Encode the asterisk parameter. Similar to `pretty`, but allows slashes.
 *
 * @param  {string}
 * @return {string}
 */
function encodeAsterisk (str) {
  return encodeURI(str).replace(/[?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$')
    }
  }

  return function (obj, opts) {
    var path = ''
    var data = obj || {}
    var options = opts || {}
    var encode = options.pretty ? encodeURIComponentPretty : encodeURIComponent

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          // Prepend partial segment prefixes.
          if (token.partial) {
            path += token.prefix
          }

          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received `' + JSON.stringify(value) + '`')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encode(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received `' + JSON.stringify(segment) + '`')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = token.asterisk ? encodeAsterisk(value) : encode(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {!RegExp} re
 * @param  {Array}   keys
 * @return {!RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {!Array}  keys
 * @return {!RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {!Array}  path
 * @param  {Array}   keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {string}  path
 * @param  {!Array}  keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function stringToRegexp (path, keys, options) {
  var tokens = parse(path)
  var re = tokensToRegExp(tokens, options)

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i])
    }
  }

  return attachKeys(re, keys)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}  tokens
 * @param  {Object=} options
 * @return {!RegExp}
 */
function tokensToRegExp (tokens, options) {
  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''
  var lastToken = tokens[tokens.length - 1]
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken)

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = '(?:' + token.pattern + ')'

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (!token.partial) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = prefix + '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {(Array|Object)=}       keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || []

  if (!isarray(keys)) {
    options = /** @type {!Object} */ (keys)
    keys = []
  } else if (!options) {
    options = {}
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, /** @type {!Array} */ (keys))
  }

  if (isarray(path)) {
    return arrayToRegexp(/** @type {!Array} */ (path), /** @type {!Array} */ (keys), options)
  }

  return stringToRegexp(/** @type {string} */ (path), /** @type {!Array} */ (keys), options)
}

//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php
//
// https://github.com/broofa/node-uuid
/**
 * Generate a v4 (random) id
 * uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
 */

/*global window, require, define */
(function(_window) {
  'use strict';

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng, _mathRNG, _nodeRNG, _whatwgRNG, _previousRoot;

  function setupBrowser() {
    // Allow for MSIE11 msCrypto
    var _crypto = _window.crypto || _window.msCrypto;

    if (!_rng && _crypto && _crypto.getRandomValues) {
      // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
      //
      // Moderately fast, high quality
      try {
        var _rnds8 = new Uint8Array(16);
        _whatwgRNG = _rng = function whatwgRNG() {
          _crypto.getRandomValues(_rnds8);
          return _rnds8;
        };
        _rng();
      } catch(e) {}
    }

    if (!_rng) {
      // Math.random()-based (RNG)
      //
      // If all else fails, use Math.random().  It's fast, but is of unspecified
      // quality.
      var  _rnds = new Array(16);
      _mathRNG = _rng = function() {
        for (var i = 0, r; i < 16; i++) {
          if ((i & 0x03) === 0) { r = Math.random() * 0x100000000; }
          _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
        }

        return _rnds;
      };
      if ('undefined' !== typeof console && console.warn) {
        console.warn("[SECURITY] node-uuid: crypto not usable, falling back to insecure Math.random()");
      }
    }
  }

  function setupNode() {
    // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
    //
    // Moderately fast, high quality
    if ('function' === typeof require) {
      try {
        var _rb = require('crypto').randomBytes;
        _nodeRNG = _rng = _rb && function() {return _rb(16);};
        _rng();
      } catch(e) {}
    }
  }

  if (_window) {
    setupBrowser();
  } else {
    setupNode();
  }

  // Buffer class to use
  var BufferClass = ('function' === typeof Buffer) ? Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
      bth[buf[i++]] + bth[buf[i++]] + '-' +
      bth[buf[i++]] + bth[buf[i++]] + '-' +
      bth[buf[i++]] + bth[buf[i++]] + '-' +
      bth[buf[i++]] + bth[buf[i++]] + '-' +
      bth[buf[i++]] + bth[buf[i++]] +
      bth[buf[i++]] + bth[buf[i++]] +
      bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = (options.clockseq != null) ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = (options.msecs != null) ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = (options.nsecs != null) ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) === 'string') {
      buf = (options === 'binary') ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;
  uuid._rng = _rng;
  uuid._mathRNG = _mathRNG;
  uuid._nodeRNG = _nodeRNG;
  uuid._whatwgRNG = _whatwgRNG;

  if (('undefined' !== typeof module) && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});


  } else {
    // Publish as global (in browsers)
    _previousRoot = _window.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _window.uuid = _previousRoot;
      return uuid;
    };

    _window.uuid = uuid;
  }
})('undefined' !== typeof window ? window : null);

// POLYFILLS!

/**
 * Polyfill in case we want to support browser IE8 and lower, all IE9+ browsers support this
 * out of box already
 */
if (!Array.isArray) {
  Array.isArray = function (arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function (predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.findIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return i;
      }
    }
    return -1;
  };
}

if (!Array.prototype.filter) {
  Array.prototype.filter = function (fun/*, thisArg*/) {
    'use strict';

    if (this === void 0 || this === null) {
      throw new TypeError();
    }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== 'function') {
      throw new TypeError();
    }

    var res = [];
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++) {
      if (i in t) {
        var val = t[i];

        // NOTE: Technically this should Object.defineProperty at
        //       the next index, as push can be affected by
        //       properties on Object.prototype and Array.prototype.
        //       But that method's new, and collisions should be
        //       rare, so use the more-compatible alternative.
        if (fun.call(thisArg, val, i, t)) {
          res.push(val);
        }
      }
    }

    return res;
  };
}


/**
 * Wrapper module with most common used functions from 3rd party frameworks!
 *
 * @type {{isEmpty, isArray, isFunction, isObject, isNull, extendOwn, extend}}
 */
function persistenceCommon() {
  'use strict';
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
  var
    push = ArrayProto.push,
    slice = ArrayProto.slice,
    toString = ObjProto.toString,
    hasOwnProperty = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray = Array.isArray,
    nativeKeys = Object.keys,
    nativeBind = FuncProto.bind,
    nativeCreate = Object.create;

  return {
    isEmpty: isEmpty,
    isArray: isArray,
    isFunction: isFunction,
    isObject: isObject,
    isNull: isNull,
    isNumber: isNumber,
    isDate: isDate,
    isString: isString,
    isUndefined: isUndefined,
    has: has,
    isFinite: isFinite,
    isNaN: isNaN,
    isBoolean: isBoolean,
    deepExtend: deepExtend,
    extendOwn: extender(false),
    extend: extender(true),
    getUID: getUID,
    clone: clone,
    stringStartsWith: stringStartsWith,
    stringEndsWith: stringEndsWith,
    type: type,
    cleanObjects: cleanObjects,
    cleanObject: cleanObject
  };


  /**
   * Checks given object type. This implementation is faster than using JS typeof().
   *
   * Support: IE8+
   * @param obj - could be number, string, function, boolean, null and so on
   * @returns {string} - string representative of the object type
   * http://youmightnotneedjquery.com/
   */
  function type(obj) {
    return Object.prototype.toString.call(obj).replace(/^\[object (.+)\]$/, '$1').toLowerCase();
  }

  /**
   * Checks if string starts with specific prefix!
   *
   * @param string
   * @param prefix
   * @returns {boolean} - returns also false when provided variable is not string!
   */
  function stringStartsWith(string, prefix) {
    if (type(string) !== 'string') return false;
    return string.slice(0, prefix.length) == prefix;
  }

  /**
   * Checks if string ends with specific prefix!
   *
   * @param string
   * @param suffix
   * @returns {boolean} - false also when the provided variable is not string!
   */
  function stringEndsWith(string, suffix) {
    if (type(string) !== 'string') return false;
    return suffix == '' || string.slice(-suffix.length) == suffix;
  }

  /**
   * Clones given JS object using the JSON stringify method to create new reference.
   *
   * @param obj
   * @returns {*}
   */
  function clone(obj) {
    obj = obj || {};
    var cloneObjects = true;
    return cloneObjects ? JSON.parse(JSON.stringify(obj)) : obj;
  }


  function cleanObjects(objects) {
    var result = [];
    for (var idx in objects) {
      // clean the object and return in the way the MCS would do!
      if (objects.hasOwnProperty(idx)) {
        var object = cleanObject(objects[idx]);
        result.push(object);
      }
    }
    return result;
  }

  function cleanObject(object) {
    var cloned = clone(object);
    // it's actually clear that this is from the DB
    delete cloned['$loki'];
    delete cloned['meta'];
    return cloned;
  }


  function getUID() {
    return Math.floor(Math.random() * 0x100000000);
  }

  function isTypeOf(name, obj) {
    return toString.call(obj) === '[object ' + name + ']';
  }

  function isDate(value) {
    return isTypeOf('Date', value);
  }

  function isString(value) {
    return isTypeOf('String', value);
  }

  function isUndefined(value) {
    //return typeof value === 'undefined';
    return value === void 0;
  }

  function has(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  }

  // Is a given object a finite number?
  function isFinite(value) {
    return isFinite(value) && !isNaN(parseFloat(value));
  }

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  function isNaN(value) {
    return isNumber(value) && value !== +value;
  }

  // Is a given value a boolean?
  function isBoolean(value) {
    return value === true || value === false || toString.call(value) === '[object Boolean]';
  }


  function isEmpty(value) {
    if (value === null) {
      return true;
    }

    // check if the value has length
    if (isArrayLike(value)
      && (isArray(value)
      || typeof value === 'string' // is string
      || isFunction(value.splice) // is array
      || isFunction(value.callee))) { // is arguments
      return !value.length;
    }

    // check if the object iis set or map
    if (!!value && typeof value == 'object') {
      var str = value.toString();
      if (str == '[object Map]' || str == '[object Set]') {
        return !value.size;
      }
    }

    // check if the object has properties
    for (var key in value) {
      if (value.hasOwnProperty(key)) {
        return false;
      }
    }

    if(!!value && isNumber(value)){
      return false;
    }

    return true;
  }

  function isArrayLike(value) {
    return value
      && typeof value === 'object'
      && typeof value.length === 'number'
      && value.length >= 0
      && value.length % 1 === 0;
  }

  function isArray(value) {
    return Array.isArray(value);
  }

  function isFunction(value) {
    // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
    // IE 11 (#1621), and in Safari 8 (#1929).
    return typeof value === "function" || false;
  }

  function isObject(value) {
    var type = typeof value;
    return type === 'function' || type === 'object' && !!value;
  }

  function isNull(value) {
    return value === null;
  }

  function isNumber(value) {
    if (typeof value == 'number') {
      return true;
    }
    return value.toString() == '[object Number]';
  }

  /**
   * Copy the properties from one object to another, however this function does NOT have the deep copy
   * capabilities.
   *
   * @param allKeys
   * @returns {Function}
   */
  function extender(allKeys) {
    return function (object) {
      var argLength = arguments.length;
      if (object == null || argLength < 2) {
        return object;
      }
      // run on all argument except first one
      for (var argIndex = 1; argIndex < argLength; argIndex++) {
        var source = arguments[argIndex];
        if (source && isObject(source)) {
          for (var key in source) {
            if (allKeys || source.hasOwnProperty(key)) {
              object[key] = source[key];
            }
          }
        }
      }
      return object;
    }
  }

  function identity(value) {
    return value;
  }

  /**
   * Deep extend capabilities taken from the JQuery implementation!
   * @returns {*|{}}
   */
  function deepExtend() {
    var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
      i = 1,
      length = arguments.length,
      deep = false,
      toString = Object.prototype.toString,
      hasOwn = Object.prototype.hasOwnProperty,
      push = Array.prototype.push,
      slice = Array.prototype.slice,
      trim = String.prototype.trim,
      indexOf = Array.prototype.indexOf,
      class2type = {
        "[object Boolean]": "boolean",
        "[object Number]": "number",
        "[object String]": "string",
        "[object Function]": "function",
        "[object Array]": "array",
        "[object Date]": "date",
        "[object RegExp]": "regexp",
        "[object Object]": "object"
      },

      jQuery = {
        isFunction: function (obj) {
          return jQuery.type(obj) === "function"
        },
        isArray: Array.isArray ||
        function (obj) {
          return jQuery.type(obj) === "array"
        },
        isWindow: function (obj) {
          return obj != null && obj == obj.window
        },
        isNumeric: function (obj) {
          return !isNaN(parseFloat(obj)) && isFinite(obj)
        },
        type: function (obj) {
          return obj == null ? String(obj) : class2type[toString.call(obj)] || "object"
        },
        isPlainObject: function (obj) {
          if (!obj || jQuery.type(obj) !== "object" || obj.nodeType) {
            return false
          }
          try {
            if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
              return false
            }
          } catch (e) {
            return false
          }
          var key;
          for (key in obj) {
          }
          return key === undefined || hasOwn.call(obj, key)
        }
      };

    if (typeof target === "boolean") {
      deep = target;
      target = arguments[1] || {};
      i = 2;
    }

    if (typeof target !== "object" && !jQuery.isFunction(target)) {
      target = {}
    }

    if (length === i) {
      target = this;
      --i;
    }

    for (i; i < length; i++) {
      if ((options = arguments[i]) != null) {
        for (name in options) {
          src = target[name];
          copy = options[name];
          if (target === copy) {
            continue
          }
          if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && jQuery.isArray(src) ? src : []
            } else {
              clone = src && jQuery.isPlainObject(src) ? src : {};
            }
            // WARNING: RECURSION
            target[name] = deepExtend(deep, clone, copy);
          } else if (copy !== undefined) {
            target[name] = copy;
          }
        }
      }
    }
    return target;
  }

}

function persistenceUtils($common, $options) {
  'use strict';
  var _ = $common;

  /**
   * This simple implementation will check if specific path match and URL for persistence and return
   * object with all parameters.
   *
   * @param options
   * @returns {Function}
   * @throws Error - in case decoding of given parameter is not possible
   */
  var pathMatch = function (options) {
    options = options || {};

    return function (path) {
      var keys = [];
      var re = pathToRegexp(path, keys, options);

      return function (pathname, params) {
        var m = re.exec(pathname);
        if (!m) return false;

        // FIX: L.Pelov - use array to address that some properties could have same names
        params = params || [];

        var key, param, obj = {};;
        for (var i = 0; i < keys.length; i++) {
          key = keys[i];
          param = m[i + 1];
          if (!param) continue;
          obj = {
            name: key.name,
            value: decodeParam(param)
          }
          //params[key.name] = decodeParam(param);
          params.push(obj);
          if (key.repeat) {
            //params[key.name] = params[key.name].split(key.delimiter)
            params[params.length - 1].name = params[params.length - 1].name.split(key.delimiter)
          }        }

        return params;
      }
    }
  };

  /**
   * Decodes parameters from the url
   *
   * @param param
   * @returns {string}
   */
  function decodeParam(param) {
    try {
      return decodeURIComponent(param);
    } catch (e) {
      throw Error('failed to decode param "' + param + '"');
    }
  }

  /**
   * Cache in-memory all already parsed URLs!
   * @type {{}}
   */
  var isPersistUrlCache = {};

  /**
   * isPathConfiguredForPersistence method result
   * @callback Persistence.Sync~isPathConfiguredForPersistenceResult
   * @param url {String}.
   * @param match {Array} parsed matches.
   */

  /**
   * Checks based on the pre-prefigured regexp in Persistence.Options if URL was configured for persistence.
   *
   * @param path {String} Url to check
   * @returns {Persistence.Sync~isPathConfiguredForPersistenceResult} - parsed url regexp and parsed matches
   */
  var isPathConfiguredForPersistence = function (path) {
    if (path == null || typeof path !== 'string') {
      console.warn('isPersistentUrl -> path can be only string');
      return false;
    }

    // check the cache first!
    if (path in isPersistUrlCache) {
      return isPersistUrlCache[path];
    }

    var len = $options.persistUris.length,
      i = 0;

    //var re = pathToRegexp(['/api/v2/users', '/api/v1/users/:id(\\d+)?/:_path?/:name?'], [], {sensitive: true});

    // go through the array and exec the given array of path
    for (; i < len; i++) {
      //var re = pathToRegexp($options.persistUris[i].reg, [], {sensitive: true});
      var match = $options.persistUris[i].reg.exec(path);
      //var match = re.exec(url);

      // we have a much so this URL is configured for caching!
      if (match) {
        return isPersistUrlCache[path] = {
          uri: $options.persistUris[i],
          match: match
        }
      }
    }

    return isPersistUrlCache[path] = false;
  };

  /**
   * Cache the parsed values for given URLs!
   *
   * @type {{}}
   */
  var keyValuesFromPersistentUrlCache = {};

  function isUrlRegexInteger(str) {
    return (str.indexOf('\d') >= 0) ? true : false
  }

  function nestedUrlPropertyToValue(prop) {
    if (!prop && !prop.value) return "";
    return prop.isInteger ? parseInt(prop.value) : prop.value;
  }

  /**
   * Parse the URL parameters and store in the cache!
   * @param persistURL
   * @returns {*}
   */
  function extractKeyValuesFromPersistentUrl2(persistURL) {

    // check the cache first!
    if (persistURL.match[0] in keyValuesFromPersistentUrlCache) {
      return keyValuesFromPersistentUrlCache[persistURL.match[0]];
    }

    // get the tokens to use for CRUID operations against the DB!
    var query = {
      root: persistURL.uri.tokens[0],
      attr: []
    };

    var keys = persistURL.uri.tokens;
    var parsedKeys = 1; // first token is always the root path! go directly to the next one

    for (var pos = 1; pos < keys.length; pos++) {
      if (_.isObject(persistURL.uri.tokens[pos])) {
        var matchId = parsedKeys++;

        var interName = persistURL.uri.tokens[pos];

        if (persistURL.match[matchId])
          query.attr.push({
            name: _.stringStartsWith(interName.name, '/') || _.stringStartsWith(interName.name, '_') ? interName.name.substring(1) : interName.name, // FIX: the real name is without the first chart, that indicates that this is obj property
            value: persistURL.match[matchId],
            pattern: interName.pattern,
            is: !!(_.stringStartsWith(interName.name, '/') || _.stringStartsWith(interName.name, '_')),
            isInteger: isUrlRegexInteger(interName.pattern)
          });
      }
      else {
        // BUT if not then is just a property, so pass to the next one
        var interName = persistURL.uri.tokens[pos];
        if (interName)
          query.attr.push({
            name: interName,
            value: _.stringStartsWith(interName, '/') || _.stringStartsWith(interName, '_') ? interName.substring(1) : interName,
            is: false,
            isInteger: isUrlRegexInteger(interName)
          });
      }
    }

    return keyValuesFromPersistentUrlCache[persistURL.match[0]] = query;
  }

  /**
   * Use this to transform payload before send to the server, in case that the payload is not JSON!
   *
   * @param payload
   * @returns {string}
   */
  function transformQueryParams(payload) {
    var array = [];

    for (var key in payload) {
      array.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }

    return array.join("&");
  }

  /**
   * Set the value to the object depending on the type of the existing object and the given new value!
   *
   * @param obj - existing object, usually from the db
   * @param val - new payload data to set to the existing object!
   */
  function setValueToObject(obj, val) {
    // if array and the payload is only 1 object, then add to the array!
    // if array and the new payload also array then replace the array
    // if object and the payload array replace
    // if object and the payload object replace!

    // generally if the val is function, and this could happen for example when usign knockout or such throw error
    if ($common.isFunction(val)) {
      throw new Error('unknown payload object, cannot assign function to payload!');
    }

    // TODO: Actually we should go over the array and check if the new payload has repeating elements and modify
    if (Array.isArray(obj) && Array.isArray(val)) {
      obj = val;
    }
    else if (Array.isArray(obj) && (!Array.isArray(val) && $common.isObject(val))) {
      obj.push(val);
    }
    else {
      obj = val;
    }

    return obj;
  }

  /**
   * Set new attribute to the existing object or update if exist.
   * Examples:
   *  setData("key1", "updated value1"); // data.key1 == "updated value1"
   *  setData("key2.nested1", 99); // data.key2.nested1 == 99
   *
   * @param key
   * @param val
   * @param obj
   * @private
   */
  var _setData = function (key, val, obj) {
    if (!obj) obj = {}; //outside (non-recursive) call, use "data" as our base object
    var ka = key.split(/\./); //split the key by the dots
    if (ka.length < 2) {
      obj[ka[0]] = val; //only one part (no dots) in key, just set value
    } else {
      if (!obj[ka[0]]) obj[ka[0]] = {}; //create our "new" base obj if it doesn't exist
      obj = obj[ka.shift()]; //remove the new "base" obj from string array, and hold actual object for recursive call
      _setData(ka.join("."), val, obj); //join the remaining parts back up with dots, and recursively set data on our new "base" obj
    }
  };

  /**
   *
   * @param key
   * @param val
   * @param obj
   * @private
   */
  var _setData2 = function (key, val, obj) {
    if (!obj) obj = {}; //outside (non-recursive) call, use "data" as our base object
    var ka = key.split(/\./); //split the key by the dots
    if (ka.length < 2) {
      // TODO: If the object does not exist you can do this directly, but if it exist, we have to check
      // if we want to replace that data and in which way!
      if (!obj[ka[0]]) {
        obj[ka[0]] = val;
      }
      else {
        //setValueToObject(obj[ka[0]], val);
        if (Array.isArray(obj[ka[0]]) && Array.isArray(val)) {
          obj[ka[0]] = val;
        }
        else if (Array.isArray(obj[ka[0]]) && (!Array.isArray(val) && $common.isObject(val))) {
          obj[ka[0]].push(val);
        }
        else {
          obj[ka[0]] = val;
        }
      }
    } else {
      if (!obj[ka[0]]) obj[ka[0]] = {}; //create our "new" base obj if it doesn't exist
      obj = obj[ka.shift()]; //remove the new "base" obj from string array, and hold actual object for recursive call
      _setData(ka.join("."), val, obj); //join the remaining parts back up with dots, and recursively set data on our new "base" obj
    }
  };

  /**
   * Get value from nested JSON object payload
   * @param key
   * @param obj
   * @returns {*}
   * @private
   */
  var _getData = function (key, obj) {
    if (!obj) return {}; //outside (non-recursive) call, use "data" as our base object
    var ka = key.split(/\./); //split the key by the dots

    if (ka.length < 2) {
      return obj[ka[0]]; //only one part (no dots) in key, just set value
    } else {
      if (!obj[ka[0]]) return {}; //create our "new" base obj if it doesn't exist
      obj = obj[ka.shift()]; //remove the new "base" obj from string array, and hold actual object for recursive call
      _getData(ka.join("."), obj); //join the remaining parts back up with dots, and recursively set data on our new "base" obj
    }
  }

  var isOfflinePersistObj = function (obj) {
    if ('meta' in obj && obj.meta.hasOwnProperty('offline-persist')) {
      return true;
    }
    return false;
  };

  /**
   * Property structure
   * @typedef persistenceUtils~Property
   * @property name {String} name of property
   * @property value {String} value of property
   * @property isProperty {Boolean} show if this is a property (:_property) or an id (:id(\\d+))
   * @property isInteger {Boolean} show if property value is integer
   */

  /**
   * Check if given object has specific (nested)property and set the given value to that payload. In case that the value
   * of the nested property is Array, will try to find for given key:value and replace it, if not exist, add to it.
   * @deprecated
   * @param object - usually a object from the DB
   * @param property {persistenceUtils~Property} property structure to search into
   * @param value - payload usually from the REST call
   * @returns {*} - the final object
   */
  function setNestedProperty(object, property, value) {
    if (object && typeof object == "object") {
      if (typeof property == "string" && property !== "") {
        //var isOfflineObj = isOfflinePersistObj(object);
        var split = property.split(".");

        return split.reduce(function (obj, prop, idx) {
          //console.log(obj, prop, idx);

          var keyValue = {
            name: null,
            value: null
          };
          var propMatch = prop.match(/\[(.*?)\]/);
          if (!propMatch) {
            obj[prop] = obj[prop] || {};
          } else {
            keyValue.name = prop.substr(0, prop.indexOf('['));
            keyValue.value = propMatch[1];
          }

          // do this only if this is the last element!
          if (split.length == (idx + 1)) {

            // the question is if there is key[value] or NOT!
            if (propMatch) {
              // ok here we have to check what the current object seams to be, but we would expect array!
              if (Array.isArray(obj)) {
                var index = obj.findIndex(function (item) {
                  return item[keyValue.name] == keyValue.value;
                });

                return (index > -1) ? _.deepExtend(value, obj[index]) : obj.push(value);
              }
              else {
                // handle as object!
                if (obj[keyValue.name] == keyValue.value) {
                  return _.deepExtend(value, obj[keyValue.name]);
                }
                else {
                  // that's a problem this object does not exist, create and add the payload
                  obj[keyValue.name] = keyValue.value;
                  return _.deepExtend(value, obj);
                }
              }
            }
            // handle usual property!
            else {
              return obj[prop] = value;
            }
          }

          if (propMatch) {
            if (Array.isArray(obj)) {
              var index = obj.findIndex(function (item) {
                item[keyValue.name] = keyValue.value;
              });

              return (index > -1) ? obj[index] : {};
            }
            else {
              // handle as object!
              if (obj[keyValue.name] == keyValue.value) {
                return obj[keyValue.name];
              }
              else {
                // that's a problem this object does not exist, create it and add the payload, then return!
                return obj[keyValue.name] = keyValue.value;
              }
            }
          }
          else {
            return obj[prop];
          }

        }, object);

      }
      else {
        return object;
      }
    } else {
      return object;
    }
  }

  /**
   * This should be the new way to go, using object directly, provides more stable logic!
   *
   * @param object
   * @param property {Array<persistenceRequestHandler~Property>} - property structure to search into:
   *                {
     *                   name: String,
     *                   value: String,
     *                   isProperty: true/false,
     *                   isInteger: true/false
     *                 }
   * @param value
   * @returns {*}
   */
  function setNestedProperty2(object, property, value) {
    if (!object || typeof object !== 'object') return object;
    if (!_.isArray(property) || !property.length > 0) return object;

    //var isOfflineObj = isOfflinePersistObj(object);

    return property.reduce(function (obj, prop, idx) {

      if (prop.isProperty) {
        obj[prop.name] = obj[prop.name] || [];
      }

      // do this only if this is the last element!
      if (property.length == (idx + 1)) {

        // the question is if there is key[value] or NOT!
        if (!prop.isProperty) {
          // ok here we have to check what the current object seams to be, but we would expect array!
          if (Array.isArray(obj)) {
            var index = obj.findIndex(function (item) {
              return item[prop.name] == nestedUrlPropertyToValue(prop);
            });

            // if this item already exists in array, just update it
            if(index > -1){
              _.deepExtend(obj[index], value);
            } else {
              value[prop.name] = nestedUrlPropertyToValue(prop);
              obj.push(value);
            }
            return value;
          }
          else {
            // handle as object!
            if (obj[prop.name] == nestedUrlPropertyToValue(prop)) {
              _.deepExtend(obj, value);
              return value;
            }
            else {
              // that's a problem this object does not exist, create and add the payload
              obj[prop.name] = nestedUrlPropertyToValue(prop);
              _.deepExtend(obj, value);
              return value;
            }
          }
        }
        // handle usual property with array value!
        else if(Array.isArray(value)) {
          obj[prop.name] = value;
          return value;
        }
        // handle usual property
        else {
          obj[prop.name].push(value);
          return value;
        }
      } // END

      if (!prop.isProperty) {
        if (Array.isArray(obj)) {
          var index = obj.findIndex(function (item) {
            item[prop.name] = nestedUrlPropertyToValue(prop);
          });

          return (index > -1) ? obj[index] : {};
        }
        else {
          // handle as object!
          if (obj[prop.name] == nestedUrlPropertyToValue(prop)) {
            return obj;
          }
          else {
            // that's a problem this object does not exist, create it and add the payload, then return!
            return obj[prop.name] = nestedUrlPropertyToValue(prop);
          }
        }
      }
      else {
        return obj[prop.name];
      }

    }, object);

  }


  /**
   * Search for (nested)property in the given object!
   *
   * @param object - usually from the offline db
   * @param property - property to search for in the form: prop1.prop2[value1].prop3....
   * @returns {*}
   */
  function getNestedProperty(object, property) {
    if (!object || typeof object !== 'object') return object;
    if (!_.isArray(property) || !property.length > 0) return object;

    //var split = property.split(".");

    return property.reduce(function (obj, prop) {

      // check if this is key[value] property!
      //var propMatch = prop.match(/\[(.*?)\]/);

      if (prop.isProperty) {
        return obj && obj[prop.name];
      }
      else {
        var keyValue = {
          name: prop.name,
          value: nestedUrlPropertyToValue(prop)
        };

        // if the current obj is array, search into the array!
        if (Array.isArray(obj) && !prop.isProperty) {
          var index = obj.findIndex(function (item) {
            return item[keyValue.name] == keyValue.value;
          });

          // return the given element or the current object or in case of sub property into that array!
          return (index > -1) ? obj[index] : (obj[keyValue.name] && obj);
        }
        else if (!prop.isProperty) {
          return (obj[keyValue.name] == keyValue.value) ? obj : (obj[keyValue.name] && obj);
        }
        else {
          return obj && obj[keyValue.name];
        }
      }

    }, object);

  }

  /**
   * Match url with wild cards!
   *
   * Example:
   *    var matchUrl = 'http://localhost:3000/internals/todo1';
   *    var excludeUri = ['http://localhost:3000/internals/*', 'http://localhost:3000/internals/todo3'];
   *
   *   for (var url in excludeUri) {
   *      console.log(matchUri(matchUrl, excludeUri[url]));
   *   }
   *
   * @param str
   * @param rule
   * @returns {boolean}
   */
  function matchUri(str, rule) {
    return new RegExp("^" + rule.replace("*", ".*") + "$").test(str);
  }

  /**
   * Parse XHR returned headers.
   *
   * Link: https://jsperf.com/parse-response-headers-from-xhr
   *
   * @param headerStr
   * @returns {{}}
   * @private
   */
  function _parseResponseHeaders(headerStr) {
    var headers = {};
    if (!headerStr) {
      return headers;
    }
    var headerPairs = headerStr.split('\u000d\u000a');
    for (var i = 0, ilen = headerPairs.length; i < ilen; i++) {
      var headerPair = headerPairs[i];
      var index = headerPair.indexOf('\u003a\u0020');
      if (index > 0) {
        headers[headerPair.substring(0, index).toLowerCase()] = headerPair.substring(index + 2);
      }
    }
    return headers;
  }

  /**
   * Check if given link is configured for persistent. The host in the URL does not play a role, you can pass values
   * like http://server:port/path1/path2 or just /path1/path2
   *
   * @param url
   * @returns {{uri, match}}
   */
  function isPersistentURL(url) {
    var parsed = $options.parseURL(url);
    return isPathConfiguredForPersistence(parsed.path);
  }

  function _isURLConfiguredForPersistence(path, returnUrl) {
    // check if this URL was configured for sync operations
    var url = isPersistentURL(path);

    // do no work if the URL is not configured for persistence!
    if (_.isEmpty(url) || url === false) {
      throw new Error('give url was configured for persistence:' + path);
    }

    // extract the root and get the collections data
    if (!returnUrl) {
      return extractKeyValuesFromPersistentUrl2(url);
    }

    return url;
  }

  /**
   * Makes sure that it cleans the sync log object form the database form DB specific arguments.
   *
   * @param obj - object should be passed by value!
   * @param cloneObject - boolean value to notify if object should be clone!
   */
  function cleanSyncLogObjectFromDBSpecificProperties(obj, cloneObject) {
    var _obj = cloneObject ? JSON.parse(JSON.stringify(obj)) : obj;

    if (_obj.hasOwnProperty('$loki') && typeof(_obj.$loki) === 'number' && !isNaN(_obj.$loki)) {
      delete _obj.$loki;
    }

    if (_obj.hasOwnProperty('meta')) {
      delete _obj.meta;
    }

    return _obj;
  }

  /**
   * Checks if the application runs in a web view!
   * @returns {boolean} Check if we are running within a WebView (such as Cordova).
   */
  function _isWebView() {
    return !(!window.cordova && !window.PhoneGap && !window.phonegap && !window.forge);
  }

  function _isMcsSyncResourceType(xhr) {
    return true;// TODO: check this return
    var isMCS = false;
    try {
      var response = function (path) {
        return $options.getUrlCache(path);
      };

      if (xhr == null) return response(xhr.responseURL);
      if (typeof xhr.getResponseHeader !== 'function') return response(xhr.responseURL);

      // this header identifies if the MCS response was using MSC Sync in the Custom Code
      isMCS = xhr.getResponseHeader('Oracle-Mobile-Sync-Resource-Type');
      if (isMCS) {
        isMCS = true;
        // so next time when GET operation and dbFirst=true we can use the proper parse!
        return $options.setUrlCache({url: xhr.responseURL, mcs: true});
      }
      else {
        return $options.setUrlCache({url: xhr.responseURL, mcs: false});
      }

      return isMCS;
    }
    catch (e) {
      console.error('error during checking the MCS headers', e);
      return $options.setUrlCache({url: xhr.responseURL, mcs: false});
      //return isMCS;
    }
  }

  /**
   * Checks if given object has the parsing method implemented for the HTTP method
   * @param obj
   * @param method
   * @returns {boolean}
   * @private
   */
  function _isSupportedHTTPMethod(obj, method) {
    if (obj.hasOwnProperty(_normalizeMethod(method))) {
      return true;
    }

    return false;
  }

  // allowed methods!
  var methods = ['delete', 'get', 'head', 'options', 'post', 'put', 'patch'];

  function _normalizeMethod(method) {
    var upcased = method.toLowerCase();
    return (methods.indexOf(upcased) > -1) ? upcased : method;
  }

  function _isLokiDbObj(obj) {
    if ('$loki' in obj && typeof(obj.$loki) === 'number' && !isNaN(obj.$loki)) {
      return true;
    }
    return false;
  }

  // public functions
  return {
    isPersistUrl: isPathConfiguredForPersistence,
    isPersistentURL: isPersistentURL,
    extractKeyValuesFromUrl2: extractKeyValuesFromPersistentUrl2,
    param: transformQueryParams,
    setData: _setData,
    parseResponseHeaders: _parseResponseHeaders,
    cleanSyncLogObjectFromDBSpecificProperties: cleanSyncLogObjectFromDBSpecificProperties,
    isWebView: _isWebView,
    isURLConfiguredForPersistence: _isURLConfiguredForPersistence,
    pathToMatch: pathMatch,
    isMcsSyncResourceType: _isMcsSyncResourceType,
    isSupportedHTTPMethod: _isSupportedHTTPMethod,
    normalizeMethod: _normalizeMethod,
    isLokiDbObj: _isLokiDbObj,
    isUrlRegexInteger: isUrlRegexInteger,
    setNestedProperty2: setNestedProperty2,
    getNestedProperty: getNestedProperty
  }
}

// TODO: L.Pelov - Reveal only the getters and setters
/**
 * Module contains all public settings for the persistence library
 * revealing module with getter and setters!
 */
function persistenceOptions($common) {
  'use strict';
  // replace underscore with own implementation
  var _ = $common;

  var $db = null;

  var dbFirst = true;
  var isCordova = typeof window.cordova != 'undefined';

  // default timeouts
  var timeout = 30000; // 30s,
  var syncTimeout = 30000; // 30s

  // use this to test if URL should be persisted
  var isPersistUri = {};

  // set URI to be persisted, otherwise nothing is persisted
  var persistUri = [];
  // In-Memory cache for all checked persistent URLs
  var isPersistUrlCache = {};
  var parseUrlCache = {};

  // make sure that we have only one On, otherwise always off!!!
  var on = null;
  var passOne = false;
  var alwayson = true;

  // turn off
  var alwaysoff = false;
  var dbFirstFalseForNextCallBool = false;
  var maxsyncattempts = 0; // by default unlimited
  var autoremoveafterreachmaxattemps = false;
  var autoSync = false;
  //var workerlocation = 'persistence.worker.js';
  var offlinedbname = 'offline';
  var synclogdbname = 'synclog';
  var dbprefix = 'persist';
  var dbprefixchangehandler = function (oldval, newval) {
    console.log(' changed from ' + oldval + ' to ' + newval);
    return newval;
  };

  // unit tests mode
  var isTest = false;

  // set which module should be used for the payload parsing!
  var module = null;

  /**
   * If not set the default is: PERIODIC_REFRESH_POLICY_REFRESH_NONE
   *
   * NOTE: http://docs.oracle.com/cloud/latest/mobilecs_gs/MCSUA/GUID-7C2A0D49-F898-4886-9A6A-4FF799F776F4.htm#MCSUA711
   */
  var periodicRefreshPolicy = {
    PERIODIC_REFRESH_POLICY_REFRESH_NONE: 'PERIODIC_REFRESH_POLICY_REFRESH_NONE',
    PERIODIC_REFRESH_POLICY_REFRESH_EXPIRED_ITEM_ON_STARTUP: 'PERIODIC_REFRESH_POLICY_REFRESH_EXPIRED_ITEM_ON_STARTUP',
    PERIODIC_REFRESH_POLICY_PERIODICALLY_REFRESH_EXPIRED_ITEMS: 'PERIODIC_REFRESH_POLICY_PERIODICALLY_REFRESH_EXPIRED_ITEMS'
  };

  var fetchPolicy = {
    FETCH_FROM_CACHE: 'FETCH_FROM_CACHE',
    FETCH_FROM_SERVICE: 'FETCH_FROM_SERVICE',
    FETCH_FROM_SERVICE_IF_ONLINE: 'FETCH_FROM_SERVICE_IF_ONLINE',
    FETCH_FROM_SERVICE_ON_CACHE_MISS: 'FETCH_FROM_SERVICE_ON_CACHE_MISS',
    FETCH_FROM_SERVICE_ON_CACHE_MISS_OR_EXPIRY: 'FETCH_FROM_SERVICE_ON_CACHE_MISS_OR_EXPIRY',
    FETCH_FROM_CACHE_SCHEDULE_REFRESH: 'FETCH_FROM_CACHE_SCHEDULE_REFRESH',
    FETCH_WITH_REFRESH: 'FETCH_WITH_REFRESH'
  };

  var expirationPolicy = {
    EXPIRE_ON_RESTART: 'EXPIRE_ON_RESTART',
    EXPIRE_AFTER: 'EXPIRE_AFTER',
    NEVER_EXPIRE: 'NEVER_EXPIRE'
  };

  var evictionPolicy = {
    EVICT_ON_EXPIRY_AT_STARTUP: 'EVICT_ON_EXPIRY_AT_STARTUP',
    MANUAL_EVICTION: 'MANUAL_EVICTION'
  };

  var updatePolicy = {
    UPDATE_IF_ONLINE: 'UPDATE_IF_ONLINE',
    QUEUE_IF_OFFLINE: 'QUEUE_IF_OFFLINE'
  };

  var conflictPolicy = {
    CLIENT_WINS: 'CLIENT_WINS',
    PRESERVE_CONFLICT: 'PRESERVE_CONFLICT',
    SERVER_WINS: 'SERVER_WINS'
  };

  var clientPolicies = {
    // set default clientPolicies
    periodicRefreshPolicy: periodicRefreshPolicy.PERIODIC_REFRESH_POLICY_REFRESH_NONE,
    periodicRefreshInterval: 120
  };

  /**
   * Specify the default clientPolicies!
   *
   * @type {{periodicRefreshPolicy: string}}
   */
  var defaultPolicy = {
    //periodicRefreshPolicy: periodicRefreshPolicy.PERIODIC_REFRESH_POLICY_REFRESH_NONE,
    conflictResolutionPolicy: conflictPolicy.PRESERVE_CONFLICT,
    evictionPolicy: evictionPolicy.MANUAL_EVICTION,
    expirationPolicy: expirationPolicy.EXPIRE_ON_RESTART,
    expireAfter: Number.MAX_VALUE,
    fetchPolicy: fetchPolicy.FETCH_FROM_SERVICE_IF_ONLINE,
    noCache: false,
    updatePolicy: updatePolicy.UPDATE_IF_ONLINE
  };

  clientPolicies['default'] = defaultPolicy;
  //clientPolicies['policies'] = [];

  /**
   * Set sync library config clientPolicies
   * @param config
   */
  var setPolicies = function (config) {
    if (!config) {
      console.error('config cannot be empty object');
      throw new Error('config cannot be empty object');
    }

    if (!_.isObject(config)) {
      console.error('policy is not object');
      throw new Error('policy is not object');
    }

    // Only on ES5-compliant browsers IE9+
    //if (!Object.keys(config).length) {
    // Yes it has at least one
    //}

    // alternative check
    var found = false, name;
    for (name in config) {
      if (config.hasOwnProperty(name)) {
        found = true;
        break;
      }
    }

    if (!found) {
      console.error('policy object does not contain any properties!');
      throw new Error('policy object does not contain any properties!');
    }

    // now check also that all properties are there, we start first with default properties
    setDefaultPolicies(config);

    // now that default config are clear we can setup the URL config!
    setUrlPolicies(config);
  };

  /**
   * Replace the default policy config with the new one, if any
   * @param config
   */
  var setDefaultPolicies = function (config) {
    if (!config.hasOwnProperty('default')) {
      //console.debug('given policy options does not have setup any default config');
      return;
    }

    console.debug('apply new default policies');

    if (config.default.conflictResolutionPolicy in conflictPolicy) {
      defaultPolicy.conflictResolutionPolicy = config.default.conflictResolutionPolicy || conflictPolicy.PRESERVE_CONFLICT;
    }

    if (config.default.evictionPolicy in evictionPolicy) {
      defaultPolicy.evictionPolicy = config.default.evictionPolicy || evictionPolicy.MANUAL_EVICTION;
    }

    if (config.default.expirationPolicy in expirationPolicy) {
      defaultPolicy.expirationPolicy = config.default.expirationPolicy || expirationPolicy.EXPIRE_ON_RESTART;
    }

    if (typeof config.default.expireAfter === 'number') {
      defaultPolicy.expireAfter = config.default.expireAfter || Number.MAX_VALUE;
    }

    if (config.default.fetchPolicy in fetchPolicy) {
      defaultPolicy.fetchPolicy = config.default.fetchPolicy || fetchPolicy.FETCH_FROM_SERVICE_IF_ONLINE;
    }

    if (typeof config.default.noCache === 'boolean') {
      defaultPolicy.noCache = config.default.noCache || false;
    }

    if (config.default.updatePolicy in updatePolicy) {
      defaultPolicy.updatePolicy = config.default.updatePolicy || updatePolicy.UPDATE_IF_ONLINE;
    }
  };

  var setUrlPolicies = function (config) {
    // get first the major properties if any!
    if (config.hasOwnProperty('periodicRefreshPolicy') && periodicRefreshPolicy.hasOwnProperty(config.periodicRefreshPolicy)) {
      clientPolicies.periodicRefreshPolicy = config.periodicRefreshPolicy || periodicRefreshPolicy.PERIODIC_REFRESH_POLICY_REFRESH_NONE;
    }

    if (config.hasOwnProperty('periodicRefreshInterval') && typeof config.periodicRefreshInterval === 'number') {
      clientPolicies.periodicRefreshInterval = config.periodicRefreshInterval || 1000 * 120; // 2 mins
    }

    if (!config.hasOwnProperty('policies')) {
      console.error('synchronisation configuration requires path policies');
      throw new Error('synchronisation configuration requires path policies');
    }

    parsePathConfig(config.policies);
  };

  // pass the object from given url clientPolicies, it will be match with the default and return the final properties
  var setPolicyForURL = function (urlPolicyObject) {
    // get a copy of the default clientPolicies!
    var urlPolicies = JSON.parse(JSON.stringify(defaultPolicy));

    if ('conflictResolutionPolicy' in urlPolicyObject && urlPolicyObject.conflictResolutionPolicy in conflictPolicy) {
      urlPolicies.conflictResolutionPolicy = urlPolicyObject.conflictResolutionPolicy || conflictPolicy.PRESERVE_CONFLICT;
    }

    if ('evictionPolicy' in urlPolicyObject && urlPolicyObject.evictionPolicy in evictionPolicy) {
      urlPolicies.evictionPolicy = urlPolicyObject.evictionPolicy || evictionPolicy.MANUAL_EVICTION;
    }

    if ('expirationPolicy' in urlPolicyObject && urlPolicyObject.expirationPolicy in expirationPolicy) {
      urlPolicies.expirationPolicy = urlPolicyObject.expirationPolicy || expirationPolicy.EXPIRE_ON_RESTART;
    }

    if ('expireAfter' in urlPolicyObject && typeof urlPolicyObject.expireAfter === 'number') {
      urlPolicies.expireAfter = urlPolicyObject.expireAfter || Number.MAX_VALUE;
    }

    if ('fetchPolicy' in urlPolicyObject && urlPolicyObject.fetchPolicy in fetchPolicy) {
      urlPolicies.fetchPolicy = urlPolicyObject.fetchPolicy || fetchPolicy.FETCH_FROM_SERVICE_IF_ONLINE;
    }

    if ('noCache' in urlPolicyObject && typeof urlPolicyObject.noCache === 'boolean') {
      urlPolicies.noCache = urlPolicyObject.noCache || false;
    }

    if ('updatePolicy' in urlPolicyObject && urlPolicyObject.updatePolicy in updatePolicy) {
      urlPolicies.updatePolicy = urlPolicyObject.updatePolicy || updatePolicy.UPDATE_IF_ONLINE;
    }

    return urlPolicies;
  };

  /**
   * go throw the path config settings and set it up
   * @param arrOfPaths
   */
  var parsePathConfig = function (arrOfPaths) {
    if (!Array.isArray(arrOfPaths)) {
      console.error('Persistence.Options.persistUris', 'param should be array!');
      throw new Error('Persistence.Options.persistUris', 'param should be array!');
    }

    // this approach should replace the previous logic!
    var route = pathMatch({
      // path-to-regexp options
      sensitive: true,
      strict: false,
      end: true,
    });

    var persistRegUriArr = [];
    clientPolicies['policies'] = arrOfPaths;

    if (arrOfPaths != null && Array.isArray(arrOfPaths)) {
      // go through the objects and take compile the regex for faster access!!!

      var len = arrOfPaths.length,
        i = 0;

      // go through the array and compile the regexes
      for (; i < len; i++) {
        var tmpPersistURL = {};

        if (arrOfPaths[i].hasOwnProperty('path')) {
          //tmpPersistURL['uri'] = arrOfPaths[i].uri;
          tmpPersistURL['uri'] = arrOfPaths[i].path;

          // this is for backward support for older version of the persistence library
          tmpPersistURL['reg'] = pathToRegexp(tmpPersistURL['uri'], [], {sensitive: true});
          tmpPersistURL['tokens'] = parse(tmpPersistURL['uri']);

          // new approach!!
          tmpPersistURL['matchURI'] = route(tmpPersistURL['uri']);

          // set clientPolicies here!
          //clientPolicies.policies.push(setPolicyForURL(arrOfPaths[i]));
          tmpPersistURL['policies'] = setPolicyForURL(arrOfPaths[i]);
          clientPolicies['policies'][i] = tmpPersistURL['policies'];
          clientPolicies['policies'][i].path = tmpPersistURL['uri'];


          //clientPolicies.policies.push();

          // how to get the first key, which is the unique key
          /*
           * http://stackoverflow.com/questions/983267/access-the-first-property-of-an-object
           * https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
           *
           * var params = match('/users/1/emails');
           * params[Object.keys(params)[0]]; // return the ID
           */

          // push the object to the main property
          persistUri.push(tmpPersistURL);

          // create new array which can be used on the end to testify id we really want to run the regex
          persistRegUriArr.push(tmpPersistURL.uri);
        }
      } // END OF FOR

      // use this object to check if we really want to persist specific URL!!!
      //@depricated - should be remove in the next version!
      isPersistUri = pathToRegexp(persistRegUriArr, [], {sensitive: true});
    }
  };

  // *** private methods
  /**
   * This simple implementation will check if specific path match and URL for persistence and return
   * object with all parameters.
   *
   * @param options
   * @returns {Function}
   * @throws Error - in case decoding of given parameter is not possible
   */
  var pathMatch = function (options) {
    options = options || {};

    return function (path) {
      var keys = [];
      var re = pathToRegexp(path, keys, options);

      return function (pathname, params) {
        var m = re.exec(pathname);
        if (!m) return false;

        // FIX: L.Pelov - user array to address the issue that some properties could have the same name
        params = params || [];

        var key, param, obj = {};
        for (var i = 0; i < keys.length; i++) {
          key = keys[i];
          param = m[i + 1];
          if (!param) continue;
          obj = {
            name: key.name,
            value: decodeParam(param)
          }
          //params[key.name] = decodeParam(param);
          params.push(obj);
          if (key.repeat) {
            //params[key.name] = params[key.name].split(key.delimiter)
            params[params.length - 1].name = params[params.length - 1].name.split(key.delimiter)
          }
        }

        return params;
      }
    }
  };

  /**
   * Decodes parameters from the url
   *
   * @param param
   * @returns {string}
   */
  function decodeParam(param) {
    try {
      return decodeURIComponent(param);
    } catch (e) {
      throw Error('failed to decode param "' + param + '"');
    }
  }

  var ready = function (fn) {
    if (document.readyState != 'loading') {
      fn();
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      document.attachEvent('onreadystatechange', function () {
        if (document.readyState != 'loading')
          fn();
      });
    }
  };

  /**
   * This is the cordova implementation for when device ready!
   *
   * @param callback
   * @returns {deviceReady}
   */
  function deviceReady(callback) {
    if (isCordova) {
      document.addEventListener('deviceready', function () {
        callback(true);
      }, false);
    } else {
      callback(false);
    }
    return deviceReady;
  }

  /**
   * change state depending on device mode!
   */
  deviceReady(function (isCordova) {
    if (isCordova) {
      var onlineCallback = function () {
        console.log('online callback');
      }

      var offlineCallback = function () {
        console.log('offline callback');
      }

      var pauseCallback = function () {
        console.log('pauseAppCallback');
      }

      var resumeCallback = function () {
        console.log('pauseAppCallback');
      }

      // register callbacks in case the state changed!
      document.addEventListener("offline", offlineCallback, false);
      document.addEventListener("online", onlineCallback, false);
      document.addEventListener("resume", resumeCallback, false);
      document.addEventListener("pause", pauseCallback, false);
    }
  });

  /**
   * Is going to check in the browser if computer is online or offline!
   */
  var initNetworkModes = function () {
    var status = navigator.onLine ? "online" : "offline";

    function updateOnlineStatus(event) {
      var condition = navigator.onLine ? "online" : "offline";

      status = condition;

      console.log("before end", "Event: " + event.type + "; Status: " + condition);
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // not required anymore!
    // if (Persistence.DB) {
    //   $db = Persistence.DB('persist.options');
    // }
  };

  // init methods to make sure that we could switch from network modes
  ready(initNetworkModes);

  /**
   * @deprecated - options table not required anymore!
   * @param options
   * @returns {*}
   */
  var setUrlCache = function (options) {
    if (!_.isObject(options)) return;
    if (!options.hasOwnProperty('url')) return;
    if (!options.hasOwnProperty('mcs')) return;

    var persistentPath = isPersistentUrl(options.url);

    if (persistentPath === false) {
      throw new Error('Persistence.Options.setUrlCache()-> URI was not configured for persistence:' + options.url);
    }

    options['url'] = persistentPath.root;

    var col = $db.getCollectionByName('options');
    var result = col.findOne({url: persistentPath.root});
    if (result) {
      _.extendOwn(result, options);
      return col.update(result);
    }
    else {
      return col.insert(options);
    }
  };

  /**
   * Checks if URL is configured for persistence and return the parameters
   * @param path - string with the current path to check
   * @returns {*} - object with the properties representing the values of the defined URL parameters
   */
   function isPersistentUrl(path) {
    if (typeof path !== 'string') {
      console.warn('isPersistentUrl -> path can be only string');
      return false;
    }

    // make sure that you parse the path!
    path = this.parseURL(path).path;

    // check the cache first!
    if (path in isPersistUrlCache) {
      return isPersistUrlCache[path];
    }

    // go through the persistUri, and check the urls!
    var len = persistUri.length, i = 0;

    for (; i < len; i++) {
      try {
        var params = persistUri[i].matchURI(path);
        if (params === false) {
          // go to the next one
          continue;
        }
        return isPersistUrlCache[path] = {
          params: params,
          root: persistUri[i].tokens[0],
          path: path,
          tokens: persistUri[i].tokens.slice(1),
          policies: persistUri[i].policies,
          isPolicy: function (policy, value) {
            if (typeof policy !== 'string') return undefined;

            if (this.policies &&
              this.policies.hasOwnProperty(policy)) {
              return value === undefined ? true : this.policies[policy] ===  value;
            }
            return false;
          }
        };
      }
      catch (e) {
        console.error(e);
        return isPersistUrlCache[path] = false;
      }
    }

    return isPersistUrlCache[path] = false;
  }

  /**
   * @deprecated - options table not required anymore!
   * @param path
   * @returns {*}
   */
  var getUrlCache = function (path) {
    return {mcs:true};
    if (_.isEmpty(path)) return;

    var persistentPath = isPersistentUrl(path);

    if (persistentPath === false) {
      throw new Error('Persistence.Options.setUrlCache()-> URI was not configured for persistence:' + path);
    }

    var col = $db.getCollectionByName('options');
    return col.findOne({url: persistentPath.root});
  };

  // reveal public methods
  return {
    isPersistentUrl: isPersistentUrl,
    /**
     * init on DOM ready to take eventually new settings!
     * support IE8+
     * @param fn
     */
    ready: ready,
    set dbFirst(yes) {
      if (typeof yes === "boolean") {
        dbFirst = yes;
      }
    },
    get dbFirst() {
      return dbFirst;
    },
    // set the new timeout in ms
    set timeout(ms) {
      if (typeof ms === 'number') {
        timeout = ms || timeout;
      }
    },
    get timeout() {
      return timeout;
    },
    set syncTimeOut(ms) {
      if (typeof ms === 'number') {
        syncTimeout = ms || syncTimeout;
      }
    },
    get syncTimeOut() {
      return syncTimeout;
    },
    parseURL: function (url) {
      if (typeof url !== 'string') {
        console.error('Persistence.Options.parseURL -> path can be only string');
        throw new Error('Persistence.Options.parseURL -> path can be only string');
      }

      // check the cache first!
      if (url in parseUrlCache) {
        return parseUrlCache[url];
      }

      // parse, store to the cache and return
      return parseUrlCache[url] = parseUri(url);
    },
    // get all persist URLs
    get persistUris() {
      return persistUri;
    },
    set persistUris(arr) {
      parsePathConfig(arr);
    },

    // global callbacks!
    set onTimeOut(callback) {
      if (typeof callback === 'function') {
        this.ontimeout = callback;
      }
    },
    set onError(callback) {
      if (typeof callback === 'function') {
        this.onerror = callback;
      }
    },
    set onSuccess(callback) {
      if (typeof callback === 'function') {
        this.onsuccess = callback;
      }
    },
    // default callbacks!
    ontimeout: function (e) {
      console.error('xhr.ontimeout', e);
    },
    onerror: function (e) {
      // NOTE: usually this is going to be network error here!
      console.error('xhr.onerror!', e);
    },
    onsuccess: function (data, status, headers, requestid) {
      console.debug('xhr.onsuccess', data, status, headers, requestid);
    },
    /**
     * More information can be found here:
     * https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/onLine
     *
     * @returns {boolean}
     */
    isOnline: function () {
      var networkState = (navigator && navigator.connection) ? navigator.connection.type : 'NULL';
      //console.log('network: TYPE (%s), CORDOVA (%s)', networkState, (typeof window.cordova != 'undefined'));

      // this means you are probably working in the browser
      if ((networkState === '' || networkState === 'NULL')) {
        if (isCordova) {
          return false;
        }
        else {
          // browser by default always online!
          // navigator.onLine ? "online" : "offline";
          return navigator.onLine ? true : false; // IE9+, Safari/iOS 8.4+
        }
      }

      if (networkState === 'unknown' || networkState === 'none') {
        return false;
      }

      // you are online!
      return true;
    },
    set isonline(callback) {
      if (typeof callback === 'function') {
        this.isOnline = callback;
      }
    },
    isOn: function () {
      if (alwayson && !passOne) {
        return true;
      }

      if (passOne == true) {
        passOne = false;
      }

      if (on) {
        on = null;
        return true;
      }

      return (!!on);
    },
    oneOn: function () {
      on = !!!on;
      return true;
    },
    oneOff: function () {
      passOne = true;
    },
    // always intercept the XHR
    set alwaysOn(bool) {
      if (bool) {
        // ok
        alwayson = true;
      }
      else {
        alwayson = false;
      }
    },
    set off(bool) {
      typeof bool === "boolean" ? alwaysoff = bool : alwaysoff = false;
    },
    get off() {
      return alwaysoff;
    },
    dbFirstFalseForNextCall: function () {
      if (dbFirst === true) {
        dbFirstFalseForNextCallBool = true;
      }
    },
    isDbFirst: function () {
      if (dbFirst === false && dbFirstFalseForNextCallBool === false) {
        return false;
      }
      else if (dbFirst === true && dbFirstFalseForNextCallBool === false) {
        return true;
      }
      // this means I have to return false!
      else if (dbFirst === true && dbFirstFalseForNextCallBool === true) {
        dbFirstFalseForNextCallBool = false;
        return false;
      }
      else {
        return dbFirst;
      }
    },
    set maxSyncAttempts(attempts) {
      if (typeof attempts === 'number') {
        maxsyncattempts = attempts || maxsyncattempts;
      }
    },
    get maxSyncAttempts() {
      return maxsyncattempts;
    },
    set autoRemoveAfterReachMaxAttemps(bool) {
      if (typeof bool === "boolean") {
        autoremoveafterreachmaxattemps = bool || autoremoveafterreachmaxattemps;
      }
    },
    get autoRemoveAfterReachMaxAttemps() {
      return autoremoveafterreachmaxattemps;
    },
    set autoSync(bool) {
      if (typeof bool === "boolean") {
        autoSync = bool;
      }
    },
    get autoSync() {
      return autoSync;
    },
    ondbprefixchange: function (oldVal, newVal) {
      dbprefixchangehandler(oldVal, newVal);
    },
    set onDbPrefixChange(callback) {
      if (typeof callback === 'function') {
        this.ondbprefixchange = callback;
      }
    },
    set dbPrefix(prefix){
      if (typeof prefix === 'string'){
        var old = dbprefix;
        dbprefix = prefix;
        //dbprefixchangehandler(old, dbprefix);
        this.ondbprefixchange(old, dbprefix);
      }
    },
    get dbPrefix() {
      return dbprefix;
    },
    set offlineDBName(name) {
      if (typeof name === 'string') {
        offlinedbname = name;
      }
    },
    get module() {
      return module;
    },
    set module(implementation) {
      if (!implementation) throw new Error('provide module implementation');

      module = implementation;
    },
    /**
     * @deprecated replace with lowercase
     */
    get Module() {
      return module;
    },
    /**
     * @deprecated replace with lowercase
     */
    set Module(implementation) {
      if (!implementation) throw new Error('provide module implementation');

      module = implementation;
    },
    get offlineDBName() {
      return offlinedbname;
    },
    set syncLogDBName(name) {
      if (typeof name === 'string') {
        synclogdbname = name;
      }
    },
    get syncLogDBName() {
      return synclogdbname;
    },
    set Policies(policies) {
      setPolicies(policies);
    },
    get Policies() {
      return clientPolicies;
    },
    get DefaultPolicies() {
      return defaultPolicy;
    },
    setUrlCache: setUrlCache,
    getUrlCache: getUrlCache,
    get isCordova() {
      return isCordova;
    },
    deviceReady: deviceReady,
    // TODO: custom method
    reset: function (){
      persistUri = [];
      clientPolicies.policies = [];
    },
    get isTest() {
      return isTest;
    },
    // set the new timeout in ms
    set isTest(value) {
      isTest = value;
    },
  }
}

/**
 * Creates the offline database and return base API for external usage.
 *
 * @type {{getDB, getCollection, getCollectionByName, getCollections, save, close, flush}}
 */
function persistenceDB(name, $options) {
  'use strict';
  /**
   * Create internal JS offline persistence db.
   */
    // default settings!
  var _db = null;
  var $name = name;

  var options = {
    autosave: true,
    autosaveInterval: 500,// in milliseconds
    autoload: true
  };

  // like a constructor, init when DOM ready!
  function init(name) {
    if ($options.off === true || $options.isTest === true) {
      options = {
        autosave: false,
        autosaveInterval: 60 * 1000 * 60 * 24 * 30 * 12,// in milliseconds, something very high, 1 year+
        autoload: false
      }
    }

    var dbName = $name || name || $options.offlineDBName || 'offline';
    _db = new loki(dbName, options);
    _db.loadDatabase();
    //_db.save();
  }

  //init();
  // exec on DOM ready!
  $options.ready(init);

  /**
   * Wraps the way collection should be taken from the database. If given collection name does not exist
   * it will create it.
   *
   * @param name - the name of the collection to get, create
   * @returns {*}
   * @param name
   */
  function getCollection2(name) {
    var col = _db.getCollection(name);

    if (!col) {
      var options = {
        clone: true, // makes sure that objects are not returned by reference
        disableChangesApi: true, // not need for change api here
        transactional: true // make sure that operations are transactional
      };

      col = _db.addCollection(name, options);
    }

    // BUG in Loki v1.3.16 - trigger save after each of the following operations
    // col.on('insert', function (result) {
    //   _db.save();
    // })
    //
    // col.on('update', function () {
    //   _db.save();
    // })
    //
    // col.on('delete', function () {
    //   _db.save();
    // })

    return col;
  }

  /**
   * Return collection directly with promise. If collection does not exist it will be created.
   *
   * @param name - the name of the database collection
   * @returns {*}
   * @deprecated
   */
  function getCollection(name) {
    return new Promise(function (resolve, reject) {
      _db.loadDatabase({}, function () {
        var col = _db.getCollection(name);

        if (!col) {
          var options = {
            clone: true, // makes sure that objects are not returned by reference
            disableChangesApi: true, // not need for change api here
            transactional: true // make sure that operations are transactional
          };

          col = _db.addCollection(name/*, options*/);
        }

        resolve(col);
      });
    });
  }

  /**
   * In case developer explicitly wants to save the database, after db operation.
   */
  function saveDatabase() {
    //_db.saveDatabase();
    _db.save();
  }

  /**
   * Returns all registered collections from the offline database.
   */
  function getCollections() {
    return _db.listCollections();
  }

  /**
   * Return the object to the internal created database
   * @returns {*}
   */
  function internalDB() {
    return _db;
  }

  /**
   * Emits a close event with an optional callback. Note that this does not destroy the db or collections,
   * it's a utility method that can be called before closing the process or 'onbeforeunload' in a browser.
   *
   * @param callback - optional
   */
  function close(callback) {
    _db.close(callback);
  }

  /**
   * This will go through all database collections and remove the data from them.
   */
  function flush() {
    // go throw the collections and delete the data there!
    var collections = getCollections();

    for (var i = 0; i < collections.length; i++) {
      // get the collection
      getCollection2(collections[i].name).removeDataOnly();
    }

    return true;
  }

  // TODO: Use promises in all calls!
  return {
    //init: init,
    getDB: internalDB,
    getCollection: getCollection,
    getCollectionByName: getCollection2,
    getCollections: getCollections,
    save: saveDatabase,
    close: close,
    flush: function () {
      return new Promise(function (resolve) {
        resolve(flush());
      });
    }
  };
}

/**
 * This module provide the MCS Persistent capabilities
 * @type {{}}
 */
function persistenceMCSHandler($options, $common, $utils) {
  'use strict';
  var URI_KEY = '$mcs$mcsPersistenceURI';
  var ETAG_KEY = '$mcs$etag';
  var HEADER_LOCATION = "location";
  var HEADER_RESOURCE_TYPE = "oracle-mobile-sync-resource-type";

  var dbname = 'mcs';
  var prefix = $options.dbPrefix;
  // to ready/write data to specific collections
  var $db = persistenceDB(prefix + '.' + dbname, $options);

  // in case the db prefix has changed, re-init the db!
  $options.onDbPrefixChange = function (oldVal, newVal) {
    $db = persistenceDB(newVal + '.' + dbname, $options);
  };

  // helper with common functions
  var _ = $common;

  var isPersistentRequest = function (request) {
    if (!request) {
      throw new Error('request cannot be undefined or null value');
    }

    if (!_.isObject(request)) {
      throw new Error('request has to be defined object with properties like: url, data etc.');
    }

    if (_.isEmpty(request)) {
      throw new Error('request cannot be empty object, it request properties like: url, data etc.');
    }

    if (_.isArray(request) || _.isFunction(request)) {
      throw new Error('request cannot be array or function');
    }

    // if response !false check that it has specific properties
    if (!'url' in request) {
      throw new Error('request.url was not specified');
    }

    return true;
  };

  /**
   * Check to see if this was also MCS payload!
   *
   * @param request
   * @returns {boolean}
   */
  var isPersistentMcsGetRequest = function (request) {
    isPersistentRequest(request);

    if (_.isEmpty(request.data)) {
      throw new Error('cannot proceed with empty payload');
    }

    if (!'items' in request.data) {
      throw new Error('items is not in the payload returned from MCS, probably not Sync Custom Code');
    }

    if (!'uris' in request.data) {
      throw new Error('url is not in the payload returned from MCS, probably not Sync Custom Code');
    }

    // don't know if this is mandatory!
    if (!'etags' in request.data) {
      throw new Error('etags is not in the payload returned from MCS, probably not Sync Custom Code');
    }

    return true;
  };

  var isPostRequest = function (request) {
    isPersistentRequest(request);

    if (!'data' in request) {
      throw new Error('request.data was not defined!');
    }

    if (!_.isObject(request.data)) {
      throw new Error('request.data is not a object or array!');
    }

    if (_.isFunction(request.data)) {
      throw new Error('request.data cannot be function');
    }

    // all good!
    return true;
  };

  var isOfflinePersistObj = function (obj) {
    if ('meta' in obj && obj.meta.hasOwnProperty('offline-persist')) {
      return true;
    }
    return false;
  };

  /**
   * If forces, you could mark the object to be stored in the DB only and not synced!
   *
   * @param obj
   * @param force
   * @returns {*}
   */
  var markObjAsOfflineIfForced = function (obj, force) {
    // only if force positive
    if (force) {
      if (isOfflinePersistObj(obj)) {
        delete obj.meta['offline-persist'];
      }

      return obj;
    }

    // since we updated that object make sure that is not going to be overridden
    if ('meta' in obj) {
      obj.meta['offline-persist'] = true;
      return obj;
    }

    obj['meta'] = {};
    obj.meta['offline-persist'] = true;

    return obj;
  };

  /**
   * Transform the payload and add it into the $db!
   *
   * NOTE: Such a transformations could hold a lot of resources!
   *
   * @param collection
   * @param payload
   * @returns {*}
   */
  var handleMcsGetCollectionPayload = function (collection, payload) {
    // to go over the items
    var size = payload.items.length;

    // get the current time!
    var now = Date.now();

    // get each object and create it in the $db
    for (var i = 0; i < size; i++) {
      var item = payload.items[i];

      item[URI_KEY] = parseUri((_.stringStartsWith(payload.uris[i], '/') ? '' : '/') + payload.uris[i]).path;
      item[ETAG_KEY] = payload.etags[i];

      var query = {};
      query[URI_KEY] = item[URI_KEY];

      var result = collection.findOne(query);

      // if already exist, update it
      if (result) {
        _.extendOwn(result, item);
        collection.update(result);
      }
      else {
        collection.insert(item);
      }
    }

    // clean everything that was not in the payload, so not updated or created!
    collection.removeWhere(function (dbObj) {
      //var diff = now - listeners[eventName].timestamp;
      return dbObj.meta.updated < now;
    });

    // return all from the collection!
    return collection.find();
  };

  /**
   * Handle item payload from the MCS
   *
   * @param collection
   * @param payload
   * @param path
   * @returns {*}
   */
  var handleMcsGetItemPayload = function (collection, payload, path) {
    // check first if this item already exist and update it, otherwise created it!
    var query = {};
    query[URI_KEY] = path;
    var result = collection.findOne(query);

    if (result) {
      var item = payload;
      _.extendOwn(result, item);
      return collection.update(result);
    }
    else {
      var item = payload;
      item[URI_KEY] = path;
      // not here this is not having etag!
      return collection.insert(item);
    }
  };

  /**
   * If nothing in the payload check get what is in the offline $db!
   * @param response - response is always array of objects!
   */
  var handleMcsGet = function (response) {
    var persistentPath = $options.isPersistentUrl(response.url);

    if (persistentPath === false) {
      throw new Error('Persistence.handleMcsGet()-> URI was not configured for persistence:' + response.url);
    }

    var collection = $db.getCollectionByName(persistentPath.root);

    // if any attributes build the query and return the information
    if (_.isEmpty(persistentPath.params)) {
      // no way to find build the query so return empty array

      // return collection in format {items:[],uris:[],etags:[]}
      var result = collection.find();
      var data = {
        //items: collection.find(),
        items: [],
        uris: [],
        etags: []
      };

      // for (var idx in data.items) {
      //   if (data.items.hasOwnProperty(idx)) {
      //     data.uris.push(data.items[idx].URI_KEY);
      //   }
      // }

      // clean the object and return in the way the MCS would do!
      for (var idx in result) {
        if (result[idx].hasOwnProperty(URI_KEY)) {
          data.uris.push(result[idx][URI_KEY]);
          delete result[idx][URI_KEY];
        }

        if (result[idx].hasOwnProperty(ETAG_KEY)) {
          data.etags.push(result[idx][ETAG_KEY]);
          delete result[idx][ETAG_KEY];
        }

        // it's actually clear that this is from the DB
        delete result[idx]['$loki'];

        data.items.push(result[idx]);
      }

      return data;
    }

    var query = {};
    query[URI_KEY] = persistentPath.path;
    return collection.findOne(query);
    // var result = collection.findOne(query);
    // if (result) {
    //   result.meta[URI_KEY] = result[URI_KEY];
    //   result.meta[ETAG_KEY] = result[ETAG_KEY];
    //
    //   delete result['$loki'];
    //   delete result[URI_KEY];
    //   delete result[ETAG_KEY];
    //
    //   return result;
    // }
    //
    // return '{}';
  };

  var handleMcsGetStore = function (response) {
    var persistentPath = $options.isPersistentUrl(response.url);

    if (persistentPath === false) {
      throw new Error('Persistence.handleMcsGetStore()-> URI was not configured for persistence:' + response.url);
    }

    // get the collection for the given url
    var collection = $db.getCollectionByName(persistentPath.root);

    // new reference!
    var payload = response.data;

    // since everything is in the payload, I don't have to bother with some complicate checking!
    // Oracle-Mobile-Sync-Resource-Type: item, collection
    // Content-Type header must be application/json
    var resourceTypeHeader = HEADER_RESOURCE_TYPE in response || response.headers[HEADER_RESOURCE_TYPE];

    if (resourceTypeHeader === 'collection') {
      // work with collection
      return handleMcsGetCollectionPayload(collection, payload);
    }
    else if (resourceTypeHeader === 'item') {
      // work with item
      return handleMcsGetItemPayload(collection, payload, persistentPath.path);
    }
    else if (resourceTypeHeader) {
      // something else!
      console.error('unknown Oracle-Mobile-Sync-Resource-Type (%s)', resourceTypeHeader);
      throw new Error('unknown Oracle-Mobile-Sync-Resource-Type');
    } else {
      // nothing to do the payload is not recognised!
      console.error('this is not MCS response, unable to handle the payload, no MCS header was specified: ', response);
      throw new Error('this is not MCS response, unable to handle the payload, no MCS header was specified');
    }
  };

  /**
   * Currently posts supports only adding new objects into the root!
   *
   * @param response
   * @param force
   */
  var handleMcsPost = function (response, force) {
    // check if URL can be persist
    var persistentPath = $options.isPersistentUrl(response.url);

    if (persistentPath === false) {
      throw new Error('Persistence.handleMcsPost()-> URI was not configured for persistence:' + response.url);
    }

    // get the collection for the given url
    var collection = $db.getCollectionByName(persistentPath.root);

    // reference
    var payload = response.data;

    if (!_.isEmpty(persistentPath.params)) {
      throw new Error('you can add new objects only against the root REST resource endpoint');
    }

    if (_.isArray(payload)) {
      throw new Error("the payload cannot be array");
    }
    // just object payload
    else if (_.isObject(payload) && !_.isNull(payload) && !_.isFunction(payload)) {
      // update offline created object with new uri
      if (response.data && response.data[URI_KEY]) {
        return updatePayloadWithNewUri(collection, response);
      } else {
        var uri = null;
        if (response && response.headers && response.headers[HEADER_LOCATION]) {
          uri = _.stringStartsWith(response.headers[HEADER_LOCATION], '/') ? response.headers[HEADER_LOCATION] : '/' + response.headers[HEADER_LOCATION];
        }
        var result = null;
        if (uri) {
          var query = {};
          query[URI_KEY] = uri;
          result = collection.findOne(query);
        }
        if (!result) {
          payload[ETAG_KEY] = '"0-1B2M2Y8AsgTpgAmY7PhCfg"'; // empty e-tag
          result = collection.insert(payload);
          // this flag means that we created this directly in the offline $db
          markObjAsOfflineIfForced(result, force);
        } else {
          _.extendOwn(result, response.data);
        }
        if (!uri) {
          // L.Pelov - fix 02 Aug 2016
          // EDGE case when you use Oracle JET with oj.Collection components!
          var key = (persistentPath.tokens.length > 0 && /^\w+$/.test(persistentPath.tokens[0].name)) ? persistentPath.tokens[0].name : null;
          var value = null;
          if (key) {
            value = (response.data.hasOwnProperty(key)) ? response.data[key] : _.getUID();
          }

          uri = (value === null) ? persistentPath.root + '/' + _.getUID() : persistentPath.root + '/' + value;

          // on post check to see if the payload already has object with ID configured in the params
          //uri = persistentPath.root + '/' + _.getUID();
        }
        result[URI_KEY] = uri;
        return collection.update(result);
      }
    }

    throw new Error("don't know what to do with the payload");
  };

  function updatePayloadWithNewUri(collection, response) {
    var query = {};
    query[URI_KEY] = response.data[URI_KEY];
    var result = collection.findOne(query);
    if (result) {
      _.extendOwn(result, response.data);
      //result[URI_KEY] = '/' + response.headers.Location;
      result[URI_KEY] = _.stringStartsWith(response.headers[HEADER_LOCATION], '/') ? response.headers[HEADER_LOCATION] : '/' + response.headers[HEADER_LOCATION];
      return collection.update(result);
    } else {
      throw new Error("the payload was not found in collection:" + query[URI_KEY]);
    }
  }


  /**
   * Currently posts supports only adding new objects into the root!
   *
   * @param response
   * @param force
   */
  var handleMcsPut = function (response, force) {
    // check if URL can be persist
    var persistentPath = $options.isPersistentUrl(response.url);

    if (persistentPath === false) {
      throw new Error('Persistence.handleMcsPut()-> URI was not configured for persistence:' + response.url);
    }

    // get the collection for the given url
    var collection = $db.getCollectionByName(persistentPath.root);

    // reference
    var payload = response.data;

    if (!_.isEmpty(persistentPath.params)) {
      // ok there is key so we can try to do the update
      if (_.isArray(payload)) {
        throw new Error("the payload cannot be array");
      }
      // just object payload
      else if (_.isObject(payload) && !_.isNull(payload) && !_.isFunction(payload)) {

        var query = {};
        query[URI_KEY] = persistentPath.path;
        var result = collection.findOne(query);
        if (result) {
          _.extendOwn(result, payload);
          markObjAsOfflineIfForced(result, force);
          return collection.update(result);
        }
      }
    }

    // don't know what to do! :)!
    throw new Error("you can execute update operations only against existing items in the offline database!");
  };

  /**
   *
   * @param response
   * @returns {*}
   */
  var handleMcsDelete = function (response) {
    // check if URL can be persist
    var persistentPath = $options.isPersistentUrl(response.url);

    if (persistentPath === false) {
      throw new Error('Persistence.handleMcsDelete()-> URI was not configured for persistence:' + response.url);
    }

    // get the collection for the given url
    var collection = $db.getCollectionByName(persistentPath.root);

    // reference
    var payload = response.data;

    if (!_.isEmpty(persistentPath.params)) {
      var query = {};
      query[URI_KEY] = persistentPath.path;
      var findOne = collection.findOne(query);
      if (findOne) {
        return collection.remove(findOne);
      }
      throw new Error('unable to find object with the given ID(%s) in the database', response.url);
    }

  };

  // TODO: Yuri - move to helper or create base class, every handler will ahve such method
  function flush(path) {
    console.info('Persistence.MCS.flush()', path);
    // if no path delete everything
    if (_.isEmpty(path)) {
      return $db.flush();
    }
    else {
      var parsed = $options.parseURL(path);
      var isPersistentUrl = $utils.isPersistUrl(parsed.path);

      return new Promise(function (resolve, reject) {
        // check if URL can be persist
        if (!isPersistentUrl) {
          reject(new Error('Persistence.MCS.flush() given URI not configured for persistence: ' + parsed.path));
        } else {
          var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);
          resolve($db.getCollectionByName(queryParams.root).removeDataOnly());
        }
      });
    }
  }

  // public API
  this.get = function (request) {
    var doGet = function (request) {
      console.info('Persistence.MCS.get()');

      isPersistentRequest(request);

      // copy the object to make sure that we don't work with the reference anymore!
      var _request = _.clone(request);

      if (!_request.hasOwnProperty('data') || _.isEmpty(_request.data)) {
        return _.clone(handleMcsGet(_request));
      }

      // if it has data, check that it was MCS payload!
      isPersistentMcsGetRequest(request);

      return _.clone(handleMcsGetStore(_request));
    };

    // return all as a promise
    //return Promise.fcall(doGet, request);
    return new Promise(function (resolve) {
      resolve(doGet(request));
    });
  };

  this.post = function (request, force) {
    var doPost = function (response, force) {
      console.info('Persistence.MCS.post()');

      isPostRequest(request);

      // never work with reference, only use new copy!
      var _request = _.clone(request);

      return _.clone(handleMcsPost(_request, force));
    };

    // promise
    return new Promise(function (resolve) {
      resolve(doPost(request, force));
    });
  };
  this.put = function (request, force) {
    var doPut = function (response, force) {
      console.info('Persistence.MCS.put()');

      // requires the same like the post!
      isPostRequest(request);

      // never work with reference, only use new copy!
      var _request = _.clone(request);

      return _.clone(handleMcsPut(_request, force));
    };

    // promise
    return new Promise(function (resolve) {
      resolve(doPut(request, force));
    });
  };
  this.delete = function (request, force) {
    var doDelete = function (response, force) {
      console.info('Persistence.MCS.delete()');

      // requires the same like the post!
      isPersistentRequest(request);

      // never work with reference, only use new copy!
      var _request = _.clone(request);

      return _.clone(handleMcsDelete(_request, force));
    };

    // promise
    return new Promise(function (resolve) {
      resolve(doDelete(request, force));
    });
  };
  this.router = function (request, force) {
    // IMPORTANT: Take the referecen outside the PROMISE!
    var self = this;

    return new Promise(function (resolve) {
      if (!_.isObject(request)) {
        console.error('Passed object is not defined request!', request);
        throw new Error('Passed object is not defined request!');
      }

      // check if method provided!
      if (!request.hasOwnProperty('method')) {
        console.error('request.method was not provided!', request);
        throw new Error('request.method was not provided!');
      }

      // copy the object to make sure that we don't work with the reference anymore!
      var _request = _.clone(request);

      // expects the router specified
      _request.method = $utils.normalizeMethod(_request.method);
      if (!self[_request.method]) {
        console.error('specified router is not implemented!');
        throw new Error('specified router is not implemented!');
      }

      resolve(self[_request.method](_request, force));
    });
  };
  this.data = function (path) {
    function doData(path) {
      var persistentPath = $options.isPersistentUrl(path);

      //
      if (!persistentPath) {
        throw new Error('Persistence.BaseModule.data() given URI not configured for persistence: ' + path);
      }

      return $db.getCollectionByName(persistentPath.root);
    }

    //
    return new Promise(function (resolve) {
      resolve(doData(path));
    });
  };
  this.flush = flush;
  this.getModuleName = function () {
    return 'MCS';
  };

  this.URI_KEY = URI_KEY;
  this.ETAG_KEY = ETAG_KEY;
}

/**
 * Request handler can be used directly, and is used to intercept the HTTP request to store objects offline.
 *
 * @type {{get, post, put, delete, data, router, flush}}
 */
// TODO: L.Pelov - rename to Generic in the next release
function persistenceRequestHandler($options, $common, $utils) {
  'use strict';
  // private declarations

  // to ready/write data to specific collections
  // var $db = persistenceDB('persist.request');
  var dbname = 'request';
  var prefix = $options.dbPrefix;
  // to ready/write data to specific collections
  var $db = persistenceDB(prefix + '.' + dbname, $options);

  // in case the db prefix has changed, re-init the db!
  $options.onDbPrefixChange = function (oldVal, newVal) {
    $db = persistenceDB(newVal + '.' + dbname, $options);
  };

  var _ = $common;

  var isPersistentRequest = function (request) {
    if (!request) {
      throw new Error('request cannot be undefined or null value');
    }

    if (!_.isObject(request)) {
      throw new Error('request has to be defined object with properties like: url, data etc.');
    }

    if (_.isEmpty(request)) {
      throw new Error('request cannot be empty object, it request properties like: url, data etc.');
    }

    if (_.isArray(request) || _.isFunction(request)) {
      throw new Error('request cannot be array or function');
    }

    // if response !false check that it has specific properties
    if (!'url' in request) {
      throw new Error('request.url was not specified');
    }

    return true;
  };

  var isPersistentGetRequest = function (request) {
    isPersistentRequest(request);
    return true;
  };

  var isPostRequest = function (request) {
    isPersistentRequest(request);

    if (!'data' in request) {
      throw new Error('request.data was not defined!');
    }

    if (!_.isObject(request.data)) {
      throw new Error('request.data is not a object or array!');
    }

    if (_.isFunction(request.data)) {
      throw new Error('request.data cannot be function');
    }

    // all good!
    return true;
  };

  var isOfflinePersistObj = function (obj) {
    return !!('meta' in obj && obj.meta.hasOwnProperty('offline-persist'));
  };

  var isLokiDbObj = function (obj) {
    return !!('$loki' in obj && typeof(obj.$loki) === 'number' && !isNaN(obj.$loki));
  };

  var buildFindQueryBasedOnUrlParams = function (urlQueryParams) {
    var dbQuery = {};

    if (urlQueryParams.attr.length > 0) {
      var key = urlQueryParams.attr[0].name;
      dbQuery[key] = (urlQueryParams.attr[0].pattern.indexOf('\d') >= 0) ? parseInt(urlQueryParams.attr[0].value) : urlQueryParams.attr[0].value + "";
    }

    return dbQuery;
  };

  var buildUniqueIDValue = function (isPersistentUrl, value) {
    var isInt = function () {
      if ((isPersistentUrl.uri.tokens.length > 1)) {
        return isPersistentUrl.uri.tokens[isPersistentUrl.uri.tokens.length - 1].pattern.indexOf('\d') >= 0;
      }
      else {
        return false;
      }
    };

    var parse = function (value) {
      return isInt() ? parseInt(value) : value + "";
    };

    if (_.isEmpty(value)) {
      return parse(_.getUID());
    }

    if (typeof value === 'number' && isInt()) {
      return value
    }

    return parse(value);
  };

  var handleGetRootArrayPayload = function (payload, isPersistentUrl, collection) {
    // check for key in the URL
    // 0 - in the tokens is always the /root path of the URL
    if (isPersistentUrl.uri.tokens.length > 1) {
      // so we know that this is the root, get everything
      var dbArray = collection.find();

      // for the merging!
      if (dbArray.length > 0) {
        // get the name of the key to use to compare
        // this is the second element in the tokens[] array
        var keyNameToCompare = isPersistentUrl.uri.tokens[1].name;

        // TODO: L.Pelov - Change this algorithm later to be able to work with ranges!
        collection.removeWhere(function (dbObj) {
          // this adds some overhead if the payload is big, as it will search through every time,
          // however each time object was found in the payload it will be remove to increase search efficiency
          var foundObjectIndex = payload.findIndex(function (payloadObj) {
            // this will return true if object with the follow parameters found!
            return (payloadObj[keyNameToCompare] === dbObj[keyNameToCompare]);
          });

          // if >-1 object was found
          if (foundObjectIndex > -1) {
            // now get the object and merge the properties!
            try {
              // merge the properties
              // if object was changed offline, don't override the offline staff!
              if (isOfflinePersistObj(dbObj)) {
                // don't override what was changed offline!
                dbObj = _.deepExtend(payload[foundObjectIndex], dbObj);
              }
              else {
                _.extendOwn(dbObj, payload[foundObjectIndex]);
              }

              // and update the database
              collection.update(dbObj);

              // remove the object from the payload, to increase search index efficiency!
              payload.splice(foundObjectIndex, 1);
            }
            catch (e) {
              console.error(e);
            }
            finally {
              // make sure that false is returned!
              return false;
            }
          }
          else {
            if (isOfflinePersistObj(dbObj)) {
              return false;
            }

            //bad for you baby you don't exist anymore, and you was not created offline, we have to delete you
            return true;
          }
        });

        // now check to see if there is something left in the payload and insert it into the db
        payload.forEach(function (obj) {
          // this situation should not happen, but better test!
          if (isLokiDbObj(obj)) {
            collection.update(obj);
          }
          else {
            collection.insert(obj);
          }
        });

        // on the end return the new collection
        return collection.find();
      }

      // if we don't have anything in the collection then just insert the payload
      return collection.insert(payload);
    }

    // we don't have a chance to compare without key specified in the config settings
    // wipe out all information not created offline and add the new payload
    collection.removeWhere(function (obj) {
      return (!isOfflinePersistObj(obj));
      //return true;
    });

    // insert the new payload
    return collection.insert(payload);
  };

  var handleGetRootObjectPayload = function (payload, isPersistentUrl, collection) {
    // check first again if we have key specified
    if (isPersistentUrl.uri.tokens.length > 1) {

      // get the name of the key to use to compare
      // this is usually the second in the tokens[] array
      var keyNameToCompare = isPersistentUrl.uri.tokens[1].name;

      // check if the object has the same key
      if (!payload.hasOwnProperty(keyNameToCompare)) {
        console.error('payload does not contain unique key specified in the URL settings');
        throw new Error('payload does not contain unique key specified in the URL settings');
      }

      // we could use the key from the payload to query the db and see if there is already object with
      // the same ID
      var findObjByKeyQuery = {};
      findObjByKeyQuery[keyNameToCompare] = payload[keyNameToCompare];

      // let see if there is object with the same id
      var result = collection.findOne(findObjByKeyQuery);

      // if result, the object exist in the db, update it then!
      if (result) {
        // ok we had something that much, remove the rest, but only if it's not marked offline
        if (isOfflinePersistObj(result)) {
          result = _.deepExtend(payload, result);
        }
        else {
          _.extendOwn(result, payload);
        }

        return collection.update(result);
      }

      // ok the object has the require ID but does not exist in the DB
      // so insert it now, but before that remove everything from here, except the offline objects we created!
      // collection.removeWhere(function(obj) {
      //      return (!obj.meta.hasOwnProperty('offline-persist'));
      // });

      // TODO: The question here is if we really want to save something that does not have any unique key defined!
      // if you here it means that the object does not exist in the DB, store it directly for now
      return collection.insert(payload);
    }

    // no keys specified delete everything that was not stored directly in the db and insert the new payload
    collection.removeWhere(function (obj) {
      return (!isOfflinePersistObj(obj));
    });

    // insert the new payload
    return collection.insert(payload);
  };

  var setPayloadSingleObject = function (newObject, payload) {
    if (_.isArray(payload)) {
      _.extendOwn(newObject, payload[0]);
    }
    else if (_.isObject(payload) && !_.isFunction(payload)) {
      _.extendOwn(newObject, payload);
    }
  };

  /**
   * Build nested property structure to be used in GET calls to setup or edit existing objects!
   *
   * @param queryParams  query parameters properties!
   * @returns {string}  prop1.prop2[value].prop3....
   * @deprecated  use buildNestedPropertyArrayParams
   */
  function buildNestedPropertySearchString(queryParams) {
    var nestedProperty = "";

    if (queryParams.attr.length > 1) {
      // skips the first key we know that this is the object unique key!
      for (var i = 1; i < queryParams.attr.length; i++) {

        // :_property
        if (queryParams.attr[i].is) {

          // prop.prop...
          if (nestedProperty.length > 0) nestedProperty += "." + queryParams.attr[i].name;
          else nestedProperty += queryParams.attr[i].name;

        }
        // :id(\\d+)
        else {

          // prop.prop[value]...
          if (nestedProperty.length > 0) {
            nestedProperty += "." + queryParams.attr[i].name + "[" + queryParams.attr[i].value + "]";
          }
          else {
            //nestedProperty += queryParams.attr[i].name[queryParams.attr[i].value];
            // TODO: Yuri - check with Lyudmil
            nestedProperty += queryParams.attr[i].value;
          }

        }
      }
    }

    return nestedProperty;
  }

  /**
   * Has to be build a string of properties which can be used when adding new elements!
   *
   * @param queryParams
   * @param isPersistentUrl
   * @param isNotGet
   *
   * @return {Array<persistenceUtils~Property>} - array of properties with parameters and values
   */
  function buildNestedPropertyArrayParams(isPersistentUrl, queryParams, isNotGet) {
    // why string, it could be array of objects, easier to access and I can pass all properties I need!

    var nestedProperty = [];
    var params = queryParams.attr;

    // here we start from the
    if (Array.isArray(params) && params.length > 0) {
      var tokens = isPersistentUrl.uri.tokens.length > 1 ? isPersistentUrl.uri.tokens.slice(1) : [];

      // go over the parameters to construct the link
      for (var i = 0; i < params.length; i++) {

        var isLast = (params.length - 1) == i;

        // :_property
        if (params[i].is) {

          // prop.prop...
          // if (nestedProperty.length > 0) nestedProperty += "." + params[i].name;
          // else nestedProperty += params[i].name;
          nestedProperty.push({
            name: params[i].name,
            value: null,
            isProperty: true,
            isInteger: false
          });


          // So the issue here we have is following:
          // - this is the last element and is property, so we have to check if in the tokens there
          // another element after that that is key:value and if yes, we should use to generate the element
          // - FIX: L.Pelov - this should be done only in POST, PUT or DELETE cases!
          if (isLast && tokens[i + 1] && isNotGet) {
            // check if there is additional element in the match to identify the key of this property!
            // this will happen in case of POST, PUT DELETE

            //nestedProperty += "." + tokens[i].name + "[" + $common.getUID() + "]";
            var isInt = $utils.isUrlRegexInteger(tokens[i + 1].pattern);
            nestedProperty.push({
              name: tokens[i + 1].name,
              value: isInt ? $common.getUID() : $common.getUID() + "",
              isProperty: false,
              isInteger: isInt
            });

          }
        }
        // :id(\\d+)
        else {

          // prop.prop[value]...
          // if the property is empty create value!
          var proValue = params[i].value || $common.getUID();
          nestedProperty.push({
            name: params[i].name,
            value: proValue,
            isProperty: false,
            isInteger: $utils.isUrlRegexInteger(tokens[i].pattern)
          });

        }

      }

    }

    return nestedProperty;
  }

  /**
   * Search for that nested object and add the new payload to it, if any!
   *
   * @param obj
   * @param persistentUrlObj
   * @param queryParams
   * @param payload
   * @returns {{obj: *, result: *}}
   */
  function createObjFromUrlParamsForExistingForPost(obj, persistentUrlObj, queryParams, payload) {
    var nestedProperty = buildNestedPropertyArrayParams(persistentUrlObj, queryParams);
    var result = obj;
    if (Array.isArray(nestedProperty) && nestedProperty.length > 0) {
      result = $utils.setNestedProperty2(obj, nestedProperty, payload);
    } else {
      _.extendOwn(obj, payload);
    }
    return {
      obj: obj,
      result: result
    };
  }

  /**
   * In case of given DB object but we have URL with sub parameters, we have to check if those nested obj exist,
   * and create them if not and add the payload inside.
   *
   * @param obj - object form the offline DB
   * @param queryParams - URL parameters, usually what is returned from $utils.extractKeyValuesFromUrl2
   * @param payload - from the REST API call
   * @return {{obj: *, result: *}}
   * @param persistentUrlObj
   */
  function createObjFromUrlParamsForGETAction(obj, persistentUrlObj, queryParams, payload) {
    // NOTICE: since this is a get action we don't have to build the sub property
    var nestedProperty = buildNestedPropertyArrayParams(persistentUrlObj, queryParams, false);
    var result = obj;
    if (Array.isArray(nestedProperty) && nestedProperty.length > 0) {
      result = $utils.setNestedProperty2(obj, nestedProperty, payload);
    }
    return {
      obj: obj,
      result: result
    };
  }

  /**
   * Try to find that nested object when offline or when no payload in GET
   * @param obj
   * @param persistentUrlObj
   * @param queryParams
   * @returns {*}
   */
  function getNestedPropertyFromUrlParamsForExisting(obj, persistentUrlObj, queryParams) {
    // build the nested property array to use to search for the object
    var nestedProperty = buildNestedPropertyArrayParams(persistentUrlObj, queryParams, false);

    // do only if nested property search required
    if (Array.isArray(nestedProperty) && nestedProperty.length > 0) {
      return $utils.getNestedProperty(obj, nestedProperty);
    }

    return obj;
  }

  /**
   * if we have attributed then the first one should be the key we look for!
   * @deprecated - use buildNestedPropertyArrayParams
   */
  function createObjFromUrlParameters(keyValueObj, queryParams, payload) {
    // this root does not exist create it with the given unique ID from the URL
    var newObject = keyValueObj;

    // NOTE that the first one key:value is the unique key!
    // TODO: L.Pelov - check performance!
    if (queryParams.attr.length > 1) {
      var nestedProperty = "";
      for (var i = 1; i < queryParams.attr.length; i++) {
        // if object than we have key:value
        if (queryParams.attr[i].is) {
          $utils.setData(queryParams.attr[i].name, queryParams.attr[i].value, newObject);
        }
        else {
          if (nestedProperty.length > 0) nestedProperty += "." + queryParams.attr[i].value;
          else nestedProperty += queryParams.attr[i].value;

          // we just have empty property to nest with other properties
          $utils.setData(nestedProperty, {}, newObject);
        }
      }

      //if (nestedProperty.length > 0) {
      //  $utils.setData(nestedProperty, payload, newObject);
      //}

      // once the nested property was created, extend with the new data!
      //_.extendOwn(newObject, payload);
    }
    else {
      //_.extendOwn(newObject, payload);
    }

    setPayloadSingleObject(newObject, payload);
    return newObject;
  }

  /**
   * @deprecated - use buildNestedPropertyArrayParams
   */
  function createObjFromUrlParametersForEdit(keyValueObj, queryParams, payload) {
    var newObject = keyValueObj;

    if (queryParams.attr.length > 1) {
      var nestedProperty = "";
      for (var i = 1; i < queryParams.attr.length; i++) {
        // if object that we have key:value
        if (queryParams.attr[i].is) {
          $utils.setData(queryParams.attr[i].name, queryParams.attr[i].value, newObject);
        }
        else {
          //console.log(query.attr[i].name,  query.attr[i].value);
          if (nestedProperty.length > 0) nestedProperty += "." + queryParams.attr[i].value;
          else nestedProperty += queryParams.attr[i].value;

          // we just have empty property to nest with other properties
          $utils.setData(nestedProperty, {}, newObject);
        }
      }
      // ok the new object is ready, we can now merge with the result
      if (nestedProperty.length > 0) {
        $utils.setData(nestedProperty, payload, newObject);
      }

      // return the new object for merging
      return newObject;
    }

    // was not able to create new object
    return payload;
  }

  var markObjAsOfflineIfForced = function (obj, force) {
    // only if force positive
    if (force) {
      if (isOfflinePersistObj(obj)) {
        delete obj.meta['offline-persist'];
      }

      return obj;
    }

    // since we updated that object make sure that is not going to be overridden
    if ('meta' in obj) {
      obj.meta['offline-persist'] = true;
      return obj;
    }

    obj['meta'] = {};
    obj.meta['offline-persist'] = true;

    return obj;
  };

  /**
   * Use only if you have no new data, empty payload, and you want to return everything from the db,
   * depending on the GET URL
   *
   * TODO: should be extended to be able to query sub element!
   * @param response{url}
   * @returns {*}
   */
  var handleGet = function (response) {

    // check first the URL if defined for persistence!
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // no need to continue, if the URL was not configured!
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.get() given URI was not configured for persistence:' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // search and get!:)
    if (!_.isEmpty(keyValueObj)) {
      var result = collection.findOne(keyValueObj);

      // deep search in the object!
      if (result) {
        return _.cleanObject(getNestedPropertyFromUrlParamsForExisting(result, isPersistentUrl, queryParams));
      }

      // nothing inside, sorry!
      return [];
    }

    console.info('unable to build find query for given url and payload, return all from db');
    return _.cleanObjects(collection.find());
  };

  /**
   * Response property
   * @typedef persistenceRequestHandler~Response
   * @property url {String}
   * @property data {Object}
   */


  /**
   * Stores/merges given payload into the offline db!
   *
   * @param response {persistenceRequestHandler~Response}
   * @returns {*}
   */
  var handleGetStore = function (response) {

    // check first the URL if defined for persistence!
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // no need to continue, if the URL was not configured!
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.get() given URI was not configured for persistence:' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    if (!_.isEmpty(keyValueObj)) {

      var result = collection.findOne(keyValueObj);

      // this means that we have element with that key, so we have to update it
      if (result) {
        // TODO: Address the possibility that some object could be marked as offline only!
        var newObj = createObjFromUrlParamsForGETAction(result, isPersistentUrl, queryParams, payload);
        collection.update(newObj.obj);
        return newObj.result;
      } else {
        var newObj = createObjFromUrlParamsForGETAction(keyValueObj, isPersistentUrl, queryParams, payload);
        collection.insert(newObj.obj);
        return newObj.result;
      }
    }
    // ok no key in the url but we have payload and it should be added somewhere
    // this also means that we are in the root path!
    else if (_.isArray(payload) && !_.isFunction(payload) && !_.isEmpty(payload)) {
      // if it is array of objects in the payload, then make a intersection
      return handleGetRootArrayPayload(payload, isPersistentUrl, collection);
    }
    // this is the situation where we have only object in the root path payload call NOT array!
    else if (_.isObject(payload) && !_.isArray(payload) && !_.isFunction(payload) && !_.isEmpty(payload)) {
      return handleGetRootObjectPayload(payload, isPersistentUrl, collection);
    } else {
      // don't know what to do:)!
      console.error('Persistence.RequestHandler.get() unknown or empty object passed for the operation');
      throw new Error('Persistence.RequestHandler.get() -> unknown or empty object passed for the operation');
    }
  };

  /**
   * Handle post array payload.
   *
   * @param payload
   * @param isPersistentUrl
   * @param collection
   * @param force
   * @returns {*}
   */
  var handlePostRootArrayPayload = function (payload, isPersistentUrl, collection, force) {
    var keyNameToCompare = (isPersistentUrl.uri.tokens.length > 1) ? isPersistentUrl.uri.tokens[1].name : null;

    // go now throw what it was in the collection
    // and see if we have match to the new payload
    payload.forEach(function (obj) {

      if (isLokiDbObj(obj)) {
        markObjAsOfflineIfForced(obj, force);
        collection.update(obj);
      }
      // check if the payload has id,
      else if (keyNameToCompare && obj.hasOwnProperty(keyNameToCompare)) {
        // try to find the element in the db, if there update, otherwise inside!
        var result = collection.findOne({keyNameToCompare: obj[keyNameToCompare]});
        if (result) {
          _.extendOwn(result, obj);
          markObjAsOfflineIfForced(result, force);
          collection.update(result);
        }
        else {
          // insert
          markObjAsOfflineIfForced(obj, force);
          collection.insert(obj);
        }
      }
      else {
        // if we don't have anything in the collection to compare
        var objInsertResult = collection.insert(obj);
        objInsertResult[keyNameToCompare] = buildUniqueIDValue(isPersistentUrl); //objInsertResult.$loki + "";
        markObjAsOfflineIfForced(objInsertResult, force);
        return _.cleanObject(collection.update(objInsertResult));
      }

    });

    // on the end return the new collection
    return _.cleanObjects(collection.find());
  };

  /**
   * Handle post create object from only simple json object
   * @param payload
   * @param isPersistentUrl
   * @param collection
   * @param force
   * @returns {*}
   */
  var handlePostRootObjectPayload = function (payload, isPersistentUrl, collection, force) {
    // well check first again if we have key specified in the $options
    var keyNameToCompare = (isPersistentUrl.uri.tokens.length > 1) ? isPersistentUrl.uri.tokens[1].name : "";

    // check if the object has the same key
    if (keyNameToCompare && !payload.hasOwnProperty(keyNameToCompare)) {
      console.info('get payload', "does not have the key specified in the URL settings");
      // if not then we have to create one empty
      payload[keyNameToCompare] = "";

      // no need to query the db for this element
      // well this is completely new element and we should mark it as offline
      var insertResult = collection.insert(payload);
      if (insertResult) {
        insertResult[keyNameToCompare] = buildUniqueIDValue(isPersistentUrl)//insertResult.$loki + "";
        // this flag means that we created this directly in the offline db
        markObjAsOfflineIfForced(insertResult, force);
        return _.cleanObject(collection.update(insertResult));
      }

      // else we have an issue here
      throw new Error('unable to store the payload object');
    }

    // ok this is the situation, where the key actually exist in the payload
    // let see if there is object with the same id
    if (keyNameToCompare && payload.hasOwnProperty(keyNameToCompare)) {
      // make sure that the payload
      var queryForObject = {};
      queryForObject[keyNameToCompare] = payload[keyNameToCompare];
      //var result = collection.findOne({keyNameToCompare: payload[keyNameToCompare]});
      var result = collection.findOne(queryForObject);

      // this means that we have element with that key, so we have to update it
      if (result) {
        // merge properties!
        _.extendOwn(result, payload);
        markObjAsOfflineIfForced(result, force);
        return _.cleanObject(collection.update(result));
      }

      // ok so if the above did not work, maybe there is a problem with the key string/int
      var rebuildKeyValue = buildUniqueIDValue(isPersistentUrl, payload[keyNameToCompare]);
      payload[keyNameToCompare] = rebuildKeyValue;
    }

    // if no key was specified in the URL option settings, we have no another option
    markObjAsOfflineIfForced(payload, force);
    return _.cleanObject(collection.insert(payload));
  };

  /**
   * Handle Post HTTP request!
   *
   * @param response {persistenceRequestHandler~Response}
   * @param force - it means that the meta['offline-persist'] property will be deleted to force update on next GET
   * @returns {*}
   */
  var handlePost = function (response, force) {
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // check if URL can be persist
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // if not empty we can search
    if (!_.isEmpty(keyValueObj)) {

      // find parent object
      var result = collection.findOne(keyValueObj);

      // ok post used URL with key, so we have to create sub element here
      if (result) {
        var newObj = createObjFromUrlParamsForExistingForPost(result, isPersistentUrl, queryParams, payload);
        var propertyName = isPersistentUrl.uri.tokens[isPersistentUrl.uri.tokens.length - 1].name;
        newObj.result[propertyName] = buildUniqueIDValue(isPersistentUrl, newObj.result[propertyName]);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.update(newObj.obj);
        return _.cleanObject(newObj.result);
      }
      else {
        var newObj = createObjFromUrlParamsForExistingForPost(keyValueObj, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.insert(newObj.obj);
        return _.cleanObject(newObj.result);
      }
    }
    // this situation will happen when we have ROOT path call, with no KEY specified
    // ok no key in the url but we have payload and it should be added somewhere
    // this also means that we are in the root!
    if (_.isArray(payload)) {
      return handlePostRootArrayPayload(payload, isPersistentUrl, collection, force);
    }
    // just object payload
    else if (_.isObject(payload) && !_.isArray(payload) && !_.isNull(payload)) {
      return handlePostRootObjectPayload(payload, isPersistentUrl, collection, force);
    }
    // dont' know what to do! :)!
    throw new Error("don't know what to do with the payload");
  };

  /**
   * Works like HTTP post
   * https://gist.github.com/wookiehangover/877067
   *
   * @param response
   * @param force
   * @returns {*}
   */
  var handlePut = function (response, force) {
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // check if URL can be persist
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // if we have attributed than the first one should be key we look for!
    if (!_.isEmpty(keyValueObj)) {

      var result = collection.findOne(keyValueObj);

      // this means that we have element with that key, so we have to update it
      if (result) {
        var newObj = createObjFromUrlParamsForExistingForPost(result, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.update(newObj.obj);
        return newObj.result;
      }
      else {
        var newObj = createObjFromUrlParamsForExistingForPost(keyValueObj, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.insert(newObj.obj);
        return newObj.result;
      }
    }

    // ok following is in the case that you call PUT on root with parameters!
    // makes PUT to work like POST!
    if (_.isArray(payload)) {
      return handlePostRootArrayPayload(payload, isPersistentUrl, collection, force);
    }

    // just object payload
    else if (_.isObject(payload) && !_.isArray(payload) && !_.isNull(payload)) {
      return handlePostRootObjectPayload(payload, isPersistentUrl, collection, force);
    }

    // dont' know:)!
    //throw new Error('unable to recognise the edit payload, it should be JSON Object or Array!');
    throw new Error('no key specified to recognise obj in the database for editing!');
  };

  /**
   * Works like HTTP post
   * https://gist.github.com/wookiehangover/877067
   *
   * @param response
   * @param force
   * @returns {*}
   */
  var handlePatch = function (response, force) {
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // check if URL can be persist
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // if we have attributed than the first one should be key we look for!
    if (!_.isEmpty(keyValueObj)) {

      var result = collection.findOne(keyValueObj);

      // this means that we have element with that key, so we have to update it
      if (result) {
        var newObj = createObjFromUrlParamsForExistingForPost(result, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.update(newObj.obj);
        return newObj.result;
      }
      else {
        var newObj = createObjFromUrlParamsForExistingForPost(keyValueObj, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.insert(newObj.obj);
        return newObj.result;
      }
    }

    // ok following is in the case that you call PUT on root with parameters!
    // makes PUT to work like POST!
    if (_.isArray(payload)) {
      return handlePostRootArrayPayload(payload, isPersistentUrl, collection, force);
    }

    // just object payload
    else if (_.isObject(payload) && !_.isArray(payload) && !_.isNull(payload)) {
      return handlePostRootObjectPayload(payload, isPersistentUrl, collection, force);
    }

    // dont' know:)!
    //throw new Error('unable to recognise the edit payload, it should be JSON Object or Array!');
    throw new Error('no key specified to recognise obj in the database for editing!');
  };

  /**
   * Delete specific element from the offline db
   *
   * @param request
   * @returns {*}
   */
  var handleDelete = function (request) {
    var parsed = $options.parseURL(request.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // check if URL can be persist
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
    }

    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);
    var collection = $db.getCollectionByName(queryParams.root);
    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // if we have attributed in the request URL specified!!!
    if (!_.isEmpty(keyValueObj)) {
      var findOne = collection.findOne(keyValueObj);
      if (findOne) {
        return _.cleanObject(collection.remove(findOne));
      }
      throw new Error('unable to find object with the given ID(%s) in the database', keyValueObj);
    }

    // OK maybe the ID is in the payload!
    // NOTE: It is not good practice to have the ID in the payload, but it is possible!
    if (request.hasOwnProperty('data')) {
      var payload = request.data;
      if (!_.isEmpty(payload) && _.isObject(payload) && !_.isArray(payload)) {

        var keyNameToCompare = (isPersistentUrl.uri.tokens.length > 1) ? isPersistentUrl.uri.tokens[1].name : null;

        // check if the object has the same key
        if (keyNameToCompare && !request.data.hasOwnProperty(keyNameToCompare)) {
          throw new Error('payload does not have the key required to delete the object');
        }

        var findOne = collection.findOne({keyNameToCompare: request.data[keyNameToCompare]});
        if (findOne) {
          return _.cleanObject(collection.remove(findOne));
        }
      }
    }

    console.error('payload does not have the key required to delete the object in the payload');
    throw new Error('payload does not have the key required to delete the object in the payload');
  };

  // TODO: Yuri - move to helper or create base class, every handler will ahve such method
  function flush(path) {
    console.info('Persistence.RequestHandler.flush()', path);
    // if no path delete everything
    if (_.isEmpty(path)) {
      return $db.flush();
    }
    else {
      var parsed = $options.parseURL(path);
      var isPersistentUrl = $utils.isPersistUrl(parsed.path);

      return new Promise(function (resolve, reject) {
        // check if URL can be persist
        if (!isPersistentUrl) {
          reject(new Error('Persistence.RequestHandler.flush() given URI not configured for persistence: ' + parsed.path));
        } else {
          var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);
          resolve($db.getCollectionByName(queryParams.root).removeDataOnly());
        }
      });
    }
  }

  // public methods!
  this.getDB = function () {
    return $db;
  };
  this.get = function (request) {
    var doGet = function (request) {
      console.info('Persistence.RequestHandler.get()');

      isPersistentGetRequest(request);

      // copy the object to make sure that we don't work with the reference anymore!
      var _request = _.clone(request);

      if (!_request.hasOwnProperty('data') || _.isEmpty(_request.data)) {
        return _.clone(handleGet(_request));
      }

      return _.clone(handleGetStore(_request));
    };
    // return all as a promise
    return new Promise(function (resolve) {
      resolve(doGet(request));
    });
  };
  // actually this is the same as get but only for specific element
  this.post = function (request, force) {
    var doPost = function (request, force) {
      console.info('Persistence.RequestHandler.post()');

      isPostRequest(request);

      // always clone before do some work with the object,
      // it takes some time but saves a lot of trouble!
      var _request = _.clone(request);

      //return handlePost(_request, force);
      return _.clone(handlePost(_request, force));
    };

    // promise
    return new Promise(function (resolve) {
      resolve(doPost(request, force));
    });
  };
  this.put = function (request, force) {
    var doPut = function (request, force) {
      console.info('Persistence.RequestHandler.put()');

      isPostRequest(request);

      // always clone the object before do some work
      var _request = _.clone(request);
      return _.clone(handlePut(_request, force));
    };

    // promise
    //return Promise.resolve(doPut(request, force));
    return new Promise(function (resolve) {
      resolve(doPut(request, force));
    });
  };
  this.patch = function (request, force) {
    var doPatch = function (request, force) {
      console.info('Persistence.RequestHandler.patch()');

      isPostRequest(request);

      // always clone the object before do some work
      var _request = _.clone(request);
      return _.clone(handlePatch(_request, force));
    };

    // promise
    //return Promise.resolve(doPut(request, force));
    return new Promise(function (resolve) {
      resolve(doPatch(request, force));
    });
  };
  this.delete = function (request) {
    function doDelete(request) {
      console.info('Persistence.RequestHandler.delete()');

      isPersistentRequest(request);

      // always clone the object before do some work
      var _request = _.clone(request);

      return _.clone(handleDelete(_request));
    }

    // promise
    //return Promise.resolve(doDelete(request));
    return new Promise(function (resolve) {
      resolve(doDelete(request));
    });
  };
  // provide the url and you will get the collection for it, as result from promise!
  this.data = function (path) {
    function doData(path) {
      console.info('Persistence.RequestHandler.data()');

      if (path == null) {
        throw new Error('Path cannot be empty!');
      }

      var parsed = $options.parseURL(path);
      var isPersistentUrl = $utils.isPersistUrl(parsed.path);

      // check if URL can be persist
      if (!isPersistentUrl) {
        throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
      }

      var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);
      return $db.getCollectionByName(queryParams.root);
    }

    // promise
    //return Promise.resolve(doData(path));
    return new Promise(function (resolve) {
      resolve(doData(path));
    });
  };
  this.router = function (request, force) {
    var self = this;

    return new Promise(function (resolve) {
      //resolve(doRouting(request, force));
      if (!isPersistentGetRequest(request)) {
        console.error('Passed object is not defined request for GET!', request.url);
        throw new Error('Passed object is not defined request for GET!');
      }

      // check if method provided!
      if (!request.hasOwnProperty('method')) {
        console.error('request.method was not provided!', request);
        throw new Error('request.method was not provided!');
      }

      // copy the object to make sure that we don't work with the reference anymore!
      var _request = _.clone(request);

      // do routing!
      // if (_request.method === 'GET') {
      //     if (!_request.hasOwnProperty('data') || _.isEmpty(_request.data)) {
      //         var result = handleGet(_request)
      //         return clone(result);
      //     }
      //     var result = handleGetStore(_request);
      //     return clone(result);
      // }

      // exec the router specified
      _request.method = $utils.normalizeMethod(_request.method);
      if (!self[_request.method]) {
        console.error('specified router is not implemented!');
        throw new Error('specified router is not implemented!');
      }

      // exec the method
      var result = self[_request.method](_request, force);
      resolve(result);
    });
  };
  // provide path and you delete everything from the collection
  this.flush = flush;
  this.getModuleName = function () {
    return 'MCS';
  };

  // private methods
  this._createObjFromUrlParamsForExistingForPost = createObjFromUrlParamsForExistingForPost;
  this._buildNestedPropertyAddString = buildNestedPropertyArrayParams;
  this._buildNestedPropertySearchString = buildNestedPropertySearchString;
  this._createObjFromUrlParamsForExisting = createObjFromUrlParamsForGETAction;
  this._buildNestedPropertyArrayParams = buildNestedPropertyArrayParams;
}

/**
 * This module provide the Oracle REST Persistent capabilities
 * @type {{}}
 */
function persistenceOracleRESTHandler($options, $common, $utils) {
  'use strict';

  // to ready/write data to specific collections
  // var $db = persistenceDB('persist.request');
  var dbname = 'oraclerest';
  var prefix = $options.dbPrefix;
  // to ready/write data to specific collections
  var $db = persistenceDB(prefix + '.' + dbname, $options);

  // in case the db prefix has changed, re-init the db!
  $options.onDbPrefixChange = function (oldVal, newVal) {
    $db = persistenceDB(newVal + '.' + dbname, $options);
  };

  var _ = $common;

  function buildOracleRESTResponse(items) {
    return {
      items: items
    };
  }

  var isPersistentRequest = function (request) {
    if (!request) {
      throw new Error('request cannot be undefined or null value');
    }

    if (!_.isObject(request)) {
      throw new Error('request has to be defined object with properties like: url, data etc.');
    }

    if (_.isEmpty(request)) {
      throw new Error('request cannot be empty object, it request properties like: url, data etc.');
    }

    if (_.isArray(request) || _.isFunction(request)) {
      throw new Error('request cannot be array or function');
    }

    // if response !false check that it has specific properties
    if (!'url' in request) {
      throw new Error('request.url was not specified');
    }

    return true;
  };

  var isPersistentGetRequest = function (request) {
    isPersistentRequest(request);
    return true;
  };

  var isPostRequest = function (request) {
    isPersistentRequest(request);

    if (!'data' in request) {
      throw new Error('request.data was not defined!');
    }

    if (!_.isObject(request.data)) {
      throw new Error('request.data is not a object or array!');
    }

    if (_.isFunction(request.data)) {
      throw new Error('request.data cannot be function');
    }

    // all good!
    return true;
  };

  var isOfflinePersistObj = function (obj) {
    return !!('meta' in obj && obj.meta.hasOwnProperty('offline-persist'));
  };

  var isLokiDbObj = function (obj) {
    return !!('$loki' in obj && typeof(obj.$loki) === 'number' && !isNaN(obj.$loki));
  };

  var buildFindQueryBasedOnUrlParams = function (urlQueryParams) {
    var dbQuery = {};

    if (urlQueryParams.attr.length > 0) {
      var key = urlQueryParams.attr[0].name;
      dbQuery[key] = (urlQueryParams.attr[0].pattern.indexOf('\d') >= 0) ? parseInt(urlQueryParams.attr[0].value) : urlQueryParams.attr[0].value + "";
    }

    return dbQuery;
  };

  var buildUniqueIDValue = function (isPersistentUrl, value) {
    var isInt = function () {
      if ((isPersistentUrl.uri.tokens.length > 1)) {
        return isPersistentUrl.uri.tokens[isPersistentUrl.uri.tokens.length - 1].pattern.indexOf('\d') >= 0;
      }
      else {
        return false;
      }
    };

    var parse = function (value) {
      return isInt() ? parseInt(value) : value + "";
    };

    if (_.isEmpty(value)) {
      return parse(_.getUID());
    }

    if (typeof value === 'number' && isInt()) {
      return value
    }

    return parse(value);
  };

  var handleGetRootArrayPayload = function (payload, isPersistentUrl, collection) {
    // check for key in the URL
    // 0 - in the tokens is always the /root path of the URL
    if (isPersistentUrl.uri.tokens.length > 1) {
      // so we know that this is the root, get everything
      var dbArray = collection.find();

      // for the merging!
      if (dbArray.length > 0) {
        // get the name of the key to use to compare
        // this is the second element in the tokens[] array
        var keyNameToCompare = isPersistentUrl.uri.tokens[1].name;

        // TODO: L.Pelov - Change this algorithm later to be able to work with ranges!
        collection.removeWhere(function (dbObj) {
          // this adds some overhead if the payload is big, as it will search through every time,
          // however each time object was found in the payload it will be remove to increase search efficiency
          var foundObjectIndex = payload.findIndex(function (payloadObj) {
            // this will return true if object with the follow parameters found!
            return (payloadObj[keyNameToCompare] === dbObj[keyNameToCompare]);
          });

          // if >-1 object was found
          if (foundObjectIndex > -1) {
            // now get the object and merge the properties!
            try {
              // merge the properties
              // if object was changed offline, don't override the offline staff!
              if (isOfflinePersistObj(dbObj)) {
                // don't override what was changed offline!
                dbObj = _.deepExtend(payload[foundObjectIndex], dbObj);
              }
              else {
                _.extendOwn(dbObj, payload[foundObjectIndex]);
              }

              // and update the database
              collection.update(dbObj);

              // remove the object from the payload, to increase search index efficiency!
              payload.splice(foundObjectIndex, 1);
            }
            catch (e) {
              console.error(e);
            }
            finally {
              // make sure that false is returned!
              return false;
            }
          }
          else {
            if (isOfflinePersistObj(dbObj)) {
              return false;
            }

            //bad for you baby you don't exist anymore, and you was not created offline, we have to delete you
            return true;
          }
        });

        // now check to see if there is something left in the payload and insert it into the db
        payload.forEach(function (obj) {
          // this situation should not happen, but better test!
          if (isLokiDbObj(obj)) {
            collection.update(obj);
          }
          else {
            collection.insert(obj);
          }
        });

        // on the end return the new collection
        return collection.find();
      }

      // if we don't have anything in the collection then just insert the payload
      return collection.insert(payload);
    }

    // we don't have a chance to compare without key specified in the config settings
    // wipe out all information not created offline and add the new payload
    collection.removeWhere(function (obj) {
      return (!isOfflinePersistObj(obj));
      //return true;
    });

    // insert the new payload
    return collection.insert(payload);
  };

  var handleGetRootObjectPayload = function (payload, isPersistentUrl, collection) {
    // check first again if we have key specified
    if (isPersistentUrl.uri.tokens.length > 1) {

      // get the name of the key to use to compare
      // this is usually the second in the tokens[] array
      var keyNameToCompare = isPersistentUrl.uri.tokens[1].name;

      // check if the object has the same key
      if (!payload.hasOwnProperty(keyNameToCompare)) {
        console.error('payload does not contain unique key specified in the URL settings');
        throw new Error('payload does not contain unique key specified in the URL settings');
      }

      // we could use the key from the payload to query the db and see if there is already object with
      // the same ID
      var findObjByKeyQuery = {};
      findObjByKeyQuery[keyNameToCompare] = payload[keyNameToCompare];

      // let see if there is object with the same id
      var result = collection.findOne(findObjByKeyQuery);

      // if result, the object exist in the db, update it then!
      if (result) {
        // ok we had something that much, remove the rest, but only if it's not marked offline
        if (isOfflinePersistObj(result)) {
          result = _.deepExtend(payload, result);
        }
        else {
          _.extendOwn(result, payload);
        }

        return collection.update(result);
      }

      // ok the object has the require ID but does not exist in the DB
      // so insert it now, but before that remove everything from here, except the offline objects we created!
      // collection.removeWhere(function(obj) {
      //      return (!obj.meta.hasOwnProperty('offline-persist'));
      // });

      // TODO: The question here is if we really want to save something that does not have any unique key defined!
      // if you here it means that the object does not exist in the DB, store it directly for now
      return collection.insert(payload);
    }

    // no keys specified delete everything that was not stored directly in the db and insert the new payload
    collection.removeWhere(function (obj) {
      return (!isOfflinePersistObj(obj));
    });

    // insert the new payload
    return collection.insert(payload);
  };

  /**
   * Build nested property structure to be used in GET calls to setup or edit existing objects!
   *
   * @param queryParams  query parameters properties!
   * @returns {string}  prop1.prop2[value].prop3....
   * @deprecated  use buildNestedPropertyArrayParams
   */
  function buildNestedPropertySearchString(queryParams) {
    var nestedProperty = "";

    if (queryParams.attr.length > 1) {
      // skips the first key we know that this is the object unique key!
      for (var i = 1; i < queryParams.attr.length; i++) {

        // :_property
        if (queryParams.attr[i].is) {

          // prop.prop...
          if (nestedProperty.length > 0) nestedProperty += "." + queryParams.attr[i].name;
          else nestedProperty += queryParams.attr[i].name;

        }
        // :id(\\d+)
        else {

          // prop.prop[value]...
          if (nestedProperty.length > 0) {
            nestedProperty += "." + queryParams.attr[i].name + "[" + queryParams.attr[i].value + "]";
          }
          else {
            //nestedProperty += queryParams.attr[i].name[queryParams.attr[i].value];
            // TODO: Yuri - check with Lyudmil
            nestedProperty += queryParams.attr[i].value;
          }

        }
      }
    }

    return nestedProperty;
  }

  /**
   * Has to be build a string of properties which can be used when adding new elements!
   *
   * @param queryParams
   * @param isPersistentUrl
   * @param isNotGet
   *
   * @return {Array<persistenceUtils~Property>} - array of properties with parameters and values
   */
  function buildNestedPropertyArrayParams(isPersistentUrl, queryParams, isNotGet) {
    // why string, it could be array of objects, easier to access and I can pass all properties I need!

    var nestedProperty = [];
    var params = queryParams.attr;

    // here we start from the
    if (Array.isArray(params) && params.length > 0) {
      var tokens = isPersistentUrl.uri.tokens.length > 1 ? isPersistentUrl.uri.tokens.slice(1) : [];

      // go over the parameters to construct the link
      for (var i = 0; i < params.length; i++) {

        var isLast = (params.length - 1) == i;

        // :_property
        if (params[i].is) {

          // prop.prop...
          // if (nestedProperty.length > 0) nestedProperty += "." + params[i].name;
          // else nestedProperty += params[i].name;
          nestedProperty.push({
            name: params[i].name,
            value: null,
            isProperty: true,
            isInteger: false
          });


          // So the issue here we have is following:
          // - this is the last element and is property, so we have to check if in the tokens there
          // another element after that that is key:value and if yes, we should use to generate the element
          // - FIX: L.Pelov - this should be done only in POST, PUT or DELETE cases!
          if (isLast && tokens[i + 1] && isNotGet) {
            // check if there is additional element in the match to identify the key of this property!
            // this will happen in case of POST, PUT DELETE

            //nestedProperty += "." + tokens[i].name + "[" + $common.getUID() + "]";
            var isInt = $utils.isUrlRegexInteger(tokens[i + 1].pattern);
            nestedProperty.push({
              name: tokens[i + 1].name,
              value: isInt ? $common.getUID() : $common.getUID() + "",
              isProperty: false,
              isInteger: isInt
            });

          }
        }
        // :id(\\d+)
        else {

          // prop.prop[value]...
          // if the property is empty create value!
          var proValue = params[i].value || $common.getUID();
          nestedProperty.push({
            name: params[i].name,
            value: proValue,
            isProperty: false,
            isInteger: $utils.isUrlRegexInteger(tokens[i].pattern)
          });

        }

      }

    }

    return nestedProperty;
  }

  /**
   * Search for that nested object and add the new payload to it, if any!
   *
   * @param obj
   * @param persistentUrlObj
   * @param queryParams
   * @param payload
   * @returns {{obj: *, result: *}}
   */
  function createObjFromUrlParamsForExistingForPost(obj, persistentUrlObj, queryParams, payload) {
    var nestedProperty = buildNestedPropertyArrayParams(persistentUrlObj, queryParams);
    var result = obj;
    if (Array.isArray(nestedProperty) && nestedProperty.length > 0) {
      result = $utils.setNestedProperty2(obj, nestedProperty, payload);
    } else {
      _.extendOwn(obj, payload);
    }
    return {
      obj: obj,
      result: result
    };
  }

  /**
   * In case of given DB object but we have URL with sub parameters, we have to check if those nested obj exist,
   * and create them if not and add the payload inside.
   *
   * @param obj - object form the offline DB
   * @param queryParams - URL parameters, usually what is returned from $utils.extractKeyValuesFromUrl2
   * @param payload - from the REST API call
   * @return {{obj: *, result: *}}
   * @param persistentUrlObj
   */
  function createObjFromUrlParamsForGETAction(obj, persistentUrlObj, queryParams, payload) {
    // NOTICE: since this is a get action we don't have to build the sub property
    var nestedProperty = buildNestedPropertyArrayParams(persistentUrlObj, queryParams, false);
    var result = obj;
    if (Array.isArray(nestedProperty) && nestedProperty.length > 0) {
      result = $utils.setNestedProperty2(obj, nestedProperty, payload);
    }
    return {
      obj: obj,
      result: result
    };
  }

  /**
   * Try to find that nested object when offline or when no payload in GET
   * @param obj
   * @param persistentUrlObj
   * @param queryParams
   * @returns {*}
   */
  function getNestedPropertyFromUrlParamsForExisting(obj, persistentUrlObj, queryParams) {
    // build the nested property array to use to search for the object
    var nestedProperty = buildNestedPropertyArrayParams(persistentUrlObj, queryParams, false);

    // do only if nested property search required
    if (Array.isArray(nestedProperty) && nestedProperty.length > 0) {
      return $utils.getNestedProperty(obj, nestedProperty);
    }

    return obj;
  }

  var markObjAsOfflineIfForced = function (obj, force) {
    // only if force positive
    if (force) {
      if (isOfflinePersistObj(obj)) {
        delete obj.meta['offline-persist'];
      }

      return obj;
    }

    // since we updated that object make sure that is not going to be overridden
    if ('meta' in obj) {
      obj.meta['offline-persist'] = true;
      return obj;
    }

    obj['meta'] = {};
    obj.meta['offline-persist'] = true;

    return obj;
  };

  /**
   * Use only if you have no new data, empty payload, and you want to return everything from the db,
   * depending on the GET URL
   *
   * TODO: should be extended to be able to query sub element!
   * @param response{url}
   * @returns {*}
   */
  var handleGet = function (response) {

    // check first the URL if defined for persistence!
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // no need to continue, if the URL was not configured!
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.get() given URI was not configured for persistence:' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // search and get!:)
    if (!_.isEmpty(keyValueObj)) {
      var result = collection.findOne(keyValueObj);

      // deep search in the object!
      if (result) {
        return _.cleanObject(getNestedPropertyFromUrlParamsForExisting(result, isPersistentUrl, queryParams));
      } else {
        // nothing inside, sorry!
        return null;
      }
    } else {
      console.info('unable to build find query for given url and payload, return all from db');
      return buildOracleRESTResponse(_.cleanObjects(collection.find()));
    }
  };

  /**
   * Response property
   * @typedef persistenceRequestHandler~Response
   * @property url {String}
   * @property data {Object}
   */


  /**
   * Stores/merges given payload into the offline db!
   *
   * @param response {persistenceRequestHandler~Response}
   * @returns {*}
   */
  var handleGetStore = function (response) {

    // check first the URL if defined for persistence!
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // no need to continue, if the URL was not configured!
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.get() given URI was not configured for persistence:' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    if (!_.isEmpty(keyValueObj)) {

      var result = collection.findOne(keyValueObj);

      var newObj;
      // this means that we have element with that key, so we have to update it
      if (result) {
        // TODO: Address the possibility that some object could be marked as offline only!
        newObj = createObjFromUrlParamsForGETAction(result, isPersistentUrl, queryParams, payload);
        collection.update(newObj.obj);
      } else {
        newObj = createObjFromUrlParamsForGETAction(keyValueObj, isPersistentUrl, queryParams, payload);
        collection.insert(newObj.obj);
      }
      return newObj.result;
    } else {
      payload = response.data.items;
      // ok no key in the url but we have payload and it should be added somewhere
      // this also means that we are in the root path!
      if (_.isArray(payload) && !_.isFunction(payload) && !_.isEmpty(payload)) {
        // if it is array of objects in the payload, then make a intersection
        var items = handleGetRootArrayPayload(payload, isPersistentUrl, collection);
        // build oracle rest response
        return buildOracleRESTResponse(items);
      }
      // TODO: when is this case happen?
      // this is the situation where we have only object in the root path payload call NOT array!
      else if (_.isObject(payload) && !_.isArray(payload) && !_.isFunction(payload) && !_.isEmpty(payload)) {
        return handleGetRootObjectPayload(payload, isPersistentUrl, collection);
      } else {
        // don't know what to do:)
        console.error('Persistence.OracleRESTHandler.get() unknown or empty object passed for the operation');
        throw new Error('Persistence.OracleRESTHandler.get() -> unknown or empty object passed for the operation');
      }
    }
  };

  /**
   * Handle post array payload.
   *
   * @param payload
   * @param isPersistentUrl
   * @param collection
   * @param force
   * @returns {*}
   */
  var handlePostRootArrayPayload = function (payload, isPersistentUrl, collection, force) {
    var keyNameToCompare = (isPersistentUrl.uri.tokens.length > 1) ? isPersistentUrl.uri.tokens[1].name : null;

    // go now throw what it was in the collection
    // and see if we have match to the new payload
    payload.forEach(function (obj) {

      if (isLokiDbObj(obj)) {
        markObjAsOfflineIfForced(obj, force);
        collection.update(obj);
      }
      // check if the payload has id,
      else if (keyNameToCompare && obj.hasOwnProperty(keyNameToCompare)) {
        // try to find the element in the db, if there update, otherwise inside!
        var result = collection.findOne({keyNameToCompare: obj[keyNameToCompare]});
        if (result) {
          _.extendOwn(result, obj);
          markObjAsOfflineIfForced(result, force);
          collection.update(result);
        }
        else {
          // insert
          markObjAsOfflineIfForced(obj, force);
          collection.insert(obj);
        }
      }
      else {
        // if we don't have anything in the collection to compare
        var objInsertResult = collection.insert(obj);
        objInsertResult[keyNameToCompare] = buildUniqueIDValue(isPersistentUrl); //objInsertResult.$loki + "";
        markObjAsOfflineIfForced(objInsertResult, force);
        return _.cleanObject(collection.update(objInsertResult));
      }

    });

    // on the end return the new collection
    return _.cleanObjects(collection.find());
  };

  /**
   * Handle post create object from only simple json object
   * @param payload
   * @param isPersistentUrl
   * @param collection
   * @param force
   * @returns {*}
   */
  var handlePostRootObjectPayload = function (payload, isPersistentUrl, collection, force) {
    // well check first again if we have key specified in the $options
    var keyNameToCompare = (isPersistentUrl.uri.tokens.length > 1) ? isPersistentUrl.uri.tokens[1].name : "";

    // check if the object has the same key
    if (keyNameToCompare && !payload.hasOwnProperty(keyNameToCompare)) {
      console.info('get payload', "does not have the key specified in the URL settings");
      // if not then we have to create one empty
      payload[keyNameToCompare] = "";

      // no need to query the db for this element
      // well this is completely new element and we should mark it as offline
      var insertResult = collection.insert(payload);
      if (insertResult) {
        insertResult[keyNameToCompare] = buildUniqueIDValue(isPersistentUrl)//insertResult.$loki + "";
        // this flag means that we created this directly in the offline db
        markObjAsOfflineIfForced(insertResult, force);
        return _.cleanObject(collection.update(insertResult));
      }

      // else we have an issue here
      throw new Error('unable to store the payload object');
    }

    // ok this is the situation, where the key actually exist in the payload
    // let see if there is object with the same id
    if (keyNameToCompare && payload.hasOwnProperty(keyNameToCompare)) {
      // make sure that the payload
      var queryForObject = {};
      queryForObject[keyNameToCompare] = payload[keyNameToCompare];
      //var result = collection.findOne({keyNameToCompare: payload[keyNameToCompare]});
      var result = collection.findOne(queryForObject);

      // this means that we have element with that key, so we have to update it
      if (result) {
        // merge properties!
        _.extendOwn(result, payload);
        markObjAsOfflineIfForced(result, force);
        return _.cleanObject(collection.update(result));
      }

      // ok so if the above did not work, maybe there is a problem with the key string/int
      var rebuildKeyValue = buildUniqueIDValue(isPersistentUrl, payload[keyNameToCompare]);
      payload[keyNameToCompare] = rebuildKeyValue;
    }

    // if no key was specified in the URL option settings, we have no another option
    markObjAsOfflineIfForced(payload, force);
    return _.cleanObject(collection.insert(payload));
  };

  /**
   * Handle Post HTTP request!
   *
   * @param response {persistenceRequestHandler~Response}
   * @param force - it means that the meta['offline-persist'] property will be deleted to force update on next GET
   * @returns {*}
   */
  var handlePost = function (response, force) {
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // check if URL can be persist
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // if not empty we can search
    if (!_.isEmpty(keyValueObj)) {

      // find parent object
      var result = collection.findOne(keyValueObj);

      // ok post used URL with key, so we have to create sub element here
      if (result) {
        var newObj = createObjFromUrlParamsForExistingForPost(result, isPersistentUrl, queryParams, payload);
        var propertyName = isPersistentUrl.uri.tokens[isPersistentUrl.uri.tokens.length - 1].name;
        newObj.result[propertyName] = buildUniqueIDValue(isPersistentUrl, newObj.result[propertyName]);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.update(newObj.obj);
        return _.cleanObject(newObj.result);
      }
      else {
        var newObj = createObjFromUrlParamsForExistingForPost(keyValueObj, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.insert(newObj.obj);
        return _.cleanObject(newObj.result);
      }
    }
    // this situation will happen when we have ROOT path call, with no KEY specified
    // ok no key in the url but we have payload and it should be added somewhere
    // this also means that we are in the root!
    if (_.isArray(payload)) {
      return handlePostRootArrayPayload(payload, isPersistentUrl, collection, force);
    }
    // just object payload
    else if (_.isObject(payload) && !_.isArray(payload) && !_.isNull(payload)) {
      return handlePostRootObjectPayload(payload, isPersistentUrl, collection, force);
    }
    // dont' know what to do! :)!
    throw new Error("don't know what to do with the payload");
  };

  /**
   * Works like HTTP post
   * https://gist.github.com/wookiehangover/877067
   *
   * @param response
   * @param force
   * @returns {*}
   */
  var handlePut = function (response, force) {
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // check if URL can be persist
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // if we have attributed than the first one should be key we look for!
    if (!_.isEmpty(keyValueObj)) {

      var result = collection.findOne(keyValueObj);

      // this means that we have element with that key, so we have to update it
      if (result) {
        var newObj = createObjFromUrlParamsForExistingForPost(result, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.update(newObj.obj);
        return newObj.result;
      }
      else {
        var newObj = createObjFromUrlParamsForExistingForPost(keyValueObj, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.insert(newObj.obj);
        return newObj.result;
      }
    }

    // ok following is in the case that you call PUT on root with parameters!
    // makes PUT to work like POST!
    if (_.isArray(payload)) {
      return handlePostRootArrayPayload(payload, isPersistentUrl, collection, force);
    }

    // just object payload
    else if (_.isObject(payload) && !_.isArray(payload) && !_.isNull(payload)) {
      return handlePostRootObjectPayload(payload, isPersistentUrl, collection, force);
    }

    // dont' know:)!
    //throw new Error('unable to recognise the edit payload, it should be JSON Object or Array!');
    throw new Error('no key specified to recognise obj in the database for editing!');
  };

  /**
   * Works like HTTP post
   * https://gist.github.com/wookiehangover/877067
   *
   * @param response
   * @param force
   * @returns {*}
   */
  var handlePatch = function (response, force) {
    var parsed = $options.parseURL(response.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // check if URL can be persist
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
    }

    // get the parameters form the REST URL used to call the backend!
    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);

    // get the collection for the given url
    var collection = $db.getCollectionByName(queryParams.root);

    // cache in between for easy access
    var payload = response.data;

    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // if we have attributed than the first one should be key we look for!
    if (!_.isEmpty(keyValueObj)) {

      var result = collection.findOne(keyValueObj);

      // this means that we have element with that key, so we have to update it
      if (result) {
        var newObj = createObjFromUrlParamsForExistingForPost(result, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.update(newObj.obj);
        return newObj.result;
      }
      else {
        var newObj = createObjFromUrlParamsForExistingForPost(keyValueObj, isPersistentUrl, queryParams, payload);
        markObjAsOfflineIfForced(newObj.obj, force);
        collection.insert(newObj.obj);
        return newObj.result;
      }
    }

    // ok following is in the case that you call PUT on root with parameters!
    // makes PUT to work like POST!
    if (_.isArray(payload)) {
      return handlePostRootArrayPayload(payload, isPersistentUrl, collection, force);
    }

    // just object payload
    else if (_.isObject(payload) && !_.isArray(payload) && !_.isNull(payload)) {
      return handlePostRootObjectPayload(payload, isPersistentUrl, collection, force);
    }

    // dont' know:)!
    //throw new Error('unable to recognise the edit payload, it should be JSON Object or Array!');
    throw new Error('no key specified to recognise obj in the database for editing!');
  };

  /**
   * Delete specific element from the offline db
   *
   * @param request
   * @returns {*}
   */
  var handleDelete = function (request) {
    var parsed = $options.parseURL(request.url);
    var isPersistentUrl = $utils.isPersistUrl(parsed.path);

    // check if URL can be persist
    if (!isPersistentUrl) {
      throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
    }

    var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);
    var collection = $db.getCollectionByName(queryParams.root);
    var keyValueObj = buildFindQueryBasedOnUrlParams(queryParams);

    // if we have attributed in the request URL specified!!!
    if (!_.isEmpty(keyValueObj)) {
      var findOne = collection.findOne(keyValueObj);
      if (findOne) {
        return _.cleanObject(collection.remove(findOne));
      }
      throw new Error('unable to find object with the given ID(%s) in the database', keyValueObj);
    }

    // OK maybe the ID is in the payload!
    // NOTE: It is not good practice to have the ID in the payload, but it is possible!
    if (request.hasOwnProperty('data')) {
      var payload = request.data;
      if (!_.isEmpty(payload) && _.isObject(payload) && !_.isArray(payload)) {

        var keyNameToCompare = (isPersistentUrl.uri.tokens.length > 1) ? isPersistentUrl.uri.tokens[1].name : null;

        // check if the object has the same key
        if (keyNameToCompare && !request.data.hasOwnProperty(keyNameToCompare)) {
          throw new Error('payload does not have the key required to delete the object');
        }

        var findOne = collection.findOne({keyNameToCompare: request.data[keyNameToCompare]});
        if (findOne) {
          return _.cleanObject(collection.remove(findOne));
        }
      }
    }

    console.error('payload does not have the key required to delete the object in the payload');
    throw new Error('payload does not have the key required to delete the object in the payload');
  };

  // TODO: Yuri - move to helper or create base class, every handler will ahve such method
  function flush(path) {
    console.info('Persistence.RequestHandler.flush()', path);
    // if no path delete everything
    if (_.isEmpty(path)) {
      return $db.flush();
    }
    else {
      var parsed = $options.parseURL(path);
      var isPersistentUrl = $utils.isPersistUrl(parsed.path);

      return new Promise(function (resolve, reject) {
        // check if URL can be persist
        if (!isPersistentUrl) {
          reject(new Error('Persistence.RequestHandler.flush() given URI not configured for persistence: ' + parsed.path));
        } else {
          var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);
          resolve($db.getCollectionByName(queryParams.root).removeDataOnly());
        }
      });
    }
  }

  // public methods!
  this.getDB = function () {
    return $db;
  };
  this.get = function (request) {
    var doGet = function (request) {
      console.info('Persistence.RequestHandler.get()');

      isPersistentGetRequest(request);

      // copy the object to make sure that we don't work with the reference anymore!
      var _request = _.clone(request);

      if (!_request.hasOwnProperty('data') || _.isEmpty(_request.data)) {
        return _.clone(handleGet(_request));
      }

      return _.clone(handleGetStore(_request));
    };
    // return all as a promise
    return new Promise(function (resolve) {
      resolve(doGet(request));
    });
  };
  // actually this is the same as get but only for specific element
  this.post = function (request, force) {
    var doPost = function (request, force) {
      console.info('Persistence.RequestHandler.post()');

      isPostRequest(request);

      // always clone before do some work with the object,
      // it takes some time but saves a lot of trouble!
      var _request = _.clone(request);

      //return handlePost(_request, force);
      return _.clone(handlePost(_request, force));
    };

    // promise
    return new Promise(function (resolve) {
      resolve(doPost(request, force));
    });
  };
  this.put = function (request, force) {
    var doPut = function (request, force) {
      console.info('Persistence.RequestHandler.put()');

      isPostRequest(request);

      // always clone the object before do some work
      var _request = _.clone(request);
      return _.clone(handlePut(_request, force));
    };

    // promise
    //return Promise.resolve(doPut(request, force));
    return new Promise(function (resolve) {
      resolve(doPut(request, force));
    });
  };
  this.patch = function (request, force) {
    var doPatch = function (request, force) {
      console.info('Persistence.RequestHandler.patch()');

      isPostRequest(request);

      // always clone the object before do some work
      var _request = _.clone(request);
      return _.clone(handlePatch(_request, force));
    };

    // promise
    //return Promise.resolve(doPut(request, force));
    return new Promise(function (resolve) {
      resolve(doPatch(request, force));
    });
  };
  this.delete = function (request) {
    function doDelete(request) {
      console.info('Persistence.RequestHandler.delete()');

      isPersistentRequest(request);

      // always clone the object before do some work
      var _request = _.clone(request);

      return _.clone(handleDelete(_request));
    }

    // promise
    //return Promise.resolve(doDelete(request));
    return new Promise(function (resolve) {
      resolve(doDelete(request));
    });
  };
  // provide the url and you will get the collection for it, as result from promise!
  this.data = function (path) {
    function doData(path) {
      console.info('Persistence.RequestHandler.data()');

      if (path == null) {
        throw new Error('Path cannot be empty!');
      }

      var parsed = $options.parseURL(path);
      var isPersistentUrl = $utils.isPersistUrl(parsed.path);

      // check if URL can be persist
      if (!isPersistentUrl) {
        throw new Error('Persistence.RequestHandler.post() given URI not configured for persistence: ' + parsed.path);
      }

      var queryParams = $utils.extractKeyValuesFromUrl2(isPersistentUrl);
      return $db.getCollectionByName(queryParams.root);
    }

    // promise
    //return Promise.resolve(doData(path));
    return new Promise(function (resolve) {
      resolve(doData(path));
    });
  };

  this.router = function (request, force) {
    var self = this;

    return new Promise(function (resolve) {
      //resolve(doRouting(request, force));
      if (!isPersistentGetRequest(request)) {
        console.error('Passed object is not defined request for GET!', request.url);
        throw new Error('Passed object is not defined request for GET!');
      }

      // check if method provided!
      if (!request.hasOwnProperty('method')) {
        console.error('request.method was not provided!', request);
        throw new Error('request.method was not provided!');
      }

      // copy the object to make sure that we don't work with the reference anymore!
      var _request = _.clone(request);

      // do routing!
      // if (_request.method === 'GET') {
      //     if (!_request.hasOwnProperty('data') || _.isEmpty(_request.data)) {
      //         var result = handleGet(_request)
      //         return clone(result);
      //     }
      //     var result = handleGetStore(_request);
      //     return clone(result);
      // }

      // exec the router specified
      _request.method = $utils.normalizeMethod(_request.method);
      if (!self[_request.method]) {
        console.error('specified router is not implemented!');
        throw new Error('specified router is not implemented!');
      }

      // exec the method
      var result = self[_request.method](_request, force);
      resolve(result);
    });
  };
  // provide path and you delete everything from the collection
  this.flush = flush;
  this.getModuleName = function () {
    return 'MCS';
  };

  // private methods
  this._createObjFromUrlParamsForExistingForPost = createObjFromUrlParamsForExistingForPost;
  this._buildNestedPropertyAddString = buildNestedPropertyArrayParams;
  this._buildNestedPropertySearchString = buildNestedPropertySearchString;
  this._createObjFromUrlParamsForExisting = createObjFromUrlParamsForGETAction;
}

/**
 * Persistence handler to triggers events when XHR Request ID finished! The interesting part here is that
 * the events are created anonym for the client using the this API.
 *
 * NOTE: Support IE9+
 * @type {{addListener, removeListener, getListener, dispatchEvent, removeAllListeners, getAllEvents, runClearDeamon, toString}}
 */
function persistenceHandler() {
  'use strict';
  var i = 0, listeners = {};
  var ttl = 30000;//30sec //1000 * 60; // all in ms
  var ttlInterval = 100 * 60 * 20; // in ms - each 2mins
  var daemon = null;

  /**
   * Add internal anonym listener
   *
   * @param event
   * @param handler
   * @param capture
   * @returns {*}
   */
  var addInternListener = function (event, handler, capture) {
    // clean unused events!
    cleanEventsJob();

    if (event == null) {
      throw new Error('event name cannot be null or undefined');
    }

    if (handler == null || typeof handler !== 'function') {
      throw new Error('event handler cannot be null or undefined function');
    }

    var element = window;

    if (capture != null || typeof capture === 'boolean') {
      element.addEventListener(event, handler, capture);
    }
    else {
      element.addEventListener(event, handler);
    }

    listeners[event] = {
      event: event,
      element: element,
      handler: handler,
      capture: capture,
      timestamp: new Date().getTime()
    };

    return listeners[event];
  };

  var removeInternListener = function (name) {

    // fix - much than it was before!
    if (name != null) {
      if (listeners.hasOwnProperty(name)) {
        // you have to make sure that you have the same handler!
        listeners[name].element.removeEventListener(listeners[name].event, listeners[name].handler, listeners[name].capture);
        delete listeners[name];
      }
    }
  };

  var removeAllListeners = function () {
    // iterate through all events and remove it
    for (var name in listeners) {
      if (listeners.hasOwnProperty(name)) {
        if (typeof listeners[name] === 'object') {
          listeners[name].element.removeEventListener(listeners[name].event, listeners[name].handler, listeners[name].capture);
          delete listeners[name];
        }
      }
    }
  };

  var showAll = function () {
    for (var name in listeners) {
      if (listeners.hasOwnProperty(name)) {
        console.log('event details: ', listeners[name]);
      }
    }
  };

  var getInternAllEvents = function () {
    return listeners;
  };

  var getInternListener = function (name) {
    if (listeners.hasOwnProperty(name)) {
      if (typeof listeners[name] === 'object') {
        return listeners[name];
      }
    }
  };

  /**
   * Dispatch custom event, if registered and remove it from the listeners! IE9+
   *
   * Reference: http://stackoverflow.com/questions/5660131/how-to-removeeventlistener-that-is-addeventlistener-with-anonymous-function
   *
   * @param status - http status code, like 200,300 so on
   * @param statusText - the http status text, like 'OK'
   * @param payload - the payload
   * @param requestID - internal request id
   */
  var dispatchInternEvent = function (status, statusText, payload, requestID) {

    // works on IE9+ browsers
    if (!window.CustomEvent) {
      return;
    }

    // if such an event was not registered, does not need the overheader
    if (!listeners.hasOwnProperty(requestID) && !typeof listeners[requestID] !== 'object') {
      return;
    }

    // creates the custom event!
    var anonymEvent = new CustomEvent(
      requestID, {
        detail: {
          status: status,
          statusText: statusText,
          data: payload,
          requestid: requestID,
          time: new Date().getTime()
        },
        bubbles: true,
        cancelable: true
      });

    // async
    setTimeout(function () {
      // dispatch event could throw exception!
      // reference: https://developer.mozilla.org/de/docs/Web/API/EventTarget/dispatchEvent
      try {
        // fire
        var cancelled = window.dispatchEvent(anonymEvent);
      }
      catch (e) {
        console.error(e);
      }
      finally {
        // ... and remove
        // this will make sure that no memory leaks will happen, the object will be remove from the GC
        setTimeout(function () {
          //if (cancelled) {
          removeInternListener(requestID);
          //}
        }, 0);
      }
    }, 0);
  };

  /**
   * Periodically remove unused events after specified TTL (Time to Leave)!
   */
  var cleanEventsJob = function () {
    //console.debug('clean events daemon');
    var age = ttl;
    var now = Date.now();
    var registeredEvents = getInternAllEvents();

    for (var eventName in registeredEvents) {
      if (registeredEvents.hasOwnProperty(eventName)) {
        var diff = now - listeners[eventName].timestamp;
        if (age < diff) {
          // remove it here
          removeInternListener(eventName);
        }
      }
    }
  };

  /**
   * This will set and start the demo, or stop if if age < 0
   *
   * @param age - the max leave age, or if 0 stop the deamon
   * @param interval - the interval on which to run the deamon
   */
  var setTTL = function (age, interval) {
    if (age < 0) {
      if (daemon != null) {
        clearInterval(daemon);
      }
    }
    else if (age == 0) {
      // run once
      cleanEventsJob();
    }
    else {
      ttl = age || ttl;
      ttlInterval = interval || ttlInterval;
      daemon = setInterval(cleanEventsJob, ttlInterval);
    }
  };

  return {
    addListener: addInternListener,
    removeListener: removeInternListener,
    getListener: getInternListener,
    dispatchEvent: dispatchInternEvent,
    removeAllListeners: removeAllListeners,
    getAllEvents: getInternAllEvents,
    runClearDeamon: setTTL,
    toString: showAll
  };
}

/**
 * Usage example:
 *
 *

 Persistence.Events.$on('success', function(args) {
      console.log('on success event emited', args);
    });

 Persistence.Events.$on('error', function(args) {
      console.log('on error event emited', args);
    });

 Persistence.Events.$on('timeout', function(args) {
      console.log('on timeout event emitted', args);
    });

 Persistence.Events.$on('timeout', function(args) {
      console.log('on timeout event emitted again', args);
    });

 setTimeout(function(){
      Persistence.Events.$emit('success', {name: 'Lyudmil'});
      Persistence.Events.$emit('error', {status: 500, error: 'this is error message'});
      Persistence.Events.$emit('timeout', {msg: 'this is timeout error'});

      Persistence.Events.$flush('success');
      Persistence.Events.$emit('success', {name: 'Lyudmil'});
    },3000);

 *
 * @type {{}}
 */
function persistenceEvents() {
  var observers = {
    "success": [],
    "error": [],
    "timeout": []
  };

  return {
    $on: function (name, observer) {
      if (name !== null && typeof name === 'string') {
        if (observers.hasOwnProperty(name)) {
          if (typeof observer === 'function') {
            observers[name].push(observer);
          }
        }
      }
    },
    $emit: function (name, obj) {
      if (name !== null && typeof name === 'string') {
        if (observers.hasOwnProperty(name)) {
          if (obj !== null) {
            for (var i = 0; i < observers[name].length; i++) {
              // fire event
              observers[name][i](obj);
            }
          }
        }
      }
    },
    $flush: function (name) {
      if (name !== null && typeof name === 'string') {
        if (observers.hasOwnProperty(name)) {
          //for(var i = 0; i < observers[name].length; i++){
          for (var i = observers[name].length - 1; i >= 0; i--) {
            // remove the event
            observers[name].splice(0, 1);
          }
        }
      }
    },
    $show: function (name) {
      throw new Error('not implemented');
    }
  };
}

/**
 * Global event emitter handler, usually used only for internal modules process work!
 * NOTE: This class is equal to singleton it will exist only once!
 */
function persistenceEventsEmitter() {
  /**
   * Events property is a hashmap, with each property being an array of callbacks!
   * @type {{}}
   */
  var events = {};

  /**
   * boolean determines whether or not the callbacks associated with each event should be
   * proceeded async, default is false!
   *
   * @type {boolean}
   */
  var asyncListeners = false;

  return {
    /**
     * Adds a listener to the queue of callbacks associated to an event
     *
     * @param eventName - the name of the event to associate
     * @param listener - the actual implementation
     * @returns {*} - returns the ID of the lister to be use to remove it later
     */
    on: function (eventName, listener) {
      var event = events[eventName];
      if (!event) {
        event = events[eventName] = [];
      }
      event.push(listener);
      return listener;
    },
    /**
     * Fires event if specific event was registered, with the option of passing parameters which are going to be processed by the callback
     * (i.e. if passing emit(event, arg0, arg1) the listener should take two parameters)
     *
     * @param eventName
     * @param data - optional object passed to the event!
     */
    emit: function (eventName, data) {
      if (eventName && events[eventName]) {
        events[eventName].forEach(function (listener) {
          if (asyncListeners) {
            setTimeout(function () {
              listener(data);
            }, 1);
          } else {
            listener(data);
          }

        });
      }
      // if event is not registered
      else {
        throw new Error('No event ' + eventName + ' defined');
      }
    },
    /**
     * Remove listeners
     *
     * @param eventName
     * @param listener
     */
    removeListener: function (eventName, listener) {
      if (events[eventName]) {
        var listeners = events[eventName];
        listeners.splice(listeners.indexOf(listener), 1);
      }
    }
  }
}

/**
 * Global event emitter for all persistence class, it can be inherited only via NEW, which will make
 * sure that specific instance exist only for the module initiating it!
 *
 * @constructor
 */
function PersistenceEventEmitter() {
}

/**
 * Stores all registered listeners! It could be overridden if the object prototype this class!
 * @type {{}}
 */
PersistenceEventEmitter.prototype.events = {};

/**
 * If listener should be executed async, default false
 */
PersistenceEventEmitter.prototype.asyncListeners = false;

/**
 * Register listener!
 *
 * @param eventName - name
 * @param listener - actual call back implementation
 * @returns {*} - returns the ID of the listener to be used to remove the listener later!
 */
PersistenceEventEmitter.prototype.on = function (eventName, listener) {
  var event = this.events[eventName];
  if (!event) {
    event = this.events[eventName] = [];
  }
  event.push(listener);
  return listener;
};

/**
 * Fires the events to already registered listeners!
 *
 * @param eventName - the name of the registered listener
 * @param data - optional to pass data to the registered listener!
 */
PersistenceEventEmitter.prototype.emit = function (eventName, data) {
  var self = this;
  if (eventName && this.events[eventName]) {
    this.events[eventName].forEach(function (listener) {
      if (self.asyncListeners) {
        setTimeout(function () {
          listener(data);
        }, 1);
      } else {
        listener(data);
      }

    });
  }
  else {
    throw new Error('No event ' + eventName + ' defined');
  }
};

/**
 * Remove already registered listener!
 *
 * @param eventName
 * @param listener
 */
PersistenceEventEmitter.prototype.removeListener = function (eventName, listener) {
  if (this.events[eventName]) {
    var listeners = this.events[eventName];
    listeners.splice(listeners.indexOf(listener), 1);
  }
};

/**
 * This module provides the sync capabilities of the persistence library. It makes sure that POST, PUT, and DELETE
 * operations will be merged. This module is equal as singleton, it will be init only once even used in several locations
 *
 * @type {{getHistory, get, post, put, delete, sync, forceSync, removeSync, flush, clear}}
 * @return {{getDB: Persistence.Sync.getDB, getHistory: Persistence.Sync.getHistory, get: Persistence.Sync.get, post: Persistence.Sync.post, put: Persistence.Sync.put, delete: Persistence.Sync.delete, router: Persistence.Sync.router, sync: handleSync, run: syncWithoutWorker, forceSync: Persistence.Sync.forceSync, operations: {run, stop, status, reset}, removeSync: Persistence.Sync.removeSync, flush: deleteAll, clear: Persistence.Sync.clear, events: internEventEmitter, isSyncRunning: statusSyncTransaction}}
 */
function persistenceSync($events, $common, $options, $utils, $handler) {
  'use strict';
  // private declarations
  var _syncRuns = false,
    _syncObj = null,
    _isDBTransaction = false,
    _defaultDBDelay = 2000, //2secs because ajax operations could take some time!
    _syncLogDirty = false, // in case db operations during the sync operation
    _ = $common; // replace underscore with own implementation

  /**
   * Init the DB
   * @type {{getDB, getCollection, getCollectionByName, getCollections, save, close, flush}}
   * @private
   */
    //var $db = Persistence.DB('persist.sync');
  var dbname = 'sync';
  var prefix = $options.dbPrefix;
  // to ready/write data to specific collections
  var $db = persistenceDB(prefix + '.' + dbname, $options);

  // in case the db prefix has changed, re-init the db!
  $options.onDbPrefixChange = function (oldVal, newVal) {
    $db = persistenceDB(newVal + '.' + dbname, $options);
  };

  /**
   * Internal events, which could be user from outside!
   * @type {{changes: Array, warning: Array}}
   */
  function internEventEmitter() {
    this.events = {
      'pre-put': [],
      'pre-patch': [],
      'pre-post': [],
      'pre-get': [],
      'pre-delete': [],
      'pre-sync': [],
      'post-sync': [],
      'error-sync': [],
      'end-sync': []
    }
  }

  // inherit the event emitter with the default pre-defined events
  internEventEmitter.prototype = new PersistenceEventEmitter();
  var _moduleEventEmitter = new internEventEmitter();

  /**
   * Get collection reference from the sync log.
   *
   * @param collection
   * @returns {*}
   */
  function getSyncLog(collection) {
    return $db.getCollectionByName(collection);
  }

  /**
   * Marks when db operation starts
   */
  function startDBTransaction() {
    return _isDBTransaction = true;
  }

  /**
   * Finish the db operation
   */
  function commitDBTransaction(isError) {
    if (!isError)_syncLogDirty = true;
    return _isDBTransaction = false;
  }

  /**
   * Check if there is DB transaction status!
   * @returns {boolean}
   */
  function isDBTransaction() {
    return _isDBTransaction;
  }

  var _dbTransactionLockCounter = 0;

  /**
   * Lock function, which will stop execution and repeat operation until db operation is released!
   *
   * @returns {number} - 1: when the lock is released, -1 if more then 10 times the lock was not released, 1 - if released
   * @type {number}
   */
  function checkAndWaitUntilDbTransactionFinish() {
    _dbTransactionLockCounter++;
    if (isDBTransaction() === true) {
      if (_dbTransactionLockCounter > 10) {
        _dbTransactionLockCounter = 0; // reset the lock but return false, which means the DB operation did not return completion
        return -1; // this means we tries 10times and lock was not releases
      }
      return 0; // this pending
    }
    else {
      // release the lock!
      _dbTransactionLockCounter = 0;
      return 1;
    }
  }

  /**
   * Check if the given object is suitable for the sync log.
   *
   * @param options
   * @returns {boolean}
   */
  var isSyncRequest = function (options) {
    if (_.isEmpty(options)) {
      throw new Error('sync options is empty object, cannot be synced!');
    }

    if (!options.hasOwnProperty('url')) {
      throw new Error('options.url was not specified!');
    }
    else {
      if (_.isEmpty(options.url)) {
        throw new Error('options.url cannot be empty!');
      }
    }

    if (!options.hasOwnProperty('headers')) {
      throw new Error('options.headers were not specified!');
    } else {
      if (!_.isObject(options.headers)) {
        throw new Error('options.headers is not a objects!');
      }
    }

    if (!options.hasOwnProperty('data')) {
      throw new Error('options.data was not specified!');
    } else {
      if (_.isEmpty(options.data)) {
        throw new Error('options.data cannot be empty object!');
      }

      if (!_.isObject(options.data)) {
        throw new Error('options.data is not a object!');
      }
    }

    return true;
  };

  /**
   * Check if the provided request is suitable to be used as delete sync request. The major difference here,
   * that we do not check for data in the payload, as this is not required for the delete call!
   *
   * @param options
   * @returns {boolean}
   */
  var isDeleteSyncRequest = function (options) {
    if (_.isEmpty(options)) {
      throw new Error('sync options is empty object, cannot be synced!');
    }

    if (!options.hasOwnProperty('url')) {
      throw new Error('options.url was not specified!');
    }
    else {
      if (_.isEmpty(options.url)) {
        throw new Error('options.url cannot be empty!');
      }
    }

    if (!options.hasOwnProperty('headers')) {
      throw new Error('options.headers were not specified!');
    } else {
      if (!_.isObject(options.headers)) {
        throw new Error('options.headers is not a objects!');
      }
    }

    return true;
  };

  /**
   * buildDBObjectFindQuery result
   * @callback Persistence.Sync~buildDBObjectFindQueryReturn
   * @param dbquery {String}.
   * @param url {String}.
   * @param queryUrl {String}.
   */

  /**
   * Internal function only! Builds the query based on URL or Payload data, or if non of them provided based on
   * the internal db key.
   *
   * @param requestOptions - make sure that you check the object if correct before pass it here!
   * @returns {Persistence.Sync~buildDBObjectFindQueryReturn}
   * @deprecated - this should be inside the parsing payload module!
   */
  var buildDBObjectFindQuery = function (requestOptions) {
    // parse the root
    var url = isURLConfiguredForPersistence(requestOptions.url, true);

    var dbQuery = {};

    // the key in the URL has always higher priority!
    //if (query.attr.length > 0) {
    if (!_.isEmpty(url.params) && $options.Module.getModuleName() !== 'MCS') {
      //var key = 'data.' + query.attr[0].name;
      // returns the name of the FIRST key!
      var key = 'data.' + url.params[0].name //Object.keys(url.params)[0];
      //var value = (query.attr[0].pattern.indexOf('\d') >= 0) ? parseInt(query.attr[0].value) : query.attr[0].value + "";
      // get the value of the key
      //var value = (url.tokens[0].pattern.indexOf('\d') >= 0) ? parseInt(url.params[Object.keys(url.params)[0]]) : url.params[Object.keys(url.params)[0]] + "";
      var value = (url.tokens[0].pattern.indexOf('\d') >= 0) ? parseInt(url.params[0].value, 10) : url.params[0].value + "";

      dbQuery[key] = {
        '$eq': value
      };
    }
    else if (url.tokens.length > 0 && $options.Module.getModuleName() !== 'MCS') {
      // check and get the key from the data payload
      // we can get the name of the key to compare
      var keyNameToCompare = url.tokens[0].name;
      if ('data' in requestOptions && keyNameToCompare in requestOptions.data) {
        var key = 'data.' + keyNameToCompare;
        dbQuery[key] = {
          '$eq': requestOptions.data[keyNameToCompare]
        };
      }
    }
    else if ('data' in requestOptions && '$loki' in requestOptions.data && typeof (requestOptions.data.$loki) === 'number' && !isNaN(requestOptions.data.$loki)) {
      var key = 'data.$loki';
      dbQuery[key] = {
        '$eq': requestOptions.data.$loki
      };
    }
    // otherwise try to use the internal db key
    // note correct we can have more then one collection with the same db key!
    else if ('$loki' in requestOptions && typeof (requestOptions.$loki) === 'number' && !isNaN(requestOptions.$loki)) {
      dbQuery = {
        '$loki': {
          '$eq': requestOptions.$loki
        }
      };
    }
    else {
      // sorry don't know what to do!
    }

    return {
      dbquery: dbQuery,
      url: url.path,
      queryUrl: url
    };
  }

  /**
   * Internal function checks if the given URL is configured for persistence and returns
   * the parsed objects from it.
   *
   * @param path
   * @param returnUrl - boolean, if true it will return the URL properties frm the regex config, otherwise will extract the url directly for you
   * @returns {*}
   */
  function isURLConfiguredForPersistence(path, returnUrl) {
    // check if this URL was configured for sync operations
    var persistentPath = $options.isPersistentUrl(path);

    if (persistentPath === false) {
      console.error('give url not configured for persistence', path);
      throw new Error('give url not configured for persistence:' + path);
    }

    // extract the root and get the collections data
    if (!returnUrl) {
      return persistentPath;
    }

    return persistentPath;
  }

  /**
   * Stores HTTP GET request in the sync log.
   *
   * NOTE: Get is always new entry in the DB, it doesn't matter if the sync runs or not!
   * @returns {*}
   * @param requestOptions
   */
  function handleGet(requestOptions) {
    if (_.isEmpty(requestOptions)) {
      throw new Error('sync options is empty object, cannot be synced!');
    }

    // we only need to check for URL here
    if (!requestOptions.hasOwnProperty('url')) {
      throw new Error('options.url was not specified!');
    }
    else {
      if (_.isEmpty(requestOptions.url)) {
        throw new Error('options.url cannot be empty!');
      }
    }

    if (!requestOptions.hasOwnProperty('headers')) {
      throw new Error('request headers were not specified!');
    }

    // we can work only with empty objects to execute GET's, so clean the get data if any
    if (!_.isEmpty(requestOptions.data)) {
      requestOptions.data = {};
    }

    requestOptions['method'] = "GET";
    _moduleEventEmitter.emit('pre-get', requestOptions);
    // TODO: check whey getSyncLog called without collection name
    return getSyncLog().insert(requestOptions);
  };

  /**
   * Create new object
   * NOTE: Each time you call POST, you will create new object! If you want to update object use PUT!
   * NOTE: This will always create new element, independent from the sync runs!
   *
   * @param requestOptions
   * @returns {*}
   */
  function handlePost(requestOptions) {

    // check first if it's sync request
    isSyncRequest(requestOptions);

    var query = isURLConfiguredForPersistence(requestOptions.url);

    // remove the $loki from the request, otherwise it will prevent to store it again!
    // NOTE: This could happen only if you work with the DB objects directly!
    if ('$loki' in requestOptions && typeof (requestOptions.$loki) === 'number' && !isNaN(requestOptions.$loki)) {
      delete requestOptions.$loki;
    }

    // store if the data object has id from the offline database
    //if ('$loki' in requestOptions.data && typeof (requestOptions.data.$loki) === 'number' && !isNaN(requestOptions.data.$loki)) {
    // override to make clear that this is POST method
    requestOptions['method'] = "POST";
    requestOptions['URI'] = query.root;

    // get the collection to be able to execute the operation
    _moduleEventEmitter.emit('pre-post', requestOptions);

    return getSyncLog().insert(requestOptions);
  }

  /**
   * Update existing object in the sync log!
   *
   * @param requestOptions
   */
  function handlePut(requestOptions) {
    isSyncRequest(requestOptions)

    var urlParsedObjects = buildDBObjectFindQuery(requestOptions);

    var _syncLog = getSyncLog(); // query.root

    _moduleEventEmitter.emit('pre-put', requestOptions);

    // no dbquery is empty, it means that we never had this put before
    if (_.isEmpty(urlParsedObjects.dbquery)) {
      // ok so if non of the above just save directly to the sync log, as long as the request
      // has URL and headers the sync will try to execute it against the backend server!
      requestOptions['method'] = 'PUT';
      requestOptions['URI'] = urlParsedObjects.queryUrl.root;

      return _syncLog.insert(requestOptions);
    }

    // parse the root
    //var query = isURLConfiguredForPersistence(requestOptions.url);

    // try to check first if there was a POST already for the same element!
    var _findInHistory = _syncLog.findOne({
      '$and': [
        urlParsedObjects.dbquery,
        {
          'method': 'POST'
        }, {
          'URI': urlParsedObjects.queryUrl.root
        }]
    });

    // if not null, then there is POST element, so update it!
    // but check first if this entry is in the process queue!
    // check to see if this post is already in execution, is yes, wait until exec ready and go
    // throw the process again!
    if (_findInHistory) {
      //ok check first now if this entry is on process!
      if (_syncObj && !_.isEmpty(_syncObj)) {
        if ('$loki' in _syncObj && _syncObj.$loki === _findInHistory.$loki) {
          // repeat then 2sec later
          setTimeout(function () {
            // repeat
            handlePut(requestOptions);
          }, _defaultDBDelay);
        }
      }

      // POST was found, then merge the data
      _.extendOwn(_findInHistory.data, requestOptions.data);
      _.extendOwn(_findInHistory.headers, requestOptions.headers);

      // zero the errors so that it could be executed again!
      _findInHistory.$errorcounter = 0;

      return _syncLog.update(_findInHistory);
    }

    // search for existing/previous PUT with the same ID
    _findInHistory = _syncLog.findOne({
      '$and': [
        urlParsedObjects.dbquery,
        {
          'method': 'PUT'
        }, {
          'URI': urlParsedObjects.queryUrl.root
        }]
    });

    // if found MERGE
    if (_findInHistory) {
      //ok check first now if this entry is on process!
      if (_syncObj && !_.isEmpty(_syncObj)) {
        if ('$loki' in _syncObj && _syncObj.$loki === _findInHistory.$loki) {
          // repeat then 2sec later
          setTimeout(function () {
            // repeat
            handlePut(requestOptions);
          }, _defaultDBDelay);
        }
      }

      _.extendOwn(_findInHistory, requestOptions);

      // zero the errors so that it could be executed again!
      _findInHistory.$errorcounter = 0;

      return _syncLog.update(_findInHistory);
    }

    // OK we had no POST and no PUT so insert the PUT
    // however store only if the data object has internal id from the DB
    //if ('$loki' in requestOptions && typeof (requestOptions.$loki) === 'number' && !isNaN(requestOptions.$loki)) {
    // insert as put
    requestOptions['method'] = 'PUT';
    requestOptions['URI'] = urlParsedObjects.queryUrl.root;

    return _syncLog.insert(requestOptions);
  }


  /**
   * Update existing object in the sync log!
   *
   * @param requestOptions
   */
  function handlePatch(requestOptions) {
    isSyncRequest(requestOptions);

    var urlParsedObjects = buildDBObjectFindQuery(requestOptions);

    var _syncLog = getSyncLog(); // query.root

    _moduleEventEmitter.emit('pre-patch', requestOptions);

    // no dbquery is empty, it means that we never had this put before
    if (_.isEmpty(urlParsedObjects.dbquery)) {
      // ok so if non of the above just save directly to the sync log, as long as the request
      // has URL and headers the sync will try to execute it against the backend server!
      requestOptions['method'] = 'PATCH';
      requestOptions['URI'] = urlParsedObjects.queryUrl.root;

      return _syncLog.insert(requestOptions);
    }

    // parse the root
    //var query = isURLConfiguredForPersistence(requestOptions.url);

    // try to check first if there was a POST already for the same element!
    var _findInHistory = _syncLog.findOne({
      '$and': [
        urlParsedObjects.dbquery,
        {
          'method': 'POST'
        }, {
          'URI': urlParsedObjects.queryUrl.root
        }]
    });

    // if not null, then there is POST element, so update it!
    // but check first if this entry is in the process queue!
    // check to see if this post is already in execution, is yes, wait until exec ready and go
    // throw the process again!
    if (_findInHistory) {
      //ok check first now if this entry is on process!
      if (_syncObj && !_.isEmpty(_syncObj)) {
        if ('$loki' in _syncObj && _syncObj.$loki === _findInHistory.$loki) {
          // repeat then 2sec later
          setTimeout(function () {
            // repeat
            handlePut(requestOptions);
          }, _defaultDBDelay);
        }
      }

      // POST was found, then merge the data
      _.extendOwn(_findInHistory.data, requestOptions.data);
      _.extendOwn(_findInHistory.headers, requestOptions.headers);

      // zero the errors so that it could be executed again!
      _findInHistory.$errorcounter = 0;

      return _syncLog.update(_findInHistory);
    }

    // search for existing/previous PATCH with the same ID
    _findInHistory = _syncLog.findOne({
      '$and': [
        urlParsedObjects.dbquery,
        {
          'method': 'PATCH'
        }, {
          'URI': urlParsedObjects.queryUrl.root
        }]
    });

    // if found MERGE
    if (_findInHistory) {
      //ok check first now if this entry is on process!
      if (_syncObj && !_.isEmpty(_syncObj)) {
        if ('$loki' in _syncObj && _syncObj.$loki === _findInHistory.$loki) {
          // repeat then 2sec later
          setTimeout(function () {
            // repeat
            handlePatch(requestOptions);
          }, _defaultDBDelay);
        }
      }

      _.extendOwn(_findInHistory, requestOptions);

      // zero the errors so that it could be executed again!
      _findInHistory.$errorcounter = 0;

      return _syncLog.update(_findInHistory);
    }

    // OK we had no POST and no PATCH so insert the PATCH
    // however store only if the data object has internal id from the DB
    //if ('$loki' in requestOptions && typeof (requestOptions.$loki) === 'number' && !isNaN(requestOptions.$loki)) {
    // insert as put
    requestOptions['method'] = 'PATCH';
    requestOptions['URI'] = urlParsedObjects.queryUrl.root;

    return _syncLog.insert(requestOptions);
  }


  /**
   * Delete object from the sync log
   * @param requestOptions
   */
  function handleDelete(requestOptions) {
    isDeleteSyncRequest(requestOptions)

    var urlParsedObjects = buildDBObjectFindQuery(requestOptions);

    _moduleEventEmitter.emit('pre-delete', requestOptions);

    var _syncLog = getSyncLog(); //query.root

    if (_.isEmpty(urlParsedObjects.dbquery)) {
      // ok so if non of the above just save directly to the sync log, as long as the request
      // has URL and headers the sync will try to execute it against the backend server!
      requestOptions['method'] = 'DELETE';
      requestOptions['URI'] = urlParsedObjects.queryUrl.root;

      return _syncLog.insert(requestOptions);
    }

    // find POST with the same ID
    var _findInHistory = _syncLog.findOne({
      '$and': [
        urlParsedObjects.dbquery,
        {
          'URI': urlParsedObjects.queryUrl.root
        },
        {
          'method': {
            '$eq': 'POST'
          }
        }]
    });

    // if not null, than there is POST element, remove it!
    if (_findInHistory) {
      //ok check first now if this entry is on process!
      if (_syncObj && !_.isEmpty(_syncObj)) {
        if ('$loki' in _syncObj && _syncObj.$loki === _findInHistory.$loki) {
          // repeat then 2sec later
          setTimeout(function () {
            // repeat
            handleDelete(requestOptions);
          }, _defaultDBDelay);
        }
      }

      // delete the object from the history table
      return _syncLog.remove(_findInHistory);
    }

    // OK check then if there was a PUT before!
    _findInHistory = _syncLog.findOne({
      '$and': [
        urlParsedObjects.dbquery,
        {
          'URI': urlParsedObjects.queryUrl.root
        },
        {
          'method': {
            '$eq': 'PUT'
          }
        }]
    });

    // if yes, remove the PUT and include the delete
    // this assumes the it always gonna be only one PUT, see handlePUT!
    if (_findInHistory) {
      //ok check first now if this entry is on process!
      if (_syncObj && !_.isEmpty(_syncObj)) {
        if ('$loki' in _syncObj && _syncObj.$loki === _findInHistory.$loki) {
          // repeat then 2sec later
          setTimeout(function () {
            // repeat
            handleDelete(requestOptions);
          }, _defaultDBDelay);
        }
      }

      // don't remove just update with the delete data, it will save operation
      _findInHistory['url'] = requestOptions['url'];
      _findInHistory['method'] = 'DELETE';
      _findInHistory['URI'] = urlParsedObjects.queryUrl.root;

      if ('data' in requestOptions) {
        _findInHistory['data'] = requestOptions['data'];
      }

      // zero the errors so that it could be executed again!
      _findInHistory.$errorcounter = 0;

      return _syncLog.update(_findInHistory);
    }

    // if non of the above is working store the delete request!
    requestOptions['method'] = 'DELETE';
    requestOptions['URI'] = urlParsedObjects.queryUrl.root;

    return _syncLog.insert(requestOptions);
  }

  /**
   * If sync operation for specific entry successful finished, remove the entry from the sync log table!
   *
   * @param request
   * @returns {*}
   */
  function removeSync(request) {

    if (_.isEmpty(request)) {
      throw new Error('removeSync(request) is empty cannot be removed from the sync log!');
    }

    if (!_.isObject(request)) {
      throw new Error('removeSync(request) is not a object!');
    }

    // we only need to check for URL here
    if (!request.hasOwnProperty('url')) {
      throw new Error('request.url was not specified!');
    }
    else {
      if (_.isEmpty(request.url)) {
        throw new Error('request.url cannot be empty!');
      }
    }

    if (!('$loki' in request && typeof (request.$loki) === 'number' && !isNaN(request.$loki))) {
      throw new Error('removeSync(request.$loki) does not exist to be able to be removed from the sync table!');
    }

    var _syncLogCollection = getSyncLog();
    var _findInSyncLog = _syncLogCollection.findOne({'$loki': request.$loki});

    // if exist
    if (_findInSyncLog) {
      // remove synced object!
      return _syncLogCollection.remove(_findInSyncLog);
    }

    // this doesn't necessarily means something bad, it could be that we had a POST and this entry was removed!
    //throw new Error('unable to find request with given id from the sync log to be removed');
    return;
  }

  /**
   * Custom XHR internal error message!
   *
   * @param message - error message
   * @param code - http code
   * @param response - payload response
   * @constructor
   */
  function XhrError(message, status, response, headers) {
    this.name = 'XhrError';
    this.message = message || 'Error during XHR2 execution';
    this.status = status || 0;
    this.response = response || '';
    this.headers = headers || {};
    this.stack = (new Error()).stack;
  }

  XhrError.prototype = Object.create(Error.prototype);
  XhrError.prototype.constructor = XhrError;

  /**
   * Uses XHR2 standard to execute ajax call to the backend server. In modern browser since IE9 all browsers
   * support XHR2, no polyfill required!
   *
   * @param method - http method, like POST, GET and son
   * @param url - to the backend server
   * @param headers - available headers
   * @param data
   * @param timeout
   * @returns {*}
   */
  function syncXhr2(method, url, headers, data, responseType, timeout) {
    // TODO: Check the provided variables!
    return new Promise(function (resolve, reject) {
      // first make sure that we don't use the interceptor!
      $options.oneOff();
      var xhr = new XMLHttpRequest();

      if ("withCredentials" in xhr) {
        xhr.withCredentials = true;
      }

      if(responseType){
        xhr.responseType = responseType;
      }

      xhr.open(method, url, true);

      for (var key in headers) {
        if (headers.hasOwnProperty(key)) {
          var obj = headers[key];
          xhr.setRequestHeader(key, obj);
        }
      }

      xhr.timeout = timeout || $options.timeout;
      xhr.ontimeout = function (e) {
        console.error('sync.xhr.ontimeout', e);

        $events.$emit('timeout', {
          event: e
        });

        reject(new TypeError('Timeout during XHR load'));
      };

      // http://docs.oracle.com/cloud/latest/mobilecs_gs/MCSUA/GUID-7C2A0D49-F898-4886-9A6A-4FF799F776F4.htm#MCSUA-GUID-1BF6EE73-A45B-4CE5-B390-3727F718FB92
      xhr.onload = function () {
        //console.log('sync.xhr.onload', xhr);
        //console.log('sync.xhr.headers', xhr.getAllResponseHeaders());
        // TODO: consider following link to adapt the the Oracle REST Error Codes!
        // todo: https://docs.oracle.com/cloud/latest/mobilecs_gs/MCSUA/GUID-12D976D7-5FCA-49C1-8D85-44A9BC438254.htm#MCSUA-GUID-EF96F2E5-8776-4169-9666-9C53EEA4F3F7
        if (xhr.status >= 200 && xhr.status < 400) {
          resolve(xhr);
        }
        else {
          reject(xhr);
        }
      };

      xhr.onerror = function () {
        console.log('sync.xhr.onerror', xhr);

        $events.$emit('error', {
          event: xhr
        });

        reject(xhr);
      };

      // send data if any!
      xhr.send((!data || typeof data === 'undefined' || data == null || method === 'DELETE') ? null : JSON.stringify(data));
    });
  }


  /**
   * Makes sure that it cleans the sync log object form the database form DB specific arguments.
   *
   * @param [obj] {Object} Should be passed by value!
   * @param [cloneObject] {Boolean} Value to notify if object should be clone!
   */
  function cleanSyncLogObjectFromDBSpecificProperties(obj, cloneObject) {
    var _obj = cloneObject ? JSON.parse(JSON.stringify(obj)) : obj;

    if ('data' in _obj && _obj.data != null) {
      if (_.isObject(_obj.data) && !_.isEmpty(_obj.data)) {
        if ('$loki' in _obj.data && typeof(_obj.data.$loki) === 'number' && !isNaN(_obj.data.$loki)) {
          delete _obj.data.$loki;
        }

        if ('meta' in _obj.data) {
          delete _obj.data.meta;
        }

        // clean everything that starts with _$
        for (var property in _obj.data) {
          if (_.stringStartsWith(property, '$mcs$')) {
            delete _obj.data[property];
          }
        }
      }
    }

    return _obj;
  }

  /**
   * Completely delete all data for given collection path, or in case empty flush for all collections
   * @param path - url path to try to get specific collection to delete if empty remove all collections data
   */
  function flushCollection(path) {
    console.info('Persistence.Sync.flush()', path);
    // if no path delete everything
    if (_.isEmpty(path)) {
      return $db.flush();
    }
    else {
      // alright need to check first if this path really was defined!
      var query = isURLConfiguredForPersistence(path);

      return new Promise(function (resolve, reject) {
        // do this only if no sync is running!
        if (_syncRuns == true) {
          reject(new Error('unable to proceed with this operation, sync is in process'));
        } else {
          resolve(getSyncLog(query.root).removeDataOnly());
        }
      });
    }
  }

  /**
   * Mark flag that transaction is in execution.
   */
  function startSyncTransaction() {
    _syncRuns = true;
  }

  /**
   * Stop current transaction execution
   */
  function stopSyncTransaction() {
    _syncRuns = false;
  }

  /**
   * Current sync status.
   *
   * @returns {boolean} - true if it is running, otherwise false
   */
  function statusSyncTransaction() {
    return _syncRuns;
  }

  /**
   * If you pass the promises, it will make sure that it change the transation flag before return the promise to the client
   * @param resolve
   * @param reject
   * @param promise
   */
  function responsePromise(resolve, reject, promise) {
    promise.then(function (result) {
      commitDBTransaction();
      resolve(result);
    }).catch(function (err) {
      commitDBTransaction(true);
      console.error(err);
      reject(err);
    });
  }

  /**
   * Proceed XHR operation against a given sync obj
   *
   * @type {{run}}
   */
  var syncProcess = (function () {

    var storeError = function (obj, message, code, response) {

      // collect all errors
      if (!Array.isArray(_syncObj.$error)) {
        obj.$error = [];
      }

      // make sure that you collect only the last maxSyncAttempts errors
      if (obj.$error.length > $options.maxSyncAttempts) {
        obj.$error.shift();
      }

      obj.$error.push({
        'status': code || 0,
        'response': response || [],
        'message': message || 'Unknown error'
      });

      // FIX: 26.06.2016 - counter should be equal the error array!
      obj.$errorcounter = obj.$error.length;
      getSyncLog().update(obj);
    };

    var onError = function (xhr, obj) {
      try {
        console.error(xhr, obj);

        if (!xhr instanceof XMLHttpRequest) {
          if ('SYNCID' in obj) {
            $handler.dispatchEvent(400, 'Bad Request', undefined, obj.SYNCID);
          }

          throw new Error('unknown XHR error during the sync process');
        }

        if ('SYNCID' in obj) {
          $handler.dispatchEvent(xhr.status, xhr.statusText, xhr, obj.SYNCID);
        }

        var response = ('response' in xhr) ? xhr.response : xhr.responseText || [];

        _moduleEventEmitter.emit('error-sync', {
          'status': xhr.status || 0,
          'response': response,
          'message': xhr.statusText || 'Unknown error'
        });

        storeError(obj, xhr.statusText, xhr.status, response);
      }
      catch (e) {
        console.error(e);
      }
      finally {
        return true;
      }
    };

    var removeAfterReachHighCount = function (obj) {
      if ($options.autoRemoveAfterReachMaxAttemps === true) {
        var promise = new Promise(function (resolve) {
          resolve(removeSync(obj));
        });

        promise.catch(function (err) {
          onError(err.message, 0, '');
        });
      }
    };

    var onSuccess = function (obj, xhr) {
      var response = {
        'status': xhr.status,
        'statusText': xhr.statusText,
        'response': ('response' in xhr) ? xhr.response : xhr.responseText,
        'headers': xhr.getAllResponseHeaders(),
        'syncObj': obj // request object, used to proceed the XHR call
      };

      // ok if we get to here all went good!:)
      _moduleEventEmitter.emit('post-sync', response);

      // dispatch event to the request listener, if any!
      if ('SYNCID' in obj) {
        $handler.dispatchEvent(response.status, response.statusText, xhr, obj.SYNCID);
      }

      return response;
    };

    var postSuccessOperations = function (original, obj) {
      // remove offline tag if object was created updated only in the offline DB!
      if (obj.syncObj.method === 'POST' || obj.syncObj.method === 'PUT') {
        var cpObj = _.clone(obj);

        // do this only if URL configured for persistence and noCache is FALSE
        var persistentPath = $options.isPersistentUrl(cpObj.syncObj.url);
        if (persistentPath === false || persistentPath.isPolicy('noCache', true)) {
          console.debug('sync post success operation exist');
          return;
        }

        var response = '';
        if (_.isString(cpObj.response)) {
          response = JSON.parse(cpObj.response);
        }

        // merge the data from the response with the existing object in the db!
        response = _.extendOwn(cpObj.syncObj.data, response);

        // do this only if this is a db relevant
        //if ($utils.isLokiDbObj(response)) {
        //!obj.response ? obj.syncObj.data : _.extendOwn(obj.syncObj.data, response);
        var headers = $utils.parseResponseHeaders(cpObj.headers);

        // this will be executed actually after the db operation!
        var update = {
          url: cpObj.syncObj.url,
          data: response,
          // if we had already entry in the DB than just update it
          method: (persistentPath.isPolicy('fetchPolicy', 'FETCH_FROM_CACHE_SCHEDULE_REFRESH')) ? 'PUT' : cpObj.syncObj.method,
          //method: 'PUT',
          headers: headers
        };

        // module defines what will be used!
        $options.Module.router(update, true).catch(function (err) {
          // error here does not have to be expose!
          console.error(err);
        });
      }
      // return the merged object
      return response;
    };

    /**
     * Process method parameter
     * @callback Persistence.Sync~processParam
     * @param url {String}.
     * @param headers {Array}.
     * @param data {Object}.
     * @param method {String} GTE, POST, DELETE.
     */

    /**
     * Proceed XHR call with the object data
     * @param [obj] {Persistence.Sync~processParam} From the sync transaction log
     */
    var process = function (obj) {
      return new Promise(function (resolve) {
        // attempt to sync
        if ($options.maxSyncAttempts === 0 || ((obj.$errorcounter || 0) <= $options.maxSyncAttempts)) {
          console.log('syncProcess.process', obj);
          _moduleEventEmitter.emit('pre-sync', obj);

          // clean the data from db specific elements before exec the XHR!
          var cleanDbObject = cleanSyncLogObjectFromDBSpecificProperties(obj, true);

          // -
          syncXhr2(cleanDbObject.method,
            cleanDbObject.url,
            cleanDbObject.headers,
            cleanDbObject.data,
            cleanDbObject.responseType,
            $options.syncTimeOut)
            .then(onSuccess.bind(this, obj))
            .then(function (response) {
              removeSync(obj);
              return response;
            })
            .then(postSuccessOperations.bind(this, obj))
            .catch(function (e) {
              return onError(e, obj);
            })
            .then(function () {
              resolve(true);
            })
        }
        // in that case we may want to auto-clean the object!
        else {
          removeAfterReachHighCount(obj);
          resolve(true);
        }
      });
    };

    return {
      run: process
    }
  }());

  /**
   * This inner class which will handle the transaction sync
   *
   * @type {{run, stop, status, reset}}
   */
  var syncQueue = (function ($sync) {
    var $queue = [],
      $index = 0,
      $stopSync = false,
      $defaultDelay = $options.syncTimeOut,
      $isRunning = false,
      $forceRun = false;

    /**
     * Process given object, this is where we will execute the operation!
     */
    var process = function (obj) {
      return new Promise(function (resolve, reject) {
        try {
          $sync.run(obj)
            .then(function () {
              resolve(true);
            })
            .catch(function (e) {
              reject(e);
            });
        }
        catch (e) {
          // error, what to do!
          console.error(e);
          reject(e);
        }
      });
    };

    /**
     * Execs all pending sync transactions, one by one, as stored in the transaction table!
     *
     */
    var next = function () {
      if ($stopSync) return;

      // if db in lock, repeat few ms later
      // 1: when the lock is released, -1 if more then 10 times the lock was not released, 1 - if released
      var lockState = checkAndWaitUntilDbTransactionFinish();
      if (lockState == -1) {
        console.warn('sync db lock not released, restart the sync process!');
        // L.Pelov 4 Jul - alternative approach
        // setTimeout(next, 200); // 200ms later try again!
        next();
        return;
      }
      else if (lockState == 0) {
        // loop again
        //delay = 500; //500ms
        next();
        return;
      }

      var i = $index++
        , nextObj = $queue[$index];
      _syncObj = $queue[i];
      if (!_syncObj) {
        rerun();
        return;
      }
      process(_syncObj).then(function () {
        doNext(nextObj, _syncObj) && setTimeout(function () {
          // go for the next!
          next();
        }, 1);
      }).catch(function (error) {
        console.log('unknown sync process error', error);
        //stop();
        rerun(); // L.Pelov - fix to make possible that sync will rerun if error!
      });
    };

    var runSync = function (force) {
      // TODO: Add promise to return when operation is ready!
      // TODO: http://stackoverflow.com/questions/34255351/is-there-a-version-of-settimeout-that-returns-an-es6-promise

      // var ctrState, rejection, p = new Promise(function (resolve, reject) {
      //   ctrState = setTimeout(resolve, ms);
      //   rejection = reject;
      // });
      // p.cancel = function () {
      //   clearTimeout(ctrState);
      //   rejection(Error("Sync process was cancelled!"));
      // };
      // return p;


      if ($options.off) return;
      if (!force && typeof force !== "boolean") force = false;
      if ($options.autoSync === false && force === false) return;

      // check first if online, if not try later!
      if (!$options.isOnline()) {
        rerun();
        return;
      }

      // do not exec again if the process is running!
      if ($isRunning) {
        $forceRun = true;
        return;
      }

      setTimeout(function () {
        $isRunning = true;
        $stopSync = false;

        // indicates that sync transaction runs now!
        startSyncTransaction();

        // populate the sync table to the queue
        $queue = getSyncLog().find();

        try {
          next();
        }
        catch (e) {
          console.log(e);
          rerun();
        }
      }, getDelay(force));
    };

    var doNext = function (obj, lastObj) {
      // there is next element, operation can continue
      if (obj) return true;

      // will restart the process after the specified timeout
      rerun();

      // fire event that there are no more elements to sync!
      _moduleEventEmitter.emit('end-sync', lastObj);
      return false;
    };

    var rerun = function () {
      // clean the tmp
      _syncObj = {};
      reset();

      // will restart the process after the specified timeout
      setTimeout(function () {
        runSync();
      }, getDelay());
    };

    var stop = function () {
      stopSyncTransaction();
      $stopSync = true;
      $isRunning = false;
    };

    var reset = function () {
      stop();
      $isRunning = false;
      $index = 0;
      $queue.length = 0;
    };

    var status = function () {
      return {
        current: $index,
        obj: $queue[$index],
        size: $queue.length,
        isRunning: $isRunning
      }
    };

    /**
     * Defines how often to repeat the process, auto-sync!
     * @param force
     * @returns {*}
     */
    var getDelay = function (force) {
      if (force) {
        return 1;
      }

      if ($forceRun) {
        $isRunning = false; // L.Pelov - fix 05.08.2016
        $forceRun = false;
        return 1;
      }

      if (_syncLogDirty) {
        _syncLogDirty = false;
        return 1;
      }
      return $defaultDelay;
    };

    return {
      run: runSync,
      stop: stop,
      status: status,
      reset: reset
    }
  }(syncProcess));

// public API
  return {
    getDB: function () {
      return $db;
    },
    /**
     * This is not save, it will always return the collection to the caller, so you can remove entries even
     * during the sync is running!
     *
     * @param options
     */
    getHistory: function (options) {
      return new Promise(function (resolve) {
        resolve(getSyncLog(options));
      });
    },
    get: function (options) {
      return new Promise(function (resolve, reject) {
        startDBTransaction();
        var promise = new Promise(function (_resolve) {
          _resolve(handleGet(options));
        });

        responsePromise(resolve, reject, promise);
      });
    },
    post: function (options) {
      return new Promise(function (resolve, reject) {
        startDBTransaction();
        var promise = new Promise(function (_resolve) {
          _resolve(handlePost(options));
        });

        responsePromise(resolve, reject, promise);
      });
    },
    put: function (options) {
      return new Promise(function (resolve, reject) {
        startDBTransaction();
        var promise = new Promise(function (_resolve) {
          _resolve(handlePut(options));
        });

        responsePromise(resolve, reject, promise);
      });
    },
    patch: function (options) {
      return new Promise(function (resolve, reject) {
        startDBTransaction();
        var promise = new Promise(function (_resolve) {
          _resolve(handlePatch(options));
        });

        responsePromise(resolve, reject, promise);
      });
    },
    delete: function (options) {
      return new Promise(function (resolve, reject) {
        startDBTransaction();
        var promise = new Promise(function (_resolve) {
          _resolve(handleDelete(options));
        });

        responsePromise(resolve, reject, promise);
      });
    },
    router: function (options) {
      var self = this;

      // route the request and auto-start sync!
      var routing = function (options) {
        //console.log('Persistent.Sync.router');
        if (_.isEmpty(options)) {
          console.error('sync router request was not provided!', options);
          throw new Error('sync router request was not provided!');
        }

        // check if method provided!
        if (!options.hasOwnProperty('method') && !_.isEmpty(options.method)) {
          console.error('sync router method was not provided!', options);
          throw new Error('sync router method was not provided!');
        }

        // exec the router specified
        var _options = _.clone(options);

        _options.method = $utils.normalizeMethod(_options.method);
        if (!self[_options.method]) {
          console.error('specified router is not implemented!');
          throw new Error('specified router is not implemented!');
        }

        // exec the method
        return new Promise(function (resolve) {
          //resolve(_.clone(self[request.method](options)));
          resolve(self[_options.method](_options));
        });
      };

      // if the operation was successful run the sync job!
      return new Promise(function (resolve, reject) {
        var promise = new Promise(function (_resolve) {
          _resolve(routing(options));
        });

        //
        promise.then(function (result) {
          // re-run the sync to make sure that this new entry will be picked!
          // force sync log run!
          //syncQueue.run(true);
          // resolve should be returned only when async operation finished!
          resolve(result);
        }).catch(function (err) {
          reject(err);
        });
      });
    },
    operations: syncQueue,
    removeSync: function (request) {
      return new Promise(function (resolve) {
        resolve(removeSync(_options));
      });
    },
    flush: flushCollection,
    events: _moduleEventEmitter,
    /**
     * Return true with the sync process is running, otherwise return false!
     * Before proceed with XHR request we should always make sure that sync is executed!
     */
    isSyncRunning: statusSyncTransaction
  };
}

/**
 * Intercepts the XMLHTTPRequest
 * @type {{run, runWithoutReadInBackground, listener, registerRequestCompletedCallback}}
 */
// Run all Ajax calls with this helper if alwaysOn = false!
function persistenceProcess($options, $common, $handler) {
  var REQUEST_ID = 'Request-ID';

  return {
    run: function (callback) {
      // NOTE: I could generate ID here and pass this to the client, when
      // he runs the callback!
      $options.oneOn();
      callback();
    },
    runWithoutReadInBackground: function (callback) {
      $options.dbFirstFalseForNextCall();
      // in our case this will just change the policy!
      callback();
    },
    listener: function (requestID, callback) {
      // catch the background listener when finished
      // check first if the dbFirst=true, otherwise no event will be triggered
      //if ($options.isDbFirst()) {
      // make sure that the Persistence.Handler exist before using it
      // xhr.getResponseHeader("Request-ID") - gets the offline id from the header returned from
      // the library
      if (typeof $handler !== 'undefined' && requestID)
      // listen for the event
        $handler.addListener(requestID, function (e) {
          //console.log('$handler', e.detail.offlineid, e.detail.status,
          //    e.detail.statusText, e.detail.response);

          callback(e.detail);

        }, false);
      //}
    },
    registerRequestCompletedCallback: function (obj, callback) {
      //if ($options.isDbFirst()) {
      // make sure that the Persistence.Handler exist before using it
      // xhr.getResponseHeader("Request-ID") - gets the offline id from the header returned from
      // the library
      if (typeof $handler !== 'undefined' && obj !== null)
      // if number than go for it directly
        if ($common.isNumber(obj)) {
          $handler.addListener(obj, function (e) {
            callback(e.detail.data, e.detail.status, e.detail.statusText, e.detail.requestid, e.detail.time);
          }, false);
        }
        else if ($common.isObject(obj)) {
          if (obj.hasOwnProperty(REQUEST_ID)) {
            $handler.addListener(obj[REQUEST_ID], function (e) {
              callback(e.detail.data, e.detail.status, e.detail.statusText, e.detail.requestid, e.detail.time);
            }, false);
          }
          else if (typeof obj.getResponseHeader === 'function') {
            if (obj.getResponseHeader(REQUEST_ID) != null) {
              //data[REQUEST_ID] = xhr.getResponseHeader(REQUEST_ID);
              $handler.addListener(obj.getResponseHeader(REQUEST_ID), function (e) {
                callback(e.detail.data, e.detail.status, e.detail.statusText, e.detail.requestid, e.detail.time);
              }, false);
            }
          }
        }
      //}
    }
  };
}

/**
 *
 * The response object has these properties:

 data – {string|Object} – The response body transformed with the transform functions.
 status – {number} – HTTP status code of the response.
 headers – {function([headerName])} – Header getter function.
 config – {Object} – The configuration object that was used to generate the request.
 statusText – {string} – HTTP status text of the response.

 */

/* A response status code between 200 and 299 is considered a success status and will result in the success callback
 being called. Any response status code outside of that range is considered an error status and will result in the
 error callback being called. Also, status codes less than -1 are normalized to zero. -1 usually means the request
 was aborted, e.g. using a config.timeout. Note that if the response is a redirect, XMLHttpRequest will
 transparently follow it, meaning that the outcome (success or error) will be determined by the final response
 status code.
 */

// TODO: see also responseJSON: https://pixelsvsbytes.com/2011/12/teach-your-xmlhttprequest-some-json/
// Persistence implementation
function persistenceXMLHttpRequestInstall(XHR, $sync, $utils, $options, $common, $handler, $events) {
  "use strict";

  // get pointer to the original object!
  var OriginalXMLHttpRequest = XHR;

  var httpStatusCodes = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    300: "Multiple Choice",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported"
  };

  var unsafeHeaders = {
    "Accept-Charset": true,
    "Accept-Encoding": true,
    "Connection": true,
    "Content-Length": true,
    "Cookie": true,
    "Cookie2": true,
    "Content-Transfer-Encoding": true,
    "Date": true,
    "Expect": true,
    "Host": true,
    "Keep-Alive": true,
    "Referer": true,
    "TE": true,
    "Trailer": true,
    "Transfer-Encoding": true,
    "Upgrade": true,
    "User-Agent": true,
    "Via": true
  };

  // TODO: http://stackoverflow.com/questions/24555370/how-can-i-catch-and-process-the-data-from-the-xhr-responses-using-casperjs/24561614#24561614
  // TODO: MCS: https://docs.oracle.com/cloud/latest/mobilecs_gs/MCSUA/GUID-85B42EE5-82F7-4FA8-A712-DCFCFAF51CA7.htm#MCSUA3501

  // XHR Proxy
  function SyncXMLHttpRequest() {
    var originalXHR = new OriginalXMLHttpRequest();
    var defaultContentTypeHeader = "application/json; charset=utf-8";

    // this is equal to FETCH_FROM_CACHE_SCHEDULE_REFRESH
    this.isDbFirst = $options.isDbFirst();

    this._req = {
      url: '',
      headers: {
        "Content-Type": defaultContentTypeHeader
      },
      data: undefined,
      method: '',
      username: '',
      password: ''
    };

    // point yourself!
    var self = this;

    Object.defineProperty(self, 'xhr', {
      get: function () {
        return originalXHR;
      }
    });

    this._setResponseHeaders = function (headers) {
      this.responseHeaders = {};

      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
          this.responseHeaders[header] = headers[header];
        }
      }

      if (this.forceMimeType) {
        this.responseHeaders['Content-Type'] = this.forceMimeType;
      }

      this.readyState = this.HEADERS_RECEIVED;
    };


    // add all proxy getters, don't need to override these
    // "responseType", "readyState", "responseXML",
    ["upload"].forEach(function (item) {
      Object.defineProperty(self, item, {
        get: function () {
          return this.xhr[item];
        }
      });
    });

    // add all pure proxy pass-through methods
    // "open", "addEventListener", "overrideMimeType", "getAllResponseHeaders"
    ["abort"].forEach(function (item) {
      Object.defineProperty(self, item, {
        value: function () {
          return this.xhr[item].apply(this.xhr, arguments);
        }
      });
    });

    // add all proxy getters/setters
    // "onload",
    ["ontimeout, timeout", "withCredentials", "onprogress"].forEach(function (item) {
      Object.defineProperty(self, item, {
        get: function () {
          return this.xhr[item];
        },
        set: function (val) {
          this.xhr[item] = val;
        }
      });
    });

    // proxy change event handler
    // http://stackoverflow.com/questions/24555370/how-can-i-catch-and-process-the-data-from-the-xhr-responses-using-casperjs/24561614#24561614

    var restproperties = [
      //"onabort",
      //"onerror",
      //"onload",
      "onloadstart",
      "onloadend",
      //"onprogress",
      //"readyState",
      //"responseText",
      //"responseType",
      //"responseXML",
      //"status",
      //"statusText",
      //"upload",
      //"withCredentials",
      "DONE",
      "UNSENT",
      "HEADERS_RECEIVED",
      "LOADING",
      "OPENED"
    ];
    restproperties.forEach(function (item) {
      Object.defineProperty(self, item, {
        get: function () {
          return this.xhr[item];
        },
        set: function (obj) {
          this.xhr[item] = obj;
        }
      });
    });

    // uniqueID will be used from the event handler
    this.uniqueID = function () {
      if (!this.uniqueIDMemo) {
        // use the UUID v4 - which preferred!
        if (uuid) {
          this.uniqueIDMemo = uuid.v4();
        }
        else {
          this.uniqueIDMemo = $common.getUID()
        }
      }
      return this.uniqueIDMemo;
    };

    // NOTICE: L.Pelov - bellow code could be part of the SyncXHR class to hide internal methods!

    this.open = function (method, url, async, user, password) {

      console.log(url);
      // now check here if you want to continue with the proxy or if you defake!
      this.persistentPath = $options.isPersistentUrl(url);
      //console.debug('isPersistentUrl', this.persistentPath);

      if (this.persistentPath === false) {
        // defake and continue with the original object
        console.debug('defake XHR');
        // non of the proxy methods will be used!
        this.defake();
        return this.xhr.open(method, url, true, user, password); //send it on
      } else {

        // use the proxy
        console.debug('PROXY');
        this.proxyXHR();

        this._req.method = method;
        this._req.url = url;
        this._req.username = user;
        this._req.password = password;

        //return this.xhr.open(method, url, true, user, password); //send it on
        return this.xhr.open.apply(this.xhr, arguments);
      }
    };


    return this;
  }


  /**
   * proxy following methods!
   */
  SyncXMLHttpRequest.prototype.proxyXHR = function () {
    var self = this;

    Object.defineProperty(self, 'onerror', {
      get: function () {
        // this will probably never called
        return this.xhr.onerror;
      },
      set: function (onerror) {
        var that = this.xhr;
        var realThis = this;
        self.originalonerror = onerror;

        that.onerror = function () {
          // intercept the call and set the vars
          self.synconerror();
          onerror.call(realThis);
        }
      }
    });

    Object.defineProperty(self, 'onload', {
      get: function () {
        return this.xhr.onload;
      },
      set: function (onload) {
        var that = this.xhr;
        var realThis = this;
        self.originalonload = onload;

        that.onload = function () {
          // intercept the call and set the vars
          self.onreadystatechangefunction();
          onload.call(realThis);
        }
      }
    });

    Object.defineProperty(self, "onreadystatechange", {
      get: function () {
        return this.xhr.onreadystatechange;
      },
      set: function (onreadystatechange) {
        var that = this.xhr;
        var realThis = this;
        self.originalonreadystate = onreadystatechange;

        that.onreadystatechange = function () {
          // request is fully loaded
          if (that.readyState == 4) {
            self.onreadystatechangefunction();
          }
          else { // this is not interesting so use the defaults!
            realThis.readyState = that.readyState;
            realThis.response = that.response;
            realThis.responseText = that.responseText;
            realThis.responseXML = that.responseXML;
            realThis.status = that.status;
            realThis.statusText = that.statusText;
            realThis.responseType = that.responseType;
          }

          onreadystatechange.call(realThis);
        };
      }
    });

    SyncXMLHttpRequest.prototype.overrideMimeType = function (mimeType) {
      if (!this._req.headers) {
        this._req.headers = {};
      }

      if (typeof mimeType === "string") {
        this.forceMimeType = mimeType.toLowerCase();
        this._req.headers['Content-Type'] = this.forceMimeType;
      }

      this.xhr.overrideMimeType(mimeType);
    };

    /**
     * Some developers prefer to use the event listener!
     *
     * @param event
     * @param callback
     * @returns {*}
     */
    SyncXMLHttpRequest.prototype.addEventListener = function (event, callback) {
      var self = this;

      if (event === 'load') {
        self.onload = callback;
        // NOTICE: no need to pass this to the XHR event lister, as the proxy will do this
        // however we want to catch the callback to be able to exec it when required
      }
      else if (event === 'error') {
        self.onerror = callback;
        // NOTICE: no need to pass this to the XHR event lister, as the proxy will do this
        // however we want to catch the callback to be able to exec it when required
      }
      else {
        // not interested for now pass over!:)
        this.xhr.addEventListener(event, callback);
      }
    };


    /**
     * Get the headers to properly intercept!
     * NOTICE: There is no need to check for unsafe headers, as the original XHR object will throw exceptions
     * if this is the case
     *
     * @param header
     * @param value
     * @returns {*}
     */
    SyncXMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      //console.log(header + ": " + value);
      //var self = this;

      if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
        throw new Error("Refused to set unsafe header \"" + header + "\"");
      }

      // NOTICE: this will throw exception for us if user try to pass unsafe header!
      this.xhr.setRequestHeader(header, value);

      // BUGFIX: IE - cache issue
      if (!this._req.headers) {
        this._req.headers = {};
      }

      this._req.headers[header] = value;
    };

    SyncXMLHttpRequest.prototype.getAllResponseHeaders = function getAllResponseHeaders() {
      var self = this;

      if (self.readyState < self.HEADERS_RECEIVED) {
        return "";
      }

      var headers = "";

      for (var header in this.responseHeaders) {
        if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
          headers += header + ": " + this.responseHeaders[header] + "\r\n";
        }
      }

      return headers;
    };

    SyncXMLHttpRequest.prototype.getResponseHeader = function getResponseHeader(header) {
      var self = this;

      if (self.readyState < self.HEADERS_RECEIVED) {
        return null;
      }

      if (/^Set-Cookie2?$/i.test(header)) {
        return null;
      }

      header = header.toLowerCase();

      for (var h in this.responseHeaders) {
        if (h.toLowerCase() == header) {
          return this.responseHeaders[h];
        }
      }

      return null;
    };
    /**
     * This interceptor will decide which way we want to go depending on user configurations!
     * @param postBody
     */
    SyncXMLHttpRequest.prototype.send = function (postBody) {
      var self = this;

      if(self.responseType){
        this._req.responseType = self.responseType;
      }

      // we currently only support JSON payloads, if this is not the case throw error
      try {
        if (postBody) {
          if (typeof postBody === 'string') {
            this._req.data = JSON.parse(postBody);
          }
          else {
            //BUG: to make sure that we work with a copy of the object, as some frameworks like knockout often override the objects!
            this._req.data = JSON.parse(JSON.stringify(postBody));
          }
        }
      }
      catch (e) {
        throw new Error('persistence library could execute only JSON payload!');
      }

      // well maybe check first if online, if not you don't have to do all that work
      var isOnline = $options.isOnline();

      var whenOffline = function () {
        setTimeout(function () {
          console.debug('Sync XHR in OFF-LINE MODE');
          handleOfflineRequest(self._req, true);
        }, 1);
      };
      var whenOnline = function () {
        setTimeout(function () {
          console.debug('Sync XHR in ON-LINE MODE');

          if (isPolicy('fetchPolicy', 'FETCH_FROM_CACHE_SCHEDULE_REFRESH') || self.isDbFirst) {
            // Instructs to fetch resources from the local cache and schedule a background refresh to update the cache with the latest version from the server.
            handleOfflineRequest(self._req, false);
          }

          // should not exec GET operation on object that was no synced!
          isObjectNeverSynced() && exeXHR();
        }, 1)
      };

      !isOnline ? whenOffline() : whenOnline();

      var defaultContentHeaders = {
        "Content-Type": 'application/json; charset=utf-8',
        "Request-ID": self.uniqueID()
      };

      var isPolicy = function (policy, value) {
        return self.persistentPath.isPolicy(policy, value);
      };

      // how to respond to the client!
      var $respond = function (status, headers, body) {
        if (isPolicy('fetchPolicy', 'FETCH_FROM_CACHE_SCHEDULE_REFRESH') || self.isDbFirst) {
          $handler.dispatchEvent(status, httpStatusCodes[status], body, self.uniqueID());
        }
        else {
          self.respond2(status, headers, body);
        }
      };

      // what to do when offline!
      var handleOfflineRequest = function (req, toSync) {
        var parsingModule = $options.Module;

        // TODO: Yuri - check if this is the right place for this functionality
        // remove data from get offline request.
        if (req.method === 'GET') {
          delete req.data;
        }

        if (isPolicy('noCache', false) && $utils.isSupportedHTTPMethod(parsingModule, req.method)) {
          return parsingModule.router(req)
            .then(function (response) {
              if (req.hasOwnProperty('method')) {
                if (req.method !== 'GET') {
                  // in case of error get the stored data and push to the sync!
                  if (toSync === true) {
                    self._req.data = response;
                    $sync.router(self._req);
                  }
                }
              }

              return response;
            })
            .then(function (response) {
              if(!$common.isEmpty(response)) {
                self.respond2(200, defaultContentHeaders, response);
              } else {
                self.respond2(404, defaultContentHeaders, 'Offline Not Found');
              }
            })
            .catch(function (err) {
              console.error(err);
              self.respond2(400, defaultContentHeaders, err);
            });
        }
        else {
          if (req.hasOwnProperty('method') && $utils.isSupportedHTTPMethod($sync, req.method)) {
            if (req.method !== 'GET') {
              // in case of error get the stored data and push to the sync!
              if (toSync === true) {
                self._req.data = req.data;
                $sync.router(req).then(function (result) {
                  self.respond2(200, defaultContentHeaders, null);
                }).catch(function (error) {
                  self.respond2(400, defaultContentHeaders, null);
                });
              }
              else {
                self.respond2(0, defaultContentHeaders, null);
              }
            }
            else {
              // status 0 means no network!
              self.respond2(0, defaultContentHeaders, null);
            }
          }
          else {
            self.respond2(400, defaultContentHeaders, null);
          }
        }
      };

      // checks if the object you try to send was ever synced!
      function isObjectNeverSynced() {
        if (!$common.isEmpty(postBody) && $common.isObject(postBody)) {
          if (postBody.hasOwnProperty('meta') && postBody.meta.hasOwnProperty('offline-persist')) {
            // don't need to proceed with the query since this object was not sync,
            // it exist only in the offline db!
            if (this._req.method === 'GET')
              return false;
          }
          else {
            // clean the object from internal properties if any!
            if (postBody.hasOwnProperty('$loki')) {
              delete postBody['$loki'];
            }

            if (postBody.hasOwnProperty('meta')) {
              delete postBody['meta'];
            }
          }
        }

        return true;
      }

      // exec the async call
      function exeXHR() {
        // generate unique sync ID to notify once there is response!
        var syncRequestID = self.uniqueID() + '-SYNC-' + Math.floor(Math.random() * 1000);
        self._req.SYNCID = syncRequestID;

        // store in the sync log first, and then execute
        $sync.router(self._req)
          .then(function () {
            // callback when the ajax call is ready,it should return the response to client after the policy sync operations
            $handler.addListener(syncRequestID, function (e) {
              // TODO: standardize response!
              // console.debug('request response', e);
              // status - e.detail.data.status
              // headers - e.detail.data.getAllResponseHeaders()
              // body - e.detail.data.responseText
              // console.log(typeof e.detail.data);
              reqListener(e.detail.data);
            }, false);

            // run the sync!
            $sync.operations.run(true);
          })
          .catch(function (error) {
            console.error(error);
            $respond(400, defaultContentHeaders, error);
          });
      }

      // what to do onload!
      /**
       * @deprecated - this should be moved the sync library!
       * @param event
       */
      function reqListener(xhr) {
        var parsingModule = $options.Module;

        // get the response - and add it to the response message data!
        var xhrResponse = ('response' in xhr) ? xhr.response : xhr.responseText;

        // NOTE: this should be always 4 because we register onload event, and NOT using onreadystatechange!
        if (xhr.readyState === 4) {

          if ($common.isEmpty(xhrResponse)) {
            xhrResponse = ""
          }

          // Assigned the Request ID to the response headers to be returned to the client!
          var responseHeaders = $utils.parseResponseHeaders(xhr.getAllResponseHeaders());
          responseHeaders['Request-ID'] = self.uniqueID();

          // work only if following
          // 304 - means not changes so use the one from cache right!
          // get the latest data from the offline db on : status === 304
          if (xhr.status >= 200 && xhr.status < 300) {

            $events.$emit('success', {
              data: xhrResponse,
              status: xhr.status,
              headers: xhr.getAllResponseHeaders(),
              requestID: self.uniqueID()
            });

            // we can work only with JSON payloads!
            var contentTypeResponseHeader = xhr.getResponseHeader("Content-Type");

            // OK this is a issues, we have a null content type, we cannot work with it, return error to the client!
            if (contentTypeResponseHeader === null) {
              if (self._req.method !== 'DELETE') {
                throw new Error('XHR did not return any HTTP headers!');
              }
            }
            else {
              // get the response header text to compare!
              contentTypeResponseHeader = contentTypeResponseHeader && contentTypeResponseHeader.split(';', 1)[0];

              // content-type should be JSON
              if ((contentTypeResponseHeader == null) || (contentTypeResponseHeader !== 'application/json')) {
                if (self._req.method !== 'DELETE') {
                  throw new Error('persistence library could handle only JSON responses!');
                }
              }
              else if(typeof xhrResponse === 'String'){
                xhrResponse = JSON.parse(xhrResponse);
              }
            }

            // take the new headers!
            self._req.headers = responseHeaders;

            // NOTE: alright if I am here than everything is good and I can start working with the requests

            // check first that the method is implemented!
            if (isPolicy('noCache', false) && $utils.isSupportedHTTPMethod(parsingModule, self._req.method)) {
              self._req.data = xhrResponse;

              if (self._req.method === 'POST' || self._req.method === 'PUT' || self._req.method === 'PATCH') {
                if (self._req.data.meta !== undefined && self._req.data.meta.hasOwnProperty('offline-persist')) {
                  delete self._req.data.meta['offline-persist'];
                }
              }

              // store the response in the offline db automatically
              parsingModule.router(self._req)
                .then(function () {
                  $respond(xhr.status, responseHeaders, xhrResponse);
                })
                .catch(function (err) {
                  console.error(err);
                  $respond(400, responseHeaders, err);
                });
            }
            else {
              // well maybe we don't want to start the response!
              $respond(xhr.status, responseHeaders, xhrResponse);
            }

          }
          // something very bad happen here!
          else {
            //if status higher then 300, then we have a issue return this back to the client
            if ((xhr.status >= 300 && xhr.status != 304)) {

              $events.$emit('error', {
                event: event
              });

              self._req.headers = responseHeaders;

              // if DB first and we were able to return something to the client, then do so
              // however if nothing, then return the error message and information
              if (isPolicy('noCache', false) && $utils.isSupportedHTTPMethod(parsingModule, self._req.method)) {
                if (self._req.method === 'GET') {
                  // there is error we don't need the message from the server here,
                  // we just want to return the offline db
                  self._req.data = [];
                }

                parsingModule.router(self._req).then(function (result) {
                  // If there is something to return
                  !result ? $respond(xhr.status, responseHeaders, xhrResponse) : $respond(xhr.status, responseHeaders, result);

                }).catch(function (error) {
                  $respond(400, responseHeaders, 'Error while executing operation against the offline database: ' + error, xhrResponse);
                });

              }
              else {
                $respond(xhr.status, responseHeaders, xhrResponse);
              }

            }
            else {
              $respond(xhr.status, responseHeaders, xhrResponse);
            }
          }
        }
        //readyState something else than 4 - DONE, which is very unlikely but hey!
        else {
          // if readyState not 4 - you don't have access to the headers!
          $respond(xhr.status, defaultContentHeaders, xhrResponse);
        }
      }

      // this is if you don't want to use the sync to do the XHR call!
      // this.xhr.send(postBody);

      // example for immediate response
      // self.respond2(200, {
      //   "Content-Type": "application/json; charset=utf-8",
      //   "Content-Language": "neee"
      // }, '[{"name":"pelov - 1"}]');
    }; // SEND END

    /**
     * Intercept on XHR error!
     */
    SyncXMLHttpRequest.prototype.synconerror = function () {
      var self = this;

      self.readyState = this.xhr.readyState;
      //self.responseText = ('response' in this.xhr) ? this.xhr.response : this.xhr.responseText;
      self.responseText = this.xhr.responseText;
      self.responseType = this.xhr.responseType;
      self.response = this.xhr.response;
      self.responseXML = this.xhr.responseXML;
      self.status = this.xhr.status;
      self.statusText = this.xhr.statusText;
    };

    /**
     * Manually set the response to the user.
     *
     * @param status - valid HTTP status code
     * @param headers - response headers
     * @param body - response body
     */
    SyncXMLHttpRequest.prototype.respond2 = function (status, headers, body) {
      var self = this;

      self._setResponseHeaders(headers);

      self.readyState = self.DONE;
      self.status = status;
      self.statusText = httpStatusCodes[status];

      // set the response which should be JSON
      if (body != null) {
        if (typeof body === 'string') {
          self.responseText = body;
          //self.response = self.responseText;
        }
        else if (typeof  body === 'object') {
          if(self.responseType && self.responseType == 'json'){
            self.response = body;
          } else {
            self.responseText = JSON.stringify(body);
          }
        }
        else {
          // don't recognise the body!
          self.responseText = null;
          self.response = self.responseText;
        }
      }
      else {
        self.responseText = null;
        self.response = self.responseText;
      }

      if (status != 0) {
        if (self.originalonload) {
          self.originalonload.call(this);
        }
        else if (self.originalonreadystate) {
          self.originalonreadystate.call(this);
        }
        else {
          throw new Error('no response XHR method was implemented!');
        }
      }
      // TODO: Error should be only if the XHR thrown error!
      else {
        if (self.originalonerror) {
          self.originalonerror.call(this);
        }
        else if (self.originalonload) {
          self.originalonload.call(this);
        }
        else if (self.originalonreadystate) {
          self.originalonreadystate.call(this);
        }
        else {
          throw new Error('no response XHR method was implemented!');
        }
      }
      //}
    };

    /**
     * Prototype from the real object to easy catch the internal variables!
     *
     * @param e
     * @returns {*}
     */
    SyncXMLHttpRequest.prototype.onreadystatechangefunction = function () {
      var self = this;

      var responseHeaders = $utils.parseResponseHeaders(this.xhr.getAllResponseHeaders());
      self._setResponseHeaders(responseHeaders);
      self.readyState = self.DONE;
      self.status = this.xhr.status;
      self.statusText = this.xhr.statusText;

      //this.responseText = ('response' in this.xhr) ? this.xhr.response : this.xhr.responseText;
      this.responseText = this.xhr.responseText;
      this.response = this.xhr.response;
      this.responseXML = this.xhr.responseXML;

      //if (this.xhr.status >= 200 && this.xhr.status < 400) {
      // success!
      //}
      //else {
      // do something on error
      //}

      // END HERE!!
      return;

    };
  }// END OF PROXY

  /**
   * Convert to the original XHR object!
   *
   * https://github.com/sinonjs/sinon/blob/master/lib/sinon/util/fake_xml_http_request.js
   * https://github.com/sinonjs/sinon/blob/master/lib/sinon/util/event.js
   *
   * @returns {SyncXMLHttpRequest}
   */
  SyncXMLHttpRequest.prototype.defake = function () {
    // go throw the objects from the original XHR and pass them to the proxy!

    // ["open", "addEventListener", "overrideMimeType"].forEach(function (item) {
    //   Object.defineProperty(self, item, {
    //     value: function () {
    //       return this.xhr[item].apply(this.xhr, arguments);
    //     }
    //   });
    // });

    var self = this;

    // Object.defineProperty(self, 'onerror', {
    //   get: function () {
    //     // this will probably never called
    //     return this.xhr.onerror;
    //   },
    //   set: function (onerror) {
    //     var that = this.xhr;
    //     that.onerror = function () {
    //       onerror.call(that);
    //     };
    //   }
    // });
    //
    // Object.defineProperty(self, 'onload', {
    //   get: function () {
    //     return this.xhr.onload;
    //   },
    //   set: function (onload) {
    //     var that = this.xhr;
    //     that.onload = function () {
    //       onload.call(that);
    //     };
    //   }
    // });

    Object.defineProperty(self, "onreadystatechange", {
      get: function () {
        return this.xhr.onreadystatechange;
      },
      set: function (onreadystatechange) {
        var that = this.xhr;
        that.onreadystatechange = function () {
          onreadystatechange.call(that);
        };
      }
    });


    // proxy ALL methods/properties
    var methods = [
      //"abort",
      "setRequestHeader",
      "send",
      "addEventListener",
      "removeEventListener",
      "getResponseHeader",
      "getAllResponseHeaders",
      "dispatchEvent",
      "overrideMimeType"
    ];
    methods.forEach(function (method) {
      Object.defineProperty(self, method, {
        value: function () {
          return this.xhr[method].apply(this.xhr, arguments);
        }
      });
    });

    var properties = [
      "onabort",
      "onerror",
      "onload",
      "readyState",
      "responseText",
      "response",
      "responseType",
      "responseXML",
      "status",
      "statusText"
    ];
    properties.forEach(function (item) {
      Object.defineProperty(self, item, {
        get: function () {
          return this.xhr[item];
        },
        set: function (obj) {
          this.xhr[item] = obj;
        }
      });
    });

    return this;
  };

  /**
   * Here decision will be take if to intercept or not:), depending or initialisation settings!
   *
   * @param intercept
   * @returns {SyncXMLHttpRequest}
   * @constructor
   */
  XMLHttpRequest = function (intercept) {
    // this means you definitely want to use the interceptor!
    if (typeof intercept === 'boolean') {
      if (intercept === true) {
        return new SyncXMLHttpRequest();
      }
      if (intercept === false) {
        return new XHR();
      }
    }

    // in that case
    if (!$options.isOn() || $options.off) {
      // in that case work with the original object!
      return new XHR();
    }

    // OK non of the above we want to intercept!
    return new SyncXMLHttpRequest();
  };

  XMLHttpRequest.originalXMLHttpRequest = OriginalXMLHttpRequest;
}

function persistenceXMLHttpRequestUninstall(){
  if(!XMLHttpRequest.originalXMLHttpRequest) {
    throw 'Sync Express not installed.';
  }
  XMLHttpRequest = XMLHttpRequest.originalXMLHttpRequest;
}


"use strict";

// persistence library initialization
function persistenceLibraryInitialization() {
  var _common = persistenceCommon();
  var _handler = persistenceHandler();
  var _events = persistenceEvents();
  var _options = persistenceOptions(_common);
  var _utils = persistenceUtils(_common, _options);
  var _sync = persistenceSync(_events, _common, _options, _utils, _handler);

  _options.module = new persistenceMCSHandler(_options, _common, _utils);

  var _process = persistenceProcess(_options, _common, _handler);

// syncXMLHttpRequest request initialization
  persistenceXMLHttpRequestInstall(XMLHttpRequest, _sync, _utils, _options, _common, _handler, _events);


  function flush(path) {
    return _options.module.flush(path)
      .then(_sync.flush.bind(_sync));
  }

  function install() {
    persistenceXMLHttpRequestInstall(XMLHttpRequest, _sync, _utils, _options, _common, _handler, _events);
  }

  function uninstall() {
    persistenceXMLHttpRequestUninstall();
  }

  /**
   * Persistence module.
   * @memberOf mcs.sync
   * @namespace sync
   * @ignore
   */
  var sync = {};


  /**
   * Module contains all public settings for the persistence library
   * @ignore
   */
  sync.options = _options;

  /**
   * This module provide the MCS Persistent capabilities
   * @ignore
   */
  sync.MCSHandler = function () {
    return new persistenceMCSHandler(_options, _common, _utils);
  };

  /**
   * Request handler can be used directly, and is used to intercept the HTTP request to store objects offline.
   * @ignore
   */
  sync.RequestHandler = function () {
    return new persistenceRequestHandler(_options, _common, _utils);
  };

  /**
   * Oracle REST handler is used to intercept the HTTP request to store objects offline.
   * @ignore
   */
  sync.OracleRestHandler = function () {
    return new persistenceOracleRESTHandler(_options, _common, _utils);
  };

  /**
   * Intercepts the XMLHTTPRequest
   * @ignore
   */
  sync.process = _process;

  sync._flush = flush;
  sync._install = install;
  sync._uninstall = uninstall;
  return sync;
}

g.mcs = {};
g.mcs._sync = persistenceLibraryInitialization();






// return RequireJS and AMD
if(_define) {
  define = _define;
  _define = undefined;
} else if(_exports) {
  exports = _exports;
  _exports = undefined;
}



}(this));


