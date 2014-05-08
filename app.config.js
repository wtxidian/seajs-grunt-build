(function( env ) {
    'use strict';

    // lofty configs
    var configs = {
		base: "http://test.1688.com/seajs-grunt-build/",
        alias: {
		  "jquery":"gallery/jquery/1.8.2/jquery",
			/*µ¯´°*/
			"dialog": "styles/component/dialog/src/dialog"
		},
		//"base":"http://style.c.alimg.com/",
		debug:false
    };

    if( typeof env.seajs !== 'undefined' ) {
        // for seajs
        env.seajs.config(configs);
    }

    if( typeof exports !== 'undefined' && env === exports ) {
        // for node.js
        exports.configs = configs;
    }

})(this);