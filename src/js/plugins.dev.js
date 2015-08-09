function getStyle(i) {
    var a  = i * Math.PI/ 6;
    var r = 100;
    var x = _.toInt(r*Math.sin(a)+105);
    var y = _.toInt(r-r*Math.cos(a)+5);
    var style = '.time-picker .time-picker-table>.time-picker-number:nth-child('+(i+1)+') {\n' +
        '    left:' + x + 'px;\n' +
        '    top:' + y + 'px;\n' +
        '}\n';
    r = 20;
    var da = - a;
    x = _.toInt(r * Math.sin(da) + r/2 + 10);
    y = _.toInt(r * Math.cos(da) + 20);
    a = 30*i;
    style +='.time-picker .time-picker-table>.time-picker-number:nth-child('+(i+1)+'):before {\n' +
        '    left: ' + x + 'px;\n' +
        '    top: ' + y + 'px;\n' +
        '    -webkit-transform: rotate(' + a + 'deg);\n' +
        '    -moz-transform: rotate(' + a + 'deg);\n' +
        '    -o-transform: rotate(' + a + 'deg);\n' +
        '    -ms-transform: rotate(' + a + 'deg);\n' +
        '    transform: rotate(' + a + 'deg);\n' +
        '}\n';
    return style;
}
