/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

 var DAT = DAT || {};

 DAT.Globe = function(container, colorFn) {

  colorFn = colorFn || function(x) {
    var c = new THREE.Color();
    var h = ( 0.6 - ( x * 0.5 ) );
    var s = 1.0;
    var v = 1.0;
    c.setHSL(h,s*v/((h=(2-s)*v)<1?h:2-h),h/2);

    return c;
  };

  var Shaders = {
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: null }
      },
      vertexShader: [
      'varying vec3 vNormal;',
      'varying vec2 vUv;',
      'void main() {',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      'vNormal = normalize( normalMatrix * normal );',
      'vUv = uv;',
      '}'
      ].join('\n'),
      fragmentShader: [
      'uniform sampler2D texture;',
      'varying vec3 vNormal;',
      'varying vec2 vUv;',
      'void main() {',
      'vec3 diffuse = texture2D( texture, vUv ).xyz;',
      'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
      'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
      'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
      '}'
      ].join('\n')
    },
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
      'varying vec3 vNormal;',
      'void main() {',
      'vNormal = normalize( normalMatrix * normal );',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      '}'
      ].join('\n'),
      fragmentShader: [
      'varying vec3 vNormal;',
      'void main() {',
      'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
      'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
      '}'
      ].join('\n')
    }
  };

  var pointObjects = [];

  var camera, scene, sceneAtmosphere, renderer, w, h;
  var vector, mesh, atmosphere, point;

  var overRenderer;

  var imgDir = '';

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: 0, y: 0 },
  target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
  targetOnDown = { x: 0, y: 0 };
  var focusPoints = [];


  var distance = 100000, distanceTarget = 100000;
  var padding = 40;
  var PI_HALF = Math.PI / 2;

  function init() {

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    var shader, uniforms, material;
    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera( 30, w / h, 1, 10000);
    camera.position.z = distance;

    vector = new THREE.Vector3();

    scene = new THREE.Scene();

    sceneAtmosphere = new THREE.Scene();

    var geometry = new THREE.SphereGeometry(200, 40, 30);

    shader = Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['texture'].value = THREE.ImageUtils.loadTexture(imgDir+'world-2.jpg');

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    scene.add(mesh);

    shader = Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: THREE.BackSide

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 1.1;
    sceneAtmosphere.add(mesh);

    geometry = new THREE.CubeGeometry(0.75, 0.75, 1, 1, 1, 1, undefined,
      { px: true, nx: true, py: true, ny: true, pz: false, nz: true}
      );

    geometry.applyMatrix( new THREE.Matrix4().makeTranslation(0,0,0.5) );
    this.point_geometry = geometry;

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.autoClear = false;
    renderer.setClearColorHex(0x000000, 0.0);
    renderer.setSize(w, h);

    renderer.domElement.style.position = 'absolute';

    container.appendChild(renderer.domElement);

    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('mousewheel', onMouseWheel, false);
    container.addEventListener('mousemove', onMouseMoveWithMouseUp, false);

    document.addEventListener('keydown', onDocumentKeyDown, false);

    window.addEventListener('resize', onWindowResize, false);

    container.addEventListener('mouseover', function() {
      overRenderer = true;
    }, false);

    container.addEventListener('mouseout', function() {
      overRenderer = false;
    }, false);
  }

  addData = function(data) {
    var lat, lng, size, color, colorFnWrapper;

    for (var key in data) {
      color = colorFn(data[key].mag);
      size = data[key].mag * 100;
      addPoint(data[key].lat, data[key].lng, size, color, subgeo);
    }
  };

  function xyzFromGeo(lat, lng) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    x = 200 * Math.sin(phi) * Math.cos(theta);
    y = 200 * Math.cos(phi);
    z = 200 * Math.sin(phi) * Math.sin(theta);

    return {x:x, y:y, z:z};
  }

  function addFocusPoint(name, lat, lng, duration){
    if (!this.focusPoints) {
      focusPoints = [];
    }

    var xyz = xyzFromGeo(lat, lng);
    focusPoints.push({name:name, x:xyz.x, y:xyz.y, z:xyz.z, duration:duration});
  }

  function addPoint(lat, lng, size, color, subgeo) {
    var key = lat + ":" + lng;
    var xyz = xyzFromGeo(lat, lng);

    var point;
    if (key in pointObjects) {
      point = pointObjects[key];
      scene.remove(point);
    } else {
      point = new THREE.Mesh(this.point_geometry, new THREE.MeshBasicMaterial({
          color: 0xffffff,
          vertexColors: THREE.FaceColors,
          morphTargets: false
      }));
      pointObjects[key] = point;
    }

    point.position.x = xyz.x;
    point.position.y = xyz.y;
    point.position.z = xyz.z;

    point.lookAt(mesh.position);

    point.scale.z = -size;
    point.updateMatrix();

    for (var i = 0; i < point.geometry.faces.length; i++) {
      point.geometry.faces[i].color = color;
    }

    scene.add(point);
    // THREE.GeometryUtils.merge(subgeo, point);
  }

  var projector = new THREE.Projector();

  function onMouseMoveWithMouseUp(event) {
    event.preventDefault();

    var vector = new THREE.Vector3(
      (event.clientX/window.innerWidth)*2-1,
      -(event.clientY/window.innerHeight)*2+1,
      0.5
    );

    projector.unprojectVector(vector, camera);

    var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

    var intersects = ray.intersectObjects(scene.children);

    if (intersects.length > 0) {
      _.each(intersects, function(point) {
        // if it is CubeGeometry it is a block, not the earth
        if(point.object.geometry instanceof THREE.CubeGeometry){
          point.object.material.color = colorFn(Math.random());
          // _.each(point.object.geometry.faces, function(face){face.color = c;});
        }
      });
    }
  }

  function onMouseMoveWithMouseDown(event) {
    mouse.x = - event.clientX;
    mouse.y = event.clientY;

    var zoomDamp = distance/1000;

    target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

    target.y = target.y > PI_HALF ? PI_HALF : target.y;
    target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
  }

  function onMouseDown(event) {
    event.preventDefault();

    container.removeEventListener('mousemove', onMouseMoveWithMouseUp, false);
    container.addEventListener('mousemove', onMouseMoveWithMouseDown, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);

    mouseOnDown.x = - event.clientX;
    mouseOnDown.y = event.clientY;

    targetOnDown.x = target.x;
    targetOnDown.y = target.y;

    container.style.cursor = 'move';
  }

  function onMouseUp(event) {
    container.addEventListener('mousemove', onMouseMoveWithMouseUp, false);
    container.removeEventListener('mousemove', onMouseMoveWithMouseDown, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor = 'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMoveWithMouseUp, false);
    container.removeEventListener('mousemove', onMouseMoveWithMouseDown, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onMouseWheel(event) {
    event.preventDefault();
    if (overRenderer) {
      zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
      zoom(100);
      event.preventDefault();
      break;
      case 40:
      zoom(-100);
      event.preventDefault();
      break;
    }
  }

  function onWindowResize( event ) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
    distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  focusRotate = function() {
    if (focusPoints !== undefined && focusPoints.length > 0) {

      t = focusPoints[0];
      console.log('rotate', t)

      target.x = t.x * 0.1;
      target.y = t.y * 0.1;

      focusPoints.push(focusPoints.shift());
      console.log(focusPoints)
      _.delay(focusRotate, t.duration * 1000);
    }
  };

  function render() {
    zoom(curZoomSpeed);

    //rotation logic
    // rotation.x += Math.min((target.x - rotation.x) * 0.2, -0.001);
    // rotation.y += (target.y - rotation.y) * 0.3;

    target.x += -0.001;

    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.3;

    camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = distance * Math.sin(rotation.y);
    camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);
    camera.lookAt(scene.position);

    vector.copy(camera.position);

    renderer.clear();
    renderer.render(scene, camera);
    renderer.render(sceneAtmosphere, camera);
  }

  init();
  this.animate = animate;


  this.__defineGetter__('time', function() {
    return this._time || 0;
  });

  this.__defineSetter__('time', function(t) {
    var validMorphs = [];
    var morphDict = this.points.morphTargetDictionary;
    for(var k in morphDict) {
      if(k.indexOf('morphPadding') < 0) {
        validMorphs.push(morphDict[k]);
      }
    }
    validMorphs.sort();
    var l = validMorphs.length-1;
    var scaledt = t*l+1;
    var index = Math.floor(scaledt);
    for (i=0;i<validMorphs.length;i++) {
      this.points.morphTargetInfluences[validMorphs[i]] = 0;
    }
    var lastIndex = index - 1;
    var leftover = scaledt - index;
    if (lastIndex >= 0) {
      this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
    }
    if (this.animated) {
      this.points.morphTargetInfluences[index] = leftover;
    }
    this._time = t;
  });

  this.addData = addData;
  // this.createPoints = createPoints;
  this.renderer = renderer;
  this.scene = scene;
  this.addFocusPoint = addFocusPoint;
  this.focusRotate = focusRotate;

  return this;

};

