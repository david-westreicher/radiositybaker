if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;
var globalmaps = null;

var size = 512;
require(['js/maps.js','js/scenes.js'],function(map,scenes){
    globalmaps = new map(size);
    init(scenes.small);
    animate();
});
var radcam, camera, controls, radscene, scene, renderer;
var globaltex = null;
var rttex = null;
var rttexbuf = null;
var rtsize = 16;
var frame = 0;
var currentpos = {x:0,y:0};
var bigFrame = null;

function flatten(v1,v2,v3){
    /*
                     d12
       v1 = (0,0) o-------o v2 = (d12,0)
                   \     /
              d13   \   /  d23
                     \ /
                      o

                   v3 = (x,y)
    */
    var d12 = v1.distanceTo(v2);
    var d13 = v1.distanceTo(v3);
    var d23 = v2.distanceTo(v3);
    var x = (d23*d23-d13*d13-d12*d12)/(-2.0*d12);
    var y = Math.sqrt(d13*d13-x*x);
    var v1p = new THREE.Vector3(0,0,0);
    var v2p = new THREE.Vector3(d12,0,0);
    var v3p = new THREE.Vector3(x,y,0);
    return [v1p,v2p,v3p];
}

function colToVec(col){
    return new THREE.Vector3(col.r,col.g,col.b);
}

function createScene(scene,cubes){
    var newscene = cubes;
    var material = new THREE.MeshBasicMaterial({color:Math.random()*0xffffff});

    var finalgeom = new THREE.Geometry();
    var cubenum = 0;
    newscene.forEach(function(cube){
        cube.updateMatrixWorld(true);
        var geom = cube.geometry;
        var verts = geom.vertices;
        geom.faces.forEach(function(face){
            var v1 = new THREE.Vector3().copy(verts[face.a]);cube.localToWorld(v1);
            var v2 = new THREE.Vector3().copy(verts[face.b]);cube.localToWorld(v2);
            var v3 = new THREE.Vector3().copy(verts[face.c]);cube.localToWorld(v3);

            var newtri = flatten(v1,v2,v3);
            var plotresult = globalmaps.plotIntoMaps(newtri,[v1,v2,v3],colToVec(cube.material.color));

            var vertnum = finalgeom.vertices.length;
            finalgeom.faces.push(new THREE.Face3(vertnum,vertnum+1,vertnum+2));
            finalgeom.vertices.push(v1,v2,v3);
            finalgeom.faceVertexUvs[0].push(plotresult.uvs);
        });
    });

    var texdat = new Uint8Array(size*size*3);
    for(var x =0;x<=size;x++){
        for(var y =0;y<=size;y++){
            var dataIndex = (x+y*size)*3;
            texdat[dataIndex+0]= 0;
            texdat[dataIndex+1]= 0;
            texdat[dataIndex+2]= 0;
        }
    }
    var finaltex = new THREE.DataTexture(texdat,size,size,THREE.RGBFormat);
    //finaltex.magFilter = finaltex.minFilter = THREE.NearestFilter;
    finalgeom.uvsNeedUpdate = true;
    finaltex.needsUpdate = true;
    globaltex = finaltex;
    var finalmesh = new THREE.Mesh( finalgeom, new THREE.MeshBasicMaterial( {map: finaltex} ) );
    scene.add(finalmesh);
    finalmesh = new THREE.Mesh( finalgeom, new THREE.MeshBasicMaterial( {map: finaltex} ) );
    radscene.add(finalmesh);
    var blackmat = new THREE.MeshBasicMaterial( {color: 0x000000} );
    blackmat.side = THREE.BackSide;
    finalmesh = new THREE.Mesh( finalgeom, blackmat);
    radscene.add(finalmesh);

    var plane = new THREE.PlaneGeometry(10,10)
    var rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: finaltex}));
    rendertotexplane.position.x = 20;
    rendertotexplane.position.y = 50;
    scene.add(rendertotexplane);
    rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: rttex}));
    rendertotexplane.position.x = 0;
    rendertotexplane.position.y = 50;
    scene.add(rendertotexplane);
    rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: bigFrame}));
    rendertotexplane.position.x = 40;
    rendertotexplane.position.y = 50;
    scene.add(rendertotexplane);
}

function init(cubes) {

    container = document.getElementById( 'container' );

    rttexbuf = new THREE.DataTexture(new Uint8Array(4*rtsize*rtsize),rtsize,rtsize,THREE.RGBAFormat);
    rttex = new THREE.WebGLRenderTarget(rtsize,rtsize, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );
    bigFrame = new THREE.WebGLRenderTarget(2048,2048, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100 );
    radcam = new THREE.PerspectiveCamera( 90, 1, 0.1, 100 );
    camera.position.z = 30;
    controls = new THREE.OrbitControls( camera );

    scene = new THREE.Scene();
    radscene = new THREE.Scene();
    createScene(scene,cubes);

    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setClearColor(0xffffff);
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    container.appendChild( renderer.domElement );

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );
    controls.update();
    render();
    stats.update();
}

function increasepos(){
    currentpos.x++;
    if(currentpos.x==size){
        currentpos.x = 0;
        currentpos.y++;
        if(currentpos.y==size)
            currentpos.y = 0;
    }
}

function setRadCamPos(){
    increasepos();
    var maps = globalmaps.maps;
    while(maps[0][currentpos.x][currentpos.y] == null)
        increasepos();
    var x = currentpos.x;
    var y = currentpos.y;
    radcam.position.copy(maps[0][x][y]);
    var lookat = new THREE.Vector3().copy(radcam.position).add(maps[1][x][y]);
    radcam.lookAt(lookat);
    //scene.add(new THREE.ArrowHelper( globalmaps[1][x][y], radcam.position, 2, frame*0x00000f ));
}

function getCol(dat){
    var col = new THREE.Vector3();
    var norm = 1.0/(rtsize*rtsize);
    for(var x = 0;x<rtsize;x++){
        for(var y = 0;y<rtsize;y++){
            var index = (x*rtsize+y)*4;
            col.x+=dat[index+0]*norm;
            col.y+=dat[index+1]*norm;
            col.z+=dat[index+2]*norm;
        }
    }
    col.multiplyScalar(0.9);
    return col;
}

function render() {

    //if(frame%2==0)
    for(var i = 0;i<10;i++){
        //render into texture
        setRadCamPos();
        renderer.render( radscene, radcam, rttex );
        //download rendered texture
        var gl = renderer.getContext();
        var dat = rttexbuf.image.data;
        gl.readPixels(0, 0, rtsize, rtsize, gl.RGBA, gl.UNSIGNED_BYTE, dat);
        var col = getCol(dat);
        //var col = new THREE.Vector3(255,255,255);
        if(globaltex){
            var imdat = globaltex.image.data;
            var index = ((size-currentpos.y)*size+currentpos.x-1)*3;
            col.x = col.x|0;
            col.y = col.y|0;
            col.z = col.z|0;
            col.multiply(globalmaps.maps[2][currentpos.x][currentpos.y]);

            var diff = 0;
            diff+= Math.abs(imdat[index+0] - col.x);
            diff+= Math.abs(imdat[index+1] - col.y);
            diff+= Math.abs(imdat[index+2] - col.z);
            imdat[index+0] = col.x|0;
            imdat[index+1] = col.y|0;
            imdat[index+2] = col.z|0;
            if(diff==0 && col.length()>255){
                globalmaps.maps[0][currentpos.x][currentpos.y] = null;
            }
        }
    }
    globaltex.needsUpdate = true;
    renderer.render( scene, camera );
    frame++;
}
