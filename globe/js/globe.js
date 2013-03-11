ORBITAL.Globe = function($container, opts) {
    self = self || {};
    opts = opts || {};

    opts.scale = opts.scale || 2;
    opts.worldImage = opts.worldImage || 'world.jpg';

    self.hslList = [
        _.clone(new THREE.Color("#FF0900").getHSL()), //#FF2E46 is on 'wrong side of hsl'
        _.clone(new THREE.Color("#FF632E").getHSL()),
        _.clone(new THREE.Color("#FFC62E").getHSL()),
        _.clone(new THREE.Color("#4BAD00").getHSL()),
        // _.clone(new THREE.Color("#922EFF").getHSL()),
        _.clone(new THREE.Color("#2E9FFF").getHSL())
    ];

    var shaders = {
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
    self.pointCache = [];
    self.focusPoints = [];
    self.earth = null;

    var camera, sceneAtmosphere, renderer, w, h;
    var vector, mesh, atmosphere, point;

    var overRenderer;
    var imgDir = '';
    var curZoomSpeed = 0;
    var zoomSpeed = 50;
    var mouse = { x: 0, y: 0 };
    var mouseOnDown = { x: 0, y: 0 };
    var rotation = { x: 0, y: 0 };
    var target = { x: Math.PI*3/2, y: Math.PI / 6.0 };
    var targetOnDown = { x: 0, y: 0 };
    var distance = 100000;
    var distanceTarget = 100000;
    var padding = 40;
    var PI_HALF = Math.PI / 2;

    init = function() {
        var shader, uniforms, material, earth_geometry;

        w = $container.offsetWidth || window.innerWidth;
        h = $container.offsetHeight || window.innerHeight;

        camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
        camera.position.z = distance;

        vector = new THREE.Vector3();
        self.scene = new THREE.Scene();
        sceneAtmosphere = new THREE.Scene();

        // Earth
        earth_geometry = new THREE.SphereGeometry(200, 40, 30);

        shader = shaders['earth'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms['texture'].value = THREE.ImageUtils.loadTexture(imgDir+opts.worldImage);

        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader
        });

        self.earth = new THREE.Mesh(earth_geometry, material);
        self.earth._type = 'earth';
        self.earth.rotation.y = Math.PI;
        self.scene.add(self.earth);

        // atmosphere
        shader = shaders['atmosphere'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            side: THREE.BackSide
        });

        mesh = new THREE.Mesh(earth_geometry, material);
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
        $(document).on('keydown', onDocumentKeyDown);
        $(window).on('resize', onWindowResize);
        $container.on('mousedown', onMouseDown);
        $container.on('mousemove', onMouseMoveWithMouseUp);
        $container.on('mouseout', function() {overRenderer = false; });
        $container.on('mouseover', function() {overRenderer = true; });
        $container.on('mousewheel', onMouseWheel);
    };

    self.addData = function(data) {
        _.each(_.values(data), function(p) {
            addPoint(p.lat, p.lng, p.mag);
        });
    };

    self.getPoint = function(lat, lng) {
        var key = self.llkey(lat, lng);
        if (key in self.pointCache) {
            return self.pointCache[key];
        }
    };

    self.addPoint = function(lat, lng, mag) {
        var ll = self.llround(lat, lng);
        var key = self.llkey(ll.lat, ll.lng);
        var point = null;
        if (key in self.pointCache){
            point = self.pointCache[key];
            point.setMag(mag);
        } else {
            point = new ORBITAL.Point(ll.lat, ll.lng, mag, mesh, self.scene, opts);
            self.pointCache[key] = point;
        }
        point.update({
            flash:true,
            flashOver:true,
            flashDuration:10 * 1000,
            flashHSLList: self.hslList
        });
    };

    self.roundPoint = function(coord) {
        return ORBITAL.GeoUtil.roundPoint(coord, opts.scale);
    };

    self.llround = function(lat, lng) {
        return {
            lat: self.roundPoint(lat),
            lng: self.roundPoint(lng)
        };
    };

    self.llkey = function(lat, lng) {
        ll = self.llround(lat, lng);
        return ORBITAL.GeoUtil.llkey(ll.lat, ll.lng);
    };

    var projector = new THREE.Projector();

    self.onMouseMoveWithMouseUp = function(event) {
        event.preventDefault();

        var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        var vector = new THREE.Vector3(mouseX, mouseY, 0.5);

        projector.unprojectVector(vector, camera);

        var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

        var intersects = ray.intersectObjects(self.scene.children);

        if (intersects.length > 0) {
            _.each(intersects, function(point) {
                if(point.object.type == "point"){
                    var geometry = point.object.geometry;

                    var color = ORBITAL.Util.colorFnRand();
                    ORBITAL.PointUtil.setPointColor(point.object, color);

                    geometry.colorsNeedUpdate = true;
                }
            });
        }
    };

    self.onMouseMoveWithMouseDown = function(event) {
        mouse.x = - event.clientX;
        mouse.y = event.clientY;

        var zoomDamp = distance/1000;

        target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

        target.y = target.y > PI_HALF ? PI_HALF : target.y;
        target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
    };

    self.onMouseDown = function(event) {
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
    };

    self.onMouseUp = function(event) {
        // on
        // $container.on('mousemove', onMouseMoveWithMouseUp);

        // off
        $container.off('mousemove', onMouseMoveWithMouseDown);
        $container.off('mouseup', onMouseUp);
        $container.off('mouseout', onMouseOut);
        $container.attr('style', 'cursor: auto');
    };

    self.onMouseOut = function(event) {
        // off
        $container.off('mousemove', onMouseMoveWithMouseUp);
        $container.off('mousemove', onMouseMoveWithMouseDown);
        $container.off('mouseup', onMouseUp);
        $container.off('mouseout', onMouseOut);
    };

    self.onMouseWheel = function(event) {
        event.preventDefault();
        if (overRenderer) {
            zoom(event.originalEvent.wheelDeltaY * 0.3);
        }
        return false;
    };

    self.onDocumentKeyDown = function(event) {
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
    };

    self.onWindowResize = function( event ) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    };

    self.zoom = function(delta) {
        distanceTarget -= delta;
        distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
        distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
    };

    self.animate = function() {
        requestAnimationFrame(animate);
        render();
    };

    self.focusRotate = function() {
        // move the focus between points on the focus list
        if (self.focusPoints !== undefined && self.focusPoints.length > 0) {

            t = self.focusPoints[0];
            xyz = ORBITAL.GeoUtil.xyzFromGeo(t.lat, t.lng);
            self.glide(xyz.x, xyz.y);

            self.focusPoints.push(self.focusPoints.shift());
            _.delay(focusRotate, t.duration * 1000);
        }
    };

    self.addFocusPoint = function(name, lat, lng, duration){
        // add a point to the list of focus points
        if (!self.focusPoints) {
            self.focusPoints = [];
        }

        var xyz = ORBITAL.GeoUtil.xyzFromGeo(lat, lng);
        self.focusPoints.push({name:name, x:xyz.x, y:xyz.y, z:xyz.z, duration:duration});
    };

    self.setFocus = function(lat, lng, opts){
        // move the camera to a lat, lng
        opts = opts || {};

        t = ORBITAL.GeoUtil.xyzFromGeo(lat, lng);
        self.glide(t.x, t.y);

        if(opts.hilight) {
            point = self.pointCache[self.llkey(lat, lng)];

        }
    };

    self.glide = _.throttle(function(x, y, duration) {
        // glide the globe to x, y over 1 second

        duration = duration || 1000;

        var zoomDamp = distance/1000;

        t = {
            x:x * 0.005 * zoomDamp,
            y:y * 0.005 * zoomDamp
        };

        t.y = target.y > PI_HALF ? PI_HALF : target.y;
        t.y = target.y < - PI_HALF ? - PI_HALF : target.y;

        var tween = new TWEEN.Tween(target).to(t, duration);
        tween.start();
    }, 1000);

    self.render = function() {
        zoom(curZoomSpeed);
        TWEEN.update();

        // make the earth slowly rotate
        target.x += -0.001;

        rotation.x += (target.x - rotation.x) * 0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

        // we actually move the camera, not the sphere.
        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

        // TODO: figure out how to move the earth, not the camera.

        // use these:
        // self.earth.rotation.x;
        // self.earth.rotation.y;
        // self.earth.rotation.x;

        // instead of these:
        // camera.position.x = 866;
        // camera.position.y = 500;
        // camera.position.z = 0;

        camera.lookAt(self.scene.position);

        vector.copy(camera.position);

        renderer.clear();
        renderer.render(self.scene, camera);
        renderer.render(sceneAtmosphere, camera);
    };

    init();

    return self;
};

