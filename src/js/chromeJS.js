function CJS(params) {
    var cJS = this;
    var canvas = $('<canvas>').attr({width: 19, height: 19}).get(0);
    var canvasContext = canvas.getContext('2d');
    var image = $('<img>', {src: ''});
    var sound = $('<audio>', {preload: 'auto', src: ''});

    var iteration = 0;

    var config = {
        disable                    : {
            image     : 'images/icon_d.png',
            background: [190,190,190,230]
        },
        enable                     : {
            image     : 'images/icon.png',
            background:[208,0,24,255]
        },
        animation: {
            frames: 36,
            speed: 10
        },
        sound: 'sounds/mail_sound.ogg',
        icon: 'images/icon.png'
    };

    cJS.enableIcon = function(enable){
        if(enable){
            chrome.browserAction.setIcon({path: config.enable.image});
            chrome.browserAction.setBadgeBackgroundColor({color:config.enable.background});
        }else{
            chrome.browserAction.setIcon({path: config.disable.image});
            chrome.browserAction.setBadgeBackgroundColor({color:config.disable.background});
        }
    };

    cJS.drawRotation = function(rotation){
        canvasContext.save();
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        canvasContext.translate(Math.ceil(canvas.width / 2), Math.ceil(canvas.height / 2));
        canvasContext.rotate(2 * Math.PI * ((1 - Math.sin(Math.PI / 2 + rotation * Math.PI)) / 2));
        canvasContext.drawImage(image.get(0), -Math.ceil(canvas.width / 2), -Math.ceil(canvas.height / 2));
        canvasContext.restore();
        chrome.browserAction.setIcon({imageData: canvasContext.getImageData(0, 0, canvas.width, canvas.height)});
    };

    cJS.drawCollapse = function(iteration){
        var delta = 2* Math.PI * iteration;
        canvasContext.save();
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        canvasContext.scale(1, 0.5 + 0.5*Math.cos(delta));

        canvasContext.drawImage(image.get(0), 0, canvas.height * (0.5 - 0.5*Math.cos(delta)));
        canvasContext.restore();
        chrome.browserAction.setIcon({imageData: canvasContext.getImageData(0, 0, canvas.width, canvas.height)});

    };

    cJS.animate = function(type){
        if(!type){
            type = 'collapse';
        }
        var drawMethod = 'draw' + type.charAt(0).toUpperCase() + type.slice(1);
        if ( cJS[drawMethod]){
            iteration += 1/config.animation.frames;
            cJS[drawMethod](iteration);
            if (iteration <= 1) {
                setTimeout(cJS.animate, config.animation.speed);
            } else {
                cJS[drawMethod](iteration = 0);
            }
        }
    };
    cJS.volume = function(value){
        sound.get(0).muted=(value==0);
        sound.get(0).volume=value;
    };

    cJS.playSound = function(soundFile){
        sound.get(0).pause();
        sound.get(0).currentTime = 0;
        if (soundFile){
            sound.attr('src', soundFile);
        }
        sound.get(0).play();
    };

    config = $.extend({}, config, params);
    sound.attr('src', config.sound);
    image.attr('src', config.icon);

}