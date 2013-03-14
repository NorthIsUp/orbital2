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
globe.addPoint(lat, lng, mag);
```

The globe internally keeps track of points you have added. If you use the same latitude and longitude it will update the existing point instead of creating a new one.

To intentionally alter metadata on an existing point use the `globe.getPoint(lat, lng)` method.

