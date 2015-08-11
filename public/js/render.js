if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;

var radcam, camera, controls, radscene, scene, renderer;
var globaltex = null;
var globalmaps = null;
var rttex = null;
var rttexbuf = null;
var size = 512;
var rtsize = 128;
var frame = 0;
var off = 0;
var currentpos = {x:0,y:0};

init();
animate();

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

function generateLuts(){
    var maps = [];
    for(var i=0;i<3;i++){
        var map = [];
        for(var x=0;x<size;x++){
            var row = [];
            for(var y=0;y<size;y++){
                row.push(null);
            }
            map.push(row);
        }
        maps.push(map);
    }
    return maps;
}

function findSpace(maps,w,h){
    var map = maps[0];
    for(var x=0;x<size-w;x++){
        for(var y=0;y<size-h;y++){
            var isFree = true;
            for(var sx=0;sx<w;sx++)
                for(var sy=0;sy<h;sy++)
                    if(map[x+sx][y+sy]!=null)
                        isFree = false;
            if(isFree)
                return [x,y];
        }
    }
    return null;
}

function interpPos(pos,tri2,tri3){
    var bary = new THREE.Triangle(tri2[0],tri2[1],tri2[2]).barycoordFromPoint(pos);
    var tmp1 = new THREE.Vector3().copy(tri3[0]).multiplyScalar(bary.x);
    var tmp2 = new THREE.Vector3().copy(tri3[1]).multiplyScalar(bary.y);
    var tmp3 = new THREE.Vector3().copy(tri3[2]).multiplyScalar(bary.z);
    var result = new THREE.Vector3().add(tmp1).add(tmp2).add(tmp3);
    return result;
}

function plotIntoLuts(maps,newtri,verts){
    var offset = 2;
    var tempgeom = new THREE.Geometry();
    newtri.forEach(function(vert){
        tempgeom.vertices.push(vert);
    });
    tempgeom.computeBoundingBox();
    var bbox = tempgeom.boundingBox;
    var width = Math.ceil(bbox.max.x-bbox.min.x)+offset*2;
    var height = Math.ceil(bbox.max.y-bbox.min.y)+offset*2;
    var space = findSpace(maps,width,height);
    var normal = new THREE.Triangle(verts[0],verts[1],verts[2]).normal();
    var uvs = [];
    for(var sx=0;sx<width;sx++)
        for(var sy=0;sy<height;sy++){
            var x = sx+bbox.min.x-offset;
            var y = sy+bbox.min.y-offset;
            var arrx = space[0]+sx;
            var arry = space[1]+sy;
            if(arrx==0 && arry ==0)
                console.log(normal,verts);
            maps[0][space[0]+sx][space[1]+sy] = interpPos(new THREE.Vector3(x,y,0),newtri,verts);
            maps[1][space[0]+sx][space[1]+sy] = normal;
            maps[2][space[0]+sx][space[1]+sy] = Math.random()*0xffffff;
        }

    for(var i=0;i<3;i++)
        uvs.push(new THREE.Vector2(newtri[i].x+space[0]+1.5,newtri[i].y+space[1]+1.5).multiplyScalar(1/size));
    return {space:space,normal:normal,uvs:uvs};
}

function getCube(){
    //return new THREE.Mesh( new THREE.DodecahedronGeometry(10), material );
    //return new THREE.Mesh( new THREE.TorusKnotGeometry(10,3), material );
    return new THREE.Mesh( new THREE.BoxGeometry(20,1,20),material);
    //return new THREE.Mesh( new THREE.CylinderGeometry( 5, 5, 20, 32 ),material);
    //return new THREE.Mesh( new THREE.IcosahedronGeometry(10),material);
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
    cube = new THREE.Mesh(new THREE.IcosahedronGeometry(5),material);
    cube.position.y = 14;
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
    var maps = generateLuts();
    globalmaps = maps;
    var newscene = [];
    var material = new THREE.MeshBasicMaterial({color:Math.random()*0xffffff});
    getgeoms3(material,newscene);

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
            var plotresult = plotIntoLuts(maps,newtri,[v1,v2,v3]);
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
            texdat[dataIndex+0]= (255*Math.random())|0;
            texdat[dataIndex+1]= (255*Math.random())|0;
            texdat[dataIndex+2]= (255*Math.random())|0;
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

    var pointgeom = new THREE.Geometry();

    for(var x=0;x<size;x++)
        for(var y=0;y<size;y++){
            var vert = maps[0][x][y];
            if(vert)
                pointgeom.vertices.push(vert);
        }
    //scene.add(new THREE.PointCloud(pointgeom,new THREE.PointCloudMaterial({color:0x00FF00,size:0.2})));
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

    camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 1, 100 );
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
    if(globalmaps){
        increasepos();
        while(globalmaps[0][currentpos.x][currentpos.y] == null)
            increasepos();
        var x = currentpos.x;
        var y = currentpos.y;
        radcam.position.copy(globalmaps[0][x][y]);
        var lookat = new THREE.Vector3().copy(radcam.position).add(globalmaps[1][x][y]);
        radcam.lookAt(lookat);
        //scene.add(new THREE.ArrowHelper( globalmaps[1][x][y], radcam.position, 2, frame*0x00000f ));
    }
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
    col.multiplyScalar(0.2);
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
