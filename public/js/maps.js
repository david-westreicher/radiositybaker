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
        var result = new THREE.Vector3();
        var tmp = new THREE.Vector3();
        for(var i =0;i<3;i++){
            tmp.copy(vals[i]).multiplyScalar(bary.getComponent(i));
            result.add(tmp);
        }
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

    self.project = function(v,n,p){
        var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n,v);
        return plane.projectPoint(p);
    }

    self.projections = function(pos,verts,norms){
        var result = [];
        for(var i=0;i<3;i++)
            result.push(self.project(verts[i],norms[i],pos));
        return result;
    }
    self.phongtess = function(bary,verts,norms){
        var position = self.interpVals(bary,verts);
        var tesspos = self.interpVals(bary,self.projections(position,verts,norms));
        var a = 0.75;
        return position.lerp(tesspos,a);
    }


    self.copyArray = function(arr){
        var len = arr.length;
        var copy = new Array(len);
        for(var i=0;i<len;i++)
            copy[i] = arr[i].slice(0);
        return copy;
    }


    self.rayTraversal = function(from,to,onT){
        var x0 = from.x, x1 = to.x,
            y0 = from.y, y1 = to.y;
        const dx = x1 - x0,
        dy = y1 - y0,
        s  = Math.abs(dx) > Math.abs(dy) ? Math.abs(dx) : Math.abs(dy),
        xi = dx * 1.0 / s,
        yi = dy * 1.0 / s;
        var x  = x0,
            y  = y0;
        for (var i = 0; i < s; i++) {
            onT(Math.round(x),Math.round(y));
            x += xi;
            y += yi;
        }
    }

    self.genOccupyMap = function(width,height,space,bbox,tri,offset){
        var result = new Array(width);
        for(var sx=0;sx<width;sx++){
            result[sx] = new Array(height);
            for(var sy=0;sy<height;sy++)
                result[sx][sy] = false;
        }
        
        //conservative triangle rasterization
        var onTraverse = function(x,y){
            result[x+offset][y+offset] = true;
        }
        self.rayTraversal(tri.a,tri.b,onTraverse);
        self.rayTraversal(tri.a,tri.c,onTraverse);
        self.rayTraversal(tri.b,tri.c,onTraverse);

        //scanline
        for(var sx=0;sx<width;sx++){
            var start = -1;
            for(var sy=0;sy<height;sy++){
                if(start==-1){
                    if(result[sx][sy])
                        start = sy;
                }else{
                    if(result[sx][sy]){
                        for(var fill = start;fill<sy;fill++){
                            result[sx][fill] = true;
                        }
                        start = -1;
                    }
                }
            }
        }

        var c = self.copyArray(result);

        for(var passes = 0;passes<1;passes++){
            for(var sx=0;sx<width;sx++)
                for(var sy=0;sy<height;sy++){
                    if(result[sx][sy]){
                        c[sx][sy] = true;
                        continue;
                    }
                    for(var nx = -1;nx<=1;nx++){
                    for(var ny = -1;ny<=1;ny++){
                        if(nx==0 && ny==0)
                            continue;
                        var x = sx+nx;
                        var y = sy+ny;
                        if(x>=0&&x<width&&y>=0&&y<height&&result[x][y]){
                            c[sx][sy] = true;
                            //result[sx][sy] = true;
                            break;
                        }
                    }}
                }
            var tmp = c;
            c = result;
            result = tmp;
        }

        return result;
    }

    self.plotIntoMaps = function(verts,normals,col){
        var newtri = self.flatten(verts[0],verts[1],verts[2]);
        var tri = new THREE.Triangle(newtri[0],newtri[1],newtri[2]);
        var space = null;
        var uvs = [];
        if(tri.area()<1){
            space = self.findSpace(3,3);
            var realtri = new THREE.Triangle(verts[0],verts[1],verts[2]);
            var norm = realtri.normal();
            var mid = realtri.midpoint();
            for(var sx=0;sx<3;sx++)
                for(var sy=0;sy<3;sy++){
                    self.maps[0][space[0]+sx][space[1]+sy] = mid;
                    self.maps[1][space[0]+sx][space[1]+sy] = norm; 
                    self.maps[2][space[0]+sx][space[1]+sy] = col;
                }

            for(var i=0;i<3;i++)
                uvs.push(new THREE.Vector2(newtri[i].x+space[0]+1.5,newtri[i].y+space[1]+1.5).multiplyScalar(1/self.size));
            return {space:space,uvs:uvs};
        }
        var offset = 2;
        var tempgeom = new THREE.Geometry();
        newtri.forEach(function(vert){
            tempgeom.vertices.push(vert);
        });
        tempgeom.computeBoundingBox();
        var bbox = tempgeom.boundingBox;
        var width = Math.ceil(bbox.max.x-bbox.min.x)+offset*2;
        var height = Math.ceil(bbox.max.y-bbox.min.y)+offset*2;
        space = self.findSpace(width,height);
        var shouldoccupy = self.genOccupyMap(width,height,space,bbox,tri,offset);
        for(var sx=0;sx<width;sx++)
            for(var sy=0;sy<height;sy++){
                var x = sx+bbox.min.x-offset;
                var y = sy+bbox.min.y-offset;
                var arrx = space[0]+sx;
                var arry = space[1]+sy;
                var pos = new THREE.Vector3(x,y,0);
                var bary = tri.barycoordFromPoint(pos);
                if(!shouldoccupy[sx][sy])
                    continue;
                self.maps[0][space[0]+sx][space[1]+sy] = self.phongtess(bary,verts,normals);
                //self.maps[0][space[0]+sx][space[1]+sy] = self.interpVals(bary,verts);
                self.maps[1][space[0]+sx][space[1]+sy] = self.interpVals(bary,normals).normalize(); 
                //self.maps[1][space[0]+sx][space[1]+sy] = new THREE.Triangle(verts[0],verts[1],verts[2]).normal(); 
                self.maps[2][space[0]+sx][space[1]+sy] = col;
            }

        for(var i=0;i<3;i++)
            uvs.push(new THREE.Vector2(newtri[i].x+space[0]+offset+.5,newtri[i].y+space[1]+offset+.5).multiplyScalar(1/self.size));
        return {space:space,uvs:uvs};
    }
}

return maps;
});
