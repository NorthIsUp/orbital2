ORBITAL.GeoUtil = (function (self) {
    self = self || {};

    /**
     * rounds a point to the closest 1/scale in.
     */
    self.roundPoint = function(coord, scale) {
        scale = scale || 1;
        return parseFloat((Math.round(coord * scale) / scale).toFixed(2));
    };

    /**
     * returns a dictionary key constructed from a lat, lng pair
     */
    self.llkey = function(lat, lng){
        return lat + ":" + lng;
    };

    /**
     * return the correct x, y, and z coordinates for a lat, lng pair.
     */
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
