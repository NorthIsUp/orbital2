ORBITAL.Util = (function (self) {
    self = self || {};

    self.colorFn = function(x) {
        var c = new THREE.Color();
        var h = (0.6-(x*0.5));
        var s = 1.0;
        var v = 1.0;
        c.setHSL(h,s*v/((h=(2-s)*v)<1?h:2-h),h/2);
        return c;
    };

    self.colorFnRand = function() {
        var c = new THREE.Color();
        var r = ('0' + Math.floor(Math.random() * 256).toString(16)).substr(-2); // red
        var g = ('0' + Math.floor(Math.random() * 256).toString(16)).substr(-2); // green
        var b = ('0' + Math.floor(Math.random() * 256).toString(16)).substr(-2); // blue
        c.setRGB(r, g, b);
        return c;
    };
    return self;
}());
