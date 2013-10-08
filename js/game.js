
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

//    this.numTiles = 3;
    // jpg size is 251, but we set 250 so get 1px overlap - firefox rendering glitch or we see gaps between tiles
    this.TILE_WIDTH = 16;
    this.numTiles = 3;
    this.worldPx = this.TILE_WIDTH * this.numTiles;


    this.frameNumber = 0;

    this.OUT_OF_WORLD_COLOR = '#FFFFFF';

    // Set start position
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

};

Game.prototype.dragStart = function (iX, iY) {

};

Game.prototype.getElement = function(id) {
    var $div = $('#container');

    return $div.find(id);
};


Game.prototype.drag = function(iX, iY) {

};

Game.prototype.dragStop = function(iX, iY) {


};

Game.prototype.realStart = function() {
    // main loop
    var self = this;
    (function gameLoop() {
        var now = Date.now();
        self.deltaTime = now - self.lastUpdateTimeStamp;
        self.lastUpdateTimeStamp = now;

        self.update();
        self.draw();

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

};

Game.prototype.drawAnimate = function() {

    var offsetX = this.vpOffset.x;
    var offsetY = this.vpOffset.y;

    this.ctx.save();
    this.ctx.fillStyle = this.OUT_OF_WORLD_COLOR;
    this.ctx.fillRect(0,0,this.viewPortWidth,this.viewPortHeight);


    // Negligible savings if a more sophisticated tiling strategy is used. So KISS.
    // It seems for the browsers we want, they clip off-screen drawing anyway.
    var curX = 0;
    var curY = 0;
    for (var cTileX = 0; cTileX < this.numTiles; cTileX++) {
        curX = cTileX * this.TILE_WIDTH;
        for (var cTileY = 0; cTileY < this.numTiles; cTileY++) {
            curY = cTileY * this.TILE_WIDTH;
            this.ctx.drawImage(this.images['blank'], offsetX + curX, offsetY + curY);
        }
    }

};

Game.prototype.draw = function() {
    // draw here to canvas
    var NUM_DRAW_BUFFERS = 5;
    if (this.animateToon || this.frameNumber < NUM_DRAW_BUFFERS || this.dragOn) {
        this.drawAnimate();
        this.frameNumber++;
    }

};
