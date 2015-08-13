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
                notfree:
                for(var sx=0;sx<w;sx++)
                    for(var sy=0;sy<h;sy++)
                        if(map[x+sx][y+sy]!=null){
                            isFree = false;
                            break notfree;
                        }
                if(isFree)
                    return [x,y];
            }
        }
        return null;
    }

    self.interpVals = function(bary,vals){
        var tmp1 = new THREE.Vector3().copy(vals[0]).multiplyScalar(bary.x);
        var tmp2 = new THREE.Vector3().copy(vals[1]).multiplyScalar(bary.y);
        var tmp3 = new THREE.Vector3().copy(vals[2]).multiplyScalar(bary.z);
        var result = new THREE.Vector3().add(tmp1).add(tmp2).add(tmp3);
        return result;
    }

    self.flatten = function(v1,v2,v3){
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

    self.plotIntoMaps = function(verts,normals,col){
        var newtri = self.flatten(verts[0],verts[1],verts[2]);
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
        var uvs = [];
        for(var sx=0;sx<width;sx++)
            for(var sy=0;sy<height;sy++){
                var x = sx+bbox.min.x-offset;
                var y = sy+bbox.min.y-offset;
                var arrx = space[0]+sx;
                var arry = space[1]+sy;
                var pos = new THREE.Vector3(x,y,0);
                var bary = new THREE.Triangle(newtri[0],newtri[1],newtri[2]).barycoordFromPoint(pos);
                self.maps[0][space[0]+sx][space[1]+sy] = self.interpVals(bary,verts);
                self.maps[1][space[0]+sx][space[1]+sy] = self.interpVals(bary,normals); 
                self.maps[2][space[0]+sx][space[1]+sy] = col;
            }

        for(var i=0;i<3;i++)
            uvs.push(new THREE.Vector2(newtri[i].x+space[0]+2.5,newtri[i].y+space[1]+2.5).multiplyScalar(1/self.size));
        return {space:space,uvs:uvs};
    }
}

return maps;
});
