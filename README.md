See it in action here http://map.labs.disqus.com/

Full disclosure: This is literally the first javascript I have written that was not in a w3c schools sandbox, sorry if it is more pythonic than javascript.

The **WebGL Globe** is an open platform for visualizing geographic
information in WebGL enabled browsers.
It supports data in JSON format, a sample of which you can find [here]
(https://github.com/dataarts/dat.globe/raw/master/globe/population909500.json). dat.globe makes heavy use of the [Three.js](https://github.com/mrdoob/three.js/)
library, and is still in early open development.


### making a globe ###
The globe requires a container to be drawn in, and for you to start the animation.

```
var $container = $('#container');
var globe = new ORBITAL.Globe($container);
globe.animate();
```


### Adding data to the globe ###
Adding a point to the globe will occur in realtime and you can do it whenever you want.

```
var point = globe.addPoint(lat, lng, mag);
```

The globe internally keeps track of points you have added. If you use the same latitude and longitude it will update the existing point instead of creating a new one.

To intentionally alter metadata on an existing point use the `globe.getPoint(lat, lng)` method.

### Removing data from the globe ###
Here's how to remove a point.

```
globe.removePoint(lat,lng);
```

If you don't have a reference to a point you may also get to it by using it's longitude and latitude.
```
var point = globe.getPoint(40.227121, -74.932938);
```

### Colors ###

New points will use the color assigned in `ORBITAL.Globe.defaultColor`.
To use a custom color simply pass in an object specifying the magnitude of the RGB colors as properties like so.

```
var point = globe.addPoint(lat, lng, mag, {r: 55/255, g: 123/255, b: 89/255});
```

You may also change the color of a point after creating it.

```
var point = globe.addPoint(lat, lng, mag);
ORBITAL.PointUtil.setPointColor(point,{r: 55/255, g: 123/255, b: 89/255});
```

Point colors may also morph colors via an animated sequence.
```
hslList = [
	_.clone(new THREE.Color("#FF0900").getHSL()),
	_.clone(new THREE.Color("#FF632E").getHSL()),
	_.clone(new THREE.Color("#FFC62E").getHSL()),
	_.clone(new THREE.Color("#4BAD00").getHSL()),
	_.clone(new THREE.Color("#2E9FFF").getHSL())
];

point.update({
	flash:true,
	flashOver:true,
	flashDuration:10 * 1000,
	flashHSLList: hslList
});
```

This sequence will move through all the colors defined in the list over the course of a 10 second period.