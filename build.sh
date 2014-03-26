#!/bin/bash
cd $(dirname $0)
rm -rf build owa.zip
cp -r src build
function compress {
    java -jar compiler.jar --js $1 --js_output_file $2
    echo Compress: $1 $(stat -c %s $1)" > "$2 $(stat -c %s $2)
}
compress "src/js/core.js"        "build/js/core.js"
compress "src/js/plugins.js"     "build/js/plugins.js"
compress "src/js/chromeJS.js"    "build/js/chromeJS.js"
compress "src/js/exchange.js"    "build/js/exchange.js"
compress "src/js/owa.js"         "build/js/owa.js"
compress "src/js/owa_options.js" "build/js/owa_options.js"
compress "src/js/notify.js"      "build/js/notify.js"
compress "src/js/popup.js"       "build/js/popup.js"
zip -r owa.zip src>/dev/null
echo Build owa.zip complete!
