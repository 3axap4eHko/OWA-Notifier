var fs = require('fs');
var gulp = require('gulp');
var minifyCss = require('gulp-minify-css');
var minifyHtml = require('gulp-minify-html');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var del = require('del');

gulp.task('clean', function(cb) {
    del(['build'], function(){
        fs.mkdir('build', cb);
    });
});

gulp.task('css', ['clean'], function() {
    gulp.src(['./src/css/*.css','!./src/css/*.min.css'])
        .pipe(minifyCss({compatibility: 'ie8'}))
        .pipe(autoprefixer({
            browsers: ['last 10 versions'],
            cascade: false
        }))
        .pipe(gulp.dest('./build/css/'));
    gulp.src(['./src/css/*.min.css'])
        .pipe(gulp.dest('./build/css/'));
});

gulp.task('js', ['clean'], function() {
    gulp.src(['./src/js/*.js', '!./src/js/*.min.js'])
        .pipe(uglify())
        .pipe(gulp.dest('./build/js/'));
    gulp.src(['./src/js/*.min.js'])
        .pipe(gulp.dest('./build/js/'));
});

gulp.task('fonts', ['clean'], function() {
    gulp.src('./src/fonts/*.woff2')
        .pipe(gulp.dest('./build/fonts/'));
});

gulp.task('images', ['clean'], function() {
    gulp.src('./src/images/*.png')
        .pipe(gulp.dest('./build/images/'));
});

gulp.task('sounds', ['clean'], function() {
    gulp.src('./src/sounds/*.ogg')
        .pipe(gulp.dest('./build/sounds/'));
});

gulp.task('xml', ['clean'], function() {
    gulp.src('./src/xml/*.xml')
        .pipe(gulp.dest('./build/xml/'));
});

gulp.task('html', ['clean'], function() {
    gulp.src('./src/*.html')
        .pipe(minifyHtml())
        .pipe(gulp.dest('./build/'));
});

gulp.task('manifest', ['clean'], function() {
    gulp.src('./src/manifest.json')
        .pipe(gulp.dest('./build/'));
});

gulp.task('default', ['clean', 'html', 'css', 'js', 'fonts', 'images','sounds','xml','manifest']);