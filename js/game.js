
function isMobile() {
    var rVal = false;

    if( navigator.userAgent.match(/Android/i)
        || navigator.userAgent.match(/webOS/i)
        || navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)
        || navigator.userAgent.match(/BlackBerry/i)
        || navigator.userAgent.match(/Windows Phone/i)
        ) {
        rVal = true;
    }

    return rVal;
}


function TheGame() {
    // ##TODONE## resolve this properly
    var iface = 'desktop';

    if (isMobile()) {
        iface = 'mobile';

        $('body').bind('touchmove', function (ev) {
            ev.preventDefault();
        });
    }

    var game = new Game(iface);

    game.updateContainer();
    // ##TODONE## needs resize handler
    $(window).resize(function() {
        game.updateContainer();
        game.drawAnimate();
    });


    $('#main').canvasDragDrop({
        mouse: iface == 'desktop',
        onClick:function(x,y) { game.clickAt(x,y); },
        onStart:function(x,y) { game.dragStart(x,y); },
        onDrag:function(x,y) { game.drag(x,y) },
        onStop:function(x,y) { game.dragStop(x,y); },
        momentum : false,
        tolerance : iface == 'desktop' ? 5 : 1
    });

    game.update();
    game.start();
}

function smoothstep(a, b, t)
    /*
     **  Usage:
     **      smoothstep(a,b,t)
     **
     **  Arguments:
     **      a       upper bound, real
     **      b       lower bound, real
     **      t       value, real
     **
     **  Returns:
     **      0 when (t < a), 1 when (t >= b),
     **      a smooth transition from 0 to 1 otherwise,
     **      or (-1) on error (a == b)
     **
     **  GMLscripts.com
     */
{
    var p;
    if (t < a) return 0;
    if (t >= b) return 1;
    if (a == b) return -1;
    p = (t - a) / (b - a);
    return (p * p * (3 - 2 * p));
}

function Game(iIface) {
    this.iface = iIface;

    this.$main = this.getElement('#main');

    this.ctx = this.$main[0].getContext('2d');

    this.imgSource = [
          'blank'
        , 'bombdeath'
        , 'bombflagged'
        , 'bombmisflagged'
        , 'bombquestion'
        , 'bombrevealed'
        , 'borderbl'
        , 'borderjointr'
        , 'bordertb'
        , 'bordertr'
        , 'checked'
        , 'faceclock'
        , 'facedead'
        , 'faceooh'
        , 'facepirate'
        , 'facesmile'
        , 'facewin'
        , 'moves0'
        , 'notchecked'
        , 'open0'
        , 'open1'
        , 'open2'
        , 'open3'
        , 'open4'
        , 'open5'
        , 'open6'
        , 'open7'
        , 'open8'
        , 'time0'
        , 'time1'
        , 'time2'
        , 'time3'
        , 'time4'
        , 'time5'
        , 'time6'
        , 'time7'
        , 'time8'
        , 'time9'
    ];

    this.images = {};
    this.GRASS_TILE_IMG_IDX = 0;

    this.WORLD_PX = 1000;
    // jpg size is 251, but we set 250 so get 1px overlap - firefox rendering glitch or we see gaps between tiles
    this.TILE_WIDTH = 250;
    this.NUM_TILES = this.WORLD_PX/this.TILE_WIDTH;

    this.isRunning = true;
    this.frameNumber = 0;
    this.dragOn = false;

    this.DRAW_LINE_COLOR = '#FF0000';
    this.DRAW_LINE_WIDTH = 4;

    this.OUT_OF_WORLD_COLOR = '#FFFFFF';

    this.TOON_WIDTH = 100;
    this.TOON_HALF_WIDTH = this.TOON_WIDTH/2;
    this.TOON_POS_CLIP_RADIUS = 41;
    this.SHADOW_OFFSET = {x:65, y:10};
    this.BALL_DIST_2_ROT_CONSTANT = 45;

    this.HALF_PI = Math.PI/2;
    this.TRAVEL_SPEED = 0.01;

    // Set start position
    this.interpPoint = {x: 512, y: 512, dist: 0, rad: -Math.PI/2};
    this.currentDist = 0;
    this.currentPoint = 0;
    this.vpOffset = {x: 0, y: 0};

}

Game.prototype.updateContainer = function() {

    this.viewPortWidth = $(window).width();
    this.viewPortHeight = $(window).height();

    this.vpOffset.x = this.viewPortWidth/2;
    this.vpOffset.y = this.viewPortHeight/2;

    // Set canvas width and height attributes correctly to
    // match actual CSS pixel size
    this.$main.attr('width', this.viewPortWidth);
    this.$main.attr('height', this.viewPortHeight);
};

Game.prototype.clickAt = function (iX, iY) {
    if (this.isRunning == true) {
        this.animateToonEnd();

        var x = iX + this.interpPoint.x - this.vpOffset.x;
        var y = iY + this.interpPoint.y - this.vpOffset.y;

        this.dragpos = {x: x, y: y};

        this.arrDragPos = [];
        this.dragDist = 0;
        this.dragRad = 0;

        this.dragpos.x = this.interpPoint.x;
        this.dragpos.y = this.interpPoint.y;

        var dragObj = this.getDragPushObj(x, y);
        if (dragObj) {
            this.arrDragPos.push(dragObj);
        }

        var thisPoint = this.arrDragPos[0];
        this.totalPointDist = thisPoint.dist;

        this.animateToon = true;
    }
};

Game.prototype.dragStart = function (iX, iY) {
    if (this.isRunning == true) {
        var boundLeft = this.vpOffset.x - this.TOON_HALF_WIDTH;
        var boundRight = this.vpOffset.x + this.TOON_HALF_WIDTH;
        var boundTop = this.vpOffset.y - this.TOON_HALF_WIDTH;
        var boundBottom = this.vpOffset.y + this.TOON_HALF_WIDTH;

        var inX = (iX > boundLeft) && (iX < boundRight);
        var inY = (iY > boundTop) && (iY < boundBottom);
        if (inX && inY) {
            iX = this.vpOffset.x;
            iY = this.vpOffset.y;
            this.dragOn = true;
            var x = iX + this.interpPoint.x - this.vpOffset.x;
            var y = iY + this.interpPoint.y - this.vpOffset.y;

            this.dragpos = {x: x, y: y};

            this.arrDragPos = [];
            this.dragDist = 0;
            this.dragRad = 0;

            this.animateToonEnd();
        }
    }
};

Game.prototype.getElement = function(id) {
    var $div = $('#container');

    return $div.find(id);
};

Game.prototype.getDragPushObj = function(x, y) {
    var lastX = this.dragpos.x;
    var lastY = this.dragpos.y;

    var diffX = x - lastX;
    var diffY = y - lastY;

    var dist = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));

    var rVal = null;

    // Set number to more than 0 for filtering... untested...
    if (dist > 0) {
        this.dragRad = Math.atan2(diffY, diffX);

        this.dragpos = {x: x, y: y};
        this.dragDist += dist;

        rVal = {x:lastX, y:lastY, dist:dist, rad:this.dragRad};

    } else if (dist == 0) {
        // final drag point
        this.dragpos = {x: x, y: y};

        rVal = {x:lastX, y:lastY, dist:dist, rad:this.dragRad};
    }

    return rVal;
};

Game.prototype.drag = function(iX, iY) {
    if (this.dragOn == true) {
        var x = iX + this.interpPoint.x - this.vpOffset.x;
        var y = iY + this.interpPoint.y - this.vpOffset.y;

        var dragObj = this.getDragPushObj(x, y);
        if (dragObj) {
            this.arrDragPos.push(dragObj);
        }
    }
};

Game.prototype.dragStop = function(iX, iY) {
    if (this.dragOn == true) {
        // Quick hack for mobile touch stop - doesn't give proper x, y
        var x;
        var y;
        if (this.iface == 'mobile') {
            x = this.dragpos.x;
            y = this.dragpos.y;
        } else {
            x = iX + this.interpPoint.x - this.vpOffset.x;
            y = iY + this.interpPoint.y - this.vpOffset.y;
        }

        var dragObj = this.getDragPushObj(x, y);
        if (dragObj != null) {
            this.arrDragPos.push(dragObj);
        }

        this.dragpos = null;
        var thisPoint = this.arrDragPos[0];
        this.totalPointDist = thisPoint.dist;

        this.animateToon = true;
        this.dragOn = false;
    }

};

Game.prototype.realStart = function() {
    // main loop
    var self = this;
    (function gameLoop() {
        var now = Date.now();
        self.deltaTime = now - self.lastUpdateTimeStamp;
        self.lastUpdateTimeStamp = now;
        if (self.isRunning == true) {
            self.update();
            self.draw();
            self.click = null;
        }
        requestAnimFrame(gameLoop, self.canvas);
    })();
};

Game.prototype.start = function() {
    // Wait for images to load...
    // For production, you will want to display a loading screen...

    var imgCtr = 0;

    var self = this;

    for (var num = 0; num < this.imgSource.length; num++) {
        var tName = self.imgSource[num];
        self.images[tName] = new Image();

        // Specify the source for the image
        self.images[tName].src = "images/" + self.imgSource[num] + ".gif";

        // only append the corresponding LI after the image is loaded
        self.images[tName].onload = function() {
            imgCtr++;

            if (imgCtr >= self.imgSource.length) {
                self.realStart();
            }
        };
    }
};

Game.prototype.interpolatePoint = function(iPoint, iDistance) {
    var tX = Math.cos(iPoint.rad) * (iPoint.dist - iDistance);
    var tY = Math.sin(iPoint.rad) * (iPoint.dist - iDistance);

    return {x: iPoint.x + tX, y: iPoint.y + tY, rad: iPoint.rad};
};

Game.prototype.animateToonEnd = function() {
    this.animateToon = false;
    this.currentDist = 0;
    this.currentPoint = 0;
    this.totalPointDist = 0;
    this.currentStep = 0;
};

Game.prototype.update = function() {
    // update object and background positions here. One possible way
    // to implement background is by using oversized div with tileable
    // background that is under the canvas and is just translated
    // based on the location to create illusion of movement. Another
    // way is to simply draw it on canvas on every update.

    if (this.animateToon) {
        // Get speed
        var travelSpeed = this.TRAVEL_SPEED * (this.dragDist);

        // Make shorter transits faster proportionally
        if (travelSpeed < this.dragDist/50) {
            travelSpeed = this.dragDist/50;
        }
        // Cap max speed on long distance transits
        if (travelSpeed > 10) {
            travelSpeed = 10;
        }

        // Get the current path progression
        this.currentStep += travelSpeed;

        // Apply easing
        var step = smoothstep(0, this.dragDist, this.currentStep);
        var lastDist = this.currentDist;
        this.currentDist = step * this.dragDist;
        var dDist = this.currentDist - lastDist;
        this.ball.dist += dDist;

        // Get the current point
        var thisPoint = this.arrDragPos[this.currentPoint];

        // Find next point in path based on distance travelled.
        var bEndArray = false;
        while ((this.currentDist > this.totalPointDist) && !bEndArray) {
            this.currentPoint++;
            if (this.currentPoint < this.arrDragPos.length) {
                thisPoint = this.arrDragPos[this.currentPoint];
                this.totalPointDist += thisPoint.dist;
            } else {
                bEndArray = true;
            }
        }

        // Interpolate to get current point
        if (this.currentPoint < this.arrDragPos.length && step < 1) {
            var distForThisPoint = this.totalPointDist - this.currentDist;
            this.interpPoint = this.interpolatePoint(thisPoint, distForThisPoint);
        } else if (this.currentPoint == this.arrDragPos.length && step < 1) {
            // bah... shit happens... I'll find you someday li'bug
            console.log("pew!");
        } else {
            this.animateToonEnd();
        }

        //clip position
        if (this.interpPoint.x - this.TOON_POS_CLIP_RADIUS < 0) {
            this.interpPoint.x = this.TOON_POS_CLIP_RADIUS;
        }
        if (this.interpPoint.x > this.WORLD_PX - this.TOON_POS_CLIP_RADIUS) {
            this.interpPoint.x = this.WORLD_PX- this.TOON_POS_CLIP_RADIUS;
        }

        if (this.interpPoint.y - this.TOON_POS_CLIP_RADIUS< 0) {
            this.interpPoint.y = this.TOON_POS_CLIP_RADIUS;
        }
        if (this.interpPoint.y > this.WORLD_PX - this.TOON_POS_CLIP_RADIUS) {
            this.interpPoint.y = this.WORLD_PX - this.TOON_POS_CLIP_RADIUS;
        }
    }
};

Game.prototype.drawAnimate = function() {

    var offsetX = -(this.interpPoint.x) + this.vpOffset.x;
    var offsetY = -(this.interpPoint.y) + this.vpOffset.y;

    this.ctx.save();
    this.ctx.fillStyle = this.OUT_OF_WORLD_COLOR;
    this.ctx.fillRect(0,0,this.viewPortWidth,this.viewPortHeight);


    // Negligible savings if a more sophisticated tiling strategy is used. So KISS.
    // It seems for the browsers we want, they clip off-screen drawing anyway.
    var curX = 0;
    var curY = 0;
    for (var cTileX = 0; cTileX < this.NUM_TILES; cTileX++) {
        curX = cTileX * this.TILE_WIDTH;
        for (var cTileY = 0; cTileY < this.NUM_TILES; cTileY++) {
            curY = cTileY * this.TILE_WIDTH;
            this.ctx.drawImage(this.images['facewin'], offsetX + curX, offsetY + curY);
        }
    }
    this.ctx.strokeStyle = this.DRAW_LINE_COLOR;
    this.ctx.lineWidth = this.DRAW_LINE_WIDTH;

    if (this.arrDragPos != null) {
        if (this.arrDragPos.length > 0) {
            this.ctx.beginPath();
            var lX = this.arrDragPos[0].x - this.interpPoint.x + this.vpOffset.x;
            var lY = this.arrDragPos[0].y - this.interpPoint.y + this.vpOffset.y;
            this.ctx.moveTo(lX, lY);
            for (var cLinePt = 1; cLinePt < this.arrDragPos.length; cLinePt++) {
                lX = this.arrDragPos[cLinePt].x - this.interpPoint.x + this.vpOffset.x;
                lY = this.arrDragPos[cLinePt].y - this.interpPoint.y + this.vpOffset.y;
                this.ctx.lineTo(lX, lY);
            }
            this.ctx.stroke();
        }
    }
    this.ctx.restore();
};

Game.prototype.draw = function() {
    // draw here to canvas
    var NUM_DRAW_BUFFERS = 5;
    if (this.animateToon || this.frameNumber < NUM_DRAW_BUFFERS || this.dragOn) {
        this.drawAnimate();
        this.frameNumber++;
    }

};
