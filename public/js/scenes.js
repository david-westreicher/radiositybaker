define(function(){

function getgeoms(material){
    var newscene = [];
    var size = 20;
    var cube = new THREE.Mesh(new THREE.BoxGeometry(size*2,1,size),material);
    cube.position.y = size/4;
    cube.rotation.z = Math.PI/8;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(size,1,size),material);
    cube.position.y = size;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(size,size,1),material);
    cube.position.y = size/2;
    cube.position.z = size/2;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(size,size,1),material);
    cube.position.y = size/2;
    cube.position.z = -size/2;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(1,size*2,size),material);
    cube.position.y = size/4;
    cube.position.x = size/2;
    newscene.push(cube);
    material = new THREE.MeshBasicMaterial({color:0xff0000});
    //cube = new THREE.Mesh( new THREE.CylinderGeometry( size/4, size/4, size/2, 12 ),material);
    cube = new THREE.Mesh(new THREE.IcosahedronGeometry(size/4,1),material);
    cube.position.y = size*0.65;
    newscene.push(cube);
    material = new THREE.MeshBasicMaterial({color:Math.random()*0xffffff});
    cube = new THREE.Mesh(new THREE.IcosahedronGeometry(size/2,1),material);
    cube.position.y = -size/3;
    newscene.push(cube);
    for(var i =0;i<5;i++){
        material = new THREE.MeshBasicMaterial({color:Math.random()*0xffffff});
        //cube = new THREE.Mesh(new THREE.SphereGeometry(size/10,8,6),material);
        //cube = new THREE.Mesh(new THREE.DodecahedronGeometry(size/10),material);
        cube = new THREE.Mesh(new THREE.IcosahedronGeometry(size/10+i,1),material);
        cube.position.x = Math.random()*size*2-size;
        cube.position.y = Math.random()*size*2-size;
        cube.position.z = Math.random()*size*2-size;
        newscene.push(cube);
    }
    return newscene;
}

function getgeoms2(material){
    var newscene = [];
    var s = 10;
    material = new THREE.MeshBasicMaterial({color:(Math.random()+0.9)*0xffffff});
    var cube = new THREE.Mesh(new THREE.PlaneGeometry(s,s),material);
    cube.rotation.x = -Math.PI/2;
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.PlaneGeometry(s,s),material);
    cube.rotation.x = Math.PI/2;
    cube.position.y = s/2;
    newscene.push(cube);
    return newscene;
}

function getgeoms3(material){
    var newscene = [];
    var cube = new THREE.Mesh( new THREE.TorusKnotGeometry(20,8), material ); 
    newscene.push(cube);
    return newscene;
}
function getgeoms4(material){
    var newscene = [];
    //var cube = new THREE.Mesh(new THREE.DodecahedronGeometry(10),material);
    var cube = new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),material);
    newscene.push(cube);
    cube = new THREE.Mesh(new THREE.BoxGeometry(40,40,1),material);
    cube.position.z = -15;
    //newscene.push(cube);
    return newscene;
}
function tesstest(material){
    var newscene = [];
    var geom = new THREE.Geometry();
    var size = 1;
    geom.vertices.push(new THREE.Vector3(0,0,0));
    geom.vertices.push(new THREE.Vector3(0,0,size));
    geom.vertices.push(new THREE.Vector3(size,0,0));
    geom.faces.push(new THREE.Face3(0,1,2));
    geom.faces[0].vertexNormals.push(new THREE.Vector3(-1,1,-1).normalize());
    geom.faces[0].vertexNormals.push(new THREE.Vector3(-1,1,1).normalize());
    geom.faces[0].vertexNormals.push(new THREE.Vector3(1,1,-1).normalize());

    var cube = new THREE.Mesh(geom,material);
    newscene.push(cube);
    return newscene;
}

var material = new THREE.MeshBasicMaterial({color:(Math.random()+0.9)*0xffffff});
material = new THREE.MeshBasicMaterial();
var scenes = {
    small: getgeoms(material),
    medium: getgeoms2(material),
    large: getgeoms3(material),
    ball: getgeoms4(material),
    tess: tesstest(material)
}

return scenes;
});
