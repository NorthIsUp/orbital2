tlog = ORBITAL.getTemporaryLogger();

ORBITAL.PointUtil = (function (self) {
    self = self || {};

    self.getPointColor = function (point) {
        // TODO: move to point class
        mesh = point.mesh || point;
        return mesh.material.color;
    };

    self.setPointColor = function (point, color) {
        // work for either the point class or a mesh
        mesh = point.mesh || point;
        mesh.material.color = color;
    };

    self.getPointHSL = function (point) {
        // TODO: move to point class
        mesh = point.mesh || point;
        return mesh.material.color.getHSL();
    };

    self.setPointHSL = function (point, hsl) {
        // TODO: move to point class
        mesh = point.mesh || point;
        mesh.material.color.setHSL(hsl.h, hsl.s, hsl.l);
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

        if(opts.flash && opts.flashOver && point.flashTween) {
            point.flashTween.stop();
            delete point.flashTween;
        }

        if(opts.flash && !point.flashTween) {
            // FIXME AMH: Flash does not correctly traverse the HSL wheel.
            // currently it treats it as a Cartesian plane, needs to be radial.

            opts.flashDuration = opts.flashDuration || 2000;
            opts.flashHSLList = opts.flashHSLList || [flashColorHSL, beforeColorHSL];


            var flashUpdate = function() {
                // interpolates HSL space, but outputs RGB string (for compatibility)
                self.setPointHSL(point, this);
            };

            var flashComplete = function(){
                self.setPointColor(point, ORBITAL.Util.colorFn(point.mag));
                delete point.flashTween;
            };

            var fade = function(hslList, opts) {
                opts.i = opts.i || 0;
                opts.flashItemDuration = opts.flashItemDuration || 200;
                opts.flashItemDuration = opts.flashDuration / opts.flashHSLList.length;

                var fromHSL = _.clone(hslList[opts.i]);
                var toHSL = hslList[++opts.i];

                point.flashTween = new TWEEN.Tween(fromHSL)
                    .to(toHSL, opts.flashItemDuration)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onUpdate(flashUpdate)
                    .start();

                if(opts.i < hslList.length - 1){
                    point.flashTween.onComplete(function(){
                        fade(hslList, opts);
                    });
                } else {
                    point.flashTween.onComplete(flashComplete);
                }
            };

            fade(opts.flashHSLList, opts);
        }

        if(opts.mag) {
            point.mesh.scale.z = -(opts.mag * 100 / point.scale);
            if(!opts.color && !point.flashTween) {
                opts.color = ORBITAL.Util.colorFn(opts.mag);
            }
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
        opts = opts || {
            scale: 1
        };
        var xyz = ORBITAL.GeoUtil.xyzFromGeo(lat, lng);
        var color = ORBITAL.Util.colorFn(mag);

        var point;

        point = self.getNewSquareMesh(1/opts.scale);
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

ORBITAL.Point = function(lat, lng, mag, mesh, scene, opts) {
    this.lat = lat;
    this.lng = lng;
    this.mag = mag;

    this.relMesh = mesh;
    this.meta = opts.data || null;
    this.onUpdate = opts.onUpdate || null;
    this.scale = opts.scale || 1;

    this.mesh = ORBITAL.PointUtil.meshForLL(lat, lng, mag, this.relMesh.position, scene, {scale:opts.scale});
};

_.extend(ORBITAL.Point.prototype, {
    size : function(){
        return this.mag * 100;
    },

    getXY : function() {
        return ORBITAL.GeoUtil.xyzFromGeo(this.lat, this.lng);
    },

    setLL : function(lat, lng) {
        this.lat = lat;
        this.lng = lng;
        return this;
    },

    setMag : function(mag) {
        this.mag = mag;
        return this;
    },

    update : function(opts) {
        var _opts = this.getXY();
        _opts.mag = this.mag;
        for (var attr in opts) {
            _opts[attr] = opts[attr];
        }

        if(this.onUpdate){
            this.onUpdate(_opts);
        } else {
            ORBITAL.PointUtil.meshUpdate(this, _opts);
        }
        return this;
    },

    age : function(opts) {
        this.mag -= this.mag > 0  ? 0.00001 : 0 ;
        return this;
    }

});
// ORBITAL.Point.prototype = Object.create({});

