ORBITAL.Globe = function($container, colorFn) {
    self = self || {};

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

    // TODO: document all this stuff
    var pointCache = [];
    var camera, scene, sceneAtmosphere, renderer, w, h;
    var vector, mesh, atmosphere, point;
    var overRenderer;
    var imgDir = '';
    var curZoomSpeed = 0;
    var zoomSpeed = 50;
    var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
    var rotation = { x: 0, y: 0 };
    var target = { x: Math.PI*3/2, y: Math.PI / 6.0 };
    var targetOnDown = { x: 0, y: 0 };
    var focusPoints = [];
    var distance = 100000, distanceTarget = 100000;
    var padding = 40;
    var PI_HALF = Math.PI / 2;

    function init() {
        var shader, uniforms, material, geometry;

        // TODO: move to less
        $container.attr('style', 'color: #fff');
        $container.attr('style', 'font: 13px/20px Arial, sans-serif');

        w = $container.offsetWidth || window.innerWidth;
        h = $container.offsetHeight || window.innerHeight;

        camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
        camera.position.z = distance;

        vector = new THREE.Vector3();
        scene = new THREE.Scene();
        sceneAtmosphere = new THREE.Scene();

        // Earth
        geometry = new THREE.SphereGeometry(200, 40, 30);

        shader = Shaders['earth'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms['texture'].value = THREE.ImageUtils.loadTexture(imgDir+'world-2.jpg');

        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh._type = 'earth';
        mesh.rotation.y = Math.PI;
        scene.add(mesh);

        // atmosphere
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

        // renderer
        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.autoClear = false;
        renderer.setClearColorHex(0x000000, 0.0);
        renderer.setSize(w, h);

        renderer.domElement.style.position = 'absolute';

        $container.append(renderer.domElement);

        // Event listeners
        $container.on('mousedown', onMouseDown);
        $container.on('mousewheel', onMouseWheel);
        $container.on('mousemove', onMouseMoveWithMouseUp);
        $(document).on('keydown', onDocumentKeyDown);
        $(window).on('resize', onWindowResize);
        $container.on('mouseover', function() {overRenderer = true; });
        $container.on('mouseout', function() {overRenderer = false; });
    }



    function addData(data) {
        _.each(_.values(data), function(p) {
            addPoint(p.lat, p.lng, p.mag);
        });
    }

    function addPoint(lat, lng, mag) {
        var key = ORBITAL.GeoUtil.llkey(lat, lng);
        var point = null;
        if (key in pointCache){
            point = pointCache[key];
            point.setMag(mag);
            point.update();
        } else {
            point = new ORBITAL.Point(lat, lng, mag, mesh);
            pointCache[key] = point;
        }
    }

    var projector = new THREE.Projector();

    function onMouseMoveWithMouseUp(event) {
        event.preventDefault();

        var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        var vector = new THREE.Vector3(mouseX, mouseY, 0.5);

        projector.unprojectVector(vector, camera);

        var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

        var intersects = ray.intersectObjects(scene.children);

        if (intersects.length > 0) {
            _.each(intersects, function(point) {
                if(point.object.type == "point"){
                    var geometry = point.object.geometry;

                    _.each(geometry.faces, function(face){
                        face.color = ORBITAL.Util.colorFnRand();
                    });

                    geometry.colorsNeedUpdate = true;
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
        // on
        $container.on('mousemove', onMouseMoveWithMouseDown);
        $container.on('mouseup', onMouseUp);
        $container.on('mouseout', onMouseOut);

        // off
        $container.off('mousemove', onMouseMoveWithMouseUp);


        mouseOnDown.x = - event.clientX;
        mouseOnDown.y = event.clientY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

        $container.attr('style', 'cursor: move');
    }

    function onMouseUp(event) {
        // on
        $container.on('mousemove', onMouseMoveWithMouseUp);

        // off
        $container.off('mousemove', onMouseMoveWithMouseDown);
        $container.off('mouseup', onMouseUp);
        $container.off('mouseout', onMouseOut);
        $container.attr('style', 'cursor: auto');
    }

    function onMouseOut(event) {
        // off
        $container.off('mousemove', onMouseMoveWithMouseUp);
        $container.off('mousemove', onMouseMoveWithMouseDown);
        $container.off('mouseup', onMouseUp);
        $container.off('mouseout', onMouseOut);
    }

    function onMouseWheel(event) {
        event.preventDefault();
        if (overRenderer) {
            zoom(event.originalEvent.wheelDeltaY * 0.3);
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

    function focusRotate() {
        if (focusPoints !== undefined && focusPoints.length > 0) {

            t = focusPoints[0];

            focusPoints.push(focusPoints.shift());
            _.delay(focusRotate, t.duration * 1000);
        }
    }

    function addFocusPoint(name, lat, lng, duration){
        if (!self.focusPoints) {
            focusPoints = [];
        }

        var xyz = ORBITAL.GeoUtil.xyzFromGeo(lat, lng);
        focusPoints.push({name:name, x:xyz.x, y:xyz.y, z:xyz.z, duration:duration});
    }

    function setFocus(lat, lng, opts){
        opts = opts || {};

        t = ORBITAL.GeoUtil.xyzFromGeo(lat, lng);
        self.glide(t.x, t.y);

        if(opts.hilight) {
            point = pointCache[ORBITAL.GeoUtil.llkey(lat, lng)];

        }
    }

    var glide = _.throttle(function(x, y) {
        // glide the globe to x, y over 1 second

        var zoomDamp = distance/1000;

        t = {
            x:x * 0.005 * zoomDamp,
            y:y * 0.005 * zoomDamp
        };

        t.y = target.y > PI_HALF ? PI_HALF : target.y;
        t.y = target.y < - PI_HALF ? - PI_HALF : target.y;

        var tween = new TWEEN.Tween(target).to(t, 1000);
        tween.start();
    }, 1000);

    function render() {
        zoom(curZoomSpeed);
        TWEEN.update();

        // make the earth slowly rotate
        // target.x += -0.001;

        rotation.x += (target.x - rotation.x) * 0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

        // we actually move the camera, not the sphere.
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

    self.addData = addData;
    self.addFocusPoint = addFocusPoint;
    self.addPoint = addPoint;
    self.animate = animate;
    self.focusRotate = focusRotate;
    self.glide = glide;
    self.renderer = renderer;
    self.scene = scene;
    self.setFocus = setFocus;

    return self;
};

