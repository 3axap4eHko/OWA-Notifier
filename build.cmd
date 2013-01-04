@echo off
cd %~dp0
rmdir /S /Q build
mkdir build
xcopy /E src build
echo Compress chromeJS.js
java -jar compiler.jar --js "src/js/chromeJS.js" --js_output_file "build/js/chromeJS.js"
echo Compress exchange.js
java -jar compiler.jar --js "src/js/exchange.js" --js_output_file "build/js/exchange.js"
echo Compress owa.js
java -jar compiler.jar --js "src/js/owa.js" --js_output_file "build/js/owa.js"
echo Compress owa_options.js
java -jar compiler.jar --js "src/js/owa_options.js" --js_output_file "build/js/owa_options.js"
echo Build complete, make zip file!
pause