if(System.support.webgl === false){

  var message = document.createElement( 'div' );
  message.style.cssText = 'font-family:monospace;font-size:13px;text-align:center;color:#fff;background:#333;padding:1em;width:540px;margin:30em auto 0';
  message.innerHTML = 'Either your graphics card or your browser does not support WebGL.<br /><a href="http://www.khronos.org/webgl/wiki_1_15/index.php/Getting_a_WebGL_Implementation">View a list</a> of WebGL compatible browsers.';
  document.body.appendChild( message );
  document.body.style.background = '#000000';

} else {

  var container = document.getElementById('container');
  var globe = new DAT.Globe(container);

  var subgeo = new THREE.Geometry();
  var size = 200;

  var counter = 0;
  var geoPoints = {};
  var decay = 0.0001;

  var ageGeoData = _.throttle(function() {
    var d;

    for (var key in geoPoints) {
      d = geoPoints[key];
      if(++d.age >= 5) {
        d.mag -= decay;
        if (d.mag <= 0) {
          delete geoPoints[key];
        }
      }
    }
  }, 1000);

var throttle_time = 100;
var doTween = _.throttle(function () {
  globe.addData(geoPoints);
  // globe.createPoints();
  throttle_time += throttle_time < 10000 ? throttle_time : throttle_time;
  }, throttle_time);

var roundPoint = function(x) {
  var scale = 2;
  return parseFloat((Math.round(x * scale) / scale).toFixed(2));
};

var addGeoPoint = function(latitude, longitude) {

  var lat = roundPoint(latitude);
  var lng = roundPoint(longitude);

  var key = lat + ":" + lng;
  if (!(key in geoPoints)) {
    geoPoints[key] = {lat:lat, lng:lng, mag:0, age:0};
  } else {
    var mag = geoPoints[key].mag;
    var add = 0;

    var scale = 1;

    if (mag < 0.01 * scale) {
      add = 10;
    } else if (mag < 0.05 * scale) {
      add = 5;
    } else if (mag < 0.1 * scale) {
      add = 1;
    } else if (mag < 0.3 * scale) {
      add = 0.5;
    } else if (mag < 0.6 * scale) {
      add = 0.3;
    } else if (mag < 0.9 * scale) {
      add = 0.1;
    } else if (mag == 1 * scale) {
      add = 0;
    } else {
      add = 0;
    }

    geoPoints[key].mag += add * 0.001;
  }
};

var handleGeoEvent = function(e) {
  var startTime = new Date();
  var data = JSON.parse(e.data);
  var geo = data.message_body.geo;

  var size = 0;

    if (geo) { // geo might be undefined
      if (e.type == "Post") {size = 0.01;}
      else if (e.type == "Vote") {size = 0.2;}
      else if (e.type == "ThreadVote") {size = 0.1;}

      addGeoPoint(geo.latitude, geo.longitude);
      doTween();
      ageGeoData();
    } else {
    }

  };

  var ev = new EventSource("http://realtime.services.disqus.com/api/raw/orbital");

  ev.addEventListener("Post", handleGeoEvent);
  ev.addEventListener("Vote", handleGeoEvent);
  ev.addEventListener("ThreadVote", handleGeoEvent);

  globe.animate();
  // globe.addFocusPoint('nyc', 40.77, 73.98, 3);
  // globe.addFocusPoint('london', 50.5, 0.166, 3);

  globe.focusRotate();

}
