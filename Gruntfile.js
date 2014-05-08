module.exports = function (grunt) {
    var transport = require('grunt-cmd-transport');
    var style = transport.style.init(grunt);
    var text = transport.text.init(grunt);
    var script = transport.script.init(grunt);

    grunt.initConfig({
        pkg : grunt.file.readJSON("package.json"),

        transport : {
            options : {
                paths : ['.'],
                alias: '<%= pkg.spm.alias %>',
                parsers : {
                    '.js' : [script.jsParser],
                    //'.css' : [style.css2jsParser],
                    '.html' : [text.html2jsParser]
                }
            },

            styles : {
                options : {
                    idleading : 'dist/styles/'
                },

                files : [
                    {
                        cwd : 'styles/',
                        src : '**/*',
                        filter : 'isFile',
                        dest : 'dist/styles'
                    }
                ]
            },

            app1 : {
                options : {
                    idleading : 'app1/'
                },

                files : [
                    {
                        cwd : 'app',
                        src : '**/*',
                        filter : 'isFile',
                        dest : 'dist/app'
                    }
                ]
            }
        },

        uglify : {
            styles : {
                files: [
                    {
                        expand: true,
                        cwd: 'dist/',
                        src: ['styles/**/*.js', '!styles/**/*-debug.js'],
                        dest: 'dist/',
                        ext: '.js'
                    }
                ]
            },
            app1 : {
                files: [
                    {
                        expand: true,
                        cwd: 'dist/',
                        src: ['app/**/*.js', '!app/**/*-debug.js'],
                        dest: 'dist/',
                        ext: '.js'
                    }
                ]
            }
        },

        clean : {
            spm : ['.build']
        }
    });

    grunt.loadNpmTasks('grunt-cmd-transport');
    grunt.loadNpmTasks('grunt-cmd-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('build-styles', ['transport:styles', 'uglify:styles', 'clean']);
    grunt.registerTask('build-app1', ['transport:app1', 'uglify:app1','clean']);
//    grunt.registerTask('default', ['clean']);
};