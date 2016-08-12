/**
 * Polyfill para [Global Object] window.Promise
 *
 * https://promisesaplus.com/
 * http://wiki.commonjs.org/wiki/Promises/A
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
 *
 * @param task Método assíncrono.
 * @returns Promise
 **/
var Promise = (function(task) {
  'use strict';

  var that = this;

  this._states = {
    PENDING: 0,
    FULFILLED: 1,
    REJECTED: 2
  };

  this._handlers = [];
  this._state = this._states.PENDING;
  this._value = null;
  this._done = false;

  var _Utils = {
    getThen: function(value) {
      var valueType = typeof value;

      if (value && (valueType === 'object' || valueType === 'function')) {
        var then = value.then;

        if (typeof then === 'function')
          return then;
      }

      return null;
    },
    doResolve: function(task, onFulfilled, onRejected) {
      that._done = false;

      try {
        task(function(value) {
          if (that._done)
            return;

          that._done = true;
          onFulfilled(value);
        }, function(reason) {
          if (that._done)
            return;

          that._done = true;
          onRejected(reason);
        });
      } catch (e) {
        if (that._done)
          return;

        that._done = true;
        onRejected(e);
      }
    }
  };

  var _fulfill = function(result) {
    that._state = that._states.FULFILLED;
    that._value = result;

    _callHandlers();
  };

  var _reject = function(reason) {
    that._state = that._states.REJECTED;
    that._value = reason;

    _callHandlers();
  };

  var _resolve = function(result) {
    try {
      var then = _Utils.getThen(result);

      if (then) {
        _Utils.doResolve(then.bind(result), _resolve, _reject);
        return;
      }

      _fulfill(result);
    } catch (e) {
      _reject(e);
    }
  };

  var _handle = function(handler) {
    if (that._state == that._states.PENDING) {
      that._handlers.push(handler);
    } else {
      if (that._state === that._states.FULFILLED &&
        typeof handler.onFulfilled === 'function') {
          handler.onFulfilled(that._value);
      }

      if (that._state === that._states.REJECTED &&
        typeof handler.onRejected === 'function') {
          handler.onRejected(that._value);
      }
    }
  };

  var _callHandlers = function() {
    that._handlers.forEach(_handle);
    that._handlers = null;
  };

  this.done = function(onFulfilled, onRejected) {
    setTimeout(function() {
      _handle({
        onFulfilled: onFulfilled,
        onRejected: onRejected
      });
    }, 0);
  };

  this.catch = function(onRejected) {
    this.then(null, onRejected);
  };

  this.then = function(onFulfilled, onRejected) {
    return new Promise(function(resolve, reject) {
      return this.done(function(result) {
        if (typeof onFulfilled === 'function') {
          try {
            return resolve(onFulfilled(result));
          } catch (e) {
            reject(onRejected(e));
          }
        } else {
          return resolve(result);
        }
      }, function(error) {
        if (typeof onRejected === 'function') {
          try {
            return resolve(onRejected(error));
          } catch (e) {
            return reject(e);
          }
        } else {
          return reject(error);
        }
      });
    });
  };

  _Utils.doResolve(task, _resolve, _reject);
});

Promise.resolve = function(value) {
  return new Promise(function(resolve) {
    resolve(value);
  });
};

Promise.reject = function(value) {
  return new Promise(function(resolve, reject) {
    reject(value);
  });
};

module.exports = {
  resolved: function(value) {
    return Promise.resolve(value);
  },
  rejected: function(reason) {
    return Promise.reject(reason);
  }
};
