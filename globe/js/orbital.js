var ORBITAL = ORBITAL || { REVISION: 1};

ORBITAL.getTemporaryLogger = function(duration) {
    duration = duration || 1000;
    return _.throttle(function(x){console.log(x);}, duration);
};
