define(function(){

var maps = function(size){
    var self = this;
    self.size = size;
    self.maps = function(){
        var maps = [];
        for(var i=0;i<3;i++){
            var map = [];
            for(var x=0;x<self.size;x++){
                var row = [];
                for(var y=0;y<self.size;y++){
                    row.push(null);
                }
                map.push(row);
            }
            maps.push(map);
        }
        return maps;
    }();

    self.findSpace = function(w,h){
        var map = self.maps[0];
        for(var x=0;x<self.size-w;x++){
            for(var y=0;y<self.size-h;y++){
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

    self.interpPos = function(pos,tri2,tri3){
        var bary = new THREE.Triangle(tri2[0],tri2[1],tri2[2]).barycoordFromPoint(pos);
        var tmp1 = new THREE.Vector3().copy(tri3[0]).multiplyScalar(bary.x);
        var tmp2 = new THREE.Vector3().copy(tri3[1]).multiplyScalar(bary.y);
        var tmp3 = new THREE.Vector3().copy(tri3[2]).multiplyScalar(bary.z);
        var result = new THREE.Vector3().add(tmp1).add(tmp2).add(tmp3);
        return result;
    }


    self.plotIntoMaps = function(newtri,verts){
        var offset = 2;
        var tempgeom = new THREE.Geometry();
        newtri.forEach(function(vert){
            tempgeom.vertices.push(vert);
        });
        tempgeom.computeBoundingBox();
        var bbox = tempgeom.boundingBox;
        var width = Math.ceil(bbox.max.x-bbox.min.x)+offset*2;
        var height = Math.ceil(bbox.max.y-bbox.min.y)+offset*2;
        var space = self.findSpace(width,height);
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
                self.maps[0][space[0]+sx][space[1]+sy] = self.interpPos(new THREE.Vector3(x,y,0),newtri,verts);
                self.maps[1][space[0]+sx][space[1]+sy] = normal;
                self.maps[2][space[0]+sx][space[1]+sy] = Math.random()*0xffffff;
            }

        for(var i=0;i<3;i++)
            uvs.push(new THREE.Vector2(newtri[i].x+space[0]+1.5,newtri[i].y+space[1]+1.5).multiplyScalar(1/self.size));
        return {space:space,normal:normal,uvs:uvs};
    }
}

return maps;
});
