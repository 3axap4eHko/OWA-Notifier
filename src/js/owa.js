var exch = new Exchange();

function exchange(){
    return exch;
}

var timerId = setInterval(function(){
    if( !exch.isValid() ){
        chrome.browserAction.setBadgeText({text: 'setup'});
    }else{
        clearInterval(timerId);
        exch.run();
    }
},1000);
