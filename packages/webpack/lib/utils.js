"use strict";
function wrapCallback(fn, cb) {
    fn.then(function (r) { return cb(); }, function (err) { return cb(err); });
}
exports.wrapCallback = wrapCallback;
