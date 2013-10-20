(function(){
    Object.defineProperty(Object.prototype,'toArray',{
        value: function(){
            return Array.prototype.slice.apply(this,[0]);
        }
    });
    Object.defineProperty(Function,'empty',{
        value: function(){}
    });
    Object.defineProperty(Function,'true',{
        value: function(){return true;}
    });
    Object.defineProperty(Function,'false',{
        value: function(){return true;}
    });
    Object.defineProperty(Function,'self',{
        value: function(value){return value;}
    });

})();