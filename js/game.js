/**
 * Created by sidarcy on 15/03/2016.
 */

screenWidth = 800;
screenHeight = 600;

if(isMobilePlatform()) {
    vp = getViewport();
    //screenHeight = vp[1];

}

//Create new Phaser.io game
var game = new Phaser.Game(screenWidth, screenHeight, Phaser.AUTO, 'game-container', { preload: preload, create: create, update: update, render: render });

//  The Google WebFont Loader will look for this object, so create it before loading the script.
WebFontConfig = {

    //  'active' means all requested fonts have finished loading
    //  We set a 1 second delay before calling 'createText'.
    //  For some reason if we don't the browser cannot render the text the first time it's created.
    active: function() { game.time.events.add(Phaser.Timer.SECOND, function(){}, this); },

    //  The Google Fonts we want to load (specify as many as you like in the array)
    google: {
        families: ['Revalia', 'Eczar']
    }

};

function preload() {
    //Function where we preload all asserts before game begons

    //Preload Google WebFont Loader script
    game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');
    //Preload images
    game.load.image('bullet', 'img/shamrock-small.png');
    game.load.image('enemyBullet', 'img/enemy-bullet.png');
    game.load.image('ship', 'img/st-ship.png');
    game.load.image('starfield', 'img/starfield.png?v=2');
    game.load.image('background', 'img/background2.png');
    game.load.image('splash', 'img/splash.png');
    //Preload Spritesheets
    game.load.spritesheet('kaboom', 'img/explode-sprite.png', 128, 128);
    game.load.spritesheet('invader', 'img/snake-sprite.png', 32, 32);

    //Preload Audio
    game.load.audio('music', ['sound/music-2.ogg']);
    game.load.audio('sound1', ['sound/hiss.ogg']);
    game.load.audio('paddyHit', ['sound/begorrah.ogg']);

}

//Global Variables
var playing = false;
var player;
var aliens;
var bullets;
var bulletTime = 0;
var cursors;
var fireButton;
var explosions;
var starfield;
var score = 0;
var scoreString = '';
var scoreText;
var enemyBullet;
var firingTimer = 0;
var stateText;
var livingEnemies = [];
var lives = 3;


function create() {
    //Funtion creating game

    //Start Arcade Physics engine
    game.physics.startSystem(Phaser.Physics.ARCADE);

    //The scrolling starfield background
    starfield = game.add.tileSprite(0, 0, 800, game.world.width, 'starfield');
    starfield.width = game.world.width;

    //  Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    // The enemy's bullets
    enemyBullets = game.add.group();
    enemyBullets.enableBody = true;
    enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    enemyBullets.createMultiple(30, 'enemyBullet');
    enemyBullets.setAll('anchor.x', 0.5);
    enemyBullets.setAll('anchor.y', 1);
    enemyBullets.setAll('outOfBoundsKill', true);
    enemyBullets.setAll('checkWorldBounds', true);

    //Setup Audio
    music = game.add.audio('music'); //Main backing track
    hitSound = game.add.audio('sound1'); //sound when snake is hot
    paddyHit = game.add.audio('paddyHit'); //sound when snake is hot


    //  St Patrick himself

    stPatYPos = (isMobilePlatform() )?game.world.height-120:game.world.height-70;

    player = game.add.sprite(400, stPatYPos, 'ship');
    player.anchor.setTo(0.5, 0.5);
    player.inputEnabled = true;
    player.input.enableDrag();
    player.input.allowVerticalDrag = false;
    player.events.onInputUp.add(fireBullet, this);


    game.physics.enable(player, Phaser.Physics.ARCADE);

    //  The snakes
    aliens = game.add.group();
    aliens.enableBody = true;
    aliens.physicsBodyType = Phaser.Physics.ARCADE;

    createAliens();

    // Scroretext top left
    scoreString = 'Score : ';
    scoreText = game.add.text(10, 10, scoreString + score, { font: '34px Eczar', fill: '#5ef691' });

    // Num of lives text, top right
    livesTxt = game.add.text(game.world.width - 130, 10, 'Lives : ' + lives, { font: '34px Eczar', fill: '#5ef691' });

    // End of game text, Gameover / Winner
    stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '84px Eczar', fill: '#5ef691', align:'center'});
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visible = false;

    //  An explosion pool
    explosions = game.add.group();
    explosions.createMultiple(30, 'kaboom');
    explosions.forEach(setupInvader, this);

    //  Game interactions, clicks, keypress
    cursors = game.input.keyboard.createCursorKeys();
    fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    //Start button / Splash screen
    startButton = game.add.button(game.world.width*0.5, game.world.height*0.5, 'splash', startGame, this);
    startButton.width = game.world.width;
    startButton.height = game.world.height;
    startButton.anchor.set(0.5);

}

function createAliens () {

    columns = ( isMobilePlatform() )?12:12;
    rows = ( isMobilePlatform() )?4:6;

    for (var y = 0; y < rows; y++)
    {
        for (var x = 0; x < columns; x++)
        {
            var alien = aliens.create(x * 48, y * 50, 'invader');
            alien.anchor.setTo(0.5, 0.5);
            alien.animations.add('fly', [ 0, 1, 2, 4], 5, true);
            alien.play('fly');
            alien.body.moves = false;
        }
    }

    aliens.x = 100;
    aliens.y = 50;

    //  All this does is basically start the invaders moving. Notice we're moving the Group they belong to, rather than the invaders directly.
    var tween = game.add.tween(aliens).to( { x: 200 }, 2000, Phaser.Easing.Linear.None, true, 0, 1000, true);

    //  When the tween loops it calls descend
    tween.onLoop.add(descend, this);
}

function setupInvader (invader) {

    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');

}


function startGame() {
    startButton.destroy();
    //Kick off background audio
    music.play();
    playing = true;
}


function descend() {

    aliens.y += 10;

}

function update() {

    if(!playing){
        return false;
    }

    //  Scroll the background
    starfield.tilePosition.y += 2;

    if (player.alive)
    {
        //  Reset the player, then check for movement keys
        player.body.velocity.setTo(0, 0);

        if (cursors.left.isDown)
        {
            player.body.velocity.x = -200;
        }
        else if (cursors.right.isDown)
        {
            player.body.velocity.x = 200;
        }

        //  Firing?
        if (fireButton.isDown)
        {
            fireBullet();
        }

        if (game.time.now > firingTimer)
        {
            enemyFires();
        }

        //  Run collision
        game.physics.arcade.overlap(bullets, aliens, collisionHandler, null, this);
        game.physics.arcade.overlap(enemyBullets, player, enemyHitsPlayer, null, this);
    }

}

function render() {

    // for (var i = 0; i < aliens.length; i++)
    // {
    //     game.debug.body(aliens.children[i]);
    // }

}

function collisionHandler (bullet, alien) {

    //  When a bullet hits an alien we kill them both
    bullet.kill();
    alien.kill();

    hitSound.play();

    //  Increase the score
    score += 20;
    scoreText.text = scoreString + score;

    //  And create an explosion :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(alien.body.x, alien.body.y);
    explosion.play('kaboom', 30, false, true);

    if (aliens.countLiving() == 0)
    {
        score += 1000;
        scoreText.text = scoreString + score;

        enemyBullets.callAll('kill',this);
        stateText.text = " You Won,\nClick to restart";
        stateText.visible = true;

        //the "click to restart" handler
        game.input.onTap.addOnce(restart,this);
    }

}

function enemyHitsPlayer (player,bullet) {

    //Function called when Paddy gets hit by snakes

    bullet.kill();

    lives --;

    livesTxt.text = "Lives : " + lives;

    //play ouch sound
    paddyHit.play();
    //  And create an explosion :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(player.body.x, player.body.y);
    explosion.play('kaboom', 30, false, true);

    if (lives == 1){
        livesTxt.fill = "#FF0000";
    }
    // When the player dies
    if (lives < 1)
    {
        player.kill();
        enemyBullets.callAll('kill');

        stateText.text=" GAME OVER \n Click to restart";

        stateText.visible = true;

        //the "click to restart" handler
        game.input.onTap.addOnce(restart,this);
    }

}

function enemyFires () {

    //  Grab the first bullet we can from the pool
    enemyBullet = enemyBullets.getFirstExists(false);

    livingEnemies.length=0;

    aliens.forEachAlive(function(alien){

        // put every living enemy in an array
        livingEnemies.push(alien);
    });


    if (enemyBullet && livingEnemies.length > 0)
    {

        var random=game.rnd.integerInRange(0,livingEnemies.length-1);

        // randomly select one of them
        var shooter=livingEnemies[random];
        // And fire the bullet from this enemy
        enemyBullet.reset(shooter.body.x, shooter.body.y);

        game.physics.arcade.moveToObject(enemyBullet,player,120);
        firingTimer = game.time.now + 2000;
    }

}

function fireBullet () {

    //  To avoid them being allowed to fire too fast we set a time limit
    if (game.time.now > bulletTime)
    {
        //  Grab the first bullet we can from the pool
        bullet = bullets.getFirstExists(false);

        if (bullet)
        {
            //  And fire it
            bullet.reset(player.x, player.y + 8);
            bullet.body.velocity.y = -400;
            bulletTime = game.time.now + 200;
        }
    }

}

function resetBullet (bullet) {

    //  Called if the bullet goes out of the screen
    bullet.kill();

}

function restart () {

    //  A new level starts

    //resets the life count
    lives = 3;
    //  And brings the aliens back from the dead :)
    aliens.removeAll();
    createAliens();

    //revives the player
    player.revive();
    //hides the text
    stateText.visible = false;

}