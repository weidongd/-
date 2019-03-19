cc.Class({
    extends: cc.Component,

    properties: {
        label: {
            default: null,
            type: cc.Label
        },
        // defaults, set visually when attaching this script to the Canvas
        text: 'Hello, World!',
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

        this.RubCardLayer_Dir_du = 0;//上下搓牌
        this.RubCardLayer_Dir_lr = 1;//左右搓牌
        this.RubCardLayer_Dir_rl = 2;//右左搓牌
        this.RubCardLayer_Dir_No = 3;//不搓牌

        var RubCardLayer_Pai = 3.141592
        this.RubCardLayer_RotationFrame = 10
        this.RubCardLayer_RotationAnger = RubCardLayer_Pai/3
        this.RubCardLayer_SmoothFrame = 10
        this.RubCardLayer_SmoothAnger = RubCardLayer_Pai/6
        this.divNum = 20

        this.state = this.RubCardLayer_State_Move;
        this.dirState = this.RubCardLayer_Dir_No

        this.__startPoker()
    },

    __startPoker:function() {
        this.__createTextures();
        this.udBackBufferInfo = this.__initTexAndPos(true, false);
        this.udFrontBufferInfo = this.__initTexAndPos(false, false);
        this.lrBackBufferInfo = this.__initTexAndPos(true, true);
        this.lrFrontBufferInfo = this.__initTexAndPos(false, true);
        this.__createGlNode();
        this.__createAllProgram();
        this.__registTouchEvent()
    },

    __endPoker:function() {
        var self = this
        setTimeout(function(){
            self.__removeRes()
        },1000);
    },

    __createGlNode:function() {
        var glnode = new cc.GLNode();
        this.node._sgNode.addChild(glnode,10);
        this.glnode = glnode;
        this.smoothFrame = 1;
        this.isEndPoker = false;

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
                    if(!this.isEndPoker)
                    {
                        this.__endPoker()
                        this.isEndPoker = true
                    }
                }
                this.smoothFrame = this.smoothFrame + 1
            }
        }.bind(this);
    },

    __registTouchEvent: function(){
        var layer = new cc.Layer();
        this.node._sgNode.addChild(layer,10);
        this.layer = layer
        var self = this;
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            onTouchBegan: function(touch, event)
            {
                var location = touch.getLocation();
                if(location.x > self.touchStartLRX && location.x < self.touchStartRLX && location.y < (self.touchStartY + 100))
                {
                    self.dirState = self.RubCardLayer_Dir_du
                }
                else if(location.y > self.touchStartY && location.y < (self.touchStartY+self.pokerHeight) && location.x < (self.touchStartLRX + 100))
                {
                    self.dirState = self.RubCardLayer_Dir_lr
                }
                else if(location.y > self.touchStartY && location.y < (self.touchStartY+self.pokerHeight) && location.x > (self.touchStartRLX - 100))
                {
                    self.dirState = self.RubCardLayer_Dir_rl
                }
                else
                {
                    self.dirState = self.RubCardLayer_Dir_du
                }
                
                return true;
            },
            onTouchMoved: function(touch, event){
                var location = touch.getLocation();
                if(self.dirState == self.RubCardLayer_Dir_du)
                {
                    self.ratioVal = (location.y-self.touchStartY)/self.pokerHeight;
                }
                else if(self.dirState == self.RubCardLayer_Dir_lr)
                {
                    self.ratioVal = (location.x-self.touchStartLRX)/self.pokerWidth;
                }
                else if(self.dirState == self.RubCardLayer_Dir_rl)
                {
                    self.ratioVal = (self.touchStartRLX-location.x)/self.pokerWidth;
                }
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
                else
                {
                    self.ratioVal = 0
                    self.dirState = self.RubCardLayer_Dir_du
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
        "   vec4 tmp_pos = vec4(a_position.x, a_position.y, 0.0, 1.0);\n"+

        "   float halfPeri = radius * 3.14159; \n"+
        "   float hr = height * ratio;\n"+
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

        var lTRVertSource = 
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
        "    vec4 tmp_pos = vec4(a_position.x, a_position.y, 0.0, 1.0);\n"+
        "    float halfPeri = radius * 3.14159; \n"+
        "    float hr = width * ratio;\n"+
        "    if(hr > 0.0 && hr <= halfPeri){\n"+
        "         if(tmp_pos.x < hr){\n"+
        "               float rad = hr/ 3.14159;\n"+
        "               float arc = (hr-tmp_pos.x)/rad;\n"+
        "               tmp_pos.x = hr - sin(arc)*rad;\n"+
        "               tmp_pos.z = rad * (1.0-cos(arc)); \n"+
        "          }\n"+
        "   }\n"+
        "   if(hr > halfPeri){\n"+
        "        float straight = (hr - halfPeri)/2.0;\n"+
        "        if(tmp_pos.x < straight){\n"+
        "            tmp_pos.x = hr  - tmp_pos.x;\n"+
        "            tmp_pos.z = radius * 2.0; \n"+
        "        }\n"+
        "        else if(tmp_pos.x < (straight + halfPeri)) {\n"+
        "            float dy = halfPeri - (tmp_pos.x - straight);\n"+
        "            float arc = dy/radius;\n"+
        "            tmp_pos.x = hr - straight - sin(arc)*radius;\n"+
        "            tmp_pos.z = radius * (1.0-cos(arc)); \n"+
        "        }\n"+
        "    }\n"+
        "    float x1 = tmp_pos.x;\n"+
        "    float z1 = tmp_pos.z;\n"+
        "    float x2 = width;\n"+
        "    float z2 = 0.0;\n"+
        "    float sinRat = sin(rotation);\n"+
        "    float cosRat = cos(rotation);\n"+
        "    tmp_pos.x=(x1-x2)*cosRat-(z1-z2)*sinRat+x2;\n"+
        "    tmp_pos.z=(z1-z2)*cosRat+(x1-x2)*sinRat+z2;\n"+
        "    tmp_pos.x = tmp_pos.x - width/2.0*(1.0-cosRat);\n"+
        "    tmp_pos += vec4(offx, offy, 0.0, 0.0);\n"+
        "    gl_Position = CC_MVPMatrix * tmp_pos;\n"+
        "    v_texCoord = a_texCoord;\n"+
        "}\n";

        var rTLVertSource = 
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
        "    vec4 tmp_pos = vec4(width - a_position.x, a_position.y, 0.0, 1.0);\n"+
        "    float halfPeri = radius * 3.14159; \n"+
        "    float hr = width * ratio;\n"+
        "    if(hr > 0.0 && hr <= halfPeri){\n"+
        "         if(tmp_pos.x < hr){\n"+
        "               float rad = hr/ 3.14159;\n"+
        "               float arc = (hr-tmp_pos.x)/rad;\n"+
        "               tmp_pos.x = hr - sin(arc)*rad;\n"+
        "               tmp_pos.z = rad * (1.0-cos(arc)); \n"+
        "          }\n"+
        "   }\n"+
        "   if(hr > halfPeri){\n"+
        "        float straight = (hr - halfPeri)/2.0;\n"+
        "        if(tmp_pos.x < straight){\n"+
        "            tmp_pos.x = hr  - tmp_pos.x;\n"+
        "            tmp_pos.z = radius * 2.0; \n"+
        "        }\n"+
        "        else if(tmp_pos.x < (straight + halfPeri)) {\n"+
        "            float dy = halfPeri - (tmp_pos.x - straight);\n"+
        "            float arc = dy/radius;\n"+
        "            tmp_pos.x = hr - straight - sin(arc)*radius;\n"+
        "            tmp_pos.z = radius * (1.0-cos(arc)); \n"+
        "        }\n"+
        "    }\n"+
        "    float x1 = tmp_pos.x;\n"+
        "    float z1 = tmp_pos.z;\n"+
        "    float x2 = width;\n"+
        "    float z2 = 0.0;\n"+
        "    float sinRat = sin(rotation);\n"+
        "    float cosRat = cos(rotation);\n"+
        "    tmp_pos.x=(x1-x2)*cosRat-(z1-z2)*sinRat+x2;\n"+
        "    tmp_pos.z=(z1-z2)*cosRat+(x1-x2)*sinRat+z2;\n"+
        "    tmp_pos.x = tmp_pos.x - width/2.0*(1.0-cosRat);\n"+
        "    tmp_pos.x = width - tmp_pos.x;\n"+
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
        "    vec4 tmp_pos = vec4(a_position.x, a_position.y, 0.0, 1.0);\n"+
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

        var lTRSmoothVertSource = 
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
        "    vec4 tmp_pos = vec4(a_position.x, a_position.y, 0.0, 1.0);\n"+
        "    float cl = width/5.0;\n"+
        "    float sl = (width - cl)/2.0;\n"+
        "    float radii = (cl/rotation)/2.0;\n"+
        "    float sinRot = sin(rotation);\n"+
        "    float cosRot = cos(rotation);\n"+
        "    float distance = radii*sinRot;\n"+
        "    float centerX = width/2.0;\n"+
        "    float posX1 = centerX - distance;\n"+
        "    float posX2 = centerX + distance;\n"+
        "    float posZ = sl*sinRot;\n"+
        "    if(tmp_pos.x <= sl){\n"+
        "       float length = sl - tmp_pos.x;\n"+
        "       tmp_pos.x = posX1 - length*cosRot;\n"+
        "       tmp_pos.z = posZ - length*sinRot;\n"+
        "    }\n"+
        "    else if(tmp_pos.x < (sl+cl)){\n"+
        "       float el = tmp_pos.x - sl;\n"+
        "       float rotation2 = -el/radii;\n"+
        "       float x1 = posX1;\n"+
        "       float y1 = posZ;\n"+
        "       float x2 = centerX;\n"+
        "       float y2 = posZ - radii*cosRot;\n"+
        "       float sinRot2 = sin(rotation2);\n"+
        "       float cosRot2 = cos(rotation2);\n"+
        "       tmp_pos.x=(x1-x2)*cosRot2-(y1-y2)*sinRot2+x2;\n"+
        "       tmp_pos.z=(y1-y2)*cosRot2+(x1-x2)*sinRot2+y2;\n"+
        "    }\n"+
        "    else if(tmp_pos.x <= width){\n"+
        "        float length = tmp_pos.x - cl - sl;\n"+
        "        tmp_pos.x = posX2 + length*cosRot;\n"+
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
        "uniform float offx;\n"+
        "uniform float offy;\n"+
        "varying vec4 v_fragmentColor;\n"+
        "varying vec2 v_texCoord;\n"+

        "void main()\n"+
        "{\n"+
        "   vec4 tmp_pos = vec4(a_position.x, a_position.y, 0.0, 1.0);\n"+
        "    tmp_pos += vec4(offx, offy, 0.0, 0.0);\n"+
        "    gl_Position = CC_MVPMatrix * tmp_pos;\n"+
        "    v_texCoord = vec2(a_texCoord.x, 1.0-a_texCoord.y);\n"+
        "}\n";

        var strFragSource =
        "varying vec4 v_fragmentColor;\n"+
        "varying vec2 v_texCoord;\n"+
        "void main()\n"+
        "{\n"+
            "//TODO, 这里可以做些片段着色特效\n"+
            "gl_FragColor = texture2D(CC_Texture0, v_texCoord);\n"+
        "}\n";

        var moveGlProgram = this.moveGlProgram = this.__createProgram(moveVertSource, strFragSource);
        var lTRGlProgram = this.lTRGlProgram = this.__createProgram(lTRVertSource, strFragSource);
        var rTLGlProgram = this.rTLGlProgram = this.__createProgram(rTLVertSource, strFragSource);
        var smoothGlProgram = this.smoothGlProgram = this.__createProgram(smoothVertSource, strFragSource);
        var lTRSmoothGlProgram = this.lTRSmoothGlProgram = this.__createProgram(lTRSmoothVertSource, strFragSource);
        var endGlProgram = this.endGlProgram = this.__createProgram(endVertSource, strFragSource);
        this.endGlProgram.retain();
        this.__intMoveProgram(moveGlProgram, true)
        this.__intMoveProgram(lTRGlProgram, false)
        this.__intMoveProgram(rTLGlProgram, false)
        this.__intSmoothProgram(smoothGlProgram)
        this.__intSmoothProgram(lTRSmoothGlProgram)

        endGlProgram.offx = endGlProgram.getUniformLocation("offx");
        endGlProgram.offy = endGlProgram.getUniformLocation("offy");
    },

    __createProgram:function(vsource, fsource) {
        var glProgram = cc.GLProgram.createWithByteArrays(vsource, fsource)
        glProgram.link();
        glProgram.updateUniforms()
        return glProgram
    },

    __intMoveProgram:function(glProgram, isUpDown) {
        glProgram.rotationLc = glProgram.getUniformLocation("rotation");
        glProgram.ratio = glProgram.getUniformLocation("ratio");
        glProgram.radius = glProgram.getUniformLocation("radius");
        glProgram.offx = glProgram.getUniformLocation("offx");
        glProgram.offy = glProgram.getUniformLocation("offy");
        glProgram.Height = glProgram.getUniformLocation("height");
        glProgram.Width = glProgram.getUniformLocation("width");
        if(isUpDown)
        {
            glProgram.backBufferInfo = this.udBackBufferInfo
            glProgram.frontBufferInfo= this.udFrontBufferInfo
        }
        else
        {
            glProgram.backBufferInfo = this.lrBackBufferInfo
            glProgram.frontBufferInfo= this.lrFrontBufferInfo
        }
        glProgram.retain();
    },

    __intSmoothProgram:function(glProgram) {
        glProgram.rotationLc = glProgram.getUniformLocation("rotation")
        glProgram.offx = glProgram.getUniformLocation("offx")
        glProgram.offy = glProgram.getUniformLocation("offy")
        glProgram.Height = glProgram.getUniformLocation("height")
        glProgram.Width = glProgram.getUniformLocation("width");
        glProgram.retain();
    },

    __drawByMoveProgram:function(rotation){
        var glProgram = this.moveGlProgram;
        if(this.dirState == this.RubCardLayer_Dir_lr)
        {
            glProgram = this.lTRGlProgram;
        }
        else if(this.dirState == this.RubCardLayer_Dir_rl)
        {
            glProgram = this.rTLGlProgram;
        }
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
        this.__drawArrays(glProgram.backBufferInfo[0], glProgram.backBufferInfo[1]);
        gl.bindTexture(gl.TEXTURE_2D, this.frontSpriteId);
        this.__drawArrays(glProgram.frontBufferInfo[0], glProgram.frontBufferInfo[1]);
        gl.disable(gl.CULL_FACE);
    },

    __drawBySmoothProgram: function (rotation){
        var glProgram = this.smoothGlProgram
        var buffInfo = this.udFrontBufferInfo
        if(this.dirState != this.RubCardLayer_Dir_du)
        {

            glProgram = this.lTRSmoothGlProgram
            buffInfo = this.lrFrontBufferInfo
        }
        glProgram.use();
        glProgram.setUniformsForBuiltins();
        gl.bindTexture(gl.TEXTURE_2D, this.frontSpriteId);
        glProgram.setUniformLocationF32(glProgram.rotationLc, rotation)
        glProgram.setUniformLocationF32(glProgram.offx, this.offx)
        glProgram.setUniformLocationF32(glProgram.offy, this.offy)
        glProgram.setUniformLocationF32(glProgram.Height, this.pokerHeight)
        glProgram.setUniformLocationF32(glProgram.Width, this.pokerWidth);
        this.__drawArrays(buffInfo[0], buffInfo[1])
    },

    __drawByEndProgram:function (){
        var glProgram = this.endGlProgram;
        glProgram.use();
        glProgram.setUniformsForBuiltins();

        gl.bindTexture(gl.TEXTURE_2D, this.frontSpriteId);
        glProgram.setUniformLocationF32(glProgram.offx, this.offx);
        glProgram.setUniformLocationF32(glProgram.offy, this.offy);
        this.__drawArrays(this.udFrontBufferInfo[0], this.udFrontBufferInfo[1]);
    },

    __drawArrays: function(pos, tex){
        gl.enableVertexAttribArray(cc.macro.VERTEX_ATTRIB_POSITION);
        gl.enableVertexAttribArray(cc.macro.VERTEX_ATTRIB_TEX_COORDS);
        var VERTEX_ATTRIB_POSITION = 0;
        var VERTEX_ATTRIB_TEX_COORDS = 2;
        gl.bindBuffer(gl.ARRAY_BUFFER, pos)
        gl.vertexAttribPointer(VERTEX_ATTRIB_POSITION,2,gl.FLOAT,0,0,0)
        gl.bindBuffer(gl.ARRAY_BUFFER, tex)
        gl.vertexAttribPointer(VERTEX_ATTRIB_TEX_COORDS,2,gl.FLOAT,0,0,0)

        gl.drawArrays(gl.TRIANGLES, 0, this.posTexNum)
        gl.bindBuffer(gl.ARRAY_BUFFER, 0)
    },

    __initTexAndPos: function(isBack,isLeftRight){
        var nDiv = this.divNum; //将宽分成100份
        var verts = new Array(); //位置坐标
        var texs = new Array(); //纹理坐标
        var dh = this.pokerHeight/nDiv;
        var dw = this.pokerWidth;
        if(isLeftRight){
            dh = this.pokerHeight;
            dw = this.pokerWidth/nDiv;
        }
        for(var c = 1; c<=nDiv; c++){
            var x = 0;
            var y = (c-1)*dh;
            if(isLeftRight){
                x = (c-1)*dw;
                y = 0;
            }
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
        return [posBuffer.buffer_id, texBuffer.buffer_id]
    },

    __createTextures: function () {
        var imgUrl = cc.url.raw(this.szFont);
        this.frontSprite = cc.textureCache.addImage(imgUrl);
        this.frontSprite.retain();

        imgUrl = cc.url.raw(this.szBack);
        this.backSprite = cc.textureCache.addImage(imgUrl);
        this.backSprite.retain();

        var pokerSize = this.backSprite.getContentSize();
        this.pokerWidth = pokerSize.height
        this.pokerHeight = pokerSize.width

        this.offx = this.posX - this.pokerWidth/2;
        this.offy = this.posY - this.pokerHeight/2;

        this.backSpriteId = this.backSprite._glID;//this.backSprite.getName()
        this.frontSpriteId = this.frontSprite._glID;//this.frontSprite.getName()

        this.touchStartY = cc.winSize.height/2 + this.posY - this.pokerHeight/2;
        this.touchStartLRX = cc.winSize.width/2 + this.posX - this.pokerWidth/2;
        this.touchStartRLX = cc.winSize.width/2 + this.posX + this.pokerWidth/2;

        this.radiusVal = this.pokerHeight/10;
    },

    __deleteBuff: function (buffInfo) {
        gl._deleteBuffer(buffInfo[0])
        gl._deleteBuffer(buffInfo[1])
    },

    //结束需要移除
    __removeRes: function () {
        this.node._sgNode.removeChild(this.glnode);
        this.node._sgNode.removeChild(this.layer);
        this.__deleteBuff(this.udBackBufferInfo)
        this.__deleteBuff(this.udFrontBufferInfo)
        this.__deleteBuff(this.lrBackBufferInfo)
        this.__deleteBuff(this.lrFrontBufferInfo)

        this.moveGlProgram.release();
        this.lTRGlProgram.release();
        this.rTLGlProgram.release();
        this.smoothGlProgram.release();
        this.lTRSmoothGlProgram.release();
        this.endGlProgram.release();
        this.backSprite.release();
        this.frontSprite.release();
    },
});

