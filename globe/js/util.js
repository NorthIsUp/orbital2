ORBITAL.Util = (function (self) {
    self = self || {};

    /**
     * Converts h, s, v values to h, s, l
     */
    self.HSVToHSL = function(h, s, v) {
        return {
            h: h,
            s: s * v / ((h=(2-s)*v)<1 ? h : 2-h),
            l: h/2
        };
    };

    /**
     * Returns a random color.
     */
    self.colorFn = function(x) {
        var c = new THREE.Color();
        var h = (0.6-(x*0.5));
        var s = 1.0;
        var v = 1.0;

        hsl = self.HSVToHSL(h, s, v);

        // convert HSV to HSL
        c.setHSL(hsl.h, hsl.s, hsl.l);
        return c;
    };

    /**
     * Returns a random color.
     */
    self.colorFnRand = function() {
        var c = new THREE.Color();

        // random hue between 0 and 1
        var h = Math.random();

        // random s, v between 0.5 and 1 to keep it colorful
        var s = self.getRandomFloat(0.5, 1);
        var v = self.getRandomFloat(0.5, 1);

        hsl = self.HSVToHSL(h, s, v);

        // convert HSV to HSL
        c.setHSL(hsl.h, hsl.s, hsl.l);
        return c;
    };

    /**
     * Returns a random number between min and max
     */
    self.getRandomFloat = function (min, max) {
        return Math.random() * (max - min) + min;
    };

    /**
     * Returns a random integer between min and max
     * Using Math.round() will give you a non-uniform distribution!
     */
    self.getRandomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };


    self.getParameterByName = function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.search);
        if(results === null)
            return "";
        else
            return decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    return self;
}());
