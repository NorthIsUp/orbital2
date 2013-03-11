ORBITAL.PointUtil = (function (self) {
    self = self || {};

    self.setPointHSL = function (point, hsl) {
        // work for either the point class or a mesh
        mesh = point.mesh || point;
        mesh.material.color.setHSL(hsl.h, hsl.s, hsl.l);

        // _.each(point.geometry.faces, function(face){
        //     face.color.setHSL(hsl.h, hsl.s, hsl.l);
        // });
        // point.geometry.colorsNeedUpdate = true;
    };

    self.setPointColor = function (point, color) {
        // work for either the point class or a mesh
        mesh = point.mesh || point;
        mesh.material.color = color;

        // _.each(point.geometry.faces, function(face){
        //     face.color = color;
        // });
        // point.geometry.colorsNeedUpdate = true;
    };

    self.getNewSquareMesh = function(width) {
        return this.getNewMesh(width, width);
    };

    self.getNewMesh = function(length, width) {
        var point_geometry = new THREE.CubeGeometry(length, width, 1, 1, 1, 1, undefined,
            { px: true, nx: true, py: true, ny: true, pz: false, nz: true}
        );

        point_geometry.applyMatrix( new THREE.Matrix4().makeTranslation(0,0,0.5) );
        point_geometry.dynamic = true;

        var mesh = new THREE.Mesh(point_geometry,
            new THREE.MeshBasicMaterial({
                color: 0xFF0000,
                shading: THREE.SmoothShading,
                vertexColors: THREE.FaceColors,
                morphTargets: false
        }));

        return mesh;
    };

    self.meshUpdate = function(point, opts) {
        opts = opts || {};

        if(opts.x) {
            point.mesh.position.x = opts.x;
        }

        if(opts.y) {
            point.mesh.position.y = opts.y;
        }

        if(opts.z) {
            point.mesh.position.z = opts.z;
        }

        if(opts.mag) {
            point.mesh.scale.z = -(opts.mag * 100);
            if(!opts.color && !point.flashTween) {
                opts.color = ORBITAL.Util.colorFn(opts.mag);
            }
        }

        if(opts.flash && !point.flashTween) {
            // get current color
            var beforeColor = ORBITAL.Util.colorFn(point.mag);

            //point.mesh.geometry.faces[0].color.getHSL();
            var flashColor = opts.flash;

            // set to flash color
            self.setPointColor(point, flashColor);
            // self.setPointFacesColor(point.mesh, flashColor);

            var flashUpdate = function() {
                self.setPointHSL(this.mesh, this);
            };

            var flashComplete = function(){
                delete this.flashTween;
            };

            // tween to new color
            opts.flashDuration = opts.flashDuration || 1000;
            point.flashTween = new TWEEN.Tween(point.mesh.material.color)
                .to(beforeColor.getHSL())

                // .to(beforeColor.getHSL(), opts.flashDuration)
                .easing(TWEEN.Easing.Quadratic.In)
                // .onUpdate(flashUpdate)
                .onComplete(flashComplete)
                .start();
        }

        if(opts.color && !point.flashTween) {
            self.setPointHSL(point, opts.color.getHSL());
        }

        if(opts.position || opts.lookat) {
            point.mesh.lookAt(opts.position || opts.lookat);
        }

        point.mesh.updateMatrix();
    };

    self.meshForLL = function(lat, lng, mag, position, scene, opts){
        opts = opts || {};
        var xyz = ORBITAL.GeoUtil.xyzFromGeo(lat, lng);
        var color = ORBITAL.Util.colorFn(mag);

        var point;

        point = self.getNewSquareMesh(1);
        point.type = "point";

        self.setPointColor(point, color);

        point.position.x = xyz.x;
        point.position.y = xyz.y;
        point.position.z = xyz.z;
        point.scale.z = -(mag * 100);

        point.lookAt(position);

        point.updateMatrix();

        scene.add(point);


        // if (opts.drop) {
        //     point.translate(1000, point.up);
        //     var tween = new TWEEN.Tween(point.position)
        //         .to(xyz, 1000);
        //     if (opts.dropCleanup) {
        //         tween.onComplete(function(){scene.remove(this);});
        //     }
        //     tween.start();
        // }

        return point;
    };

    return self;
}());

ORBITAL.Point = function(lat, lng, mag, mesh, scene, data, onUpdate) {
    this.relMesh = mesh;
    this.mesh = ORBITAL.PointUtil.meshForLL(lat, lng, mag, this.relMesh.position, scene);
    this.meta = data || null;
    this.onUpdate = onUpdate || null;
};

ORBITAL.Point.prototype = Object.create({});

ORBITAL.Point.prototype.size = function(){
    return this.mag * 100;
};

ORBITAL.Point.prototype.getXY = function() {
    return ORBITAL.GeoUtil.xyzFromGeo(this.lat, this.lng);
};

ORBITAL.Point.prototype.setLL = function(lat, lng) {
    this.lat = lat;
    this.lng = lng;
};

ORBITAL.Point.prototype.setMag = function(mag) {
    this.mag = mag;
};

ORBITAL.Point.prototype.update = function(opts) {
    if (!opts){
        var xyz = this.getXY();
        opts = {
            mag:this.mag,
            x:xyz.x,
            y:xyz.y,
            z:xyz.z
        };
    }

    if(this.onUpdate){
        this.onUpdate(opts);
    } else {
        ORBITAL.PointUtil.meshUpdate(this, opts);
    }
};
