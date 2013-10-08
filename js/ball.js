/**
 * Created with JetBrains WebStorm.
 * User: danielsim
 * Date: 9/8/13
 * Time: 10:56 PM
 * To change this template use File | Settings | File Templates.
 */

function Ball(iCtx, iWidth, iHeight, iRadius) {
    this.width = iWidth;
    this.height = iHeight;
    this.ctx = iCtx;
    this.SEGMENTS = 32;
    this.ZOFFSET = 100;
    this.distance = 200;
    this.dist = 0;
    this.radius = iRadius;

    // Compositing
    this.SPECULAR_INNER_COLOR = 'rgba(64, 64, 55, 1)';
    this.SPECULAR_OUTER_COLOR = 'rgba(0, 0, 22, 0)';

    this.GROUND_GI_UPPER_COLOR = 'rgba(0, 100, 0, 0)';
    this.GROUND_GI_LOWER_COLOR = 'rgba(0, 100, 0, 0.5)';

    this.create();
}

function Point3D() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
}

Ball.prototype.create = function() {
    this.point = [];

    this.numberOfVertexes = 0;

    var radius = Math.cos(Math.PI) * this.radius;
    var fixedY = Math.sin(Math.PI) * this.radius;
    // Number of segments
    var incr = Math.PI*2/this.SEGMENTS;
    var p = null;

    // Generate ring points
    for(var alpha = 0; alpha < Math.PI*2; alpha += incr) {
        p = this.point[this.numberOfVertexes] = new Point3D();

        p.x = Math.cos(alpha) * radius;
        p.y = fixedY;
        p.z = Math.sin(alpha) * radius;

        this.numberOfVertexes++;
    }
};

Ball.prototype.rotateX = function(point, radians) {
    var y = point.y;
    point.y = (y * Math.cos(radians)) + (point.z * Math.sin(radians) * -1.0);
    point.z = (y * Math.sin(radians)) + (point.z * Math.cos(radians));
};

// Used rotation so comment out.
//Ball.prototype.rotateY = function(point, radians) {
//    var x = point.x;
//    point.x = (x * Math.cos(radians)) + (point.z * Math.sin(radians) * -1.0);
//    point.z = (x * Math.sin(radians)) + (point.z * Math.cos(radians));
//};

Ball.prototype.rotateZ = function(point, radians) {
    var x = point.x;
    point.x = (x * Math.cos(radians)) + (point.y * Math.sin(radians) * -1.0);
    point.y = (x * Math.sin(radians)) + (point.y * Math.cos(radians));
};

Ball.prototype.projection = function(xy, z, xyOffset, zOffset, distance) {
    return ((distance * xy) / (z - zOffset)) + xyOffset;
};

Ball.prototype.renderHalf = function (rotation, rad, ctx, color) {
    var x, y;
    var p = new Point3D();
    var modRot = rotation % (Math.PI * 2);

    ctx.fillStyle = color;
    ctx.lineWidth = 0;

    ctx.beginPath();

    // Render 1st Half
    var i = 0;
    for (i = 0; i < this.SEGMENTS / 2 + 1; i++) {

        p.x = this.point[i].x;
        p.y = this.point[i].y;
        p.z = this.point[i].z;

        var thisRotation = rotation;
        if (modRot > Math.PI / 2 && modRot < (Math.PI / 2 * 3)) {
            thisRotation = Math.PI / 2;
        }

        this.rotateX(p, thisRotation);
        this.rotateZ(p, rad);

        x = this.projection(p.x, p.z, this.width / 2.0, this.ZOFFSET, this.distance);
        y = this.projection(p.y, p.z, this.height / 2.0, this.ZOFFSET, this.distance);

        if (i == 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    // Render 2nd Half
    for (i = this.SEGMENTS / 2 + 1; i < this.SEGMENTS; i++) {

        p.x = this.point[i].x;
        p.y = this.point[i].y;
        p.z = this.point[i].z;

        var thisRotation = rotation;

        if (modRot > Math.PI / 2 + Math.PI) {
            thisRotation = Math.PI / 2;
        }
        if (modRot < Math.PI / 2) {
            thisRotation = Math.PI / 2;
        }

        this.rotateX(p, thisRotation);
        this.rotateZ(p, rad);

        x = this.projection(p.x, p.z, this.width / 2.0, this.ZOFFSET, this.distance);
        y = this.projection(p.y, p.z, this.height / 2.0, this.ZOFFSET, this.distance);


        ctx.lineTo(x, y);
    }

    ctx.fill();
};

/*
 * Renders ball with 2 filled n-sided polygons then applies lighting pass
 *
 */
Ball.prototype.render = function (rotation, rad) {
    var ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // Draw 1st side
    this.renderHalf(rotation + Math.PI, rad, ctx, '#2222EE');

    // Draw 2nd side
    this.renderHalf(rotation, rad, ctx, '#CCCCCC');

    // Render Embellishments

    // Do some specular with radial gradient.
    var p = new Point3D();
    var x, y;
    var grad = ctx.createRadialGradient(65, 35, 5, 50, 40, 50);
    grad.addColorStop(0, this.SPECULAR_INNER_COLOR);
    grad.addColorStop(1, this.SPECULAR_OUTER_COLOR);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (var i = 0; i < this.SEGMENTS; i++) {

        p.x = this.point[i].x;
        p.y = this.point[i].y;
        p.z = this.point[i].z;

        // The rotation below can be made unnecessary, but works for now and FPS is fine.
        this.rotateX(p, Math.PI/2);
        this.rotateZ(p, rad);

        x = this.projection(p.x, p.z, this.width / 2.0, this.ZOFFSET, this.distance - 2);
        y = this.projection(p.y, p.z, this.height / 2.0, this.ZOFFSET, this.distance - 2);

        if (i == 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.fill();

    // Do a little Global Illumination - mimic light bouncing of grass with a linear gradient.
    var grad = ctx.createLinearGradient(50, 70, 50, 100);
    grad.addColorStop(0, this.GROUND_GI_UPPER_COLOR);
    grad.addColorStop(1, this.GROUND_GI_LOWER_COLOR);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (var i = 0; i < this.SEGMENTS; i++) {

        p.x = this.point[i].x;
        p.y = this.point[i].y;
        p.z = this.point[i].z;

        // The rotation below can be made unnecessary, but works for now and FPS is fine.
        this.rotateX(p, Math.PI/2);
        this.rotateZ(p, rad);

        x = this.projection(p.x, p.z, this.width / 2.0, this.ZOFFSET, this.distance);
        y = this.projection(p.y, p.z, this.height / 2.0, this.ZOFFSET, this.distance);

        if (i == 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.fill();

    ctx.restore();
};