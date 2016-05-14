const buildDir = './build';
const buildFile = './owa.zip';

var fs = require('fs');
var gulp = require('gulp');
var cleanCSS = require('gulp-clean-css');
var htmlMin = require('gulp-htmlmin');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var del = require('del');
var babel = require('gulp-babel');

gulp.task('clean', cb => {
    return del([buildDir, buildFile], cb);
});

gulp.task('css-minify', ['clean'], function() {
    return gulp.src(['./src/css/*.css', '!./src/css/*.min.css'])
        .pipe(cleanCSS())
        .pipe(autoprefixer({
            browsers: ['last 10 versions'],
            cascade: false
        }))
        .pipe(gulp.dest(`${buildDir}/css`));
});

gulp.task('css-copy', ['clean'], function() {
    return gulp.src(['./src/css/*.min.css'])
        .pipe(gulp.dest(`${buildDir}/css`));
});

gulp.task('js-minify', ['clean'], function() {
    return gulp.src(['./src/js/*.js', '!./src/js/*.min.js', '!./src/js/*.dev.js'])
        .pipe(babel({
                  presets: ['es2015','react']
              }))
        .pipe(uglify())
        .pipe(gulp.dest(`${buildDir}/js`));
});

gulp.task('js-copy', ['clean'], function() {
    return gulp.src(['./src/js/*.min.js'])
        .pipe(gulp.dest(`${buildDir}/js`));
});

gulp.task('fonts-copy', ['clean'], function() {
    return gulp.src('./src/fonts/*.woff2')
        .pipe(gulp.dest(`${buildDir}/fonts/`));
});

gulp.task('images-copy', ['clean'], function() {
    return gulp.src('./src/images/*.png')
        .pipe(gulp.dest(`${buildDir}/images/`));
});

gulp.task('sounds-copy', ['clean'], function() {
    return gulp.src('./src/sounds/*.ogg')
        .pipe(gulp.dest(`${buildDir}/sounds/`));
});

gulp.task('xml-copy', ['clean'], function() {
    return gulp.src('./src/xml/*.xml')
        .pipe(gulp.dest(`${buildDir}/xml/`));
});

gulp.task('html-minify', ['clean'], function() {
    return gulp.src('./src/*.html')
        .pipe(htmlMin())
        .pipe(gulp.dest(`${buildDir}`));
});

gulp.task('manifest-generate', ['clean'], function() {
    return gulp.src('./src/manifest.json')
        .pipe(gulp.dest(`${buildDir}`));
});

gulp.task('other-files', ['clean'], function() {
    return gulp.src(['./LICENSE.txt', './README.md'])
        .pipe(gulp.dest(`${buildDir}`));
});

gulp.task('packing', ['html-minify', 'css-minify', 'css-copy', 'js-minify', 'js-copy', 'fonts-copy', 'images-copy', 'sounds-copy','xml-copy', 'manifest-generate', 'other-files'], function(){
    var JSZip = require("jszip");
    var zip = new JSZip();
    var replacer = new RegExp(`^${buildDir}(\\\/)`);
    require('glob').sync(`${buildDir}/**/*`).forEach(function(file){
        if (fs.lstatSync(file).isFile()) {
            zip.file(file.replace(replacer, ''), fs.readFileSync(file));
        }
    });
    return zip.generateAsync({type:"nodebuffer"})
        .then( buffer => fs.writeFile(buildFile, buffer));
});

gulp.task('default', ['packing']);