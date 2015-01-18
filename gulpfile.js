'use strict';

var browserSync = require('browser-sync'),
    del         = require('del'),
    gulp        = require('gulp'),
    runSequence = require('run-sequence'),
    vinylPaths  = require('vinyl-paths'),
    $           = require('gulp-load-plugins')();

var DIR = {
  APP:  './app',
  DIST: './dist'
}

gulp.task('browser-sync', function() {
  browserSync({
    server: {
      baseDir: DIR.DIST
    }
  });
});

gulp.task('clean', function(cb) {
  del([ DIR.DIST + '/**' ], cb);
});

gulp.task('compile', [
  'compile:extras',
  'compile:html',
  'compile:images',
  'compile:scripts',
  'compile:styles'
]);

gulp.task('compile:extras', function() {
  return gulp.src(['./CNAME', DIR.APP + '/favicon.ico'])
    .pipe(gulp.dest(DIR.DIST));
});

gulp.task('compile:html', function() {
  return gulp.src(DIR.APP + '/**/*.html')
    .pipe(gulp.dest(DIR.DIST));
});

gulp.task('compile:images', function() {
  return gulp.src(DIR.APP + '/images/*')
    .pipe($.size())
    .pipe(gulp.dest(DIR.DIST + '/images'));
});

gulp.task('compile:scripts', function() {
  return gulp.src(DIR.APP + '/scripts/app.js')
    .pipe(gulp.dest(DIR.DIST + '/scripts/'));
});

gulp.task('compile:styles', function() {
  return $.rubySass(DIR.APP + '/styles/')
    .pipe($.plumber())
    .on('error', $.notify.onError('Sass failed'))
    .on('error', $.util.log)
    .pipe($.sourcemaps.init())
    .pipe($.autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest(DIR.DIST + '/styles'));
});

gulp.task('minifyVersion', function(cb) {
  var cssGlob     = '**/*.css',
      jsGlob      = '**/*.js',
      mapGlob     = '**/*.map',
      cssFilter   = $.filter(cssGlob),
      jsFilter    = $.filter(jsGlob),
      assetFilter = $.filter([cssGlob, jsGlob, mapGlob]),
      vp          = vinylPaths();

  return gulp.src(DIR.DIST + '/**')
    // Store asset paths to delete after stream
    .pipe(assetFilter)
    .pipe(vp)
    .pipe(assetFilter.restore())
    // Minify JS
    .pipe(jsFilter)
    .pipe($.uglify())
    .on('error', $.notify.onError('Uglify failed'))
    .on('error', $.util.log)
    .pipe(jsFilter.restore())
    // Minify CSS
    .pipe(cssFilter)
    .pipe($.csso())
    .on('error', $.notify.onError('CSSO failed'))
    .on('error', $.util.log)
    .pipe(cssFilter.restore())
    // Version assets
    .pipe($.revAll({
      ignore: ['.html']
    }))
    .pipe(gulp.dest(DIR.DIST))
    // Show asset sizes
    .pipe($.size({
      showFiles: true,
      gzip: true
    }))
    // Delete unversioned assets
    .on('end', function() {
      del(vp.paths);
    }, cb);
});

gulp.task('build', function() {
  runSequence('clean', 'compile', 'minifyVersion');
});

gulp.task('deploy', ['build'], function() {
  return gulp.src('./dist/**/*')
    .pipe($.ghPages());
});

gulp.task('dev', ['clean'], function() {
  runSequence('compile', ['browser-sync', 'watch']);
});

gulp.task('watch', function() {
  gulp.watch(DIR.APP + '/styles/**/*.scss', ['compile:styles']);
  gulp.watch(DIR.APP + '/scripts/**/*.js',  ['compile:scripts']);
  gulp.watch(DIR.APP + '/fonts/**/*',       ['compile:fonts']);
  gulp.watch(DIR.APP + '/images/**/*',      ['compile:images']);
  gulp.watch(DIR.APP + '/**/*.html',        ['compile:html']);
});

gulp.task('default', ['dev']);
