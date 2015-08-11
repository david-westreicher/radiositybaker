if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;
var globalmaps = null;

var size = 512;
require(['js/maps.js'],function(map){
    globalmaps = new map(size);
    init();
    animate();
});
var radcam, camera, controls, radscene, scene, renderer;
var globaltex = null;
var rttex = null;
var rttexbuf = null;
var rtsize = 128;
var frame = 0;
var off = 0;
var currentpos = {x:0,y:0};


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

function getgeoms(material,newscene){
    var cube = new THREE.Mesh(new THREE.BoxGeometry(20,1,20),material);
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(20,1,20),material);
    cube.position.y = 20;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(20,20,1),material);
    cube.position.y = 10;
    cube.position.z = 10;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(20,20,1),material);
    cube.position.y = 10;
    cube.position.z = -10;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(1,20,20),material);
    cube.position.y = 10;
    cube.position.x = 10;
    newscene.push(cube);
    cube = new THREE.Mesh( new THREE.CylinderGeometry( 5, 5, 10, 12 ),material);
    cube.position.y = 14;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.IcosahedronGeometry(10),material);
    cube.position.y = -7;
    newscene.push(cube);
}

function getgeoms2(material,newscene){
    var s = 30;
    var cube = new THREE.Mesh(new THREE.PlaneGeometry(s,s),material);
    cube.rotation.x = -Math.PI/2;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.PlaneGeometry(s,s),material);
    cube.rotation.x = Math.PI/2;
    cube.position.y = s/2;
    newscene.push(cube);
}

function getgeoms3(material,newscene){
    var cube = new THREE.Mesh( new THREE.TorusKnotGeometry(10,4), material ); 
    newscene.push(cube);
}

function createScene(scene){
    var newscene = [];
    var material = new THREE.MeshBasicMaterial({color:Math.random()*0xffffff});
    getgeoms(material,newscene);

    var newgeom = new THREE.Geometry();
    var finalgeom = new THREE.Geometry();
    var cubenum = 0;
    newscene.forEach(function(cube){
        //cube.position.y = (cubenum++)*5;
        cube.updateMatrixWorld(true);
        var geom = cube.geometry;
        var verts = geom.vertices;
        geom.faces.forEach(function(face){
            var v1 = new THREE.Vector3().copy(verts[face.a]);cube.localToWorld(v1);
            var v2 = new THREE.Vector3().copy(verts[face.b]);cube.localToWorld(v2);
            var v3 = new THREE.Vector3().copy(verts[face.c]);cube.localToWorld(v3);


            var newtri = flatten(v1,v2,v3);
            var plotresult = globalmaps.plotIntoMaps(newtri,[v1,v2,v3]);
            newtri.forEach(function(vert){
                newgeom.vertices.push(vert.add(new THREE.Vector3(plotresult.space[0],plotresult.space[1],0)));
            });

            var vertnum = newgeom.vertices.length-3;
            newgeom.faces.push(new THREE.Face3(vertnum,vertnum+1,vertnum+2));
            finalgeom.faces.push(new THREE.Face3(vertnum,vertnum+1,vertnum+2,plotresult.normal));
            finalgeom.vertices.push(v1,v2,v3);
            finalgeom.faceVertexUvs[0].push(plotresult.uvs);
        });
        //scene.add(cube);
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
    //finaltex = THREE.ImageUtils.loadTexture( "img/uv_checker large.png" );
    var finalmesh = new THREE.Mesh( finalgeom, new THREE.MeshBasicMaterial( {map: finaltex} ) );
    scene.add(finalmesh);
    finalmesh = new THREE.Mesh( finalgeom, new THREE.MeshBasicMaterial( {map: finaltex} ) );
    radscene.add(finalmesh);

    var newmesh = new THREE.Mesh( newgeom, new THREE.MeshBasicMaterial( {color: 0x0000ff} ) );
    newmesh.position.x = 10;
    newmesh.position.y = 10;
    newmesh.scale.x = newmesh.scale.y = newmesh.scale.z = 0.1;
    //scene.add(newmesh);

    /*
    var pointgeom = new THREE.Geometry();

    for(var x=0;x<size;x++)
        for(var y=0;y<size;y++){
            var vert = maps[0][x][y];
            if(vert)
                pointgeom.vertices.push(vert);
        }
    //scene.add(new THREE.PointCloud(pointgeom,new THREE.PointCloudMaterial({color:0x00FF00,size:0.2})));
    //*/
    var rendertotexplane = new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial({map: finaltex}));
    rendertotexplane.position.x = 20;
    rendertotexplane.position.y = 30;
    scene.add(rendertotexplane);
    rendertotexplane = new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial({map: rttex}));
    rendertotexplane.position.x = 0;
    rendertotexplane.position.y = 30;
    scene.add(rendertotexplane);
}

function init() {

    container = document.getElementById( 'container' );

    rttexbuf = new THREE.DataTexture(new Uint8Array(4*rtsize*rtsize),rtsize,rtsize,THREE.RGBAFormat);
    rttex = new THREE.WebGLRenderTarget(rtsize,rtsize, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100 );
    radcam = new THREE.PerspectiveCamera( 90, 1, 0.1, 100 );
    camera.position.z = 30;
    controls = new THREE.OrbitControls( camera );

    scene = new THREE.Scene();
    radscene = new THREE.Scene();
    createScene(scene);

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
    col.multiplyScalar(0.4);
    return col;
}

function render() {

    //if(frame%2==0)
        //console.log(off);
    for(var i = 0;i<20;i++){
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
            var diff = 0;
            diff+= Math.abs(imdat[index+0] - (col.x|0));
            diff+= Math.abs(imdat[index+1] - (col.y|0));
            diff+= Math.abs(imdat[index+2] - (col.z|0));
            imdat[index+0] = col.x|0;
            imdat[index+1] = col.y|0;
            imdat[index+2] = col.z|0;
            if(diff==0 && col.length()>255){
                //console.log(currentpos);
                off++;
                globalmaps[0][currentpos.x][currentpos.y] = null;
            }
        }
    }
    globaltex.needsUpdate = true;
    renderer.render( scene, camera );
    frame++;
}
