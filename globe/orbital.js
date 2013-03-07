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
  var queue = {};

  var getGeoData = function() {
    var data = [];
    for (var key in queue) {
      var d = queue[key];
      data.push(d[0], d[1], d[2]);
    }
    return data;
  };

  var doTween = _.throttle(function () {
    var dataToAdd = {format: 'magnitude', name: ++counter, animated: false};
    globe.addData(getGeoData(), dataToAdd);
    globe.createPoints();
    // new TWEEN.Tween(globe).to({time: 1},1000).easing(TWEEN.Easing.Cubic.Out).start();
  }, 1000);

  var roundPoint = function(x) {
    var scale = 2;
    return (Math.round(x * scale) / scale).toFixed(2);
  };

  var addGeoPoint = function(latitude, longitude) {

    var lat = roundPoint(latitude);
    var lon = roundPoint(longitude);

    var point = [lat, lon];
    if (!(point in queue)) {
      queue[point] = [lat, lon, 0];
    } else {
      var value = queue[point][2];
      var add = 0;

      var scale = 1;

      if (value < 0.01 * scale) {
        add = 10;
      } else if (value < 0.05 * scale) {
        add = 1;
      } else if (value < 0.1 * scale) {
        add = 0.5;
      } else if (value < 0.3 * scale) {
        add = 0.3;
      } else if (value < 0.6 * scale) {
        add = 0.1;
      } else if (value < 0.9 * scale) {
        add = 0.01;
      } else if (value == 1 * scale) {
        add = 0;
      } else {
        add = 0;
      }

      queue[point][2] += add * 0.001;
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
    } else {
    }

  };

  var ev = new EventSource("http://realtime.services.disqus.com/api/raw/orbital");

  ev.addEventListener("Post", handleGeoEvent);
  ev.addEventListener("Vote", handleGeoEvent);
  ev.addEventListener("ThreadVote", handleGeoEvent);

  var animate = function(){
    requestAnimationFrame(animate);
    TWEEN.update();
  };


  animate();
  globe.animate();
  // globe.addFocusPoint('nyc', 40.77, 73.98, 3);
  // globe.addFocusPoint('london', 50.5, 0.166, 3);

  globe.focusRotate();

}
