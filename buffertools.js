'use strict';

var SlowBuffer = require('buffer').SlowBuffer;
var Buffer = require('buffer').Buffer;

// requires node 3.1
var events = require('events');
var util = require('util');

var buffertools = {};

var unaryAction = function(f) {
  return function() {
    var target = this;
    if (target instanceof Buffer) {
    } else if (arguments[0] instanceof Buffer) {
      target = arguments[0];
      Array.prototype.shift.apply(arguments);
    } else {
      throw Error('Argument should be a buffer object.');
    }
    f.apply(target, arguments);
  };
};

buffertools.clear = unaryAction(function() {
});

exports.extend = function() {
  var receivers;
  if (arguments.length > 0) {
    receivers = Array.prototype.slice.call(arguments);
  } else if (typeof SlowBuffer === 'function') {
    receivers = [Buffer.prototype, SlowBuffer.prototype];
  } else {
    receivers = [Buffer.prototype];
  }
  for (var i = 0, n = receivers.length; i < n; i += 1) {
    var receiver = receivers[i];
    for (var key in buffertools) {
      receiver[key] = buffertools[key];
    }
    if (receiver !== exports) {
      receiver.concat = function() {
        var args = [this].concat(Array.prototype.slice.call(arguments));
        return buffertools.concat.apply(buffertools, args);
      };
    }
  }
};
exports.extend(exports);

//
// WritableBufferStream
//
// - never emits 'error'
// - never emits 'drain'
//
function WritableBufferStream() {
  this.writable = true;
  this.buffer = null;
}

util.inherits(WritableBufferStream, events.EventEmitter);

WritableBufferStream.prototype._append = function(buffer, encoding) {
  if (!this.writable) {
    throw new Error('Stream is not writable.');
  }

  if (Buffer.isBuffer(buffer)) {
    // no action required
  }
  else if (typeof buffer == 'string') {
    // TODO optimize
    buffer = new Buffer(buffer, encoding || 'utf8');
  }
  else {
    throw new Error('Argument should be either a buffer or a string.');
  }

  // FIXME optimize!
  if (this.buffer) {
    this.buffer = buffertools.concat(this.buffer, buffer);
  }
  else {
    this.buffer = new Buffer(buffer.length);
    buffer.copy(this.buffer);
  }
};

WritableBufferStream.prototype.write = function(buffer, encoding) {
  this._append(buffer, encoding);

  // signal that it's safe to immediately write again
  return true;
};

WritableBufferStream.prototype.end = function(buffer, encoding) {
  if (buffer) {
    this._append(buffer, encoding);
  }

  this.emit('close');

  this.writable = false;
};

WritableBufferStream.prototype.getBuffer = function() {
  if (this.buffer) {
    return this.buffer;
  }
  return new Buffer(0);
};

WritableBufferStream.prototype.toString = function() {
  return this.getBuffer().toString();
};

exports.WritableBufferStream = WritableBufferStream;
