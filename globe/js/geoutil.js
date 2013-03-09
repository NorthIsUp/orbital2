ORBITAL.GeoUtil = (function (self) {
    self = self || {};

    self.llkey = function(lat, lng){
        return lat + ":" + lng;
    };

    self.xyzFromGeo = function(lat, lng) {
        var phi = (90 - lat) * Math.PI / 180;
        var theta = (180 - lng) * Math.PI / 180;

        x = 200 * Math.sin(phi) * Math.cos(theta);
        y = 200 * Math.cos(phi);
        z = 200 * Math.sin(phi) * Math.sin(theta);

        return {x:x, y:y, z:z};
    };

    return self;
}());
