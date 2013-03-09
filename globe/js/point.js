ORBITAL.PointUtil = (function (self) {
    self = self || {};

    self.getNewSquareMesh = function(width) {
        return this.getNewMesh(width, width);
    };

    self.getNewMesh = function(length, width) {
        var point_geometry = new THREE.CubeGeometry(length, width, 1, 1, 1, 1, undefined,
            { px: true, nx: true, py: true, ny: true, pz: false, nz: true}
        );

        point_geometry.applyMatrix( new THREE.Matrix4().makeTranslation(0,0,0.5) );
        point_geometry.dynamic = true;

        var mesh = new THREE.Mesh(point_geometry, new THREE.MeshBasicMaterial({
            color: 0xffffff,
            vertexColors: THREE.FaceColors,
            morphTargets: false
        }));

        return mesh;
    };

    self.meshUpdate = function(point, opts) {
        opts = opts || {};
        if(opts.x) {
            point.position.x = opts.x;
        }

        if(opts.y) {
            point.position.y = opts.y;
        }

        if(opts.z) {
            point.position.z = opts.z;
        }

        if(opts.mag) {
            point.scale.z = -(opts.mag * 100);
            if(!opts.color) {
                opts.color = ORBITAL.Util.colorFn(opts.mag);
            }
        }

        if(opts.color) {
            _.each(point.geometry.faces, function(face){
                face.color = opts.color;
            });
            point.geometry.colorsNeedUpdate = true;
        }

        if(opts.position) {
            point.lookAt(opts.position);
        }

        point.updateMatrix();
    };

    self.meshForLL = function(lat, lng, mag, position, scene){
        var xyz = ORBITAL.GeoUtil.xyzFromGeo(lat, lng);
        var color = ORBITAL.Util.colorFn(mag);

        var point;

        point = self.getNewSquareMesh(1);
        point.type = "point";

        _.each(point.geometry.faces, function(face){
          face.color = color;
        });

        point.geometry.colorsNeedUpdate = true;

        point.position.x = xyz.x;
        point.position.y = xyz.y;
        point.position.z = xyz.z;
        point.scale.z = -(mag * 100);

        point.lookAt(position);

        point.updateMatrix();
        scene.add(point);
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
    var xyz = this.getXY();
    if (!opts){
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
        ORBITAL.PointUtil.meshUpdate(this.mesh, opts);
    }
};

