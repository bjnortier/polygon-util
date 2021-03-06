var gulp = require('gulp');
var path = require('path');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var jscsStylish = require('gulp-jscs-stylish');

var srcFiles = path.join('lib', '**', '*.js');
var unitTestFiles = path.join('test', 'unit', '**', '*.test.js');
var functionalTestFiles = path.join('test', 'functional', 'src', '**', '*.js');

gulp.task('clearconsole', function() {
  process.stdout.write('\x1Bc');
});

gulp.task('jshint', function() {
  return gulp.src([
    srcFiles,
    unitTestFiles,
    functionalTestFiles
  ])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jscs', function() {
  return gulp.src([
    srcFiles,
    unitTestFiles,
    functionalTestFiles
  ])
    .pipe(jscs())
    .pipe(jscsStylish());
});

gulp.task('unit', ['jshint', 'jscs'], function() {
  return gulp.src(unitTestFiles)
    .pipe(mocha());
});

gulp.task('test', ['jshint', 'jscs', 'unit']);

gulp.task('default', ['test']);

gulp.task('watch', function() {
  gulp.watch([srcFiles], ['clearconsole', 'jshint', 'jscs', 'unit']);
  gulp.watch([unitTestFiles], ['clearconsole', 'jshint', 'jscs', 'unit']);
  gulp.watch([functionalTestFiles], ['clearconsole', 'jshint', 'jscs']);
});
