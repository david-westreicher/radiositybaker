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
        requirejs([
                threejs+'controls/OrbitControls.js',
                'js/render.js'
            ],
            function(renderer){
                console.log(renderer);
            });
    }
);
