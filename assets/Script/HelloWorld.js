cc.Class({
    extends: cc.Component,

    properties: {
        label: {
            default: null,
            type: cc.Label
        },
        // defaults, set visually when attaching this script to the Canvas
        text: 'Hello, World!',

       
        // frontSprite:{
        //     default:null,
        //     type: cc.SpriteFrame
        // },



        // backSprite :{
        //     default:null,
        //     type: cc.SpriteFrame
        // }

    },

    onLoad: function () {
        this.label.string = this.text;
        this.__initCfg();
    },

    __initCfg: function () {
        this.posX = 0;
        this.posY = 0;
        this.ratioVal = 0;
        this.radiusVal = 0;
        this.szBack = "resources/poker_beimian.png";
        this.szFont = "resources/poker_10.png";
        this.RubCardLayer_State_Move = 0;
        this.RubCardLayer_State_Smooth = 1;
        var RubCardLayer_Pai = 3.141592
        this.RubCardLayer_RotationFrame = 10
        this.RubCardLayer_RotationAnger = RubCardLayer_Pai/3
        this.RubCardLayer_SmoothFrame = 10
        this.RubCardLayer_SmoothAnger = RubCardLayer_Pai/6

        this.state = this.RubCardLayer_State_Move;

        this.__createTextures();
        this.__initTexAndPos(true);
        this.__initTexAndPos(false);
        this.__createGlNode();
        this.__createAllProgram();
        this.__registTouchEvent()
        this.radiusVal = this.pokerHeight/10;
    },

    __createGlNode:function() {
        var glnode = new cc.GLNode();
        this.node._sgNode.addChild(glnode,10);
        this.glnode = glnode;
        this.smoothFrame = 1;
        this.isCreateNum = false;

        glnode.draw = function() {
            if(this.state == this.RubCardLayer_State_Move){
                this.__drawByMoveProgram(0);
            }
            else if(this.state == this.RubCardLayer_State_Smooth){
                if(this.smoothFrame <= this.RubCardLayer_RotationFrame)
                {
                    this.__drawByMoveProgram(-this.RubCardLayer_RotationAnger*this.smoothFrame/this.RubCardLayer_RotationFrame);
                }
                else if(this.smoothFrame < (this.RubCardLayer_RotationFrame+this.RubCardLayer_SmoothFrame)){
                    var scale = (this.smoothFrame - this.RubCardLayer_RotationFrame)/this.RubCardLayer_SmoothFrame;
                    this.__drawBySmoothProgram(Math.max(0.01,this.RubCardLayer_SmoothAnger*(1-scale)))
                }
                else{
                    //第一次到这里就铺平了
                    this.__drawByEndProgram()
                    if(this.isCreateNum == false){
                        this.isCreateNum = true
                        setTimeout(function () {
                            this.node._sgNode.removeChild(this.glnode);
                            this.node._sgNode.removeChild(this.layer);
                            this.onDestroy();
                        }.bind(this), 1000);
                    }
                    
                }
                this.smoothFrame = this.smoothFrame + 1
            }
        }.bind(this);
    },

    __registTouchEvent: function(){
        var layer = new cc.Layer();
        this.layer = layer
        this.node._sgNode.addChild(layer,10);
        var self = this;
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            onTouchBegan: function(touch, event)
            {
                cc.log("page view touch onTouchBegan");
                return true;
            },
            onTouchMoved: function(touch, event){
                var location = touch.getLocation();
                self.ratioVal = (location.y-self.touchStartY)/self.pokerHeight;
                self.ratioVal = Math.max(0, self.ratioVal);
                self.ratioVal = Math.min(1, self.ratioVal);
                return true;
            },
            onTouchEnded: function(touch, event){
                cc.log("page view touch onTouchEnded");
                if(self.ratioVal >= 1)
                {
                    self.state = self.RubCardLayer_State_Smooth;
                }
            },

        }, layer);
    },

    __createAllProgram:function() {
        var moveVertSource = 
        "attribute vec2 a_position;\n"+
        "attribute vec2 a_texCoord;\n"+
        "uniform float ratio; \n"+
        "uniform float radius; \n"+
        "uniform float width;\n"+
        "uniform float height;\n"+
        "uniform float offx;\n"+
        "uniform float offy;\n"+
        "uniform float rotation;\n"+
        "varying vec2 v_texCoord;\n"+

        "void main()\n"+
        "{\n"+
        "   vec4 tmp_pos = vec4(0.0, 0.0, 0.0, 0.0);\n"+
        "   tmp_pos = vec4(a_position.x, a_position.y, 0.0, 1.0);\n"+

        "   float halfPeri = radius * 3.14159; \n"+
        "   float hr = height * ratio;\n"+
        "   if(tmp_pos.x < 0.0 || tmp_pos.x > width || tmp_pos.y < 0.0 || tmp_pos.y > height){\n"+
        "   tmp_pos.x = 0.0;tmp_pos.y = 0.0;}\n"+
        "   if(hr > 0.0 && hr <= halfPeri){\n"+
        "         if(tmp_pos.y < hr){\n"+
        "               float rad = hr/ 3.14159;\n"+
        "               float arc = (hr-tmp_pos.y)/rad;\n"+
        "               tmp_pos.y = hr - sin(arc)*rad;\n"+
        "               tmp_pos.z = rad * (1.0-cos(arc)); \n"+
        "          }\n"+
        "   }\n"+
        "   if(hr > halfPeri){\n"+
        "        float straight = (hr - halfPeri)/2.0;\n"+
        "        if(tmp_pos.y < straight){\n"+
        "            tmp_pos.y = hr  - tmp_pos.y;\n"+
        "            tmp_pos.z = radius * 2.0; \n"+
        "        }\n"+
        "        else if(tmp_pos.y < (straight + halfPeri)) {\n"+
        "            float dy = halfPeri - (tmp_pos.y - straight);\n"+
        "            float arc = dy/radius;\n"+
        "            tmp_pos.y = hr - straight - sin(arc)*radius;\n"+
        "            tmp_pos.z = radius * (1.0-cos(arc)); \n"+
        "        }\n"+
        "    }\n"+
        "    float y1 = tmp_pos.y;\n"+
        "    float z1 = tmp_pos.z;\n"+
        "    float y2 = height;\n"+
        "    float z2 = 0.0;\n"+
        "    float sinRat = sin(rotation);\n"+
        "    float cosRat = cos(rotation);\n"+
        "    tmp_pos.y=(y1-y2)*cosRat-(z1-z2)*sinRat+y2;\n"+
        "    tmp_pos.z=(z1-z2)*cosRat+(y1-y2)*sinRat+z2;\n"+
        "    tmp_pos.y = tmp_pos.y - height/2.0*(1.0-cosRat);\n"+
        "    tmp_pos += vec4(offx, offy, 0.0, 0.0);\n"+
        "    gl_Position = CC_MVPMatrix * tmp_pos;\n"+
        "    v_texCoord = a_texCoord;\n"+
        "}\n";

        var smoothVertSource = 
        "attribute vec2 a_position;\n"+
        "attribute vec2 a_texCoord;\n"+
        "uniform float width;\n"+
        "uniform float height;\n"+
        "uniform float offx;\n"+
        "uniform float offy;\n"+
        "uniform float rotation;\n"+
        "varying vec2 v_texCoord;\n"+

        "void main()\n"+
        "{\n"+
        "   vec4 tmp_pos = vec4(0.0, 0.0, 0.0, 0.0);\n"+
        "   tmp_pos = vec4(a_position.x, a_position.y, 0.0, 1.0);\n"+
        "    if(tmp_pos.x < 0.0 || tmp_pos.x > width || tmp_pos.y < 0.0 || tmp_pos.y > height){\n"+
        "    tmp_pos.x = 0.0;tmp_pos.y = 0.0;}\n"+
        "    float cl = height/5.0;\n"+
        "    float sl = (height - cl)/2.0;\n"+
        "    float radii = (cl/rotation)/2.0;\n"+
        "    float sinRot = sin(rotation);\n"+
        "    float cosRot = cos(rotation);\n"+
        "    float distance = radii*sinRot;\n"+
        "    float centerY = height/2.0;\n"+
        "    float poxY1 = centerY - distance;\n"+
        "    float poxY2 = centerY + distance;\n"+
        "    float posZ = sl*sinRot;\n"+
        "    if(tmp_pos.y <= sl){\n"+
        "       float length = sl - tmp_pos.y;\n"+
        "       tmp_pos.y = poxY1 - length*cosRot;\n"+
        "       tmp_pos.z = posZ - length*sinRot;\n"+
        "    }\n"+
        "    else if(tmp_pos.y < (sl+cl)){\n"+
        "       float el = tmp_pos.y - sl;\n"+
        "       float rotation2 = -el/radii;\n"+
        "       float x1 = poxY1;\n"+
        "       float y1 = posZ;\n"+
        "       float x2 = centerY;\n"+
        "       float y2 = posZ - radii*cosRot;\n"+
        "       float sinRot2 = sin(rotation2);\n"+
        "       float cosRot2 = cos(rotation2);\n"+
        "       tmp_pos.y=(x1-x2)*cosRot2-(y1-y2)*sinRot2+x2;\n"+
        "       tmp_pos.z=(y1-y2)*cosRot2+(x1-x2)*sinRot2+y2;\n"+
        "    }\n"+
        "    else if(tmp_pos.y <= height){\n"+
        "        float length = tmp_pos.y - cl - sl;\n"+
        "        tmp_pos.y = poxY2 + length*cosRot;\n"+
        "        tmp_pos.z = posZ - length*sinRot;\n"+
        "    }\n"+
        "    tmp_pos += vec4(offx, offy, 0.0, 0.0);\n"+
        "    gl_Position = CC_MVPMatrix * tmp_pos;\n"+
        "    v_texCoord = vec2(a_texCoord.x, 1.0-a_texCoord.y);\n"+
        "}\n";

        var endVertSource = 
        "\n" +
        "attribute vec2 a_position;\n"+
        "attribute vec2 a_texCoord;\n"+
        "uniform float width;\n"+
        "uniform float height;\n"+
        "uniform float offx;\n"+
        "uniform float offy;\n"+
        "varying vec2 v_texCoord;\n"+

        "void main()\n"+
        "{\n"+
        "   vec4 tmp_pos = vec4(0.0, 0.0, 0.0, 0.0);\n"+
        "   tmp_pos = vec4(a_position.x, a_position.y, 0.0, 1.0);\n"+
        "    if(tmp_pos.x < 0.0 || tmp_pos.x > width || tmp_pos.y < 0.0 || tmp_pos.y > height){\n"+
        "    tmp_pos.x = 0.0;tmp_pos.y = 0.0;}\n"+
        "    tmp_pos += vec4(offx, offy, 0.0, 0.0);\n"+
        "    gl_Position = CC_MVPMatrix * tmp_pos;\n"+
        "    v_texCoord = vec2(a_texCoord.x, 1.0-a_texCoord.y);\n"+
        "}\n";

        var strFragSource =
        "varying vec2 v_texCoord;\n"+
        "void main()\n"+
        "{\n"+
            "//TODO, 这里可以做些片段着色特效\n"+
            "gl_FragColor = texture2D(CC_Texture0, v_texCoord);\n"+
        "}\n";

        var moveGlProgram = this.moveGlProgram = this.__createProgram(moveVertSource, strFragSource);
        var smoothGlProgram = this.smoothGlProgram = this.__createProgram(smoothVertSource, strFragSource);
        var endGlProgram = this.endGlProgram = this.__createProgram(endVertSource, strFragSource);
        this.moveGlProgram.retain();
        this.smoothGlProgram.retain();
        this.endGlProgram.retain();

        moveGlProgram.rotationLc = moveGlProgram.getUniformLocation("rotation");
        moveGlProgram.ratio = moveGlProgram.getUniformLocation("ratio");
        moveGlProgram.radius = moveGlProgram.getUniformLocation("radius");
        moveGlProgram.offx = moveGlProgram.getUniformLocation("offx");
        moveGlProgram.offy = moveGlProgram.getUniformLocation("offy");
        moveGlProgram.Height = moveGlProgram.getUniformLocation("height");
        moveGlProgram.Width = moveGlProgram.getUniformLocation("width");

        smoothGlProgram.rotationLc = smoothGlProgram.getUniformLocation("rotation")
        smoothGlProgram.offx = smoothGlProgram.getUniformLocation("offx")
        smoothGlProgram.offy = smoothGlProgram.getUniformLocation("offy")
        smoothGlProgram.Height = smoothGlProgram.getUniformLocation("height")
        smoothGlProgram.Width = smoothGlProgram.getUniformLocation("width");

        endGlProgram.offx = endGlProgram.getUniformLocation("offx");
        endGlProgram.offy = endGlProgram.getUniformLocation("offy");
        endGlProgram.Height = endGlProgram.getUniformLocation("height")
        endGlProgram.Width = endGlProgram.getUniformLocation("width");
    },

    __createProgram:function(vsource, fsource) {
        var glProgram = cc.GLProgram.createWithByteArrays(vsource, fsource)
        glProgram.link();
        glProgram.updateUniforms()
        return glProgram
    },

    __drawByMoveProgram:function(rotation){
        var glProgram = this.moveGlProgram;
        gl.enable(gl.CULL_FACE);
        glProgram.use();
        glProgram.setUniformsForBuiltins();

        glProgram.setUniformLocationF32(glProgram.rotationLc, rotation);
        glProgram.setUniformLocationF32(glProgram.ratio, this.ratioVal);
        glProgram.setUniformLocationF32(glProgram.radius, this.radiusVal);
        glProgram.setUniformLocationF32(glProgram.offx, this.offx);
        glProgram.setUniformLocationF32(glProgram.offy, this.offy);
        glProgram.setUniformLocationF32(glProgram.Height, this.pokerHeight);
        glProgram.setUniformLocationF32(glProgram.Width, this.pokerWidth);

        gl.bindTexture(gl.TEXTURE_2D, this.backSpriteId);
        this.__drawArrays(this.backPosBuffer, this.backTexBuffer);
        gl.bindTexture(gl.TEXTURE_2D, this.frontSpriteId);
        this.__drawArrays(this.frontPosBuffer, this.frontTexBuffer);
        gl.disable(gl.CULL_FACE);
    },

    __drawBySmoothProgram: function (rotation){
        var glProgram = this.smoothGlProgram
        glProgram.use();
        glProgram.setUniformsForBuiltins();

        gl.bindTexture(gl.TEXTURE_2D, this.frontSpriteId);
        glProgram.setUniformLocationF32(glProgram.rotationLc, rotation)
        glProgram.setUniformLocationF32(glProgram.offx, this.offx)
        glProgram.setUniformLocationF32(glProgram.offy, this.offy)
        glProgram.setUniformLocationF32(glProgram.Height, this.pokerHeight)
        glProgram.setUniformLocationF32(glProgram.Width, this.pokerWidth);

        this.__drawArrays(this.frontPosBuffer, this.frontTexBuffer)
    },

    __drawByEndProgram:function (){
        var glProgram = this.endGlProgram;
        glProgram.use();
        glProgram.setUniformsForBuiltins();

        gl.bindTexture(gl.TEXTURE_2D, this.frontSpriteId);
        glProgram.setUniformLocationF32(glProgram.offx, this.offx);
        glProgram.setUniformLocationF32(glProgram.offy, this.offy);
        glProgram.setUniformLocationF32(glProgram.Height, this.pokerHeight)
        glProgram.setUniformLocationF32(glProgram.Width, this.pokerWidth);
        this.__drawArrays(this.frontPosBuffer, this.frontTexBuffer);
    },

    __drawArrays: function(pos, tex){
        gl.enableVertexAttribArray(cc.macro.VERTEX_ATTRIB_POSITION);
        gl.enableVertexAttribArray(cc.macro.VERTEX_ATTRIB_TEX_COORDS);
        //console.log('gl.FLOAT='+gl.FLOAT);
        var VERTEX_ATTRIB_POSITION = 0;
        var VERTEX_ATTRIB_TEX_COORDS = 2;
        gl.bindBuffer(gl.ARRAY_BUFFER, pos)
        gl.vertexAttribPointer(VERTEX_ATTRIB_POSITION,2,gl.FLOAT,0,0,0)
        gl.bindBuffer(gl.ARRAY_BUFFER, tex)
        gl.vertexAttribPointer(VERTEX_ATTRIB_TEX_COORDS,2,gl.FLOAT,0,0,0)
        gl.drawArrays(gl.TRIANGLES, 0, this.posTexNum)
        gl.bindBuffer(gl.ARRAY_BUFFER, 0)
    },

    __initTexAndPos: function(isBack){
        var nDiv = 20; //将宽分成100份
        var verts = new Array(); //位置坐标
        var texs = new Array(); //纹理坐标
        var dh = this.pokerHeight/nDiv;
        var dw = this.pokerWidth;

        //计算顶点位置
        for(var c = 1; c<=nDiv; c++){
            var x = 0;
            var y = (c-1)*dh;
            var quad = null;
            if(isBack){
                quad = new Array(x, y, x+dw, y, x, y+dh, x+dw, y, x+dw, y+dh, x, y+dh);
            }
            else{
                quad = new Array(x, y, x, y+dh, x+dw, y, x+dw, y, x, y+dh, x+dw, y+dh);
            };
            for(var i=0; i<=5; i++){
                var quadX = quad[i*2]
                var quadY = quad[i*2+1]
                var numX = 1 - quadY/this.pokerHeight
                var numY = quadX/this.pokerWidth
                texs.push(Math.max(0,numX));
                texs.push(Math.max(0,numY));
            };
            for (var k in quad)
            {
                verts.push(quad[k]);
            };
        }

        var posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.posTexNum = verts.length/2;

        var texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texs), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if(isBack)
        {
            this.backPosBuffer = posBuffer.buffer_id;
            this.backTexBuffer = texBuffer.buffer_id;
        }
        else{
            this.frontPosBuffer = posBuffer.buffer_id;
            this.frontTexBuffer = texBuffer.buffer_id;
        }
    },

    __createTextures: function () {
        var imgUrl = cc.url.raw(this.szFont);
        this.frontSprite = cc.textureCache.addImage(imgUrl);
        this.frontSprite.retain();

        imgUrl = cc.url.raw(this.szBack);
        this.backSprite = cc.textureCache.addImage(imgUrl);
        this.backSprite.retain();

        var pokerSize = cc.size(314,475)//this.backSprite.getContentSize();
        this.pokerWidth = pokerSize.height
        this.pokerHeight = pokerSize.width

        this.offx = this.posX - this.pokerWidth/2;
        this.offy = this.posY - this.pokerHeight/2;
        //this.backSpriteId = this.backSprite.getName()
        //this.frontSpriteId = this.frontSprite.getName()
        this.backSpriteId = this.backSprite._glID;
        this.frontSpriteId = this.frontSprite._glID;
        this.touchStartY = cc.winSize.height/2 + this.posY - this.pokerHeight/2;
    },

    //结束需要移除
    onDestroy: function () {
        gl._deleteBuffer(this.backPosBuffer)
        gl._deleteBuffer(this.backTexBuffer)
        gl._deleteBuffer(this.frontPosBuffer)
        gl._deleteBuffer(this.frontTexBuffer)
        this.moveGlProgram.release();
        this.smoothGlProgram.release();
        this.endGlProgram.release();
        this.backSprite.release();
        this.frontSprite.release();
    },
});

