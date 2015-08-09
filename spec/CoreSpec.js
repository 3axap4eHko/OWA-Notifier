require('../src/js/core');
describe("Core:", function() {

    it("Should format string with object parameter", function(){
        for(var i=0; i<10; i++) {
            var placeHolder = _.randomString(5),
                replace = _.randomString(10),
                rightSide = _.randomString(5),
                leftSide= _.randomString(5),
                testString1=  leftSide + "{"+placeHolder+"}" + rightSide+ "{"+placeHolder+"}",
                parameters = {};
            parameters[placeHolder] = replace;
            expect(_.fmtString(testString1, parameters)).toBe(leftSide + replace + rightSide + replace);
        }
    });

    it("Should format string with array parameter", function(){
        for(var i=0; i<10; i++) {
            var replace = _.randomString(10),
                parameters = [replace],
                rightSide = _.randomString(5),
                leftSide= _.randomString(5),
                testString1=  leftSide + "{0}" + rightSide + "{0}";
            expect(_.fmtString(testString1, parameters)).toBe(leftSide + replace + rightSide + replace);
        }
    });

});