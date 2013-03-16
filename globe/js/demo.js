if (!window.RequestAnimationFrame) {
  window.RequestAnimationFrame = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (f) { return setTimeout(f, 0); };
}
if(System.support.webgl === false){

  var message = document.createElement( 'div' );
  message.style.cssText = 'font-family:monospace;font-size:13px;text-align:center;color:#fff;background:#333;padding:1em;width:540px;margin:30em auto 0';
  message.innerHTML = 'Either your graphics card or your browser does not support WebGL.<br /><a href="http://www.khronos.org/webgl/wiki_1_15/index.php/Getting_a_WebGL_Implementation">View a list</a> of WebGL compatible browsers.';
  document.body.appendChild( message );
  document.body.style.background = '#000000';

} else {

  var $container = $('#container');
  var globe_scale = parseInt(ORBITAL.Util.getParameterByName('globeScale'), 10) || 1;
  var globe = new ORBITAL.Globe($container, {scale: globe_scale});
  globe.animate();

  var addGeoPoint = function(latitude, longitude) {
    var point = globe.getPoint(latitude, longitude) || {lat:latitude, lng:longitude, mag:0};

    var mag = point.mag;
    var add;

    var scale = 1;

    if (mag < 0.01 * scale) {
      add = .01;
    } else if (mag < 0.05 * scale) {
      add = .005;
    } else if (mag < 0.1 * scale) {
      add = .001;
    } else if (mag < 0.3 * scale) {
      add = .0005;
    } else if (mag < 0.6 * scale) {
      add = .0003;
    } else if (mag < 0.9 * scale) {
      add = .0001;
    } else {
      add = 0;
    }

    point.mag += add;
    globe.addPoint(point.lat, point.lng, point.mag);

  };

  var handleGeoEvent = function(e) {
    var data = JSON.parse(e.data);
    var geo = data.message_body.geo;

    if (geo) { // geo might be undefined
      addGeoPoint(geo.latitude, geo.longitude);
/*      if(e.type == "Post"){
        requestAnimationFrame(function(){showPost(data);});
      }
*/
    }

  };

  var postinfo = document.getElementById("postInfo");
  var remove = false;
  var showPost = _.debounce(function(message) {
    var mb = message.message_body;

    var postbox = document.createElement('div');
    postbox.className = 'postbox';
    postbox.innerHTML = '<div class="post">' + mb.post.messages.formatted + '</div>';

    postinfo.appendChild(postbox);

    remove = remove || (postinfo.offsetHeight > window.innerHeight);
    if (remove)
        postinfo.removeChild(postinfo.firstChild);
  }, 0);

  var ageGeoPoints = function() {
    var keys = Object.keys(globe.pointCache);
    for (var i = keys.length-1; i>=0; i--) {
      var point = globe.pointCache[keys[i]];
      point.age().update();
    }
    _.delay(ageGeoPoints, 100);
  };
  ageGeoPoints();

  try {
    var ev = new EventSource("http://realtime.services.disqus.com/api/raw/orbital");
  } catch (e) {
    var ev = new EventSourcePollyfill("http://realtime.services.disqus.com/api/raw/orbital");
  }

  ev.addEventListener("Post", handleGeoEvent);
  ev.addEventListener("Vote", handleGeoEvent);
  ev.addEventListener("ThreadVote", handleGeoEvent);

}
