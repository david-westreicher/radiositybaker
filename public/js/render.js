if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;
var globalmaps = null;

var size = 512;
var tileSize = 16;
var plane = null;

require(['js/maps.js','js/scenes.js'],function(map,scenes){
    globalmaps = new map(size);
    plane = new THREE.PlaneGeometry(10,10);
    init(scenes.small);
    animate();
});
var radcam, camera, controls, radscene, scene, renderer,orthoscene;
var renderTarget = {
    size:512,
    rt: null,
    col: null
}
var downsampler = [];
var frame = 0;
var currentpos = {x:0,y:0};
var colmap = null;

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

function createDownSampler(scene){
    var currentSize = renderTarget.size;
    var num = 0;
    while(currentSize>renderTarget.size/tileSize){
        currentSize/=2;
        var rt = new THREE.WebGLRenderTarget(currentSize,currentSize, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat } );
        rt.generateMipmaps = true;

        var dsscene = new THREE.Scene();
        var rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: (num==0?renderTarget.rt:downsampler[downsampler.length-1].rt)}));
        rendertotexplane.material.side = THREE.DoubleSide;
        dsscene.add(rendertotexplane);
        downsampler.push({scene:dsscene,rt:rt});

        rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: rt}));
        rendertotexplane.position.x = 60 + 10*num++;
        rendertotexplane.position.y = 50;
        scene.add(rendertotexplane);
    }
    console.log(downsampler);
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


    var rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: renderTarget.col}));
    rendertotexplane.position.x = 20;
    rendertotexplane.position.y = 50;
    scene.add(rendertotexplane);
    rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: renderTarget.rt}));
    rendertotexplane.position.x = 40;
    rendertotexplane.position.y = 50;
    scene.add(rendertotexplane);

    return finalgeom;
}

function createcolmap(){
    var colmapdata = new Uint8Array(size*size*3);
    for(var x =0;x<size;x++){
        for(var y =0;y<size;y++){
            var dataIndex = (x+(size-y-1)*size)*3;
            var col = globalmaps.maps[0][x][y]==null?new THREE.Vector3(0,0,0):globalmaps.maps[2][x][y];
            colmapdata[dataIndex+0]= col.x*255;
            colmapdata[dataIndex+1]= col.y*255;
            colmapdata[dataIndex+2]= col.z*255;
        }
    }
    colmap = new THREE.DataTexture(colmapdata,size,size,THREE.RGBFormat);
    colmap.needsUpdate = true;
}

function createShader(){
    var shader = new THREE.ShaderMaterial({
        uniforms: {
            color: {type: 't', value: colmap},
            radiance: {type: 't', value: renderTarget.col}
        },
        vertexShader: [
            "varying vec2 vuv;",
            "void main() {",
            "   vuv = uv;",
            "   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
            "}"
        ].join("\n"),
        fragmentShader:[
            "uniform sampler2D color;",
            "uniform sampler2D radiance;",
            "varying vec2 vuv;",
            "void main() {",
            "   gl_FragColor = texture2D(color,vuv)*texture2D(radiance,vuv)*0.9;",
            "}"
        ].join("\n")
    });
    console.log(shader);
    return shader;
}

function init(cubes) {

    container = document.getElementById( 'container' );


    //var filter = THREE.NearestFilter;
    var filter = THREE.LinearFilter;
    renderTarget.col = new THREE.WebGLRenderTarget(size,size, { minFilter: filter , magFilter: filter, format: THREE.RGBFormat } );

    renderTarget.rt = new THREE.WebGLRenderTarget(renderTarget.size,renderTarget.size, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat } );

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 500 );
    radcam = new THREE.PerspectiveCamera( 90, 1, 0.1, 100 );
    orthocam = new THREE.OrthographicCamera(-5,5,5,-5,-1,1);
    camera.position.z = 30;
    controls = new THREE.OrbitControls( camera );

    scene = new THREE.Scene();
    radscene = new THREE.Scene();
    orthoscene = new THREE.Scene();
    createDownSampler(scene);
    var rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: downsampler[downsampler.length-1].rt}));
    rendertotexplane.material.side = THREE.DoubleSide;
    orthoscene.add(rendertotexplane);
    //orthoscene.add(new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial({color:0x00ff00})));

    var finalgeom = createScene(scene,cubes);
    createcolmap();
    var shader = createShader();

    rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: colmap}));
    rendertotexplane.position.x = -20;
    rendertotexplane.position.y = 50;
    scene.add(rendertotexplane);

    
    
    var finalmesh = new THREE.Mesh( finalgeom, shader );
    scene.add(finalmesh);
    finalmesh = new THREE.Mesh( finalgeom, shader );
    radscene.add(finalmesh);
    var blackmat = new THREE.MeshBasicMaterial( {color: 0x000000} );
    blackmat.side = THREE.BackSide;
    finalmesh = new THREE.Mesh( finalgeom, blackmat);
    radscene.add(finalmesh);

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

function downsample(){
    downsampler.forEach(function(ds){
        renderer.setRenderTarget(ds.rt);
        renderer.setViewport(0,0,ds.rt.width,ds.rt.height);
        renderer.render( ds.scene, orthocam, ds.rt );
    });
}

function advancepos(tiles){
    currentpos.x+=tiles;
    if(currentpos.x>=size){
        currentpos.x = 0;
        currentpos.y+=tiles;
    }
    if(currentpos.y>=size){
        currentpos.x = 0;
        currentpos.y = 0;
    }
}
function render() {

    var maps = globalmaps.maps;
    var tiles = renderTarget.size/tileSize;
    renderer.enableScissorTest(true);
    
    var allzero = true;
    for(var x = currentpos.x;x<size && x<currentpos.x+tiles;x++){
        for(var y = currentpos.y;y<size && y<currentpos.y+tiles;y++){
            var pos = maps[0][x][y];
            if(pos==null)
                continue;
            radcam.position.copy(pos);
            var lookat = new THREE.Vector3().copy(radcam.position).add(maps[1][x][y]);
            radcam.lookAt(lookat);
            
            renderer.setRenderTarget(renderTarget.rt);
            renderer.setViewport((x-currentpos.x)*tileSize,(y-currentpos.y)*tileSize,tileSize,tileSize);
            renderer.setScissor((x-currentpos.x)*tileSize,(y-currentpos.y)*tileSize,tileSize,tileSize);
            renderer.render( radscene, radcam, renderTarget.rt );
            allzero = false;
        }
    }
    //console.log(currentpos);
        //scene.add(new THREE.ArrowHelper( maps[1][currentpos.x][currentpos.y], radcam.position, 2, 0x00ff00 ));


    renderer.enableScissorTest(false);
    if(!allzero){
        downsample();
        renderer.enableScissorTest(true);

        renderer.setRenderTarget(renderTarget.col);
        renderer.setViewport(currentpos.x,currentpos.y,tiles,tiles);
        renderer.setScissor(currentpos.x,currentpos.y,tiles,tiles);
        renderer.render( orthoscene, orthocam, renderTarget.col );

        renderer.enableScissorTest(false);
    }

    //if(currentpos.y>100 && frame%100==0){}
    //else
    if(frame%10==0)
    advancepos(tiles);
    while(maps[1][currentpos.x][currentpos.y]==null)
        advancepos(tiles);
    renderer.setViewport(0,0, window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );
    frame++;
}
