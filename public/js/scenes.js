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
    cube = new THREE.Mesh(new THREE.BoxGeometry(1,size,size),material);
    cube.position.y = size/2;
    cube.position.x = size/2;
    newscene.push(cube);
/*
    material = new THREE.MeshBasicMaterial({color:Math.random()*0xffffff});
    cube = new THREE.Mesh( new THREE.CylinderGeometry( size/4, size/4, size/2, 12 ),material);
    cube.position.y = size*0.75;
    newscene.push(cube);
    material = new THREE.MeshBasicMaterial({color:Math.random()*0xffffff});
    cube = new THREE.Mesh(new THREE.IcosahedronGeometry(size/2),material);
    cube.position.y = -size/3;
    newscene.push(cube);*/
    return newscene;
}

function getgeoms2(material){
    var newscene = [];
    var s = 30;
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
    var cube = new THREE.Mesh( new THREE.TorusKnotGeometry(10,4), material ); 
    newscene.push(cube);
    return newscene;
}

var material = new THREE.MeshBasicMaterial({color:(Math.random()+0.9)*0xffffff});
material = new THREE.MeshBasicMaterial();
var scenes = {
    small: getgeoms(material),
    medium: getgeoms2(material),
    large: getgeoms3(material)
}

return scenes;
});
