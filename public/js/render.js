if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var stats;
var globalmaps = null;

var size = 512;
var tileSize = 16;
var plane = null;
var reflectivity = 0.9;

require(['js/maps.js','js/scenes.js'],function(map,scenes){
    globalmaps = new map(size);
    plane = new THREE.PlaneGeometry(10,10);
    init(scenes.small);
    animate();
});
var radcam, camera, controls, radscene, scene, renderer,orthoscene;
var renderTarget = {
    size:256,
    rt: null,
    col: null
}
var downsampler = [];
var frame = 0;
var pass = 0;
var debugnum = 0;
var currentpos = {x:0,y:0};
var colmap = null;

function colToVec(col){
    return new THREE.Vector3(col.r,col.g,col.b);
}

function addDebugTex(tex){
    var rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: tex}));
    rendertotexplane.position.x = 10*debugnum++;
    rendertotexplane.position.y = 50;
    scene.add(rendertotexplane);
}

function createDownSampler(scene){
    var currentSize = renderTarget.size;
    var num = 0;
    while(currentSize>renderTarget.size/tileSize){
        currentSize/=2;
        var rt = new THREE.WebGLRenderTarget(currentSize,currentSize, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );

        var dsscene = new THREE.Scene();
        var rendertotexplane = new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map: (num==0?renderTarget.rt:downsampler[downsampler.length-1].rt)}));
        rendertotexplane.material.side = THREE.DoubleSide;
        dsscene.add(rendertotexplane);
        downsampler.push({scene:dsscene,rt:rt});
        addDebugTex(rt);
        num++;
    }
}

function transformNormals(normMatrix,norms){
    var result = [];
    norms.forEach(function(norm){
        var n = new THREE.Vector3().copy(norm).applyMatrix4(normMatrix);
        result.push(n);
    });
    return result;
}

function createScene(scene,newscene){

    var finalgeom = new THREE.Geometry();
    var cubenum = 0;
    newscene.forEach(function(cube){
        cube.updateMatrixWorld(true);
        var normMatrix = new THREE.Matrix4().getInverse(cube.matrix).transpose();
        var geom = cube.geometry;
        var verts = geom.vertices;
        geom.faces.forEach(function(face){
            var v1 = new THREE.Vector3().copy(verts[face.a]);cube.localToWorld(v1);
            var v2 = new THREE.Vector3().copy(verts[face.b]);cube.localToWorld(v2);
            var v3 = new THREE.Vector3().copy(verts[face.c]);cube.localToWorld(v3);
            var norms = transformNormals(normMatrix,face.vertexNormals);

            var plotresult = globalmaps.plotIntoMaps([v1,v2,v3],norms,colToVec(cube.material.color));

            var vertnum = finalgeom.vertices.length;
            finalgeom.faces.push(new THREE.Face3(vertnum,vertnum+1,vertnum+2));
            finalgeom.vertices.push(v1,v2,v3);
            finalgeom.faceVertexUvs[0].push(plotresult.uvs);
        });
    });

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
            "   gl_FragColor = texture2D(color,vuv)*texture2D(radiance,vuv)*"+reflectivity+";",
            "}"
        ].join("\n")
    });
    return shader;
}

function init(cubes) {

    //var filter = THREE.NearestFilter;
    var nearest = THREE.NearestFilter;
    var linear = THREE.LinearFilter;
    renderTarget.col = new THREE.WebGLRenderTarget(size,size, { minFilter: nearest , magFilter: linear, format: THREE.RGBFormat } );

    renderTarget.rt = new THREE.WebGLRenderTarget(renderTarget.size,renderTarget.size, { minFilter: linear, magFilter: linear, format: THREE.RGBFormat } );

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

    var finalgeom = createScene(scene,cubes);
    createcolmap();

    addDebugTex(renderTarget.rt);
    addDebugTex(renderTarget.col);
    addDebugTex(colmap);
    
    
    var shader = createShader();
    scene.add(new THREE.Mesh(finalgeom, shader));
    radscene.add(new THREE.Mesh(finalgeom, shader));
    radscene.add(new THREE.Mesh(finalgeom,new THREE.MeshBasicMaterial({color:0x000000, side:THREE.BackSide})));

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xffffff);
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    //renderer.gammaInput = true;
    //renderer.gammaOutput = true;

    var container = document.getElementById( 'container' );
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
        pass++;
    }
}

function render() {

    var maps = globalmaps.maps;
    var tiles = renderTarget.size/tileSize;
    renderer.setPixelRatio(1);

    if(frame%1==0){
    renderer.enableScissorTest(true);
    var allzero = true;
    while(allzero){
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
                //if(pass==0&& Math.random()>0.985)
                   //scene.add(new THREE.ArrowHelper(maps[1][x][y], radcam.position, 2, 0xff0000 ));
                allzero = false;
            }
        }
        if(allzero)
            advancepos(tiles);
    }

    renderer.enableScissorTest(false);
    downsample();
    renderer.enableScissorTest(true);
    renderer.setRenderTarget(renderTarget.col);
    renderer.setViewport(currentpos.x,currentpos.y,tiles,tiles);
    renderer.setScissor(currentpos.x,currentpos.y,tiles,tiles);
    renderer.render( orthoscene, orthocam, renderTarget.col );
    renderer.enableScissorTest(false);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setViewport(0,0, window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );

    advancepos(tiles);
    }
    else
        renderer.render( scene, camera );

    frame++;
}
