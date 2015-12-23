var now = new Date();
var christmas = [11];
var winter = [0,1,11,10];

if (~christmas.indexOf(now.getMonth())) {
    document.body.classList.add('christmas');
}
if (~winter.indexOf(now.getMonth())) {
    document.body.classList.add('winter');
}
