
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
    this.numTiles = {x:4, y:4};
    this.worldPx = {x:this.TILE_WIDTH * this.numTiles.x, y:this.TILE_WIDTH * this.numTiles.y};
    this.numMines = 2;


    this.frameNumber = 0;

    this.OUT_OF_WORLD_COLOR = '#FFFFFF';

    // Set start position
    this.vpOffset = {x: 0, y: 0};

    this.gameGrid = [];

    for (var i = 0; i < this.numTiles.x; i++) {
        this.gameGrid[i] = [];
        for (var j = 0; j < this.numTiles.y; j++) {
            this.gameGrid[i][j] = {state:'blank', mine:false, opened:false, adj:0, dirty:false};
        }

    }

    for (var mineIdx = 0; mineIdx < this.numMines; mineIdx++) {
        var mineX = Math.floor(Math.random() * this.numTiles.x);
        var mineY = Math.floor(Math.random() * this.numTiles.y);
        console.log('Mine at: ' + mineX + ',' + mineY);
        this.gameGrid[mineX][mineY].mine = true;
    }

    for (var i = 0; i < this.numTiles.x; i++) {
        for (var j = 0; j < this.numTiles.y; j++) {
            this.gameGrid[i][j].adj = this.countSurrounding(i, j);
            console.log(this.gameGrid[i][j].adj + ', ');
        }

    }

    this.gameState = 'alive';
    this.face = 'facesmile';
    this.winCountdown = (this.numTiles.x * this.numTiles.y) - this.numMines;

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

Game.prototype.checkInGrid = function(iX, iY) {
 return (-1 < iX && iX < this.numTiles.x) && (-1 < iY && iY < this.numTiles.y );
};

Game.prototype.showMines = function () {
    for (var i = 0; i < this.numTiles.x; i++) {
        for (var j = 0; j < this.numTiles.y; j++) {
            if (this.gameGrid[i][j].mine) {
                this.gameGrid[i][j].state = 'bombrevealed';
            }
        }

    }

};

Game.prototype.unDirty = function () {
    for (var i = 0; i < this.numTiles.x; i++) {
        for (var j = 0; j < this.numTiles.y; j++) {
            this.gameGrid[i][j].dirty = false;
        }

    }

};

Game.prototype.countSurrounding = function (iX, iY) {
    //count surrounding mines
    var mineCount = 0;
    var mineWalk = [{x:-1, y:-1},{x:0, y:-1},{x:1, y:-1},{x:1, y:0},{x:1, y:1},{x:0, y:1},{x:-1, y:1},{x:-1, y:0}];

    for (var walkIdx = 0; walkIdx < mineWalk.length; walkIdx++) {
        var tX = mineWalk[walkIdx].x + iX;
        var tY = mineWalk[walkIdx].y + iY;

        //            console.log('check ' + tX + ',' + tY);
        if (this.checkInGrid(tX, tY)){
            if (this.gameGrid[tX][tY].mine == true) {
                mineCount++;
            }
        }
    }

    return mineCount;
};

Game.prototype.openSurrounding = function (iX, iY) {
    if (this.gameGrid[iX][iY].dirty != true) {
        this.gameGrid[iX][iY].dirty = true;
    } else {
        return;
    }

    //count surrounding mines
    var mineWalk = [{x:-1, y:-1},{x:0, y:-1},{x:1, y:-1},{x:1, y:0},{x:1, y:1},{x:0, y:1},{x:-1, y:1},{x:-1, y:0}];


    if (this.gameGrid[iX][iY].adj == 0) {
        for (var walkIdx = 0; walkIdx < mineWalk.length; walkIdx++) {
            var tX = mineWalk[walkIdx].x + iX;
            var tY = mineWalk[walkIdx].y + iY;

            //            console.log('check ' + tX + ',' + tY);
            if (this.checkInGrid(tX, tY)){
                if (this.gameGrid[tX][tY].adj == 0) {
                    if (this.gameGrid[tX][tY].mine != true) {
                        if (this.gameGrid[tX][tY].dirty != true) {
                            this.openSurrounding(tX, tY);
                        }
                    }
                } else if (this.gameGrid[tX][tY].mine != true){
                    if (this.gameGrid[tX][tY].dirty != true) {
                        this.gameGrid[tX][tY].state = 'open' + this.gameGrid[tX][tY].adj;
                        this.gameGrid[tX][tY].dirty = true;
                        this.winCountdown--;
                    }
                }
            }
        }
    }

    this.gameGrid[iX][iY].state = 'open' + this.gameGrid[iX][iY].adj;

    this.winCountdown--;

};

Game.prototype.clickAt = function (iX, iY) {

    if (this.gameState != 'alive') {
        return;
    }

    // Handle grid clicks

    var gridX = Math.floor((iX + (this.worldPx.x/2) - this.vpOffset.x)/ this.TILE_WIDTH);
    var gridY = Math.floor((iY + (this.worldPx.y/2) - this.vpOffset.y)/ this.TILE_WIDTH);

    if (this.checkInGrid(gridX, gridY))  {
        console.log('in');

        //BOOM?
        if (this.gameGrid[gridX][gridY].mine == true) {
//            mineCount++;
            this.gameGrid[gridX][gridY].state = 'bombdeath';
            this.gameState = 'dead';
            this.face = 'facedead';
        } else {
            this.openSurrounding(gridX, gridY);
            this.unDirty();

            console.log('cd=' + this.winCountdown);

            if (this.winCountdown <= 0) {
                this.gameState = 'win'
                this.face = 'facewin';
                this.showMines();
            }
        }

    }

    console.log({x:gridX, y:gridY});

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

    var centeringX = this.worldPx.x/2;
    var centeringY = this.worldPx.y/2;

    this.ctx.save();
    this.ctx.fillStyle = this.OUT_OF_WORLD_COLOR;
    this.ctx.fillRect(0,0,this.viewPortWidth,this.viewPortHeight);

    var curX = 0;
    var curY = 0;

    // Draw grid
    for (var cTileX = 0; cTileX < this.numTiles.x; cTileX++) {
        curX = (cTileX * this.TILE_WIDTH) - centeringX;
        for (var cTileY = 0; cTileY < this.numTiles.y; cTileY++) {
            curY = (cTileY * this.TILE_WIDTH) - centeringY;
            state = this.gameGrid[cTileX][cTileY].state;
            this.ctx.drawImage(this.images[state], offsetX + curX, offsetY + curY);
        }
    }

    this.FACE_WIDTH = 26;
    this.GRID_BORDER_PX_BOT = 16;
    // Draw Face
    var faceX = offsetX - (this.FACE_WIDTH/2);
    var faceY = offsetY - (this.FACE_WIDTH) - (this.worldPx.y/2) - this.GRID_BORDER_PX_BOT;
    this.ctx.drawImage(this.images[this.face], faceX, faceY);

};

Game.prototype.draw = function() {
    // draw here to canvas
    var NUM_DRAW_BUFFERS = 5;

    this.drawAnimate();
    this.frameNumber++;

};
