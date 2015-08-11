var three = "libs/threejs/"
var threejs = three+"examples/js/"

requirejs(
    [
        three+'build/three.js',
        threejs+'Detector.js',
        threejs+'libs/stats.min.js'
    ],
    function(){
        console.log('all loaded');
        requirejs(['js/render.js']);
    }
);
