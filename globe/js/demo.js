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
  console.log(globe_scale);
  var globe = new ORBITAL.Globe($container, {scale: globe_scale});
  globe.animate();

  var addGeoPoint = function(latitude, longitude) {
    var point = globe.getPoint(latitude, longitude);

    if (!point) {
      point = {lat:latitude, lng:longitude, mag:0};
    }

    var mag = point.mag;
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

    point.mag += add * 0.001;
    globe.addPoint(point.lat, point.lng, point.mag);

  };

  var handleGeoEvent = function(e) {
    var startTime = new Date();
    var data = JSON.parse(e.data);
    var geo = data.message_body.geo;

    if (geo) { // geo might be undefined
      addGeoPoint(geo.latitude, geo.longitude);
      if(e.type == "Post"){
        requestAnimationFrame(function(){showPost(data);});
      }
    }

  };

  var showPost = _.debounce(function(message) {
    var mb = message.message_body;

    var postinfo = $("#postInfo");

    var $postbox = $("<div>");
    var $post = $("<div>");
    var $avatar = $("<img>");

    $postbox.addClass("postbox");
    $post.addClass("post");
    $avatar.addClass("avatar");

    $avatar.attr("src", mb.author.avatar);
    $post.html(mb.post.messages.formatted);

    // $post.prepend($avatar);
    $postbox.append($post);

    postinfo.append($postbox);

    while(postinfo.height() > window.innerHeight){
      $("#postInfo div:first").remove();
    }

    // globe.setFocus(mb.geo.latitude, mb.geo.longitude);

  }, 0);

  var ageGeoPoints = function() {
    for (var key in globe.pointCache) {
      var point = globe.pointCache[key];
      point.age().update();
    }
    _.delay(ageGeoPoints, 0.1);
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

  // globe.addFocusPoint('new york', 40.77, 73.98, 3);
  // globe.addFocusPoint('london', 50.5, 0.166, 3);
  // globe.focusRotate();

}
