var fs = require('fs');
var gulp = require('gulp');
var concatCss = require('gulp-concat-css');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var autoprefixer = require('gulp-autoprefixer');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var del = require('del');

gulp.task('clean', function(cb) {
    del(['build/**'], cb);
});

gulp.task('css', function() {
    gulp.src('./assets/css/*.css')
        .pipe(concatCss('style.min.css'))
        .pipe(minifyCss())
        .pipe(autoprefixer({
            browsers: ['last 10 versions'],
            cascade: false
        }))
        .pipe(gulp.dest('./public/css/'));

    gulp.src('./assets/css/fight/*.css')
        .pipe(concatCss('fight.min.css'))
        .pipe(minifyCss({compatibility: 'ie8'}))
        .pipe(autoprefixer({
            browsers: ['last 10 versions'],
            cascade: false
        }))
        .pipe(gulp.dest('./public/css/'));
});

gulp.task('sass', function() {
    gulp.src('./assets/sass/*.ccss')
        .pipe(sass('style.css'))
        .pipe(minifyCss(''))
        .pipe(rename('style.sass.min.css'))
        .pipe(autoprefixer({
            browsers: ['last 10 versions'],
            cascade: false
        }))
        .pipe(gulp.dest('./public/css/'));
});

gulp.task('html', function() {
    gulp.src('./assets/*.html')
        .pipe(gulp.dest('./public/'));
});

gulp.task('fonts', function() {
    gulp.src('./assets/font/**/*')
        .pipe(gulp.dest('./public/font/'));
});

gulp.task('js', function() {
    gulp.src('./assets/js/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('./public/js/'));
});
gulp.task('jslibs', function() {
    gulp.src('./assets/js/libs/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('./public/js/libs/'));
});
gulp.task('jsmods', function() {
    gulp.src('./assets/js/modules/**/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('./public/js/modules/'));
});
