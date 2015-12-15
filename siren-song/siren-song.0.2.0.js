/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	var webglet = __webpack_require__(2);
	var rites = __webpack_require__(28);
	var Kybrd = __webpack_require__(36);
	var glMatrix = __webpack_require__(15);
	var mat4 = glMatrix.mat4;
	
	var RecyclingParticleSystem = __webpack_require__(37);
	var OctaveDistributor = __webpack_require__(41);
	var Cloud = __webpack_require__(42);
	var Level = __webpack_require__(45);
	var GoodGuy = __webpack_require__(49);
	var Score = __webpack_require__(51);
	var UI = __webpack_require__(52);
	var ObjectPool = __webpack_require__(53);
	var SpiralSiren = __webpack_require__(54);
	var generate_ir = __webpack_require__(61);
	var settings = __webpack_require__(48);
	
	FONT_LOADED = false;
	WINDOW_LOADED = false;
	
	WebFont.load({
	    google: {
	        families: ['Orbitron']
	    },
	    active: function () {
	        if (WINDOW_LOADED) {
	            window.app.start();
	        }
	        FONT_LOADED = true;
	    },
	    inactive: function () {
	        if (WINDOW_LOADED) {
	            window.app.start();
	        }
	        FONT_LOADED = true;
	    }
	});
	
	var SirenSong = function (options) {
	    webglet.App.call(this, options);
	
	    this.canvas.width = this.canvas.clientWidth;
	    this.canvas.height = this.canvas.clientHeight;
	
	    if (!gl) {
	        // Hide UI
	        document.getElementById('ui').style.display = 'none';
	        return;
	    }
	
	    this.screenWidth = screen.width;
	    this.screenHeight = screen.height;
	
	    this.shouldUpdate = false;
	    this.lastUpdateTime = 0;
	    this.timestep = 1 / 60;
	
	    var vertexShader = document.getElementById('basic-vert').innerHTML;
	    var fragmentShader = document.getElementById('basic-frag').innerHTML;
	    this.renderer = new webglet.BasicRenderer(vertexShader, fragmentShader);
	    gl.clearColor(0, 0, 0, 0);
	
	    this.projection = new webglet.MatrixStack();
	
	    this.modelview = new webglet.MatrixStack();
	
	    this.vec2Pool = new ObjectPool(Float32Array.bind(null, 2));
	
	    this.keyboard = new Kybrd();
	
	    this.context = new AudioContext();
	    this.octaveDistributor = new OctaveDistributor();
	
	    this.input = this.context.createGain();
	    this.delay = this.context.createDelay();
	    this.delay.delayTime.value = 4 * 60 / settings.bpm;
	    this.feedback = this.context.createGain();
	    this.feedback.gain.value = 0.7;
	    this.delayDirty = this.context.createGain();
	    this.delayDirty.gain.value = 0.2;
	    this.delayClean = this.context.createGain();
	    this.delayClean.gain.value = 0.8;
	
	    var ir = generate_ir(this.context, 3, 0.8);
	    this.reverb = this.context.createConvolver();
	    this.reverb.buffer = ir;
	    this.reverbDirty = this.context.createGain();
	    this.reverbDirty.gain.value = 0.4;
	    this.reverbClean = this.context.createGain();
	    this.reverbClean.gain.value = 0.6;
	
	    this.bitCrusher = this.context.createWaveShaper();
	    var levels = Math.pow(2, settings.bitRate);
	    var curve = new Float32Array(Math.pow(2, 16));
	    var perLevel = curve.length / levels;
	    for (var i = 0; i < levels; i++) {
	        var value = i / (levels - 1) * 2 - 1;
	        for (var j = 0; j < perLevel; j++) {
	            curve[i * perLevel + j] = value;
	        }
	    }
	    this.bitCrusher.curve = curve;
	
	    this.input.connect(this.delay);
	    this.delay.connect(this.feedback);
	    this.feedback.connect(this.delay);
	    this.delay.connect(this.delayDirty);
	    this.input.connect(this.delayClean);
	    this.delayClean.connect(this.reverb);
	    this.delayDirty.connect(this.reverb);
	    this.delayClean.connect(this.reverbClean);
	    this.delayDirty.connect(this.reverbClean);
	    this.reverb.connect(this.reverbDirty);
	    this.reverbClean.connect(this.bitCrusher);
	    this.reverbDirty.connect(this.bitCrusher);
	    this.bitCrusher.connect(this.context.destination);
	
	    this.octaveDistributor = new OctaveDistributor();
	    this.rootFrequency = 16.352;
	    this.scale = new rites.scale.Major();
	
	    this.particleSystem = new RecyclingParticleSystem(30);
	
	    this.cloud = new Cloud(this);
	
	    this.level = new Level(this);
	
	    this.goodGuy = new GoodGuy(this);
	
	    this.sirens = [];
	
	    this.chain = [this.goodGuy];
	
	    this.score = new Score(this);
	
	    this.ui = new UI(this);
	
	    if (FONT_LOADED) {
	        this.start();
	    }
	    WINDOW_LOADED = true;
	};
	SirenSong.prototype = Object.create(webglet.App.prototype);
	SirenSong.prototype.constructor = SirenSong;
	
	SirenSong.prototype.start = function () {
	    this.goodGuy.center();
	    this.goodGuy.update();
	    this.ui.startCountdown();
	
	    requestAnimationFrame(this.draw.bind(this));
	};
	
	SirenSong.prototype.startUpdates = function () {
	    this.shouldUpdate = true;
	    this.accum = 0;
	    this.lastUpdateTime = Date.now();
	};
	
	SirenSong.prototype.stopUpdates = function () {
	    this.shouldUpdate = false;
	};
	
	SirenSong.prototype.handleKeys = function () {
	    if (this.keyboard.isPressed('left') || this.keyboard.isPressed('a')) {
	        var dx = settings.baseTurningSpeed + settings.turningSpeedMultiplier * this.score.score;
	        this.goodGuy.particle.velocity[0] -= dx;
	    }
	    if (this.keyboard.isPressed('right') || this.keyboard.isPressed('d')) {
	        var dx = settings.baseTurningSpeed + settings.turningSpeedMultiplier * this.score.score;
	        this.goodGuy.particle.velocity[0] += dx;
	    }
	};
	
	SirenSong.prototype.addSirens = function () {
	    if (Math.random() > 0.98) {
	        this.sirens.push(new SpiralSiren(this));
	    }
	};
	
	SirenSong.prototype.update = function (dt) {
	    this.handleKeys();
	    this.particleSystem.tick(dt);
	    this.level.update(dt);
	
	    this.addSirens();
	    for (var i = 0; i < this.sirens.length; i++) {
	        this.sirens[i].update();
	    }
	
	    this.goodGuy.update();
	
	    this.cloud.update(dt);
	
	    this.ui.updateScore();
	};
	
	SirenSong.prototype.runUpdates = function () {
	    if (!this.shouldUpdate) {
	        return;
	    }
	
	    var time = Date.now();
	    var dt = (time - this.lastUpdateTime) / 1000;
	    this.lastUpdateTime = time;
	
	    this.accum += dt;
	
	    while (this.accum >= this.timestep) {
	        this.update(this.timestep);
	        this.accum -= this.timestep;
	    }
	};
	
	SirenSong.prototype.draw = function () {
	    if (this.canvas.clientWidth && this.canvas.clientHeight && (this.canvas.width != this.canvas.clientWidth || this.canvas.height != this.canvas.clientHeight)) {
	        this.canvas.width = this.canvas.clientWidth;
	        this.canvas.height = this.canvas.clientHeight;
	    }
	
	    this.runUpdates();
	
	    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	
	    mat4.ortho(this.projection.matrix, -0.5, 0.5, 0.5 * this.canvas.height / this.canvas.width, -0.5 * this.canvas.height / this.canvas.width, -1, 1);
	    this.renderer.setUniform('uProjectionMatrix', this.projection.matrix);
	
	    gl.clear(gl.COLOR_BUFFER_BIT);
	    this.renderer.setUniform('uModelviewMatrix', this.modelview.matrix);
	    this.level.draw();
	    this.cloud.draw();
	    for (var i = 0; i < this.sirens.length; i++) {
	        this.sirens[i].draw();
	    }
	    this.goodGuy.draw();
	    this.ui.draw();
	    requestAnimationFrame(this.draw.bind(this));
	};
	
	SirenSong.prototype.pxToLength = function (px) {
	    return px / this.widthPx();
	};
	
	SirenSong.prototype.lengthToPx = function (length) {
	    return length * this.widthPx();
	};
	
	SirenSong.prototype.width = function () {
	    return 1;
	};
	
	SirenSong.prototype.widthPx = function () {
	    return this.canvas.width;
	};
	
	SirenSong.prototype.height = function () {
	    return this.pxToLength(this.heightPx());
	};
	
	SirenSong.prototype.heightPx = function () {
	    return this.canvas.height;
	};
	
	SirenSong.prototype.minWidth = function () {
	    return 1;
	};
	
	SirenSong.prototype.minWidthPx = function () {
	    return 320;
	};
	
	SirenSong.prototype.maxWidth = function () {
	    return 1;
	};
	
	SirenSong.prototype.maxWidthPx = function () {
	    return this.screenWidth;
	};
	
	SirenSong.prototype.minHeight = function () {
	    return 0;
	};
	
	SirenSong.prototype.minHeightPx = function () {
	    return 0;
	};
	
	SirenSong.prototype.maxHeight = function () {
	    return this.maxHeightPx() / this.minWidthPx();
	};
	
	SirenSong.prototype.maxHeightPx = function () {
	    return this.screenHeight;
	};
	
	document.addEventListener("DOMContentLoaded", function () {
	    var canvas = document.getElementById('game');
	    window.app = new SirenSong({ canvas: canvas,
	        contextAttributes: {
	            antialias: false,
	            alpha: false,
	            depth: false
	        } });
	});

/***/ },
/* 1 */
/***/ function(module, exports) {

	/* Web Font Loader v1.5.2 - (c) Adobe Systems, Google. License: Apache 2.0 */
	;(function(window,document,undefined){var j=!0,l=null,m=!1;function n(a){return function(){return this[a]}}var q=this;function r(a,b){var c=a.split("."),d=q;!(c[0]in d)&&d.execScript&&d.execScript("var "+c[0]);for(var e;c.length&&(e=c.shift());)!c.length&&void 0!==b?d[e]=b:d=d[e]?d[e]:d[e]={}}function aa(a,b,c){return a.call.apply(a.bind,arguments)}
	function ba(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function t(a,b,c){t=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?aa:ba;return t.apply(l,arguments)}var u=Date.now||function(){return+new Date};function v(a,b){this.G=a;this.v=b||a;this.z=this.v.document}v.prototype.createElement=function(a,b,c){a=this.z.createElement(a);if(b)for(var d in b)b.hasOwnProperty(d)&&("style"==d?a.style.cssText=b[d]:a.setAttribute(d,b[d]));c&&a.appendChild(this.z.createTextNode(c));return a};function ca(a,b,c){a=a.z.getElementsByTagName(b)[0];a||(a=document.documentElement);a&&a.lastChild&&a.insertBefore(c,a.lastChild)}
	function w(a,b){for(var c=a.className.split(/\s+/),d=0,e=c.length;d<e;d++)if(c[d]==b)return;c.push(b);a.className=c.join(" ").replace(/\s+/g," ").replace(/^\s+|\s+$/,"")}function x(a,b){for(var c=a.className.split(/\s+/),d=[],e=0,g=c.length;e<g;e++)c[e]!=b&&d.push(c[e]);a.className=d.join(" ").replace(/\s+/g," ").replace(/^\s+|\s+$/,"")}function da(a,b){for(var c=a.className.split(/\s+/),d=0,e=c.length;d<e;d++)if(c[d]==b)return j;return m}
	function y(a){var b=a.v.location.protocol;"about:"==b&&(b=a.G.location.protocol);return"https:"==b?"https:":"http:"}function ea(a,b){var c=a.createElement("link",{rel:"stylesheet",href:b}),d=m;c.onload=function(){d||(d=j)};c.onerror=function(){d||(d=j)};ca(a,"head",c)}
	function z(a,b,c,d){var e=a.z.getElementsByTagName("head")[0];if(e){var g=a.createElement("script",{src:b}),f=m;g.onload=g.onreadystatechange=function(){if(!f&&(!this.readyState||"loaded"==this.readyState||"complete"==this.readyState))f=j,c&&c(l),g.onload=g.onreadystatechange=l,"HEAD"==g.parentNode.tagName&&e.removeChild(g)};e.appendChild(g);window.setTimeout(function(){f||(f=j,c&&c(Error("Script load timeout")))},d||5E3);return g}return l};function A(a,b,c){this.M=a;this.U=b;this.Aa=c}r("webfont.BrowserInfo",A);A.prototype.pa=n("M");A.prototype.hasWebFontSupport=A.prototype.pa;A.prototype.qa=n("U");A.prototype.hasWebKitFallbackBug=A.prototype.qa;A.prototype.ra=n("Aa");A.prototype.hasWebKitMetricsBug=A.prototype.ra;function B(a,b,c,d){this.d=a!=l?a:l;this.o=b!=l?b:l;this.aa=c!=l?c:l;this.f=d!=l?d:l}var fa=/^([0-9]+)(?:[\._-]([0-9]+))?(?:[\._-]([0-9]+))?(?:[\._+-]?(.*))?$/;B.prototype.toString=function(){return[this.d,this.o||"",this.aa||"",this.f||""].join("")};
	function C(a){a=fa.exec(a);var b=l,c=l,d=l,e=l;a&&(a[1]!==l&&a[1]&&(b=parseInt(a[1],10)),a[2]!==l&&a[2]&&(c=parseInt(a[2],10)),a[3]!==l&&a[3]&&(d=parseInt(a[3],10)),a[4]!==l&&a[4]&&(e=/^[0-9]+$/.test(a[4])?parseInt(a[4],10):a[4]));return new B(b,c,d,e)};function D(a,b,c,d,e,g,f,h,k,p,s){this.K=a;this.Ga=b;this.za=c;this.fa=d;this.Ea=e;this.ea=g;this.wa=f;this.Fa=h;this.va=k;this.da=p;this.k=s}r("webfont.UserAgent",D);D.prototype.getName=n("K");D.prototype.getName=D.prototype.getName;D.prototype.oa=n("za");D.prototype.getVersion=D.prototype.oa;D.prototype.ka=n("fa");D.prototype.getEngine=D.prototype.ka;D.prototype.la=n("ea");D.prototype.getEngineVersion=D.prototype.la;D.prototype.ma=n("wa");D.prototype.getPlatform=D.prototype.ma;D.prototype.na=n("va");
	D.prototype.getPlatformVersion=D.prototype.na;D.prototype.ja=n("da");D.prototype.getDocumentMode=D.prototype.ja;D.prototype.ia=n("k");D.prototype.getBrowserInfo=D.prototype.ia;function E(a,b){this.a=a;this.I=b}var ga=new D("Unknown",new B,"Unknown","Unknown",new B,"Unknown","Unknown",new B,"Unknown",void 0,new A(m,m,m));
	E.prototype.parse=function(){var a;if(-1!=this.a.indexOf("MSIE")||-1!=this.a.indexOf("Trident/")){a=F(this);var b=G(this),c=C(b),d=l,e=l,g=l,f=l,h=H(this.a,/Trident\/([\d\w\.]+)/,1),k=I(this.I),d=-1!=this.a.indexOf("MSIE")?H(this.a,/MSIE ([\d\w\.]+)/,1):H(this.a,/rv:([\d\w\.]+)/,1),e=C(d);""!=h?(g="Trident",f=C(h)):(g="Unknown",f=new B,h="Unknown");a=new D("MSIE",e,d,g,f,h,a,c,b,k,new A("Windows"==a&&6<=e.d||"Windows Phone"==a&&8<=c.d,m,m))}else if(-1!=this.a.indexOf("Opera"))a:if(a="Unknown",b=H(this.a,
	/Presto\/([\d\w\.]+)/,1),c=C(b),d=G(this),e=C(d),g=I(this.I),c.d!==l?a="Presto":(-1!=this.a.indexOf("Gecko")&&(a="Gecko"),b=H(this.a,/rv:([^\)]+)/,1),c=C(b)),-1!=this.a.indexOf("Opera Mini/"))f=H(this.a,/Opera Mini\/([\d\.]+)/,1),h=C(f),a=new D("OperaMini",h,f,a,c,b,F(this),e,d,g,new A(m,m,m));else{if(-1!=this.a.indexOf("Version/")&&(f=H(this.a,/Version\/([\d\.]+)/,1),h=C(f),h.d!==l)){a=new D("Opera",h,f,a,c,b,F(this),e,d,g,new A(10<=h.d,m,m));break a}f=H(this.a,/Opera[\/ ]([\d\.]+)/,1);h=C(f);a=
	h.d!==l?new D("Opera",h,f,a,c,b,F(this),e,d,g,new A(10<=h.d,m,m)):new D("Opera",new B,"Unknown",a,c,b,F(this),e,d,g,new A(m,m,m))}else/OPR\/[\d.]+/.test(this.a)?a=ha(this):/AppleWeb(K|k)it/.test(this.a)?a=ha(this):-1!=this.a.indexOf("Gecko")?(a="Unknown",b=new B,c="Unknown",d=G(this),e=C(d),g=m,-1!=this.a.indexOf("Firefox")?(a="Firefox",c=H(this.a,/Firefox\/([\d\w\.]+)/,1),b=C(c),g=3<=b.d&&5<=b.o):-1!=this.a.indexOf("Mozilla")&&(a="Mozilla"),f=H(this.a,/rv:([^\)]+)/,1),h=C(f),g||(g=1<h.d||1==h.d&&
	9<h.o||1==h.d&&9==h.o&&2<=h.aa||f.match(/1\.9\.1b[123]/)!=l||f.match(/1\.9\.1\.[\d\.]+/)!=l),a=new D(a,b,c,"Gecko",h,f,F(this),e,d,I(this.I),new A(g,m,m))):a=ga;return a};function F(a){var b=H(a.a,/(iPod|iPad|iPhone|Android|Windows Phone|BB\d{2}|BlackBerry)/,1);if(""!=b)return/BB\d{2}/.test(b)&&(b="BlackBerry"),b;a=H(a.a,/(Linux|Mac_PowerPC|Macintosh|Windows|CrOS)/,1);return""!=a?("Mac_PowerPC"==a&&(a="Macintosh"),a):"Unknown"}
	function G(a){var b=H(a.a,/(OS X|Windows NT|Android) ([^;)]+)/,2);if(b||(b=H(a.a,/Windows Phone( OS)? ([^;)]+)/,2))||(b=H(a.a,/(iPhone )?OS ([\d_]+)/,2)))return b;if(b=H(a.a,/(?:Linux|CrOS) ([^;)]+)/,1))for(var b=b.split(/\s/),c=0;c<b.length;c+=1)if(/^[\d\._]+$/.test(b[c]))return b[c];return(a=H(a.a,/(BB\d{2}|BlackBerry).*?Version\/([^\s]*)/,2))?a:"Unknown"}
	function ha(a){var b=F(a),c=G(a),d=C(c),e=H(a.a,/AppleWeb(?:K|k)it\/([\d\.\+]+)/,1),g=C(e),f="Unknown",h=new B,k="Unknown",p=m;/OPR\/[\d.]+/.test(a.a)?f="Opera":-1!=a.a.indexOf("Chrome")||-1!=a.a.indexOf("CrMo")||-1!=a.a.indexOf("CriOS")?f="Chrome":/Silk\/\d/.test(a.a)?f="Silk":"BlackBerry"==b||"Android"==b?f="BuiltinBrowser":-1!=a.a.indexOf("PhantomJS")?f="PhantomJS":-1!=a.a.indexOf("Safari")?f="Safari":-1!=a.a.indexOf("AdobeAIR")&&(f="AdobeAIR");"BuiltinBrowser"==f?k="Unknown":"Silk"==f?k=H(a.a,
	/Silk\/([\d\._]+)/,1):"Chrome"==f?k=H(a.a,/(Chrome|CrMo|CriOS)\/([\d\.]+)/,2):-1!=a.a.indexOf("Version/")?k=H(a.a,/Version\/([\d\.\w]+)/,1):"AdobeAIR"==f?k=H(a.a,/AdobeAIR\/([\d\.]+)/,1):"Opera"==f?k=H(a.a,/OPR\/([\d.]+)/,1):"PhantomJS"==f&&(k=H(a.a,/PhantomJS\/([\d.]+)/,1));h=C(k);p="AdobeAIR"==f?2<h.d||2==h.d&&5<=h.o:"BlackBerry"==b?10<=d.d:"Android"==b?2<d.d||2==d.d&&1<d.o:526<=g.d||525<=g.d&&13<=g.o;return new D(f,h,k,"AppleWebKit",g,e,b,d,c,I(a.I),new A(p,536>g.d||536==g.d&&11>g.o,"iPhone"==
	b||"iPad"==b||"iPod"==b||"Macintosh"==b))}function H(a,b,c){return(a=a.match(b))&&a[c]?a[c]:""}function I(a){if(a.documentMode)return a.documentMode};function ia(a){this.ua=a||"-"}ia.prototype.f=function(a){for(var b=[],c=0;c<arguments.length;c++)b.push(arguments[c].replace(/[\W_]+/g,"").toLowerCase());return b.join(this.ua)};function J(a,b){this.K=a;this.V=4;this.L="n";var c=(b||"n4").match(/^([nio])([1-9])$/i);c&&(this.L=c[1],this.V=parseInt(c[2],10))}J.prototype.getName=n("K");function K(a){return a.L+a.V}function ja(a){var b=4,c="n",d=l;a&&((d=a.match(/(normal|oblique|italic)/i))&&d[1]&&(c=d[1].substr(0,1).toLowerCase()),(d=a.match(/([1-9]00|normal|bold)/i))&&d[1]&&(/bold/i.test(d[1])?b=7:/[1-9]00/.test(d[1])&&(b=parseInt(d[1].substr(0,1),10))));return c+b};function ka(a,b,c){this.c=a;this.h=b;this.O=c;this.j="wf";this.g=new ia("-")}function L(a){x(a.h,a.g.f(a.j,"loading"));da(a.h,a.g.f(a.j,"active"))||w(a.h,a.g.f(a.j,"inactive"));M(a,"inactive")}function M(a,b,c){if(a.O[b])if(c)a.O[b](c.getName(),K(c));else a.O[b]()};function la(){this.w={}};function O(a,b){this.c=a;this.C=b;this.s=this.c.createElement("span",{"aria-hidden":"true"},this.C)}
	function P(a,b){var c;c=[];for(var d=b.K.split(/,\s*/),e=0;e<d.length;e++){var g=d[e].replace(/['"]/g,"");-1==g.indexOf(" ")?c.push(g):c.push("'"+g+"'")}c=c.join(",");d="normal";e=b.V+"00";"o"===b.L?d="oblique":"i"===b.L&&(d="italic");a.s.style.cssText="position:absolute;top:-999px;left:-999px;font-size:300px;width:auto;height:auto;line-height:normal;margin:0;padding:0;font-variant:normal;white-space:nowrap;font-family:"+c+";"+("font-style:"+d+";font-weight:"+e+";")}
	function Q(a){ca(a.c,"body",a.s)}O.prototype.remove=function(){var a=this.s;a.parentNode&&a.parentNode.removeChild(a)};function ma(a,b,c,d,e,g,f,h){this.W=a;this.sa=b;this.c=c;this.q=d;this.C=h||"BESbswy";this.k=e;this.F={};this.T=g||5E3;this.Z=f||l;this.B=this.A=l;a=new O(this.c,this.C);Q(a);for(var k in R)R.hasOwnProperty(k)&&(P(a,new J(R[k],K(this.q))),this.F[R[k]]=a.s.offsetWidth);a.remove()}var R={Da:"serif",Ca:"sans-serif",Ba:"monospace"};
	ma.prototype.start=function(){this.A=new O(this.c,this.C);Q(this.A);this.B=new O(this.c,this.C);Q(this.B);this.xa=u();P(this.A,new J(this.q.getName()+",serif",K(this.q)));P(this.B,new J(this.q.getName()+",sans-serif",K(this.q)));oa(this)};function pa(a,b,c){for(var d in R)if(R.hasOwnProperty(d)&&b===a.F[R[d]]&&c===a.F[R[d]])return j;return m}
	function oa(a){var b=a.A.s.offsetWidth,c=a.B.s.offsetWidth;b===a.F.serif&&c===a.F["sans-serif"]||a.k.U&&pa(a,b,c)?u()-a.xa>=a.T?a.k.U&&pa(a,b,c)&&(a.Z===l||a.Z.hasOwnProperty(a.q.getName()))?S(a,a.W):S(a,a.sa):setTimeout(t(function(){oa(this)},a),25):S(a,a.W)}function S(a,b){a.A.remove();a.B.remove();b(a.q)};function T(a,b,c,d){this.c=b;this.t=c;this.P=0;this.ba=this.Y=m;this.T=d;this.k=a.k}function qa(a,b,c,d,e){if(0===b.length&&e)L(a.t);else{a.P+=b.length;e&&(a.Y=e);for(e=0;e<b.length;e++){var g=b[e],f=c[g.getName()],h=a.t,k=g;w(h.h,h.g.f(h.j,k.getName(),K(k).toString(),"loading"));M(h,"fontloading",k);(new ma(t(a.ga,a),t(a.ha,a),a.c,g,a.k,a.T,d,f)).start()}}}
	T.prototype.ga=function(a){var b=this.t;x(b.h,b.g.f(b.j,a.getName(),K(a).toString(),"loading"));x(b.h,b.g.f(b.j,a.getName(),K(a).toString(),"inactive"));w(b.h,b.g.f(b.j,a.getName(),K(a).toString(),"active"));M(b,"fontactive",a);this.ba=j;ra(this)};T.prototype.ha=function(a){var b=this.t;x(b.h,b.g.f(b.j,a.getName(),K(a).toString(),"loading"));da(b.h,b.g.f(b.j,a.getName(),K(a).toString(),"active"))||w(b.h,b.g.f(b.j,a.getName(),K(a).toString(),"inactive"));M(b,"fontinactive",a);ra(this)};
	function ra(a){0==--a.P&&a.Y&&(a.ba?(a=a.t,x(a.h,a.g.f(a.j,"loading")),x(a.h,a.g.f(a.j,"inactive")),w(a.h,a.g.f(a.j,"active")),M(a,"active")):L(a.t))};function U(a){this.G=a;this.u=new la;this.ya=new E(a.navigator.userAgent,a.document);this.a=this.ya.parse();this.Q=this.R=0}
	U.prototype.load=function(a){var b=a.context||this.G;this.c=new v(this.G,b);var b=new ka(this.c,b.document.documentElement,a),c=[],d=a.timeout;w(b.h,b.g.f(b.j,"loading"));M(b,"loading");var c=this.u,e=this.c,g=[],f;for(f in a)if(a.hasOwnProperty(f)){var h=c.w[f];h&&g.push(h(a[f],e))}c=g;this.Q=this.R=c.length;a=new T(this.a,this.c,b,d);f=0;for(d=c.length;f<d;f++)e=c[f],e.H(this.a,t(this.ta,this,e,b,a))};
	U.prototype.ta=function(a,b,c,d){var e=this;d?a.load(function(a,b,d){var k=0==--e.R;setTimeout(function(){qa(c,a,b||{},d||l,k)},0)}):(a=0==--this.R,this.Q--,a&&0==this.Q&&L(b),qa(c,[],{},l,a))};function sa(a,b,c){this.N=a?a:b+ta;this.p=[];this.S=[];this.ca=c||""}var ta="//fonts.googleapis.com/css";sa.prototype.f=function(){if(0==this.p.length)throw Error("No fonts to load!");if(-1!=this.N.indexOf("kit="))return this.N;for(var a=this.p.length,b=[],c=0;c<a;c++)b.push(this.p[c].replace(/ /g,"+"));a=this.N+"?family="+b.join("%7C");0<this.S.length&&(a+="&subset="+this.S.join(","));0<this.ca.length&&(a+="&text="+encodeURIComponent(this.ca));return a};function ua(a){this.p=a;this.$=[];this.J={}}
	var va={latin:"BESbswy",cyrillic:"&#1081;&#1103;&#1046;",greek:"&#945;&#946;&#931;",khmer:"&#x1780;&#x1781;&#x1782;",Hanuman:"&#x1780;&#x1781;&#x1782;"},wa={thin:"1",extralight:"2","extra-light":"2",ultralight:"2","ultra-light":"2",light:"3",regular:"4",book:"4",medium:"5","semi-bold":"6",semibold:"6","demi-bold":"6",demibold:"6",bold:"7","extra-bold":"8",extrabold:"8","ultra-bold":"8",ultrabold:"8",black:"9",heavy:"9",l:"3",r:"4",b:"7"},xa={i:"i",italic:"i",n:"n",normal:"n"},ya=RegExp("^(thin|(?:(?:extra|ultra)-?)?light|regular|book|medium|(?:(?:semi|demi|extra|ultra)-?)?bold|black|heavy|l|r|b|[1-9]00)?(n|i|normal|italic)?$");
	ua.prototype.parse=function(){for(var a=this.p.length,b=0;b<a;b++){var c=this.p[b].split(":"),d=c[0].replace(/\+/g," "),e=["n4"];if(2<=c.length){var g;var f=c[1];g=[];if(f)for(var f=f.split(","),h=f.length,k=0;k<h;k++){var p;p=f[k];if(p.match(/^[\w-]+$/)){p=ya.exec(p.toLowerCase());var s=void 0;if(p==l)s="";else{s=void 0;s=p[1];if(s==l||""==s)s="4";else var na=wa[s],s=na?na:isNaN(s)?"4":s.substr(0,1);s=[p[2]==l||""==p[2]?"n":xa[p[2]],s].join("")}p=s}else p="";p&&g.push(p)}0<g.length&&(e=g);3==c.length&&
	(c=c[2],g=[],c=!c?g:c.split(","),0<c.length&&(c=va[c[0]])&&(this.J[d]=c))}this.J[d]||(c=va[d])&&(this.J[d]=c);for(c=0;c<e.length;c+=1)this.$.push(new J(d,e[c]))}};function V(a,b){this.a=(new E(navigator.userAgent,document)).parse();this.c=a;this.e=b}var za={Arimo:j,Cousine:j,Tinos:j};V.prototype.H=function(a,b){b(a.k.M)};V.prototype.load=function(a){var b=this.c;if("MSIE"==this.a.getName()&&this.e.blocking!=j){var c=t(this.X,this,a),d=function(){b.z.body?c():setTimeout(d,0)};d()}else this.X(a)};
	V.prototype.X=function(a){for(var b=this.c,c=new sa(this.e.api,y(b),this.e.text),d=this.e.families,e=d.length,g=0;g<e;g++){var f=d[g].split(":");3==f.length&&c.S.push(f.pop());var h="";2==f.length&&""!=f[1]&&(h=":");c.p.push(f.join(h))}d=new ua(d);d.parse();ea(b,c.f());a(d.$,d.J,za)};function W(a,b){this.c=a;this.e=b;this.m=[]}W.prototype.D=function(a){return y(this.c)+(this.e.api||"//f.fontdeck.com/s/css/js/")+(this.c.v.location.hostname||this.c.G.location.hostname)+"/"+a+".js"};
	W.prototype.H=function(a,b){var c=this.e.id,d=this.c.v,e=this;c?(d.__webfontfontdeckmodule__||(d.__webfontfontdeckmodule__={}),d.__webfontfontdeckmodule__[c]=function(a,c){for(var d=0,k=c.fonts.length;d<k;++d){var p=c.fonts[d];e.m.push(new J(p.name,ja("font-weight:"+p.weight+";font-style:"+p.style)))}b(a)},z(this.c,this.D(c),function(a){a&&b(m)})):b(m)};W.prototype.load=function(a){a(this.m)};function X(a,b){this.c=a;this.e=b;this.m=[]}X.prototype.D=function(a){var b=y(this.c);return(this.e.api||b+"//use.typekit.net")+"/"+a+".js"};
	X.prototype.H=function(a,b){var c=this.e.id,d=this.e,e=this.c.v,g=this;c?(e.__webfonttypekitmodule__||(e.__webfonttypekitmodule__={}),e.__webfonttypekitmodule__[c]=function(c){c(a,d,function(a,c,d){for(var e=0;e<c.length;e+=1){var f=d[c[e]];if(f)for(var N=0;N<f.length;N+=1)g.m.push(new J(c[e],f[N]));else g.m.push(new J(c[e]))}b(a)})},z(this.c,this.D(c),function(a){a&&b(m)},2E3)):b(m)};X.prototype.load=function(a){a(this.m)};function Y(a,b){this.c=a;this.e=b;this.m=[]}Y.prototype.H=function(a,b){var c=this,d=c.e.projectId,e=c.e.version;if(d){var g=c.c.v;z(this.c,c.D(d,e),function(e){if(e)b(m);else{if(g["__mti_fntLst"+d]&&(e=g["__mti_fntLst"+d]()))for(var h=0;h<e.length;h++)c.m.push(new J(e[h].fontfamily));b(a.k.M)}}).id="__MonotypeAPIScript__"+d}else b(m)};Y.prototype.D=function(a,b){var c=y(this.c),d=(this.e.api||"fast.fonts.net/jsapi").replace(/^.*http(s?):(\/\/)?/,"");return c+"//"+d+"/"+a+".js"+(b?"?v="+b:"")};
	Y.prototype.load=function(a){a(this.m)};function Z(a,b){this.c=a;this.e=b}Z.prototype.load=function(a){var b,c,d=this.e.urls||[],e=this.e.families||[],g=this.e.testStrings||{};b=0;for(c=d.length;b<c;b++)ea(this.c,d[b]);d=[];b=0;for(c=e.length;b<c;b++){var f=e[b].split(":");if(f[1])for(var h=f[1].split(","),k=0;k<h.length;k+=1)d.push(new J(f[0],h[k]));else d.push(new J(f[0]))}a(d,g)};Z.prototype.H=function(a,b){return b(a.k.M)};var $=new U(q);$.u.w.custom=function(a,b){return new Z(b,a)};$.u.w.fontdeck=function(a,b){return new W(b,a)};$.u.w.monotype=function(a,b){return new Y(b,a)};$.u.w.typekit=function(a,b){return new X(b,a)};$.u.w.google=function(a,b){return new V(b,a)};q.WebFont||(q.WebFont={},q.WebFont.load=t($.load,$),q.WebFontConfig&&$.load(q.WebFontConfig));})(this,document);
	


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	exports.App = __webpack_require__(3).App;
	exports.Attribute = __webpack_require__(5).Attribute;
	exports.BasicRenderer = __webpack_require__(6).BasicRenderer;
	exports.Buffer = __webpack_require__(10).Buffer;
	exports.Framebuffer = __webpack_require__(11).Framebuffer;
	exports.FramebufferRenderer = __webpack_require__(13).FramebufferRenderer;
	exports.MatrixStack = __webpack_require__(14).MatrixStack;
	exports.Mesh = __webpack_require__(25).Mesh;
	exports.RectMesh = __webpack_require__(26).RectMesh;
	exports.Shader = __webpack_require__(8).Shader;
	exports.ShaderProgram = __webpack_require__(7).ShaderProgram;
	exports.Texture = __webpack_require__(12).Texture;
	exports.Transformation = __webpack_require__(27).Transformation;
	exports.Uniform = __webpack_require__(9).Uniform;
	
	exports.glMatrix = __webpack_require__(15);


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {var WebGLDebugUtils = __webpack_require__(4).WebGLDebugUtils;
	
	var App = function(options) {
	    options = options || {};
	    this.canvas = options.canvas;
	    var contextAttributes = options.contextAttributes || {};
	    try {
	        global.gl = (this.canvas.getContext("webgl", contextAttributes) ||
	                     this.canvas.getContext('experimental-webgl',
	                                            options.contextAttributes));
	        if (options.debug) {
	            gl = WebGLDebugUtils.makeDebugContext(gl);
	        }
	    }
	    catch (error) {
	        gl = null;
	    }
	};
	
	App.prototype.updateViewport = function() {
	    if (this.canvas.clientWidth && this.canvas.clientHeight &&
	        (this.canvas.width != this.canvas.clientWidth ||
	        this.canvas.height != this.canvas.clientHeight)) {
	        this.canvas.width = this.canvas.clientWidth;
	        this.canvas.height = this.canvas.clientHeight;
	    }
	    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	};
	
	App.prototype.getCanvasPosition = function() {
	    var position = vec2.create();
	    var object = this.canvas;
	    do {
	        vec2[0] += object.offsetLeft;
	        vec2[1] += object.offsetTop;
	    } while (object = object.offsetParent);
	    return position;
	};
	
	exports.App = App;
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 4 */
/***/ function(module, exports) {

	/*
	** Copyright (c) 2012 The Khronos Group Inc.
	**
	** Permission is hereby granted, free of charge, to any person obtaining a
	** copy of this software and/or associated documentation files (the
	** "Materials"), to deal in the Materials without restriction, including
	** without limitation the rights to use, copy, modify, merge, publish,
	** distribute, sublicense, and/or sell copies of the Materials, and to
	** permit persons to whom the Materials are furnished to do so, subject to
	** the following conditions:
	**
	** The above copyright notice and this permission notice shall be included
	** in all copies or substantial portions of the Materials.
	**
	** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
	** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
	** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
	** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
	** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
	*/
	
	// Various functions for helping debug WebGL apps.
	
	WebGLDebugUtils = function() {
	
	/**
	 * Wrapped logging function.
	 * @param {string} msg Message to log.
	 */
	var log = function(msg) {
	  if (window.console && window.console.log) {
	    window.console.log(msg);
	  }
	};
	
	/**
	 * Wrapped error logging function.
	 * @param {string} msg Message to log.
	 */
	var error = function(msg) {
	  if (window.console && window.console.error) {
	    window.console.error(msg);
	  } else {
	    log(msg);
	  }
	};
	
	
	/**
	 * Which arguments are enums based on the number of arguments to the function.
	 * So
	 *    'texImage2D': {
	 *       9: { 0:true, 2:true, 6:true, 7:true },
	 *       6: { 0:true, 2:true, 3:true, 4:true },
	 *    },
	 *
	 * means if there are 9 arguments then 6 and 7 are enums, if there are 6
	 * arguments 3 and 4 are enums
	 *
	 * @type {!Object.<number, !Object.<number, string>}
	 */
	var glValidEnumContexts = {
	  // Generic setters and getters
	
	  'enable': {1: { 0:true }},
	  'disable': {1: { 0:true }},
	  'getParameter': {1: { 0:true }},
	
	  // Rendering
	
	  'drawArrays': {3:{ 0:true }},
	  'drawElements': {4:{ 0:true, 2:true }},
	
	  // Shaders
	
	  'createShader': {1: { 0:true }},
	  'getShaderParameter': {2: { 1:true }},
	  'getProgramParameter': {2: { 1:true }},
	  'getShaderPrecisionFormat': {2: { 0: true, 1:true }},
	
	  // Vertex attributes
	
	  'getVertexAttrib': {2: { 1:true }},
	  'vertexAttribPointer': {6: { 2:true }},
	
	  // Textures
	
	  'bindTexture': {2: { 0:true }},
	  'activeTexture': {1: { 0:true }},
	  'getTexParameter': {2: { 0:true, 1:true }},
	  'texParameterf': {3: { 0:true, 1:true }},
	  'texParameteri': {3: { 0:true, 1:true, 2:true }},
	  'texImage2D': {
	     9: { 0:true, 2:true, 6:true, 7:true },
	     6: { 0:true, 2:true, 3:true, 4:true }
	  },
	  'texSubImage2D': {
	    9: { 0:true, 6:true, 7:true },
	    7: { 0:true, 4:true, 5:true }
	  },
	  'copyTexImage2D': {8: { 0:true, 2:true }},
	  'copyTexSubImage2D': {8: { 0:true }},
	  'generateMipmap': {1: { 0:true }},
	  'compressedTexImage2D': {7: { 0: true, 2:true }},
	  'compressedTexSubImage2D': {8: { 0: true, 6:true }},
	
	  // Buffer objects
	
	  'bindBuffer': {2: { 0:true }},
	  'bufferData': {3: { 0:true, 2:true }},
	  'bufferSubData': {3: { 0:true }},
	  'getBufferParameter': {2: { 0:true, 1:true }},
	
	  // Renderbuffers and framebuffers
	
	  'pixelStorei': {2: { 0:true, 1:true }},
	  'readPixels': {7: { 4:true, 5:true }},
	  'bindRenderbuffer': {2: { 0:true }},
	  'bindFramebuffer': {2: { 0:true }},
	  'checkFramebufferStatus': {1: { 0:true }},
	  'framebufferRenderbuffer': {4: { 0:true, 1:true, 2:true }},
	  'framebufferTexture2D': {5: { 0:true, 1:true, 2:true }},
	  'getFramebufferAttachmentParameter': {3: { 0:true, 1:true, 2:true }},
	  'getRenderbufferParameter': {2: { 0:true, 1:true }},
	  'renderbufferStorage': {4: { 0:true, 1:true }},
	
	  // Frame buffer operations (clear, blend, depth test, stencil)
	
	  'clear': {1: { 0: { 'enumBitwiseOr': ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT'] }}},
	  'depthFunc': {1: { 0:true }},
	  'blendFunc': {2: { 0:true, 1:true }},
	  'blendFuncSeparate': {4: { 0:true, 1:true, 2:true, 3:true }},
	  'blendEquation': {1: { 0:true }},
	  'blendEquationSeparate': {2: { 0:true, 1:true }},
	  'stencilFunc': {3: { 0:true }},
	  'stencilFuncSeparate': {4: { 0:true, 1:true }},
	  'stencilMaskSeparate': {2: { 0:true }},
	  'stencilOp': {3: { 0:true, 1:true, 2:true }},
	  'stencilOpSeparate': {4: { 0:true, 1:true, 2:true, 3:true }},
	
	  // Culling
	
	  'cullFace': {1: { 0:true }},
	  'frontFace': {1: { 0:true }},
	
	  // ANGLE_instanced_arrays extension
	
	  'drawArraysInstancedANGLE': {4: { 0:true }},
	  'drawElementsInstancedANGLE': {5: { 0:true, 2:true }},
	
	  // EXT_blend_minmax extension
	
	  'blendEquationEXT': {1: { 0:true }}
	};
	
	/**
	 * Map of numbers to names.
	 * @type {Object}
	 */
	var glEnums = null;
	
	/**
	 * Map of names to numbers.
	 * @type {Object}
	 */
	var enumStringToValue = null;
	
	/**
	 * Initializes this module. Safe to call more than once.
	 * @param {!WebGLRenderingContext} ctx A WebGL context. If
	 *    you have more than one context it doesn't matter which one
	 *    you pass in, it is only used to pull out constants.
	 */
	function init(ctx) {
	  if (glEnums == null) {
	    glEnums = { };
	    enumStringToValue = { };
	    for (var propertyName in ctx) {
	      if (typeof ctx[propertyName] == 'number') {
	        glEnums[ctx[propertyName]] = propertyName;
	        enumStringToValue[propertyName] = ctx[propertyName];
	      }
	    }
	  }
	}
	
	/**
	 * Checks the utils have been initialized.
	 */
	function checkInit() {
	  if (glEnums == null) {
	    throw 'WebGLDebugUtils.init(ctx) not called';
	  }
	}
	
	/**
	 * Returns true or false if value matches any WebGL enum
	 * @param {*} value Value to check if it might be an enum.
	 * @return {boolean} True if value matches one of the WebGL defined enums
	 */
	function mightBeEnum(value) {
	  checkInit();
	  return (glEnums[value] !== undefined);
	}
	
	/**
	 * Gets an string version of an WebGL enum.
	 *
	 * Example:
	 *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
	 *
	 * @param {number} value Value to return an enum for
	 * @return {string} The string version of the enum.
	 */
	function glEnumToString(value) {
	  checkInit();
	  var name = glEnums[value];
	  return (name !== undefined) ? ("gl." + name) :
	      ("/*UNKNOWN WebGL ENUM*/ 0x" + value.toString(16) + "");
	}
	
	/**
	 * Returns the string version of a WebGL argument.
	 * Attempts to convert enum arguments to strings.
	 * @param {string} functionName the name of the WebGL function.
	 * @param {number} numArgs the number of arguments passed to the function.
	 * @param {number} argumentIndx the index of the argument.
	 * @param {*} value The value of the argument.
	 * @return {string} The value as a string.
	 */
	function glFunctionArgToString(functionName, numArgs, argumentIndex, value) {
	  var funcInfo = glValidEnumContexts[functionName];
	  if (funcInfo !== undefined) {
	    var funcInfo = funcInfo[numArgs];
	    if (funcInfo !== undefined) {
	      if (funcInfo[argumentIndex]) {
	        if (typeof funcInfo[argumentIndex] === 'object' &&
	            funcInfo[argumentIndex]['enumBitwiseOr'] !== undefined) {
	          var enums = funcInfo[argumentIndex]['enumBitwiseOr'];
	          var orResult = 0;
	          var orEnums = [];
	          for (var i = 0; i < enums.length; ++i) {
	            var enumValue = enumStringToValue[enums[i]];
	            if ((value & enumValue) !== 0) {
	              orResult |= enumValue;
	              orEnums.push(glEnumToString(enumValue));
	            }
	          }
	          if (orResult === value) {
	            return orEnums.join(' | ');
	          } else {
	            return glEnumToString(value);
	          }
	        } else {
	          return glEnumToString(value);
	        }
	      }
	    }
	  }
	  if (value === null) {
	    return "null";
	  } else if (value === undefined) {
	    return "undefined";
	  } else {
	    return value.toString();
	  }
	}
	
	/**
	 * Converts the arguments of a WebGL function to a string.
	 * Attempts to convert enum arguments to strings.
	 *
	 * @param {string} functionName the name of the WebGL function.
	 * @param {number} args The arguments.
	 * @return {string} The arguments as a string.
	 */
	function glFunctionArgsToString(functionName, args) {
	  // apparently we can't do args.join(",");
	  var argStr = "";
	  var numArgs = args.length;
	  for (var ii = 0; ii < numArgs; ++ii) {
	    argStr += ((ii == 0) ? '' : ', ') +
	        glFunctionArgToString(functionName, numArgs, ii, args[ii]);
	  }
	  return argStr;
	};
	
	
	function makePropertyWrapper(wrapper, original, propertyName) {
	  //log("wrap prop: " + propertyName);
	  wrapper.__defineGetter__(propertyName, function() {
	    return original[propertyName];
	  });
	  // TODO(gmane): this needs to handle properties that take more than
	  // one value?
	  wrapper.__defineSetter__(propertyName, function(value) {
	    //log("set: " + propertyName);
	    original[propertyName] = value;
	  });
	}
	
	// Makes a function that calls a function on another object.
	function makeFunctionWrapper(original, functionName) {
	  //log("wrap fn: " + functionName);
	  var f = original[functionName];
	  return function() {
	    //log("call: " + functionName);
	    var result = f.apply(original, arguments);
	    return result;
	  };
	}
	
	/**
	 * Given a WebGL context returns a wrapped context that calls
	 * gl.getError after every command and calls a function if the
	 * result is not gl.NO_ERROR.
	 *
	 * @param {!WebGLRenderingContext} ctx The webgl context to
	 *        wrap.
	 * @param {!function(err, funcName, args): void} opt_onErrorFunc
	 *        The function to call when gl.getError returns an
	 *        error. If not specified the default function calls
	 *        console.log with a message.
	 * @param {!function(funcName, args): void} opt_onFunc The
	 *        function to call when each webgl function is called.
	 *        You can use this to log all calls for example.
	 * @param {!WebGLRenderingContext} opt_err_ctx The webgl context
	 *        to call getError on if different than ctx.
	 */
	function makeDebugContext(ctx, opt_onErrorFunc, opt_onFunc, opt_err_ctx) {
	  opt_err_ctx = opt_err_ctx || ctx;
	  init(ctx);
	  opt_onErrorFunc = opt_onErrorFunc || function(err, functionName, args) {
	        // apparently we can't do args.join(",");
	        var argStr = "";
	        var numArgs = args.length;
	        for (var ii = 0; ii < numArgs; ++ii) {
	          argStr += ((ii == 0) ? '' : ', ') +
	              glFunctionArgToString(functionName, numArgs, ii, args[ii]);
	        }
	        error("WebGL error "+ glEnumToString(err) + " in "+ functionName +
	              "(" + argStr + ")");
	      };
	
	  // Holds booleans for each GL error so after we get the error ourselves
	  // we can still return it to the client app.
	  var glErrorShadow = { };
	
	  // Makes a function that calls a WebGL function and then calls getError.
	  function makeErrorWrapper(ctx, functionName) {
	    return function() {
	      if (opt_onFunc) {
	        opt_onFunc(functionName, arguments);
	      }
	      var result = ctx[functionName].apply(ctx, arguments);
	      var err = opt_err_ctx.getError();
	      if (err != 0) {
	        glErrorShadow[err] = true;
	        opt_onErrorFunc(err, functionName, arguments);
	      }
	      return result;
	    };
	  }
	
	  // Make a an object that has a copy of every property of the WebGL context
	  // but wraps all functions.
	  var wrapper = {};
	  for (var propertyName in ctx) {
	    if (typeof ctx[propertyName] == 'function') {
	      if (propertyName != 'getExtension') {
	        wrapper[propertyName] = makeErrorWrapper(ctx, propertyName);
	      } else {
	        var wrapped = makeErrorWrapper(ctx, propertyName);
	        wrapper[propertyName] = function () {
	          var result = wrapped.apply(ctx, arguments);
	          return makeDebugContext(result, opt_onErrorFunc, opt_onFunc, opt_err_ctx);
	        };
	      }
	    } else {
	      makePropertyWrapper(wrapper, ctx, propertyName);
	    }
	  }
	
	  // Override the getError function with one that returns our saved results.
	  wrapper.getError = function() {
	    for (var err in glErrorShadow) {
	      if (glErrorShadow.hasOwnProperty(err)) {
	        if (glErrorShadow[err]) {
	          glErrorShadow[err] = false;
	          return err;
	        }
	      }
	    }
	    return ctx.NO_ERROR;
	  };
	
	  return wrapper;
	}
	
	function resetToInitialState(ctx) {
	  var numAttribs = ctx.getParameter(ctx.MAX_VERTEX_ATTRIBS);
	  var tmp = ctx.createBuffer();
	  ctx.bindBuffer(ctx.ARRAY_BUFFER, tmp);
	  for (var ii = 0; ii < numAttribs; ++ii) {
	    ctx.disableVertexAttribArray(ii);
	    ctx.vertexAttribPointer(ii, 4, ctx.FLOAT, false, 0, 0);
	    ctx.vertexAttrib1f(ii, 0);
	  }
	  ctx.deleteBuffer(tmp);
	
	  var numTextureUnits = ctx.getParameter(ctx.MAX_TEXTURE_IMAGE_UNITS);
	  for (var ii = 0; ii < numTextureUnits; ++ii) {
	    ctx.activeTexture(ctx.TEXTURE0 + ii);
	    ctx.bindTexture(ctx.TEXTURE_CUBE_MAP, null);
	    ctx.bindTexture(ctx.TEXTURE_2D, null);
	  }
	
	  ctx.activeTexture(ctx.TEXTURE0);
	  ctx.useProgram(null);
	  ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
	  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null);
	  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
	  ctx.bindRenderbuffer(ctx.RENDERBUFFER, null);
	  ctx.disable(ctx.BLEND);
	  ctx.disable(ctx.CULL_FACE);
	  ctx.disable(ctx.DEPTH_TEST);
	  ctx.disable(ctx.DITHER);
	  ctx.disable(ctx.SCISSOR_TEST);
	  ctx.blendColor(0, 0, 0, 0);
	  ctx.blendEquation(ctx.FUNC_ADD);
	  ctx.blendFunc(ctx.ONE, ctx.ZERO);
	  ctx.clearColor(0, 0, 0, 0);
	  ctx.clearDepth(1);
	  ctx.clearStencil(-1);
	  ctx.colorMask(true, true, true, true);
	  ctx.cullFace(ctx.BACK);
	  ctx.depthFunc(ctx.LESS);
	  ctx.depthMask(true);
	  ctx.depthRange(0, 1);
	  ctx.frontFace(ctx.CCW);
	  ctx.hint(ctx.GENERATE_MIPMAP_HINT, ctx.DONT_CARE);
	  ctx.lineWidth(1);
	  ctx.pixelStorei(ctx.PACK_ALIGNMENT, 4);
	  ctx.pixelStorei(ctx.UNPACK_ALIGNMENT, 4);
	  ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);
	  ctx.pixelStorei(ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	  // TODO: Delete this IF.
	  if (ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL) {
	    ctx.pixelStorei(ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL, ctx.BROWSER_DEFAULT_WEBGL);
	  }
	  ctx.polygonOffset(0, 0);
	  ctx.sampleCoverage(1, false);
	  ctx.scissor(0, 0, ctx.canvas.width, ctx.canvas.height);
	  ctx.stencilFunc(ctx.ALWAYS, 0, 0xFFFFFFFF);
	  ctx.stencilMask(0xFFFFFFFF);
	  ctx.stencilOp(ctx.KEEP, ctx.KEEP, ctx.KEEP);
	  ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
	  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT | ctx.STENCIL_BUFFER_BIT);
	
	  // TODO: This should NOT be needed but Firefox fails with 'hint'
	  while(ctx.getError());
	}
	
	function makeLostContextSimulatingCanvas(canvas) {
	  var unwrappedContext_;
	  var wrappedContext_;
	  var onLost_ = [];
	  var onRestored_ = [];
	  var wrappedContext_ = {};
	  var contextId_ = 1;
	  var contextLost_ = false;
	  var resourceId_ = 0;
	  var resourceDb_ = [];
	  var numCallsToLoseContext_ = 0;
	  var numCalls_ = 0;
	  var canRestore_ = false;
	  var restoreTimeout_ = 0;
	
	  // Holds booleans for each GL error so can simulate errors.
	  var glErrorShadow_ = { };
	
	  canvas.getContext = function(f) {
	    return function() {
	      var ctx = f.apply(canvas, arguments);
	      // Did we get a context and is it a WebGL context?
	      if (ctx instanceof WebGLRenderingContext) {
	        if (ctx != unwrappedContext_) {
	          if (unwrappedContext_) {
	            throw "got different context"
	          }
	          unwrappedContext_ = ctx;
	          wrappedContext_ = makeLostContextSimulatingContext(unwrappedContext_);
	        }
	        return wrappedContext_;
	      }
	      return ctx;
	    }
	  }(canvas.getContext);
	
	  function wrapEvent(listener) {
	    if (typeof(listener) == "function") {
	      return listener;
	    } else {
	      return function(info) {
	        listener.handleEvent(info);
	      }
	    }
	  }
	
	  var addOnContextLostListener = function(listener) {
	    onLost_.push(wrapEvent(listener));
	  };
	
	  var addOnContextRestoredListener = function(listener) {
	    onRestored_.push(wrapEvent(listener));
	  };
	
	
	  function wrapAddEventListener(canvas) {
	    var f = canvas.addEventListener;
	    canvas.addEventListener = function(type, listener, bubble) {
	      switch (type) {
	        case 'webglcontextlost':
	          addOnContextLostListener(listener);
	          break;
	        case 'webglcontextrestored':
	          addOnContextRestoredListener(listener);
	          break;
	        default:
	          f.apply(canvas, arguments);
	      }
	    };
	  }
	
	  wrapAddEventListener(canvas);
	
	  canvas.loseContext = function() {
	    if (!contextLost_) {
	      contextLost_ = true;
	      numCallsToLoseContext_ = 0;
	      ++contextId_;
	      while (unwrappedContext_.getError());
	      clearErrors();
	      glErrorShadow_[unwrappedContext_.CONTEXT_LOST_WEBGL] = true;
	      var event = makeWebGLContextEvent("context lost");
	      var callbacks = onLost_.slice();
	      setTimeout(function() {
	          //log("numCallbacks:" + callbacks.length);
	          for (var ii = 0; ii < callbacks.length; ++ii) {
	            //log("calling callback:" + ii);
	            callbacks[ii](event);
	          }
	          if (restoreTimeout_ >= 0) {
	            setTimeout(function() {
	                canvas.restoreContext();
	              }, restoreTimeout_);
	          }
	        }, 0);
	    }
	  };
	
	  canvas.restoreContext = function() {
	    if (contextLost_) {
	      if (onRestored_.length) {
	        setTimeout(function() {
	            if (!canRestore_) {
	              throw "can not restore. webglcontestlost listener did not call event.preventDefault";
	            }
	            freeResources();
	            resetToInitialState(unwrappedContext_);
	            contextLost_ = false;
	            numCalls_ = 0;
	            canRestore_ = false;
	            var callbacks = onRestored_.slice();
	            var event = makeWebGLContextEvent("context restored");
	            for (var ii = 0; ii < callbacks.length; ++ii) {
	              callbacks[ii](event);
	            }
	          }, 0);
	      }
	    }
	  };
	
	  canvas.loseContextInNCalls = function(numCalls) {
	    if (contextLost_) {
	      throw "You can not ask a lost contet to be lost";
	    }
	    numCallsToLoseContext_ = numCalls_ + numCalls;
	  };
	
	  canvas.getNumCalls = function() {
	    return numCalls_;
	  };
	
	  canvas.setRestoreTimeout = function(timeout) {
	    restoreTimeout_ = timeout;
	  };
	
	  function isWebGLObject(obj) {
	    //return false;
	    return (obj instanceof WebGLBuffer ||
	            obj instanceof WebGLFramebuffer ||
	            obj instanceof WebGLProgram ||
	            obj instanceof WebGLRenderbuffer ||
	            obj instanceof WebGLShader ||
	            obj instanceof WebGLTexture);
	  }
	
	  function checkResources(args) {
	    for (var ii = 0; ii < args.length; ++ii) {
	      var arg = args[ii];
	      if (isWebGLObject(arg)) {
	        return arg.__webglDebugContextLostId__ == contextId_;
	      }
	    }
	    return true;
	  }
	
	  function clearErrors() {
	    var k = Object.keys(glErrorShadow_);
	    for (var ii = 0; ii < k.length; ++ii) {
	      delete glErrorShadow_[k];
	    }
	  }
	
	  function loseContextIfTime() {
	    ++numCalls_;
	    if (!contextLost_) {
	      if (numCallsToLoseContext_ == numCalls_) {
	        canvas.loseContext();
	      }
	    }
	  }
	
	  // Makes a function that simulates WebGL when out of context.
	  function makeLostContextFunctionWrapper(ctx, functionName) {
	    var f = ctx[functionName];
	    return function() {
	      // log("calling:" + functionName);
	      // Only call the functions if the context is not lost.
	      loseContextIfTime();
	      if (!contextLost_) {
	        //if (!checkResources(arguments)) {
	        //  glErrorShadow_[wrappedContext_.INVALID_OPERATION] = true;
	        //  return;
	        //}
	        var result = f.apply(ctx, arguments);
	        return result;
	      }
	    };
	  }
	
	  function freeResources() {
	    for (var ii = 0; ii < resourceDb_.length; ++ii) {
	      var resource = resourceDb_[ii];
	      if (resource instanceof WebGLBuffer) {
	        unwrappedContext_.deleteBuffer(resource);
	      } else if (resource instanceof WebGLFramebuffer) {
	        unwrappedContext_.deleteFramebuffer(resource);
	      } else if (resource instanceof WebGLProgram) {
	        unwrappedContext_.deleteProgram(resource);
	      } else if (resource instanceof WebGLRenderbuffer) {
	        unwrappedContext_.deleteRenderbuffer(resource);
	      } else if (resource instanceof WebGLShader) {
	        unwrappedContext_.deleteShader(resource);
	      } else if (resource instanceof WebGLTexture) {
	        unwrappedContext_.deleteTexture(resource);
	      }
	    }
	  }
	
	  function makeWebGLContextEvent(statusMessage) {
	    return {
	      statusMessage: statusMessage,
	      preventDefault: function() {
	          canRestore_ = true;
	        }
	    };
	  }
	
	  return canvas;
	
	  function makeLostContextSimulatingContext(ctx) {
	    // copy all functions and properties to wrapper
	    for (var propertyName in ctx) {
	      if (typeof ctx[propertyName] == 'function') {
	         wrappedContext_[propertyName] = makeLostContextFunctionWrapper(
	             ctx, propertyName);
	       } else {
	         makePropertyWrapper(wrappedContext_, ctx, propertyName);
	       }
	    }
	
	    // Wrap a few functions specially.
	    wrappedContext_.getError = function() {
	      loseContextIfTime();
	      if (!contextLost_) {
	        var err;
	        while (err = unwrappedContext_.getError()) {
	          glErrorShadow_[err] = true;
	        }
	      }
	      for (var err in glErrorShadow_) {
	        if (glErrorShadow_[err]) {
	          delete glErrorShadow_[err];
	          return err;
	        }
	      }
	      return wrappedContext_.NO_ERROR;
	    };
	
	    var creationFunctions = [
	      "createBuffer",
	      "createFramebuffer",
	      "createProgram",
	      "createRenderbuffer",
	      "createShader",
	      "createTexture"
	    ];
	    for (var ii = 0; ii < creationFunctions.length; ++ii) {
	      var functionName = creationFunctions[ii];
	      wrappedContext_[functionName] = function(f) {
	        return function() {
	          loseContextIfTime();
	          if (contextLost_) {
	            return null;
	          }
	          var obj = f.apply(ctx, arguments);
	          obj.__webglDebugContextLostId__ = contextId_;
	          resourceDb_.push(obj);
	          return obj;
	        };
	      }(ctx[functionName]);
	    }
	
	    var functionsThatShouldReturnNull = [
	      "getActiveAttrib",
	      "getActiveUniform",
	      "getBufferParameter",
	      "getContextAttributes",
	      "getAttachedShaders",
	      "getFramebufferAttachmentParameter",
	      "getParameter",
	      "getProgramParameter",
	      "getProgramInfoLog",
	      "getRenderbufferParameter",
	      "getShaderParameter",
	      "getShaderInfoLog",
	      "getShaderSource",
	      "getTexParameter",
	      "getUniform",
	      "getUniformLocation",
	      "getVertexAttrib"
	    ];
	    for (var ii = 0; ii < functionsThatShouldReturnNull.length; ++ii) {
	      var functionName = functionsThatShouldReturnNull[ii];
	      wrappedContext_[functionName] = function(f) {
	        return function() {
	          loseContextIfTime();
	          if (contextLost_) {
	            return null;
	          }
	          return f.apply(ctx, arguments);
	        }
	      }(wrappedContext_[functionName]);
	    }
	
	    var isFunctions = [
	      "isBuffer",
	      "isEnabled",
	      "isFramebuffer",
	      "isProgram",
	      "isRenderbuffer",
	      "isShader",
	      "isTexture"
	    ];
	    for (var ii = 0; ii < isFunctions.length; ++ii) {
	      var functionName = isFunctions[ii];
	      wrappedContext_[functionName] = function(f) {
	        return function() {
	          loseContextIfTime();
	          if (contextLost_) {
	            return false;
	          }
	          return f.apply(ctx, arguments);
	        }
	      }(wrappedContext_[functionName]);
	    }
	
	    wrappedContext_.checkFramebufferStatus = function(f) {
	      return function() {
	        loseContextIfTime();
	        if (contextLost_) {
	          return wrappedContext_.FRAMEBUFFER_UNSUPPORTED;
	        }
	        return f.apply(ctx, arguments);
	      };
	    }(wrappedContext_.checkFramebufferStatus);
	
	    wrappedContext_.getAttribLocation = function(f) {
	      return function() {
	        loseContextIfTime();
	        if (contextLost_) {
	          return -1;
	        }
	        return f.apply(ctx, arguments);
	      };
	    }(wrappedContext_.getAttribLocation);
	
	    wrappedContext_.getVertexAttribOffset = function(f) {
	      return function() {
	        loseContextIfTime();
	        if (contextLost_) {
	          return 0;
	        }
	        return f.apply(ctx, arguments);
	      };
	    }(wrappedContext_.getVertexAttribOffset);
	
	    wrappedContext_.isContextLost = function() {
	      return contextLost_;
	    };
	
	    return wrappedContext_;
	  }
	}
	
	return {
	  /**
	   * Initializes this module. Safe to call more than once.
	   * @param {!WebGLRenderingContext} ctx A WebGL context. If
	   *    you have more than one context it doesn't matter which one
	   *    you pass in, it is only used to pull out constants.
	   */
	  'init': init,
	
	  /**
	   * Returns true or false if value matches any WebGL enum
	   * @param {*} value Value to check if it might be an enum.
	   * @return {boolean} True if value matches one of the WebGL defined enums
	   */
	  'mightBeEnum': mightBeEnum,
	
	  /**
	   * Gets an string version of an WebGL enum.
	   *
	   * Example:
	   *   WebGLDebugUtil.init(ctx);
	   *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
	   *
	   * @param {number} value Value to return an enum for
	   * @return {string} The string version of the enum.
	   */
	  'glEnumToString': glEnumToString,
	
	  /**
	   * Converts the argument of a WebGL function to a string.
	   * Attempts to convert enum arguments to strings.
	   *
	   * Example:
	   *   WebGLDebugUtil.init(ctx);
	   *   var str = WebGLDebugUtil.glFunctionArgToString('bindTexture', 2, 0, gl.TEXTURE_2D);
	   *
	   * would return 'TEXTURE_2D'
	   *
	   * @param {string} functionName the name of the WebGL function.
	   * @param {number} numArgs The number of arguments
	   * @param {number} argumentIndx the index of the argument.
	   * @param {*} value The value of the argument.
	   * @return {string} The value as a string.
	   */
	  'glFunctionArgToString': glFunctionArgToString,
	
	  /**
	   * Converts the arguments of a WebGL function to a string.
	   * Attempts to convert enum arguments to strings.
	   *
	   * @param {string} functionName the name of the WebGL function.
	   * @param {number} args The arguments.
	   * @return {string} The arguments as a string.
	   */
	  'glFunctionArgsToString': glFunctionArgsToString,
	
	  /**
	   * Given a WebGL context returns a wrapped context that calls
	   * gl.getError after every command and calls a function if the
	   * result is not NO_ERROR.
	   *
	   * You can supply your own function if you want. For example, if you'd like
	   * an exception thrown on any GL error you could do this
	   *
	   *    function throwOnGLError(err, funcName, args) {
	   *      throw WebGLDebugUtils.glEnumToString(err) +
	   *            " was caused by call to " + funcName;
	   *    };
	   *
	   *    ctx = WebGLDebugUtils.makeDebugContext(
	   *        canvas.getContext("webgl"), throwOnGLError);
	   *
	   * @param {!WebGLRenderingContext} ctx The webgl context to wrap.
	   * @param {!function(err, funcName, args): void} opt_onErrorFunc The function
	   *     to call when gl.getError returns an error. If not specified the default
	   *     function calls console.log with a message.
	   * @param {!function(funcName, args): void} opt_onFunc The
	   *     function to call when each webgl function is called. You
	   *     can use this to log all calls for example.
	   */
	  'makeDebugContext': makeDebugContext,
	
	  /**
	   * Given a canvas element returns a wrapped canvas element that will
	   * simulate lost context. The canvas returned adds the following functions.
	   *
	   * loseContext:
	   *   simulates a lost context event.
	   *
	   * restoreContext:
	   *   simulates the context being restored.
	   *
	   * lostContextInNCalls:
	   *   loses the context after N gl calls.
	   *
	   * getNumCalls:
	   *   tells you how many gl calls there have been so far.
	   *
	   * setRestoreTimeout:
	   *   sets the number of milliseconds until the context is restored
	   *   after it has been lost. Defaults to 0. Pass -1 to prevent
	   *   automatic restoring.
	   *
	   * @param {!Canvas} canvas The canvas element to wrap.
	   */
	  'makeLostContextSimulatingCanvas': makeLostContextSimulatingCanvas,
	
	  /**
	   * Resets a context to the initial state.
	   * @param {!WebGLRenderingContext} ctx The webgl context to
	   *     reset.
	   */
	  'resetToInitialState': resetToInitialState
	};
	
	}();
	
	exports.WebGLDebugUtils = WebGLDebugUtils;


/***/ },
/* 5 */
/***/ function(module, exports) {

	var Attribute = function(attribInfo, program) {
	    this.size = attribInfo.size;
	    this.type = attribInfo.type;
	    this.name = attribInfo.name;
	    this.location = gl.getAttribLocation(program, this.name);
	    this.createFunctionHashes();
	    this.createSizeHash();
	};
	
	Attribute.prototype.createFunctionHashes = function() {
	    this.floatFunctions = {};
	    this.floatFunctions[gl.FLOAT] = gl.vertexAttrib1fv;
	    this.floatFunctions[gl.FLOAT_VEC2] = gl.vertexAttrib2fv;
	    this.floatFunctions[gl.FLOAT_VEC3] = gl.vertexAttrib3fv;
	    this.floatFunctions[gl.FLOAT_VEC4] = gl.vertexAttrib4fv;
	
	    this.matrixFunctions = {};
	    this.matrixFunctions[gl.FLOAT_MAT2] = gl.vertexAttrib2fv;
	    this.matrixFunctions[gl.FLOAT_MAT3] = gl.vertexAttrib3fv;
	    this.matrixFunctions[gl.FLOAT_MAT4] = gl.vertexAttrib4fv;
	};
	
	Attribute.prototype.createSizeHash = function() {
	    this.sizes = {};
	    this.sizes[gl.FLOAT] = 1;
	    this.sizes[gl.FLOAT_VEC2] = 2;
	    this.sizes[gl.FLOAT_VEC3] = 3;
	    this.sizes[gl.FLOAT_VEC4] = 4;
	    this.sizes[gl.FLOAT_MAT2] = 4;
	    this.sizes[gl.FLOAT_MAT3] = 9;
	    this.sizes[gl.FLOAT_MAT4] = 16;
	};
	
	Attribute.prototype.setValue = function(value) {
	    if (typeof value == 'number') {
	        value = [value];
	    }
	    if (this.floatFunctions[this.type]) {
	        this.setFloat(value);
	    }
	    else if (this.matrixFunctions[this.type]) {
	        this.setMatrix(value);
	    }
	};
	
	Attribute.prototype.setFloat = function(value) {
	    this.floatFunctions[this.type].apply(gl, [this.location, value]);
	};
	
	Attribute.prototype.setMatrix = function(value) {
	    this.matrixFunctions[this.type].apply(gl, [this.location, value]);
	};
	
	Attribute.prototype.setPointer = function() {
	    gl.enableVertexAttribArray(this.location);
	    gl.vertexAttribPointer(this.location, this.sizes[this.type],
	                           gl.FLOAT, false, 0, 0);
	};
	
	exports.Attribute = Attribute;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var ShaderProgram = __webpack_require__(7).ShaderProgram;
	
	var BasicRenderer = function(vertexShader, fragmentShader) {
	    this.shaderProgram = new ShaderProgram();
	    this.shaderProgram.addShader(vertexShader, gl.VERTEX_SHADER);
	    this.shaderProgram.addShader(fragmentShader, gl.FRAGMENT_SHADER);
	    this.shaderProgram.use();
	};
	
	BasicRenderer.prototype.render = function(mesh, offset, numberOfVertices) {
	    this.shaderProgram.use();
	    mesh.associate(this.shaderProgram);
	    mesh.render(offset, numberOfVertices);
	};
	
	BasicRenderer.prototype.setUniform = function(name, value) {
	    this.shaderProgram.setUniform(name, value);
	};
	
	exports.BasicRenderer = BasicRenderer;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var Shader = __webpack_require__(8).Shader;
	var Attribute = __webpack_require__(5).Attribute;
	var Uniform = __webpack_require__(9).Uniform;
	
	var ShaderProgram = function() {
	    this.id = ShaderProgram.id;
	    ShaderProgram.id += 1;
	
	    this.program = null;
	    this.shaders = [];
	    this.uniforms = {};
	    this.attributes = {};
	    this.needRecompile = true;
	};
	
	ShaderProgram.id = 0;
	
	ShaderProgram.prototype.addShader = function(source, type) {
	    var shader = new Shader(source, type);
	    this.shaders.push(shader);
	    this.needRecompile = true;
	    return shader;
	};
	
	ShaderProgram.prototype.removeShader = function(shader) {
	    var index = this.shaders.indexOf(shader);
	    if (index != -1) {
	        this.shaders.splice(index, 1);
	    }
	    this.needRecompile = true;
	};
	
	ShaderProgram.prototype.createProgram = function() {
	    this.program = gl.createProgram();
	};
	
	ShaderProgram.prototype.deleteProgram = function() {
	    gl.deleteProgram(this.program);
	};
	
	ShaderProgram.prototype.attachShaders = function() {
	    for (var i = 0; i < this.shaders.length; i++) {
	        var shader = this.shaders[i];
	        gl.attachShader(this.program, shader.getShader());
	    }
	};
	
	ShaderProgram.prototype.getAttributes = function() {
	    var numAttributes = gl.getProgramParameter(this.program,
	                                               gl.ACTIVE_ATTRIBUTES);
	    console.log('Program %d has %d active attributes', this.id,
	                numAttributes);
	    for (var i = 0; i < numAttributes; i++) {
	        var attributeInfo = gl.getActiveAttrib(this.program, i);
	        var attribute = new Attribute(attributeInfo, this.program);
	        this.attributes[attribute.name] = attribute;
	        console.log('Attribute %d: %s', i, attribute.name);
	    }
	};
	
	ShaderProgram.prototype.getUniforms = function() {
	    var numUniforms = gl.getProgramParameter(this.program,
	                                             gl.ACTIVE_UNIFORMS);
	    console.log('Program %d has %d active uniforms', this.id,
	                numUniforms);
	    for (var i = 0; i < numUniforms; i++) {
	        var uniformInfo = gl.getActiveUniform(this.program, i);
	        var uniform = new Uniform(uniformInfo, this.program);
	        this.uniforms[uniform.name] = uniform;
	        console.log('Uniform %d: %s', i, uniform.name);
	    }
	};
	
	ShaderProgram.prototype.linkProgram = function() {
	    gl.linkProgram(this.program);
	    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
	        console.error('Could not link shader program, %i', this.program);
	        return false;
	    }
	    return true;
	};
	
	ShaderProgram.prototype.useProgram = function() {
	    gl.useProgram(this.program);
	};
	
	ShaderProgram.prototype.use = function() {
	    if (this.needRecompile ||
	        ShaderProgram.activeProgram != this.program) {
	        if (this.needRecompile) {
	            if (this.program !== null) {
	                this.deleteProgram();
	            }
	            this.createProgram();
	            this.attachShaders();
	            this.linkProgram();
	            this.getAttributes();
	            this.getUniforms();
	            this.needRecompile = false;
	        }
	        this.useProgram();
	        ShaderProgram.activeProgram = this.program;
	    }
	};
	
	ShaderProgram.prototype.getUniform = function(name) {
	    return this.uniforms[name];
	};
	
	ShaderProgram.prototype.setUniform = function(name, value) {
	    this.use();
	    this.uniforms[name].setValue(value);
	};
	
	ShaderProgram.prototype.getAttribute = function(name) {
	    return this.attributes[name];
	};
	
	ShaderProgram.prototype.setAttribute = function(name, value) {
	    this.use();
	    this.attributes[name].setValue(value);
	};
	
	ShaderProgram.activeProgram = null;
	
	exports.ShaderProgram = ShaderProgram;


/***/ },
/* 8 */
/***/ function(module, exports) {

	var Shader = function(source, type) {
	    this.source = source;
	    this.type = type;
	
	    this.shader = gl.createShader(this.type);
	
	    gl.shaderSource(this.shader, this.source);
	    gl.compileShader(this.shader);
	
	    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
	        console.error('Could not compile shader ', this.name, '\n',
	                      gl.getShaderInfoLog(this.shader));
	    }
	};
	
	Shader.prototype.getShader = function() {
	    return (this.shader);
	};
	
	exports.Shader = Shader;


/***/ },
/* 9 */
/***/ function(module, exports) {

	var Uniform = function(uniformInfo, program) {
	    this.size = uniformInfo.size;
	    this.type = uniformInfo.type;
	    this.name = uniformInfo.name;
	    this.location = gl.getUniformLocation(program, this.name);
	    this.createFunctionHashes();
	};
	
	Uniform.prototype.createFunctionHashes = function() {
	    this.floatFunctions = {};
	    this.floatFunctions[gl.FLOAT] = gl.uniform1fv;
	    this.floatFunctions[gl.FLOAT_VEC2] = gl.uniform2fv;
	    this.floatFunctions[gl.FLOAT_VEC3] = gl.uniform3fv;
	    this.floatFunctions[gl.FLOAT_VEC4] = gl.uniform4fv;
	
	    this.intFunctions = {};
	    this.intFunctions[gl.INT] = gl.uniform1iv;
	    this.intFunctions[gl.INT_VEC2] = gl.uniform2iv;
	    this.intFunctions[gl.INT_VEC3] = gl.uniform3iv;
	    this.intFunctions[gl.INT_VEC4] = gl.uniform4iv;
	
	    this.boolFunctions = {};
	    this.boolFunctions[gl.BOOL] = gl.uniform1iv;
	    this.boolFunctions[gl.BOOL_VEC2] = gl.uniform2iv;
	    this.boolFunctions[gl.BOOL_VEC3] = gl.uniform3iv;
	    this.boolFunctions[gl.BOOL_VEC4] = gl.unform4iv;
	
	    this.matrixFunctions = {};
	    this.matrixFunctions[gl.FLOAT_MAT2] = gl.uniformMatrix2fv;
	    this.matrixFunctions[gl.FLOAT_MAT3] = gl.uniformMatrix3fv;
	    this.matrixFunctions[gl.FLOAT_MAT4] = gl.uniformMatrix4fv;
	
	    this.samplerFunctions = {};
	    this.samplerFunctions[gl.SAMPLER_2D] = gl.uniform1iv;
	    this.samplerFunctions[gl.SAMPLER_CUBE] = gl.uniform1iv;
	};
	
	Uniform.prototype.setValue = function(value) {
	    if (typeof value == 'number') {
	        value = [value];
	    }
	    if (this.floatFunctions[this.type]) {
	        this.setFloat(value);
	    }
	    else if (this.intFunctions[this.type]) {
	        this.setInt(value);
	    }
	    else if (this.boolFunctions[this.type]) {
	        this.setBool(value);
	    }
	    else if (this.matrixFunctions[this.type]) {
	        this.setMatrix(value);
	    }
	    else if (this.samplerFunctions[this.type]) {
	        this.setSampler(value);
	    }
	};
	
	Uniform.prototype.setFloat = function(value) {
	    this.floatFunctions[this.type].apply(gl, [this.location, value]);
	};
	
	Uniform.prototype.setInt = function(value) {
	    this.intFunctions[this.type].apply(gl, [this.location, value]);
	};
	
	Uniform.prototype.setBool = function(value) {
	    this.boolFunctions[this.type].apply(gl, [this.location, value]);
	};
	
	Uniform.prototype.setMatrix = function(value) {
	    this.matrixFunctions[this.type].apply(gl, [this.location, false,
	                                               value]);
	};
	
	Uniform.prototype.setSampler = function(value) {
	    this.samplerFunctions[this.type].apply(gl, [this.location, value]);
	};
	
	exports.Uniform = Uniform;


/***/ },
/* 10 */
/***/ function(module, exports) {

	var Buffer = function(numVertices, itemSize, usage) {
	    this.numVertices = numVertices;
	    this.itemSize = itemSize;
	    this.usage = usage;
	    // Set up the buffer with no data
	    this.buffer = gl.createBuffer();
	    this.null();
	    this.array = new Float32Array(numVertices * itemSize);
	};
	
	Buffer.prototype.getBuffer = function() {
	    return this.buffer;
	};
	
	Buffer.prototype.null = function() {
	    this.bind();
	    // Num vertices multiplied by 4, which is size (bytes) of Float32
	    gl.bufferData(gl.ARRAY_BUFFER,
	                  this.numVertices * this.itemSize * 4,
	                  this.usage);
	};
	
	Buffer.prototype.setValues = function(values, offset, length) {
	    offset = offset || 0;
	    if (length === undefined) {
	        if (values) {
	            length = values.length;
	        }
	        else {
	            length = this.array.length;
	        }
	    }
	
	    if (length == 0) {
	        return;
	    }
	
	    var array = this.array.subarray(offset, length);
	    if (values) {
	        array.set(values);
	    }
	    this.bind();
	    gl.bufferSubData(gl.ARRAY_BUFFER, 0, array);
	};
	
	Buffer.prototype.bind = function() {
	    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
	};
	
	Buffer.prototype.unbind = function() {
	    gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};
	
	Buffer.prototype.associate = function(attribute) {
	    this.bind();
	    attribute.setPointer();
	    this.unbind();
	};
	
	exports.Buffer = Buffer;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var Texture = __webpack_require__(12).Texture;
	
	var Framebuffer = function(width, height) {
	    this.width = width;
	    this.height = height;
	
	    this.framebuffer = gl.createFramebuffer();
	
	    this.begin();
	
	    // Add depth buffer
	    this.depthBuffer = gl.createRenderbuffer();
	    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
	    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width,
	                           height);
	    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
	                               gl.RENDERBUFFER, this.depthBuffer);
	    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	
	    this.end();
	
	    // Add texture for color
	    this.texture = new Texture(width, height);
	    this.attachTexture(this.texture);
	
	    this.begin();
	    // Check it all worked
	    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !=
	        gl.FRAMEBUFFER_COMPLETE) {
	        console.error('Could not create framebuffer - error ',
	                      gl.checkFramebufferStatus(gl.FRAMEBUFFER));
	    }
	    this.end();
	};
	
	Framebuffer.prototype.begin = function(storedViewport) {
	    if (storedViewport) {
	        this.pushViewport(storedViewport);
	    }
	    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
	};
	
	Framebuffer.prototype.end = function() {
	    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	    if (this.storedViewport) {
	        this.popViewport();
	    }
	};
	
	Framebuffer.prototype.attachTexture = function(texture) {
	    this.texture = texture;
	    this.begin();
	    this.texture.begin();
	    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
	                            gl.TEXTURE_2D, this.texture.getTexture(),
	                            0);
	    this.texture.end();
	    this.end();
	};
	
	Framebuffer.prototype.clear = function(color) {
	    this.begin();
	    gl.clearColor(color[0], color[1], color[2], color[3]);
	    gl.clear(gl.COLOR_BUFFER_BIT);
	    this.end();
	};
	
	Framebuffer.prototype.pushViewport = function(storedViewport) {
	    this.storedViewport = storedViewport;
	    gl.viewport(0, 0, this.width, this.height);
	};
	
	Framebuffer.prototype.popViewport = function() {
	    gl.viewport(this.storedViewport[0], this.storedViewport[1],
	                this.storedViewport[2], this.storedViewport[3]);
	    this.storedViewport = null;
	};
	
	exports.Framebuffer = Framebuffer;


/***/ },
/* 12 */
/***/ function(module, exports) {

	var Texture = function(width, height) {
	    this.texture = gl.createTexture();
	    this.flipped = false;
	    this.bind();
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA,
	                  gl.UNSIGNED_BYTE, null);
	    this.end();
	};
	
	Texture.prototype.begin = function(textureUnit) {
	    if (!textureUnit) {
	        textureUnit = 0;
	    }
	    gl.activeTexture(gl.TEXTURE0 + textureUnit);
	    this.bind();
	};
	
	Texture.prototype.bind = function() {
	    gl.bindTexture(gl.TEXTURE_2D, this.texture);
	};
	
	Texture.prototype.end = function() {
	    gl.bindTexture(gl.TEXTURE_2D, null);
	};
	
	Texture.prototype.getTexture = function() {
	    return this.texture;
	};
	
	Texture.prototype.flipY = function() {
	    if (!this.flipped) {
	        this.bind();
	        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	        this.end();
	        this.flipped = true;
	    }
	};
	
	Texture.prototype.loadFromFile = function(filename) {
	    var image = new Image();
	    image.src = filename;
	    image.onload = this.loadFromExisting.bind(this, image);
	};
	
	Texture.prototype.loadFromExisting = function(image) {
	    this.image = image;
	    this.flipY();
	    this.bind();
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
	                  this.image);
	    this.end();
	};
	
	exports.Texture = Texture;
	


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var Framebuffer = __webpack_require__(11).Framebuffer;
	var BasicRenderer = __webpack_require__(6).BasicRenderer;
	
	var FramebufferRenderer = function(width, height,
	                                   vertexShader, fragmentShader) {
	    BasicRenderer.call(this, vertexShader, fragmentShader);
	    this.framebuffer = new Framebuffer(width, height);
	};
	FramebufferRenderer.prototype = Object.create(BasicRenderer.prototype);
	FramebufferRenderer.prototype.constructor = FramebufferRenderer;
	
	FramebufferRenderer.prototype.render = function(mesh, offset, numberOfVertices,
	                                                storedViewport) {
	    this.shaderProgram.use();
	    mesh.associate(this.shaderProgram);
	    this.framebuffer.begin(storedViewport);
	    mesh.render(offset, numberOfVertices);
	    this.framebuffer.end();
	};
	
	exports.FramebufferRenderer = FramebufferRenderer;


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var mat4 = __webpack_require__(15).mat4;
	
	var MatrixStack = function() {
	    this.stack = [];
	    this.matrix = mat4.create();
	    mat4.identity(this.matrix);
	};
	
	MatrixStack.prototype.pushMatrix = function() {
	    var newMatrix = mat4.clone(this.matrix);
	    this.stack.push(newMatrix);
	};
	
	MatrixStack.prototype.popMatrix = function() {
	    if (this.stack.length > 0) {
	        this.matrix = this.stack.pop();
	    }
	};
	
	exports.MatrixStack = MatrixStack;


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @fileoverview gl-matrix - High performance matrix and vector operations
	 * @author Brandon Jones
	 * @author Colin MacKenzie IV
	 * @version 2.3.0
	 */
	
	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	// END HEADER
	
	exports.glMatrix = __webpack_require__(16);
	exports.mat2 = __webpack_require__(17);
	exports.mat2d = __webpack_require__(18);
	exports.mat3 = __webpack_require__(19);
	exports.mat4 = __webpack_require__(20);
	exports.quat = __webpack_require__(21);
	exports.vec2 = __webpack_require__(24);
	exports.vec3 = __webpack_require__(22);
	exports.vec4 = __webpack_require__(23);

/***/ },
/* 16 */
/***/ function(module, exports) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	/**
	 * @class Common utilities
	 * @name glMatrix
	 */
	var glMatrix = {};
	
	// Constants
	glMatrix.EPSILON = 0.000001;
	glMatrix.ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
	glMatrix.RANDOM = Math.random;
	
	/**
	 * Sets the type of array used when creating new vectors and matrices
	 *
	 * @param {Type} type Array type, such as Float32Array or Array
	 */
	glMatrix.setMatrixArrayType = function(type) {
	    GLMAT_ARRAY_TYPE = type;
	}
	
	var degree = Math.PI / 180;
	
	/**
	* Convert Degree To Radian
	*
	* @param {Number} Angle in Degrees
	*/
	glMatrix.toRadian = function(a){
	     return a * degree;
	}
	
	module.exports = glMatrix;


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	var glMatrix = __webpack_require__(16);
	
	/**
	 * @class 2x2 Matrix
	 * @name mat2
	 */
	var mat2 = {};
	
	/**
	 * Creates a new identity mat2
	 *
	 * @returns {mat2} a new 2x2 matrix
	 */
	mat2.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    return out;
	};
	
	/**
	 * Creates a new mat2 initialized with values from an existing matrix
	 *
	 * @param {mat2} a matrix to clone
	 * @returns {mat2} a new 2x2 matrix
	 */
	mat2.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    return out;
	};
	
	/**
	 * Copy the values from one mat2 to another
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the source matrix
	 * @returns {mat2} out
	 */
	mat2.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    return out;
	};
	
	/**
	 * Set a mat2 to the identity matrix
	 *
	 * @param {mat2} out the receiving matrix
	 * @returns {mat2} out
	 */
	mat2.identity = function(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    return out;
	};
	
	/**
	 * Transpose the values of a mat2
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the source matrix
	 * @returns {mat2} out
	 */
	mat2.transpose = function(out, a) {
	    // If we are transposing ourselves we can skip a few steps but have to cache some values
	    if (out === a) {
	        var a1 = a[1];
	        out[1] = a[2];
	        out[2] = a1;
	    } else {
	        out[0] = a[0];
	        out[1] = a[2];
	        out[2] = a[1];
	        out[3] = a[3];
	    }
	    
	    return out;
	};
	
	/**
	 * Inverts a mat2
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the source matrix
	 * @returns {mat2} out
	 */
	mat2.invert = function(out, a) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
	
	        // Calculate the determinant
	        det = a0 * a3 - a2 * a1;
	
	    if (!det) {
	        return null;
	    }
	    det = 1.0 / det;
	    
	    out[0] =  a3 * det;
	    out[1] = -a1 * det;
	    out[2] = -a2 * det;
	    out[3] =  a0 * det;
	
	    return out;
	};
	
	/**
	 * Calculates the adjugate of a mat2
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the source matrix
	 * @returns {mat2} out
	 */
	mat2.adjoint = function(out, a) {
	    // Caching this value is nessecary if out == a
	    var a0 = a[0];
	    out[0] =  a[3];
	    out[1] = -a[1];
	    out[2] = -a[2];
	    out[3] =  a0;
	
	    return out;
	};
	
	/**
	 * Calculates the determinant of a mat2
	 *
	 * @param {mat2} a the source matrix
	 * @returns {Number} determinant of a
	 */
	mat2.determinant = function (a) {
	    return a[0] * a[3] - a[2] * a[1];
	};
	
	/**
	 * Multiplies two mat2's
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the first operand
	 * @param {mat2} b the second operand
	 * @returns {mat2} out
	 */
	mat2.multiply = function (out, a, b) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
	    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
	    out[0] = a0 * b0 + a2 * b1;
	    out[1] = a1 * b0 + a3 * b1;
	    out[2] = a0 * b2 + a2 * b3;
	    out[3] = a1 * b2 + a3 * b3;
	    return out;
	};
	
	/**
	 * Alias for {@link mat2.multiply}
	 * @function
	 */
	mat2.mul = mat2.multiply;
	
	/**
	 * Rotates a mat2 by the given angle
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat2} out
	 */
	mat2.rotate = function (out, a, rad) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
	        s = Math.sin(rad),
	        c = Math.cos(rad);
	    out[0] = a0 *  c + a2 * s;
	    out[1] = a1 *  c + a3 * s;
	    out[2] = a0 * -s + a2 * c;
	    out[3] = a1 * -s + a3 * c;
	    return out;
	};
	
	/**
	 * Scales the mat2 by the dimensions in the given vec2
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the matrix to rotate
	 * @param {vec2} v the vec2 to scale the matrix by
	 * @returns {mat2} out
	 **/
	mat2.scale = function(out, a, v) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
	        v0 = v[0], v1 = v[1];
	    out[0] = a0 * v0;
	    out[1] = a1 * v0;
	    out[2] = a2 * v1;
	    out[3] = a3 * v1;
	    return out;
	};
	
	/**
	 * Creates a matrix from a given angle
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2.identity(dest);
	 *     mat2.rotate(dest, dest, rad);
	 *
	 * @param {mat2} out mat2 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat2} out
	 */
	mat2.fromRotation = function(out, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad);
	    out[0] = c;
	    out[1] = s;
	    out[2] = -s;
	    out[3] = c;
	    return out;
	}
	
	/**
	 * Creates a matrix from a vector scaling
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2.identity(dest);
	 *     mat2.scale(dest, dest, vec);
	 *
	 * @param {mat2} out mat2 receiving operation result
	 * @param {vec2} v Scaling vector
	 * @returns {mat2} out
	 */
	mat2.fromScaling = function(out, v) {
	    out[0] = v[0];
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = v[1];
	    return out;
	}
	
	/**
	 * Returns a string representation of a mat2
	 *
	 * @param {mat2} mat matrix to represent as a string
	 * @returns {String} string representation of the matrix
	 */
	mat2.str = function (a) {
	    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
	};
	
	/**
	 * Returns Frobenius norm of a mat2
	 *
	 * @param {mat2} a the matrix to calculate Frobenius norm of
	 * @returns {Number} Frobenius norm
	 */
	mat2.frob = function (a) {
	    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
	};
	
	/**
	 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
	 * @param {mat2} L the lower triangular matrix 
	 * @param {mat2} D the diagonal matrix 
	 * @param {mat2} U the upper triangular matrix 
	 * @param {mat2} a the input matrix to factorize
	 */
	
	mat2.LDU = function (L, D, U, a) { 
	    L[2] = a[2]/a[0]; 
	    U[0] = a[0]; 
	    U[1] = a[1]; 
	    U[3] = a[3] - L[2] * U[1]; 
	    return [L, D, U];       
	}; 
	
	
	module.exports = mat2;


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	var glMatrix = __webpack_require__(16);
	
	/**
	 * @class 2x3 Matrix
	 * @name mat2d
	 * 
	 * @description 
	 * A mat2d contains six elements defined as:
	 * <pre>
	 * [a, c, tx,
	 *  b, d, ty]
	 * </pre>
	 * This is a short form for the 3x3 matrix:
	 * <pre>
	 * [a, c, tx,
	 *  b, d, ty,
	 *  0, 0, 1]
	 * </pre>
	 * The last row is ignored so the array is shorter and operations are faster.
	 */
	var mat2d = {};
	
	/**
	 * Creates a new identity mat2d
	 *
	 * @returns {mat2d} a new 2x3 matrix
	 */
	mat2d.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(6);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    out[4] = 0;
	    out[5] = 0;
	    return out;
	};
	
	/**
	 * Creates a new mat2d initialized with values from an existing matrix
	 *
	 * @param {mat2d} a matrix to clone
	 * @returns {mat2d} a new 2x3 matrix
	 */
	mat2d.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(6);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    return out;
	};
	
	/**
	 * Copy the values from one mat2d to another
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the source matrix
	 * @returns {mat2d} out
	 */
	mat2d.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    return out;
	};
	
	/**
	 * Set a mat2d to the identity matrix
	 *
	 * @param {mat2d} out the receiving matrix
	 * @returns {mat2d} out
	 */
	mat2d.identity = function(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    out[4] = 0;
	    out[5] = 0;
	    return out;
	};
	
	/**
	 * Inverts a mat2d
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the source matrix
	 * @returns {mat2d} out
	 */
	mat2d.invert = function(out, a) {
	    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
	        atx = a[4], aty = a[5];
	
	    var det = aa * ad - ab * ac;
	    if(!det){
	        return null;
	    }
	    det = 1.0 / det;
	
	    out[0] = ad * det;
	    out[1] = -ab * det;
	    out[2] = -ac * det;
	    out[3] = aa * det;
	    out[4] = (ac * aty - ad * atx) * det;
	    out[5] = (ab * atx - aa * aty) * det;
	    return out;
	};
	
	/**
	 * Calculates the determinant of a mat2d
	 *
	 * @param {mat2d} a the source matrix
	 * @returns {Number} determinant of a
	 */
	mat2d.determinant = function (a) {
	    return a[0] * a[3] - a[1] * a[2];
	};
	
	/**
	 * Multiplies two mat2d's
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the first operand
	 * @param {mat2d} b the second operand
	 * @returns {mat2d} out
	 */
	mat2d.multiply = function (out, a, b) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
	        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
	    out[0] = a0 * b0 + a2 * b1;
	    out[1] = a1 * b0 + a3 * b1;
	    out[2] = a0 * b2 + a2 * b3;
	    out[3] = a1 * b2 + a3 * b3;
	    out[4] = a0 * b4 + a2 * b5 + a4;
	    out[5] = a1 * b4 + a3 * b5 + a5;
	    return out;
	};
	
	/**
	 * Alias for {@link mat2d.multiply}
	 * @function
	 */
	mat2d.mul = mat2d.multiply;
	
	/**
	 * Rotates a mat2d by the given angle
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat2d} out
	 */
	mat2d.rotate = function (out, a, rad) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
	        s = Math.sin(rad),
	        c = Math.cos(rad);
	    out[0] = a0 *  c + a2 * s;
	    out[1] = a1 *  c + a3 * s;
	    out[2] = a0 * -s + a2 * c;
	    out[3] = a1 * -s + a3 * c;
	    out[4] = a4;
	    out[5] = a5;
	    return out;
	};
	
	/**
	 * Scales the mat2d by the dimensions in the given vec2
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the matrix to translate
	 * @param {vec2} v the vec2 to scale the matrix by
	 * @returns {mat2d} out
	 **/
	mat2d.scale = function(out, a, v) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
	        v0 = v[0], v1 = v[1];
	    out[0] = a0 * v0;
	    out[1] = a1 * v0;
	    out[2] = a2 * v1;
	    out[3] = a3 * v1;
	    out[4] = a4;
	    out[5] = a5;
	    return out;
	};
	
	/**
	 * Translates the mat2d by the dimensions in the given vec2
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the matrix to translate
	 * @param {vec2} v the vec2 to translate the matrix by
	 * @returns {mat2d} out
	 **/
	mat2d.translate = function(out, a, v) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
	        v0 = v[0], v1 = v[1];
	    out[0] = a0;
	    out[1] = a1;
	    out[2] = a2;
	    out[3] = a3;
	    out[4] = a0 * v0 + a2 * v1 + a4;
	    out[5] = a1 * v0 + a3 * v1 + a5;
	    return out;
	};
	
	/**
	 * Creates a matrix from a given angle
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2d.identity(dest);
	 *     mat2d.rotate(dest, dest, rad);
	 *
	 * @param {mat2d} out mat2d receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat2d} out
	 */
	mat2d.fromRotation = function(out, rad) {
	    var s = Math.sin(rad), c = Math.cos(rad);
	    out[0] = c;
	    out[1] = s;
	    out[2] = -s;
	    out[3] = c;
	    out[4] = 0;
	    out[5] = 0;
	    return out;
	}
	
	/**
	 * Creates a matrix from a vector scaling
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2d.identity(dest);
	 *     mat2d.scale(dest, dest, vec);
	 *
	 * @param {mat2d} out mat2d receiving operation result
	 * @param {vec2} v Scaling vector
	 * @returns {mat2d} out
	 */
	mat2d.fromScaling = function(out, v) {
	    out[0] = v[0];
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = v[1];
	    out[4] = 0;
	    out[5] = 0;
	    return out;
	}
	
	/**
	 * Creates a matrix from a vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2d.identity(dest);
	 *     mat2d.translate(dest, dest, vec);
	 *
	 * @param {mat2d} out mat2d receiving operation result
	 * @param {vec2} v Translation vector
	 * @returns {mat2d} out
	 */
	mat2d.fromTranslation = function(out, v) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    out[4] = v[0];
	    out[5] = v[1];
	    return out;
	}
	
	/**
	 * Returns a string representation of a mat2d
	 *
	 * @param {mat2d} a matrix to represent as a string
	 * @returns {String} string representation of the matrix
	 */
	mat2d.str = function (a) {
	    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
	                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
	};
	
	/**
	 * Returns Frobenius norm of a mat2d
	 *
	 * @param {mat2d} a the matrix to calculate Frobenius norm of
	 * @returns {Number} Frobenius norm
	 */
	mat2d.frob = function (a) { 
	    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
	}; 
	
	module.exports = mat2d;


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	var glMatrix = __webpack_require__(16);
	
	/**
	 * @class 3x3 Matrix
	 * @name mat3
	 */
	var mat3 = {};
	
	/**
	 * Creates a new identity mat3
	 *
	 * @returns {mat3} a new 3x3 matrix
	 */
	mat3.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(9);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 1;
	    out[5] = 0;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 1;
	    return out;
	};
	
	/**
	 * Copies the upper-left 3x3 values into the given mat3.
	 *
	 * @param {mat3} out the receiving 3x3 matrix
	 * @param {mat4} a   the source 4x4 matrix
	 * @returns {mat3} out
	 */
	mat3.fromMat4 = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[4];
	    out[4] = a[5];
	    out[5] = a[6];
	    out[6] = a[8];
	    out[7] = a[9];
	    out[8] = a[10];
	    return out;
	};
	
	/**
	 * Creates a new mat3 initialized with values from an existing matrix
	 *
	 * @param {mat3} a matrix to clone
	 * @returns {mat3} a new 3x3 matrix
	 */
	mat3.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(9);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    return out;
	};
	
	/**
	 * Copy the values from one mat3 to another
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the source matrix
	 * @returns {mat3} out
	 */
	mat3.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    return out;
	};
	
	/**
	 * Set a mat3 to the identity matrix
	 *
	 * @param {mat3} out the receiving matrix
	 * @returns {mat3} out
	 */
	mat3.identity = function(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 1;
	    out[5] = 0;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 1;
	    return out;
	};
	
	/**
	 * Transpose the values of a mat3
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the source matrix
	 * @returns {mat3} out
	 */
	mat3.transpose = function(out, a) {
	    // If we are transposing ourselves we can skip a few steps but have to cache some values
	    if (out === a) {
	        var a01 = a[1], a02 = a[2], a12 = a[5];
	        out[1] = a[3];
	        out[2] = a[6];
	        out[3] = a01;
	        out[5] = a[7];
	        out[6] = a02;
	        out[7] = a12;
	    } else {
	        out[0] = a[0];
	        out[1] = a[3];
	        out[2] = a[6];
	        out[3] = a[1];
	        out[4] = a[4];
	        out[5] = a[7];
	        out[6] = a[2];
	        out[7] = a[5];
	        out[8] = a[8];
	    }
	    
	    return out;
	};
	
	/**
	 * Inverts a mat3
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the source matrix
	 * @returns {mat3} out
	 */
	mat3.invert = function(out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8],
	
	        b01 = a22 * a11 - a12 * a21,
	        b11 = -a22 * a10 + a12 * a20,
	        b21 = a21 * a10 - a11 * a20,
	
	        // Calculate the determinant
	        det = a00 * b01 + a01 * b11 + a02 * b21;
	
	    if (!det) { 
	        return null; 
	    }
	    det = 1.0 / det;
	
	    out[0] = b01 * det;
	    out[1] = (-a22 * a01 + a02 * a21) * det;
	    out[2] = (a12 * a01 - a02 * a11) * det;
	    out[3] = b11 * det;
	    out[4] = (a22 * a00 - a02 * a20) * det;
	    out[5] = (-a12 * a00 + a02 * a10) * det;
	    out[6] = b21 * det;
	    out[7] = (-a21 * a00 + a01 * a20) * det;
	    out[8] = (a11 * a00 - a01 * a10) * det;
	    return out;
	};
	
	/**
	 * Calculates the adjugate of a mat3
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the source matrix
	 * @returns {mat3} out
	 */
	mat3.adjoint = function(out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8];
	
	    out[0] = (a11 * a22 - a12 * a21);
	    out[1] = (a02 * a21 - a01 * a22);
	    out[2] = (a01 * a12 - a02 * a11);
	    out[3] = (a12 * a20 - a10 * a22);
	    out[4] = (a00 * a22 - a02 * a20);
	    out[5] = (a02 * a10 - a00 * a12);
	    out[6] = (a10 * a21 - a11 * a20);
	    out[7] = (a01 * a20 - a00 * a21);
	    out[8] = (a00 * a11 - a01 * a10);
	    return out;
	};
	
	/**
	 * Calculates the determinant of a mat3
	 *
	 * @param {mat3} a the source matrix
	 * @returns {Number} determinant of a
	 */
	mat3.determinant = function (a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8];
	
	    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
	};
	
	/**
	 * Multiplies two mat3's
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the first operand
	 * @param {mat3} b the second operand
	 * @returns {mat3} out
	 */
	mat3.multiply = function (out, a, b) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8],
	
	        b00 = b[0], b01 = b[1], b02 = b[2],
	        b10 = b[3], b11 = b[4], b12 = b[5],
	        b20 = b[6], b21 = b[7], b22 = b[8];
	
	    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
	    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
	    out[2] = b00 * a02 + b01 * a12 + b02 * a22;
	
	    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
	    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
	    out[5] = b10 * a02 + b11 * a12 + b12 * a22;
	
	    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
	    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
	    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
	    return out;
	};
	
	/**
	 * Alias for {@link mat3.multiply}
	 * @function
	 */
	mat3.mul = mat3.multiply;
	
	/**
	 * Translate a mat3 by the given vector
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the matrix to translate
	 * @param {vec2} v vector to translate by
	 * @returns {mat3} out
	 */
	mat3.translate = function(out, a, v) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8],
	        x = v[0], y = v[1];
	
	    out[0] = a00;
	    out[1] = a01;
	    out[2] = a02;
	
	    out[3] = a10;
	    out[4] = a11;
	    out[5] = a12;
	
	    out[6] = x * a00 + y * a10 + a20;
	    out[7] = x * a01 + y * a11 + a21;
	    out[8] = x * a02 + y * a12 + a22;
	    return out;
	};
	
	/**
	 * Rotates a mat3 by the given angle
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat3} out
	 */
	mat3.rotate = function (out, a, rad) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8],
	
	        s = Math.sin(rad),
	        c = Math.cos(rad);
	
	    out[0] = c * a00 + s * a10;
	    out[1] = c * a01 + s * a11;
	    out[2] = c * a02 + s * a12;
	
	    out[3] = c * a10 - s * a00;
	    out[4] = c * a11 - s * a01;
	    out[5] = c * a12 - s * a02;
	
	    out[6] = a20;
	    out[7] = a21;
	    out[8] = a22;
	    return out;
	};
	
	/**
	 * Scales the mat3 by the dimensions in the given vec2
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the matrix to rotate
	 * @param {vec2} v the vec2 to scale the matrix by
	 * @returns {mat3} out
	 **/
	mat3.scale = function(out, a, v) {
	    var x = v[0], y = v[1];
	
	    out[0] = x * a[0];
	    out[1] = x * a[1];
	    out[2] = x * a[2];
	
	    out[3] = y * a[3];
	    out[4] = y * a[4];
	    out[5] = y * a[5];
	
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    return out;
	};
	
	/**
	 * Creates a matrix from a vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat3.identity(dest);
	 *     mat3.translate(dest, dest, vec);
	 *
	 * @param {mat3} out mat3 receiving operation result
	 * @param {vec2} v Translation vector
	 * @returns {mat3} out
	 */
	mat3.fromTranslation = function(out, v) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 1;
	    out[5] = 0;
	    out[6] = v[0];
	    out[7] = v[1];
	    out[8] = 1;
	    return out;
	}
	
	/**
	 * Creates a matrix from a given angle
	 * This is equivalent to (but much faster than):
	 *
	 *     mat3.identity(dest);
	 *     mat3.rotate(dest, dest, rad);
	 *
	 * @param {mat3} out mat3 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat3} out
	 */
	mat3.fromRotation = function(out, rad) {
	    var s = Math.sin(rad), c = Math.cos(rad);
	
	    out[0] = c;
	    out[1] = s;
	    out[2] = 0;
	
	    out[3] = -s;
	    out[4] = c;
	    out[5] = 0;
	
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 1;
	    return out;
	}
	
	/**
	 * Creates a matrix from a vector scaling
	 * This is equivalent to (but much faster than):
	 *
	 *     mat3.identity(dest);
	 *     mat3.scale(dest, dest, vec);
	 *
	 * @param {mat3} out mat3 receiving operation result
	 * @param {vec2} v Scaling vector
	 * @returns {mat3} out
	 */
	mat3.fromScaling = function(out, v) {
	    out[0] = v[0];
	    out[1] = 0;
	    out[2] = 0;
	
	    out[3] = 0;
	    out[4] = v[1];
	    out[5] = 0;
	
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 1;
	    return out;
	}
	
	/**
	 * Copies the values from a mat2d into a mat3
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat2d} a the matrix to copy
	 * @returns {mat3} out
	 **/
	mat3.fromMat2d = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = 0;
	
	    out[3] = a[2];
	    out[4] = a[3];
	    out[5] = 0;
	
	    out[6] = a[4];
	    out[7] = a[5];
	    out[8] = 1;
	    return out;
	};
	
	/**
	* Calculates a 3x3 matrix from the given quaternion
	*
	* @param {mat3} out mat3 receiving operation result
	* @param {quat} q Quaternion to create matrix from
	*
	* @returns {mat3} out
	*/
	mat3.fromQuat = function (out, q) {
	    var x = q[0], y = q[1], z = q[2], w = q[3],
	        x2 = x + x,
	        y2 = y + y,
	        z2 = z + z,
	
	        xx = x * x2,
	        yx = y * x2,
	        yy = y * y2,
	        zx = z * x2,
	        zy = z * y2,
	        zz = z * z2,
	        wx = w * x2,
	        wy = w * y2,
	        wz = w * z2;
	
	    out[0] = 1 - yy - zz;
	    out[3] = yx - wz;
	    out[6] = zx + wy;
	
	    out[1] = yx + wz;
	    out[4] = 1 - xx - zz;
	    out[7] = zy - wx;
	
	    out[2] = zx - wy;
	    out[5] = zy + wx;
	    out[8] = 1 - xx - yy;
	
	    return out;
	};
	
	/**
	* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
	*
	* @param {mat3} out mat3 receiving operation result
	* @param {mat4} a Mat4 to derive the normal matrix from
	*
	* @returns {mat3} out
	*/
	mat3.normalFromMat4 = function (out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],
	
	        b00 = a00 * a11 - a01 * a10,
	        b01 = a00 * a12 - a02 * a10,
	        b02 = a00 * a13 - a03 * a10,
	        b03 = a01 * a12 - a02 * a11,
	        b04 = a01 * a13 - a03 * a11,
	        b05 = a02 * a13 - a03 * a12,
	        b06 = a20 * a31 - a21 * a30,
	        b07 = a20 * a32 - a22 * a30,
	        b08 = a20 * a33 - a23 * a30,
	        b09 = a21 * a32 - a22 * a31,
	        b10 = a21 * a33 - a23 * a31,
	        b11 = a22 * a33 - a23 * a32,
	
	        // Calculate the determinant
	        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	
	    if (!det) { 
	        return null; 
	    }
	    det = 1.0 / det;
	
	    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
	    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
	    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
	
	    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
	    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
	    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
	
	    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
	    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
	    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
	
	    return out;
	};
	
	/**
	 * Returns a string representation of a mat3
	 *
	 * @param {mat3} mat matrix to represent as a string
	 * @returns {String} string representation of the matrix
	 */
	mat3.str = function (a) {
	    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
	                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
	                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
	};
	
	/**
	 * Returns Frobenius norm of a mat3
	 *
	 * @param {mat3} a the matrix to calculate Frobenius norm of
	 * @returns {Number} Frobenius norm
	 */
	mat3.frob = function (a) {
	    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
	};
	
	
	module.exports = mat3;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	var glMatrix = __webpack_require__(16);
	
	/**
	 * @class 4x4 Matrix
	 * @name mat4
	 */
	var mat4 = {};
	
	/**
	 * Creates a new identity mat4
	 *
	 * @returns {mat4} a new 4x4 matrix
	 */
	mat4.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(16);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	};
	
	/**
	 * Creates a new mat4 initialized with values from an existing matrix
	 *
	 * @param {mat4} a matrix to clone
	 * @returns {mat4} a new 4x4 matrix
	 */
	mat4.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(16);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    out[9] = a[9];
	    out[10] = a[10];
	    out[11] = a[11];
	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};
	
	/**
	 * Copy the values from one mat4 to another
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    out[9] = a[9];
	    out[10] = a[10];
	    out[11] = a[11];
	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};
	
	/**
	 * Set a mat4 to the identity matrix
	 *
	 * @param {mat4} out the receiving matrix
	 * @returns {mat4} out
	 */
	mat4.identity = function(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	};
	
	/**
	 * Transpose the values of a mat4
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.transpose = function(out, a) {
	    // If we are transposing ourselves we can skip a few steps but have to cache some values
	    if (out === a) {
	        var a01 = a[1], a02 = a[2], a03 = a[3],
	            a12 = a[6], a13 = a[7],
	            a23 = a[11];
	
	        out[1] = a[4];
	        out[2] = a[8];
	        out[3] = a[12];
	        out[4] = a01;
	        out[6] = a[9];
	        out[7] = a[13];
	        out[8] = a02;
	        out[9] = a12;
	        out[11] = a[14];
	        out[12] = a03;
	        out[13] = a13;
	        out[14] = a23;
	    } else {
	        out[0] = a[0];
	        out[1] = a[4];
	        out[2] = a[8];
	        out[3] = a[12];
	        out[4] = a[1];
	        out[5] = a[5];
	        out[6] = a[9];
	        out[7] = a[13];
	        out[8] = a[2];
	        out[9] = a[6];
	        out[10] = a[10];
	        out[11] = a[14];
	        out[12] = a[3];
	        out[13] = a[7];
	        out[14] = a[11];
	        out[15] = a[15];
	    }
	    
	    return out;
	};
	
	/**
	 * Inverts a mat4
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.invert = function(out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],
	
	        b00 = a00 * a11 - a01 * a10,
	        b01 = a00 * a12 - a02 * a10,
	        b02 = a00 * a13 - a03 * a10,
	        b03 = a01 * a12 - a02 * a11,
	        b04 = a01 * a13 - a03 * a11,
	        b05 = a02 * a13 - a03 * a12,
	        b06 = a20 * a31 - a21 * a30,
	        b07 = a20 * a32 - a22 * a30,
	        b08 = a20 * a33 - a23 * a30,
	        b09 = a21 * a32 - a22 * a31,
	        b10 = a21 * a33 - a23 * a31,
	        b11 = a22 * a33 - a23 * a32,
	
	        // Calculate the determinant
	        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	
	    if (!det) { 
	        return null; 
	    }
	    det = 1.0 / det;
	
	    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
	    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
	    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
	    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
	    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
	    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
	    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
	    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
	    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
	    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
	    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
	    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
	    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
	    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
	    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
	    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
	
	    return out;
	};
	
	/**
	 * Calculates the adjugate of a mat4
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.adjoint = function(out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
	
	    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
	    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
	    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
	    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
	    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
	    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
	    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
	    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
	    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
	    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
	    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
	    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
	    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
	    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
	    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
	    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
	    return out;
	};
	
	/**
	 * Calculates the determinant of a mat4
	 *
	 * @param {mat4} a the source matrix
	 * @returns {Number} determinant of a
	 */
	mat4.determinant = function (a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],
	
	        b00 = a00 * a11 - a01 * a10,
	        b01 = a00 * a12 - a02 * a10,
	        b02 = a00 * a13 - a03 * a10,
	        b03 = a01 * a12 - a02 * a11,
	        b04 = a01 * a13 - a03 * a11,
	        b05 = a02 * a13 - a03 * a12,
	        b06 = a20 * a31 - a21 * a30,
	        b07 = a20 * a32 - a22 * a30,
	        b08 = a20 * a33 - a23 * a30,
	        b09 = a21 * a32 - a22 * a31,
	        b10 = a21 * a33 - a23 * a31,
	        b11 = a22 * a33 - a23 * a32;
	
	    // Calculate the determinant
	    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	};
	
	/**
	 * Multiplies two mat4's
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the first operand
	 * @param {mat4} b the second operand
	 * @returns {mat4} out
	 */
	mat4.multiply = function (out, a, b) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
	
	    // Cache only the current line of the second matrix
	    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
	    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
	
	    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
	    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
	
	    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
	    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
	
	    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
	    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
	    return out;
	};
	
	/**
	 * Alias for {@link mat4.multiply}
	 * @function
	 */
	mat4.mul = mat4.multiply;
	
	/**
	 * Translate a mat4 by the given vector
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to translate
	 * @param {vec3} v vector to translate by
	 * @returns {mat4} out
	 */
	mat4.translate = function (out, a, v) {
	    var x = v[0], y = v[1], z = v[2],
	        a00, a01, a02, a03,
	        a10, a11, a12, a13,
	        a20, a21, a22, a23;
	
	    if (a === out) {
	        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
	        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
	        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
	        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
	    } else {
	        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
	        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
	        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
	
	        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
	        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
	        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;
	
	        out[12] = a00 * x + a10 * y + a20 * z + a[12];
	        out[13] = a01 * x + a11 * y + a21 * z + a[13];
	        out[14] = a02 * x + a12 * y + a22 * z + a[14];
	        out[15] = a03 * x + a13 * y + a23 * z + a[15];
	    }
	
	    return out;
	};
	
	/**
	 * Scales the mat4 by the dimensions in the given vec3
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to scale
	 * @param {vec3} v the vec3 to scale the matrix by
	 * @returns {mat4} out
	 **/
	mat4.scale = function(out, a, v) {
	    var x = v[0], y = v[1], z = v[2];
	
	    out[0] = a[0] * x;
	    out[1] = a[1] * x;
	    out[2] = a[2] * x;
	    out[3] = a[3] * x;
	    out[4] = a[4] * y;
	    out[5] = a[5] * y;
	    out[6] = a[6] * y;
	    out[7] = a[7] * y;
	    out[8] = a[8] * z;
	    out[9] = a[9] * z;
	    out[10] = a[10] * z;
	    out[11] = a[11] * z;
	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};
	
	/**
	 * Rotates a mat4 by the given angle around the given axis
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @param {vec3} axis the axis to rotate around
	 * @returns {mat4} out
	 */
	mat4.rotate = function (out, a, rad, axis) {
	    var x = axis[0], y = axis[1], z = axis[2],
	        len = Math.sqrt(x * x + y * y + z * z),
	        s, c, t,
	        a00, a01, a02, a03,
	        a10, a11, a12, a13,
	        a20, a21, a22, a23,
	        b00, b01, b02,
	        b10, b11, b12,
	        b20, b21, b22;
	
	    if (Math.abs(len) < glMatrix.EPSILON) { return null; }
	    
	    len = 1 / len;
	    x *= len;
	    y *= len;
	    z *= len;
	
	    s = Math.sin(rad);
	    c = Math.cos(rad);
	    t = 1 - c;
	
	    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
	    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
	    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
	
	    // Construct the elements of the rotation matrix
	    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
	    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
	    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;
	
	    // Perform rotation-specific matrix multiplication
	    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
	    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
	    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
	    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
	    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
	    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
	    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
	    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
	    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
	    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
	    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
	    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
	
	    if (a !== out) { // If the source and destination differ, copy the unchanged last row
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }
	    return out;
	};
	
	/**
	 * Rotates a matrix by the given angle around the X axis
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.rotateX = function (out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a10 = a[4],
	        a11 = a[5],
	        a12 = a[6],
	        a13 = a[7],
	        a20 = a[8],
	        a21 = a[9],
	        a22 = a[10],
	        a23 = a[11];
	
	    if (a !== out) { // If the source and destination differ, copy the unchanged rows
	        out[0]  = a[0];
	        out[1]  = a[1];
	        out[2]  = a[2];
	        out[3]  = a[3];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }
	
	    // Perform axis-specific matrix multiplication
	    out[4] = a10 * c + a20 * s;
	    out[5] = a11 * c + a21 * s;
	    out[6] = a12 * c + a22 * s;
	    out[7] = a13 * c + a23 * s;
	    out[8] = a20 * c - a10 * s;
	    out[9] = a21 * c - a11 * s;
	    out[10] = a22 * c - a12 * s;
	    out[11] = a23 * c - a13 * s;
	    return out;
	};
	
	/**
	 * Rotates a matrix by the given angle around the Y axis
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.rotateY = function (out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a00 = a[0],
	        a01 = a[1],
	        a02 = a[2],
	        a03 = a[3],
	        a20 = a[8],
	        a21 = a[9],
	        a22 = a[10],
	        a23 = a[11];
	
	    if (a !== out) { // If the source and destination differ, copy the unchanged rows
	        out[4]  = a[4];
	        out[5]  = a[5];
	        out[6]  = a[6];
	        out[7]  = a[7];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }
	
	    // Perform axis-specific matrix multiplication
	    out[0] = a00 * c - a20 * s;
	    out[1] = a01 * c - a21 * s;
	    out[2] = a02 * c - a22 * s;
	    out[3] = a03 * c - a23 * s;
	    out[8] = a00 * s + a20 * c;
	    out[9] = a01 * s + a21 * c;
	    out[10] = a02 * s + a22 * c;
	    out[11] = a03 * s + a23 * c;
	    return out;
	};
	
	/**
	 * Rotates a matrix by the given angle around the Z axis
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.rotateZ = function (out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a00 = a[0],
	        a01 = a[1],
	        a02 = a[2],
	        a03 = a[3],
	        a10 = a[4],
	        a11 = a[5],
	        a12 = a[6],
	        a13 = a[7];
	
	    if (a !== out) { // If the source and destination differ, copy the unchanged last row
	        out[8]  = a[8];
	        out[9]  = a[9];
	        out[10] = a[10];
	        out[11] = a[11];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }
	
	    // Perform axis-specific matrix multiplication
	    out[0] = a00 * c + a10 * s;
	    out[1] = a01 * c + a11 * s;
	    out[2] = a02 * c + a12 * s;
	    out[3] = a03 * c + a13 * s;
	    out[4] = a10 * c - a00 * s;
	    out[5] = a11 * c - a01 * s;
	    out[6] = a12 * c - a02 * s;
	    out[7] = a13 * c - a03 * s;
	    return out;
	};
	
	/**
	 * Creates a matrix from a vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, dest, vec);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {vec3} v Translation vector
	 * @returns {mat4} out
	 */
	mat4.fromTranslation = function(out, v) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = v[0];
	    out[13] = v[1];
	    out[14] = v[2];
	    out[15] = 1;
	    return out;
	}
	
	/**
	 * Creates a matrix from a vector scaling
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.scale(dest, dest, vec);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {vec3} v Scaling vector
	 * @returns {mat4} out
	 */
	mat4.fromScaling = function(out, v) {
	    out[0] = v[0];
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = v[1];
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = v[2];
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}
	
	/**
	 * Creates a matrix from a given angle around a given axis
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.rotate(dest, dest, rad, axis);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @param {vec3} axis the axis to rotate around
	 * @returns {mat4} out
	 */
	mat4.fromRotation = function(out, rad, axis) {
	    var x = axis[0], y = axis[1], z = axis[2],
	        len = Math.sqrt(x * x + y * y + z * z),
	        s, c, t;
	    
	    if (Math.abs(len) < glMatrix.EPSILON) { return null; }
	    
	    len = 1 / len;
	    x *= len;
	    y *= len;
	    z *= len;
	    
	    s = Math.sin(rad);
	    c = Math.cos(rad);
	    t = 1 - c;
	    
	    // Perform rotation-specific matrix multiplication
	    out[0] = x * x * t + c;
	    out[1] = y * x * t + z * s;
	    out[2] = z * x * t - y * s;
	    out[3] = 0;
	    out[4] = x * y * t - z * s;
	    out[5] = y * y * t + c;
	    out[6] = z * y * t + x * s;
	    out[7] = 0;
	    out[8] = x * z * t + y * s;
	    out[9] = y * z * t - x * s;
	    out[10] = z * z * t + c;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}
	
	/**
	 * Creates a matrix from the given angle around the X axis
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.rotateX(dest, dest, rad);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.fromXRotation = function(out, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad);
	    
	    // Perform axis-specific matrix multiplication
	    out[0]  = 1;
	    out[1]  = 0;
	    out[2]  = 0;
	    out[3]  = 0;
	    out[4] = 0;
	    out[5] = c;
	    out[6] = s;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = -s;
	    out[10] = c;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}
	
	/**
	 * Creates a matrix from the given angle around the Y axis
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.rotateY(dest, dest, rad);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.fromYRotation = function(out, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad);
	    
	    // Perform axis-specific matrix multiplication
	    out[0]  = c;
	    out[1]  = 0;
	    out[2]  = -s;
	    out[3]  = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = s;
	    out[9] = 0;
	    out[10] = c;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}
	
	/**
	 * Creates a matrix from the given angle around the Z axis
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.rotateZ(dest, dest, rad);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.fromZRotation = function(out, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad);
	    
	    // Perform axis-specific matrix multiplication
	    out[0]  = c;
	    out[1]  = s;
	    out[2]  = 0;
	    out[3]  = 0;
	    out[4] = -s;
	    out[5] = c;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}
	
	/**
	 * Creates a matrix from a quaternion rotation and vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, vec);
	 *     var quatMat = mat4.create();
	 *     quat4.toMat4(quat, quatMat);
	 *     mat4.multiply(dest, quatMat);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {quat4} q Rotation quaternion
	 * @param {vec3} v Translation vector
	 * @returns {mat4} out
	 */
	mat4.fromRotationTranslation = function (out, q, v) {
	    // Quaternion math
	    var x = q[0], y = q[1], z = q[2], w = q[3],
	        x2 = x + x,
	        y2 = y + y,
	        z2 = z + z,
	
	        xx = x * x2,
	        xy = x * y2,
	        xz = x * z2,
	        yy = y * y2,
	        yz = y * z2,
	        zz = z * z2,
	        wx = w * x2,
	        wy = w * y2,
	        wz = w * z2;
	
	    out[0] = 1 - (yy + zz);
	    out[1] = xy + wz;
	    out[2] = xz - wy;
	    out[3] = 0;
	    out[4] = xy - wz;
	    out[5] = 1 - (xx + zz);
	    out[6] = yz + wx;
	    out[7] = 0;
	    out[8] = xz + wy;
	    out[9] = yz - wx;
	    out[10] = 1 - (xx + yy);
	    out[11] = 0;
	    out[12] = v[0];
	    out[13] = v[1];
	    out[14] = v[2];
	    out[15] = 1;
	    
	    return out;
	};
	
	/**
	 * Creates a matrix from a quaternion rotation, vector translation and vector scale
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, vec);
	 *     var quatMat = mat4.create();
	 *     quat4.toMat4(quat, quatMat);
	 *     mat4.multiply(dest, quatMat);
	 *     mat4.scale(dest, scale)
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {quat4} q Rotation quaternion
	 * @param {vec3} v Translation vector
	 * @param {vec3} s Scaling vector
	 * @returns {mat4} out
	 */
	mat4.fromRotationTranslationScale = function (out, q, v, s) {
	    // Quaternion math
	    var x = q[0], y = q[1], z = q[2], w = q[3],
	        x2 = x + x,
	        y2 = y + y,
	        z2 = z + z,
	
	        xx = x * x2,
	        xy = x * y2,
	        xz = x * z2,
	        yy = y * y2,
	        yz = y * z2,
	        zz = z * z2,
	        wx = w * x2,
	        wy = w * y2,
	        wz = w * z2,
	        sx = s[0],
	        sy = s[1],
	        sz = s[2];
	
	    out[0] = (1 - (yy + zz)) * sx;
	    out[1] = (xy + wz) * sx;
	    out[2] = (xz - wy) * sx;
	    out[3] = 0;
	    out[4] = (xy - wz) * sy;
	    out[5] = (1 - (xx + zz)) * sy;
	    out[6] = (yz + wx) * sy;
	    out[7] = 0;
	    out[8] = (xz + wy) * sz;
	    out[9] = (yz - wx) * sz;
	    out[10] = (1 - (xx + yy)) * sz;
	    out[11] = 0;
	    out[12] = v[0];
	    out[13] = v[1];
	    out[14] = v[2];
	    out[15] = 1;
	    
	    return out;
	};
	
	/**
	 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, vec);
	 *     mat4.translate(dest, origin);
	 *     var quatMat = mat4.create();
	 *     quat4.toMat4(quat, quatMat);
	 *     mat4.multiply(dest, quatMat);
	 *     mat4.scale(dest, scale)
	 *     mat4.translate(dest, negativeOrigin);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {quat4} q Rotation quaternion
	 * @param {vec3} v Translation vector
	 * @param {vec3} s Scaling vector
	 * @param {vec3} o The origin vector around which to scale and rotate
	 * @returns {mat4} out
	 */
	mat4.fromRotationTranslationScaleOrigin = function (out, q, v, s, o) {
	  // Quaternion math
	  var x = q[0], y = q[1], z = q[2], w = q[3],
	      x2 = x + x,
	      y2 = y + y,
	      z2 = z + z,
	
	      xx = x * x2,
	      xy = x * y2,
	      xz = x * z2,
	      yy = y * y2,
	      yz = y * z2,
	      zz = z * z2,
	      wx = w * x2,
	      wy = w * y2,
	      wz = w * z2,
	      
	      sx = s[0],
	      sy = s[1],
	      sz = s[2],
	
	      ox = o[0],
	      oy = o[1],
	      oz = o[2];
	      
	  out[0] = (1 - (yy + zz)) * sx;
	  out[1] = (xy + wz) * sx;
	  out[2] = (xz - wy) * sx;
	  out[3] = 0;
	  out[4] = (xy - wz) * sy;
	  out[5] = (1 - (xx + zz)) * sy;
	  out[6] = (yz + wx) * sy;
	  out[7] = 0;
	  out[8] = (xz + wy) * sz;
	  out[9] = (yz - wx) * sz;
	  out[10] = (1 - (xx + yy)) * sz;
	  out[11] = 0;
	  out[12] = v[0] + ox - (out[0] * ox + out[4] * oy + out[8] * oz);
	  out[13] = v[1] + oy - (out[1] * ox + out[5] * oy + out[9] * oz);
	  out[14] = v[2] + oz - (out[2] * ox + out[6] * oy + out[10] * oz);
	  out[15] = 1;
	        
	  return out;
	};
	
	mat4.fromQuat = function (out, q) {
	    var x = q[0], y = q[1], z = q[2], w = q[3],
	        x2 = x + x,
	        y2 = y + y,
	        z2 = z + z,
	
	        xx = x * x2,
	        yx = y * x2,
	        yy = y * y2,
	        zx = z * x2,
	        zy = z * y2,
	        zz = z * z2,
	        wx = w * x2,
	        wy = w * y2,
	        wz = w * z2;
	
	    out[0] = 1 - yy - zz;
	    out[1] = yx + wz;
	    out[2] = zx - wy;
	    out[3] = 0;
	
	    out[4] = yx - wz;
	    out[5] = 1 - xx - zz;
	    out[6] = zy + wx;
	    out[7] = 0;
	
	    out[8] = zx + wy;
	    out[9] = zy - wx;
	    out[10] = 1 - xx - yy;
	    out[11] = 0;
	
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	
	    return out;
	};
	
	/**
	 * Generates a frustum matrix with the given bounds
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {Number} left Left bound of the frustum
	 * @param {Number} right Right bound of the frustum
	 * @param {Number} bottom Bottom bound of the frustum
	 * @param {Number} top Top bound of the frustum
	 * @param {Number} near Near bound of the frustum
	 * @param {Number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	mat4.frustum = function (out, left, right, bottom, top, near, far) {
	    var rl = 1 / (right - left),
	        tb = 1 / (top - bottom),
	        nf = 1 / (near - far);
	    out[0] = (near * 2) * rl;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = (near * 2) * tb;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = (right + left) * rl;
	    out[9] = (top + bottom) * tb;
	    out[10] = (far + near) * nf;
	    out[11] = -1;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = (far * near * 2) * nf;
	    out[15] = 0;
	    return out;
	};
	
	/**
	 * Generates a perspective projection matrix with the given bounds
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {number} fovy Vertical field of view in radians
	 * @param {number} aspect Aspect ratio. typically viewport width/height
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	mat4.perspective = function (out, fovy, aspect, near, far) {
	    var f = 1.0 / Math.tan(fovy / 2),
	        nf = 1 / (near - far);
	    out[0] = f / aspect;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = f;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = (far + near) * nf;
	    out[11] = -1;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = (2 * far * near) * nf;
	    out[15] = 0;
	    return out;
	};
	
	/**
	 * Generates a perspective projection matrix with the given field of view.
	 * This is primarily useful for generating projection matrices to be used
	 * with the still experiemental WebVR API.
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	mat4.perspectiveFromFieldOfView = function (out, fov, near, far) {
	    var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
	        downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
	        leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
	        rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
	        xScale = 2.0 / (leftTan + rightTan),
	        yScale = 2.0 / (upTan + downTan);
	
	    out[0] = xScale;
	    out[1] = 0.0;
	    out[2] = 0.0;
	    out[3] = 0.0;
	    out[4] = 0.0;
	    out[5] = yScale;
	    out[6] = 0.0;
	    out[7] = 0.0;
	    out[8] = -((leftTan - rightTan) * xScale * 0.5);
	    out[9] = ((upTan - downTan) * yScale * 0.5);
	    out[10] = far / (near - far);
	    out[11] = -1.0;
	    out[12] = 0.0;
	    out[13] = 0.0;
	    out[14] = (far * near) / (near - far);
	    out[15] = 0.0;
	    return out;
	}
	
	/**
	 * Generates a orthogonal projection matrix with the given bounds
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {number} left Left bound of the frustum
	 * @param {number} right Right bound of the frustum
	 * @param {number} bottom Bottom bound of the frustum
	 * @param {number} top Top bound of the frustum
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	mat4.ortho = function (out, left, right, bottom, top, near, far) {
	    var lr = 1 / (left - right),
	        bt = 1 / (bottom - top),
	        nf = 1 / (near - far);
	    out[0] = -2 * lr;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = -2 * bt;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 2 * nf;
	    out[11] = 0;
	    out[12] = (left + right) * lr;
	    out[13] = (top + bottom) * bt;
	    out[14] = (far + near) * nf;
	    out[15] = 1;
	    return out;
	};
	
	/**
	 * Generates a look-at matrix with the given eye position, focal point, and up axis
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {vec3} eye Position of the viewer
	 * @param {vec3} center Point the viewer is looking at
	 * @param {vec3} up vec3 pointing up
	 * @returns {mat4} out
	 */
	mat4.lookAt = function (out, eye, center, up) {
	    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
	        eyex = eye[0],
	        eyey = eye[1],
	        eyez = eye[2],
	        upx = up[0],
	        upy = up[1],
	        upz = up[2],
	        centerx = center[0],
	        centery = center[1],
	        centerz = center[2];
	
	    if (Math.abs(eyex - centerx) < glMatrix.EPSILON &&
	        Math.abs(eyey - centery) < glMatrix.EPSILON &&
	        Math.abs(eyez - centerz) < glMatrix.EPSILON) {
	        return mat4.identity(out);
	    }
	
	    z0 = eyex - centerx;
	    z1 = eyey - centery;
	    z2 = eyez - centerz;
	
	    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
	    z0 *= len;
	    z1 *= len;
	    z2 *= len;
	
	    x0 = upy * z2 - upz * z1;
	    x1 = upz * z0 - upx * z2;
	    x2 = upx * z1 - upy * z0;
	    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
	    if (!len) {
	        x0 = 0;
	        x1 = 0;
	        x2 = 0;
	    } else {
	        len = 1 / len;
	        x0 *= len;
	        x1 *= len;
	        x2 *= len;
	    }
	
	    y0 = z1 * x2 - z2 * x1;
	    y1 = z2 * x0 - z0 * x2;
	    y2 = z0 * x1 - z1 * x0;
	
	    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
	    if (!len) {
	        y0 = 0;
	        y1 = 0;
	        y2 = 0;
	    } else {
	        len = 1 / len;
	        y0 *= len;
	        y1 *= len;
	        y2 *= len;
	    }
	
	    out[0] = x0;
	    out[1] = y0;
	    out[2] = z0;
	    out[3] = 0;
	    out[4] = x1;
	    out[5] = y1;
	    out[6] = z1;
	    out[7] = 0;
	    out[8] = x2;
	    out[9] = y2;
	    out[10] = z2;
	    out[11] = 0;
	    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
	    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
	    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
	    out[15] = 1;
	
	    return out;
	};
	
	/**
	 * Returns a string representation of a mat4
	 *
	 * @param {mat4} mat matrix to represent as a string
	 * @returns {String} string representation of the matrix
	 */
	mat4.str = function (a) {
	    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
	                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
	                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
	                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
	};
	
	/**
	 * Returns Frobenius norm of a mat4
	 *
	 * @param {mat4} a the matrix to calculate Frobenius norm of
	 * @returns {Number} Frobenius norm
	 */
	mat4.frob = function (a) {
	    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
	};
	
	
	module.exports = mat4;


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	var glMatrix = __webpack_require__(16);
	var mat3 = __webpack_require__(19);
	var vec3 = __webpack_require__(22);
	var vec4 = __webpack_require__(23);
	
	/**
	 * @class Quaternion
	 * @name quat
	 */
	var quat = {};
	
	/**
	 * Creates a new identity quat
	 *
	 * @returns {quat} a new quaternion
	 */
	quat.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = 0;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    return out;
	};
	
	/**
	 * Sets a quaternion to represent the shortest rotation from one
	 * vector to another.
	 *
	 * Both vectors are assumed to be unit length.
	 *
	 * @param {quat} out the receiving quaternion.
	 * @param {vec3} a the initial vector
	 * @param {vec3} b the destination vector
	 * @returns {quat} out
	 */
	quat.rotationTo = (function() {
	    var tmpvec3 = vec3.create();
	    var xUnitVec3 = vec3.fromValues(1,0,0);
	    var yUnitVec3 = vec3.fromValues(0,1,0);
	
	    return function(out, a, b) {
	        var dot = vec3.dot(a, b);
	        if (dot < -0.999999) {
	            vec3.cross(tmpvec3, xUnitVec3, a);
	            if (vec3.length(tmpvec3) < 0.000001)
	                vec3.cross(tmpvec3, yUnitVec3, a);
	            vec3.normalize(tmpvec3, tmpvec3);
	            quat.setAxisAngle(out, tmpvec3, Math.PI);
	            return out;
	        } else if (dot > 0.999999) {
	            out[0] = 0;
	            out[1] = 0;
	            out[2] = 0;
	            out[3] = 1;
	            return out;
	        } else {
	            vec3.cross(tmpvec3, a, b);
	            out[0] = tmpvec3[0];
	            out[1] = tmpvec3[1];
	            out[2] = tmpvec3[2];
	            out[3] = 1 + dot;
	            return quat.normalize(out, out);
	        }
	    };
	})();
	
	/**
	 * Sets the specified quaternion with values corresponding to the given
	 * axes. Each axis is a vec3 and is expected to be unit length and
	 * perpendicular to all other specified axes.
	 *
	 * @param {vec3} view  the vector representing the viewing direction
	 * @param {vec3} right the vector representing the local "right" direction
	 * @param {vec3} up    the vector representing the local "up" direction
	 * @returns {quat} out
	 */
	quat.setAxes = (function() {
	    var matr = mat3.create();
	
	    return function(out, view, right, up) {
	        matr[0] = right[0];
	        matr[3] = right[1];
	        matr[6] = right[2];
	
	        matr[1] = up[0];
	        matr[4] = up[1];
	        matr[7] = up[2];
	
	        matr[2] = -view[0];
	        matr[5] = -view[1];
	        matr[8] = -view[2];
	
	        return quat.normalize(out, quat.fromMat3(out, matr));
	    };
	})();
	
	/**
	 * Creates a new quat initialized with values from an existing quaternion
	 *
	 * @param {quat} a quaternion to clone
	 * @returns {quat} a new quaternion
	 * @function
	 */
	quat.clone = vec4.clone;
	
	/**
	 * Creates a new quat initialized with the given values
	 *
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @param {Number} w W component
	 * @returns {quat} a new quaternion
	 * @function
	 */
	quat.fromValues = vec4.fromValues;
	
	/**
	 * Copy the values from one quat to another
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the source quaternion
	 * @returns {quat} out
	 * @function
	 */
	quat.copy = vec4.copy;
	
	/**
	 * Set the components of a quat to the given values
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @param {Number} w W component
	 * @returns {quat} out
	 * @function
	 */
	quat.set = vec4.set;
	
	/**
	 * Set a quat to the identity quaternion
	 *
	 * @param {quat} out the receiving quaternion
	 * @returns {quat} out
	 */
	quat.identity = function(out) {
	    out[0] = 0;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    return out;
	};
	
	/**
	 * Sets a quat from the given angle and rotation axis,
	 * then returns it.
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {vec3} axis the axis around which to rotate
	 * @param {Number} rad the angle in radians
	 * @returns {quat} out
	 **/
	quat.setAxisAngle = function(out, axis, rad) {
	    rad = rad * 0.5;
	    var s = Math.sin(rad);
	    out[0] = s * axis[0];
	    out[1] = s * axis[1];
	    out[2] = s * axis[2];
	    out[3] = Math.cos(rad);
	    return out;
	};
	
	/**
	 * Adds two quat's
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @returns {quat} out
	 * @function
	 */
	quat.add = vec4.add;
	
	/**
	 * Multiplies two quat's
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @returns {quat} out
	 */
	quat.multiply = function(out, a, b) {
	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        bx = b[0], by = b[1], bz = b[2], bw = b[3];
	
	    out[0] = ax * bw + aw * bx + ay * bz - az * by;
	    out[1] = ay * bw + aw * by + az * bx - ax * bz;
	    out[2] = az * bw + aw * bz + ax * by - ay * bx;
	    out[3] = aw * bw - ax * bx - ay * by - az * bz;
	    return out;
	};
	
	/**
	 * Alias for {@link quat.multiply}
	 * @function
	 */
	quat.mul = quat.multiply;
	
	/**
	 * Scales a quat by a scalar number
	 *
	 * @param {quat} out the receiving vector
	 * @param {quat} a the vector to scale
	 * @param {Number} b amount to scale the vector by
	 * @returns {quat} out
	 * @function
	 */
	quat.scale = vec4.scale;
	
	/**
	 * Rotates a quaternion by the given angle about the X axis
	 *
	 * @param {quat} out quat receiving operation result
	 * @param {quat} a quat to rotate
	 * @param {number} rad angle (in radians) to rotate
	 * @returns {quat} out
	 */
	quat.rotateX = function (out, a, rad) {
	    rad *= 0.5; 
	
	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        bx = Math.sin(rad), bw = Math.cos(rad);
	
	    out[0] = ax * bw + aw * bx;
	    out[1] = ay * bw + az * bx;
	    out[2] = az * bw - ay * bx;
	    out[3] = aw * bw - ax * bx;
	    return out;
	};
	
	/**
	 * Rotates a quaternion by the given angle about the Y axis
	 *
	 * @param {quat} out quat receiving operation result
	 * @param {quat} a quat to rotate
	 * @param {number} rad angle (in radians) to rotate
	 * @returns {quat} out
	 */
	quat.rotateY = function (out, a, rad) {
	    rad *= 0.5; 
	
	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        by = Math.sin(rad), bw = Math.cos(rad);
	
	    out[0] = ax * bw - az * by;
	    out[1] = ay * bw + aw * by;
	    out[2] = az * bw + ax * by;
	    out[3] = aw * bw - ay * by;
	    return out;
	};
	
	/**
	 * Rotates a quaternion by the given angle about the Z axis
	 *
	 * @param {quat} out quat receiving operation result
	 * @param {quat} a quat to rotate
	 * @param {number} rad angle (in radians) to rotate
	 * @returns {quat} out
	 */
	quat.rotateZ = function (out, a, rad) {
	    rad *= 0.5; 
	
	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        bz = Math.sin(rad), bw = Math.cos(rad);
	
	    out[0] = ax * bw + ay * bz;
	    out[1] = ay * bw - ax * bz;
	    out[2] = az * bw + aw * bz;
	    out[3] = aw * bw - az * bz;
	    return out;
	};
	
	/**
	 * Calculates the W component of a quat from the X, Y, and Z components.
	 * Assumes that quaternion is 1 unit in length.
	 * Any existing W component will be ignored.
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a quat to calculate W component of
	 * @returns {quat} out
	 */
	quat.calculateW = function (out, a) {
	    var x = a[0], y = a[1], z = a[2];
	
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
	    return out;
	};
	
	/**
	 * Calculates the dot product of two quat's
	 *
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @returns {Number} dot product of a and b
	 * @function
	 */
	quat.dot = vec4.dot;
	
	/**
	 * Performs a linear interpolation between two quat's
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {quat} out
	 * @function
	 */
	quat.lerp = vec4.lerp;
	
	/**
	 * Performs a spherical linear interpolation between two quat
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {quat} out
	 */
	quat.slerp = function (out, a, b, t) {
	    // benchmarks:
	    //    http://jsperf.com/quaternion-slerp-implementations
	
	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        bx = b[0], by = b[1], bz = b[2], bw = b[3];
	
	    var        omega, cosom, sinom, scale0, scale1;
	
	    // calc cosine
	    cosom = ax * bx + ay * by + az * bz + aw * bw;
	    // adjust signs (if necessary)
	    if ( cosom < 0.0 ) {
	        cosom = -cosom;
	        bx = - bx;
	        by = - by;
	        bz = - bz;
	        bw = - bw;
	    }
	    // calculate coefficients
	    if ( (1.0 - cosom) > 0.000001 ) {
	        // standard case (slerp)
	        omega  = Math.acos(cosom);
	        sinom  = Math.sin(omega);
	        scale0 = Math.sin((1.0 - t) * omega) / sinom;
	        scale1 = Math.sin(t * omega) / sinom;
	    } else {        
	        // "from" and "to" quaternions are very close 
	        //  ... so we can do a linear interpolation
	        scale0 = 1.0 - t;
	        scale1 = t;
	    }
	    // calculate final values
	    out[0] = scale0 * ax + scale1 * bx;
	    out[1] = scale0 * ay + scale1 * by;
	    out[2] = scale0 * az + scale1 * bz;
	    out[3] = scale0 * aw + scale1 * bw;
	    
	    return out;
	};
	
	/**
	 * Performs a spherical linear interpolation with two control points
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @param {quat} c the third operand
	 * @param {quat} d the fourth operand
	 * @param {Number} t interpolation amount
	 * @returns {quat} out
	 */
	quat.sqlerp = (function () {
	  var temp1 = quat.create();
	  var temp2 = quat.create();
	  
	  return function (out, a, b, c, d, t) {
	    quat.slerp(temp1, a, d, t);
	    quat.slerp(temp2, b, c, t);
	    quat.slerp(out, temp1, temp2, 2 * t * (1 - t));
	    
	    return out;
	  };
	}());
	
	/**
	 * Calculates the inverse of a quat
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a quat to calculate inverse of
	 * @returns {quat} out
	 */
	quat.invert = function(out, a) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
	        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
	        invDot = dot ? 1.0/dot : 0;
	    
	    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0
	
	    out[0] = -a0*invDot;
	    out[1] = -a1*invDot;
	    out[2] = -a2*invDot;
	    out[3] = a3*invDot;
	    return out;
	};
	
	/**
	 * Calculates the conjugate of a quat
	 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a quat to calculate conjugate of
	 * @returns {quat} out
	 */
	quat.conjugate = function (out, a) {
	    out[0] = -a[0];
	    out[1] = -a[1];
	    out[2] = -a[2];
	    out[3] = a[3];
	    return out;
	};
	
	/**
	 * Calculates the length of a quat
	 *
	 * @param {quat} a vector to calculate length of
	 * @returns {Number} length of a
	 * @function
	 */
	quat.length = vec4.length;
	
	/**
	 * Alias for {@link quat.length}
	 * @function
	 */
	quat.len = quat.length;
	
	/**
	 * Calculates the squared length of a quat
	 *
	 * @param {quat} a vector to calculate squared length of
	 * @returns {Number} squared length of a
	 * @function
	 */
	quat.squaredLength = vec4.squaredLength;
	
	/**
	 * Alias for {@link quat.squaredLength}
	 * @function
	 */
	quat.sqrLen = quat.squaredLength;
	
	/**
	 * Normalize a quat
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a quaternion to normalize
	 * @returns {quat} out
	 * @function
	 */
	quat.normalize = vec4.normalize;
	
	/**
	 * Creates a quaternion from the given 3x3 rotation matrix.
	 *
	 * NOTE: The resultant quaternion is not normalized, so you should be sure
	 * to renormalize the quaternion yourself where necessary.
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {mat3} m rotation matrix
	 * @returns {quat} out
	 * @function
	 */
	quat.fromMat3 = function(out, m) {
	    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
	    // article "Quaternion Calculus and Fast Animation".
	    var fTrace = m[0] + m[4] + m[8];
	    var fRoot;
	
	    if ( fTrace > 0.0 ) {
	        // |w| > 1/2, may as well choose w > 1/2
	        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
	        out[3] = 0.5 * fRoot;
	        fRoot = 0.5/fRoot;  // 1/(4w)
	        out[0] = (m[5]-m[7])*fRoot;
	        out[1] = (m[6]-m[2])*fRoot;
	        out[2] = (m[1]-m[3])*fRoot;
	    } else {
	        // |w| <= 1/2
	        var i = 0;
	        if ( m[4] > m[0] )
	          i = 1;
	        if ( m[8] > m[i*3+i] )
	          i = 2;
	        var j = (i+1)%3;
	        var k = (i+2)%3;
	        
	        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
	        out[i] = 0.5 * fRoot;
	        fRoot = 0.5 / fRoot;
	        out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
	        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
	        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
	    }
	    
	    return out;
	};
	
	/**
	 * Returns a string representation of a quatenion
	 *
	 * @param {quat} vec vector to represent as a string
	 * @returns {String} string representation of the vector
	 */
	quat.str = function (a) {
	    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
	};
	
	module.exports = quat;


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	var glMatrix = __webpack_require__(16);
	
	/**
	 * @class 3 Dimensional Vector
	 * @name vec3
	 */
	var vec3 = {};
	
	/**
	 * Creates a new, empty vec3
	 *
	 * @returns {vec3} a new 3D vector
	 */
	vec3.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(3);
	    out[0] = 0;
	    out[1] = 0;
	    out[2] = 0;
	    return out;
	};
	
	/**
	 * Creates a new vec3 initialized with values from an existing vector
	 *
	 * @param {vec3} a vector to clone
	 * @returns {vec3} a new 3D vector
	 */
	vec3.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(3);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    return out;
	};
	
	/**
	 * Creates a new vec3 initialized with the given values
	 *
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @returns {vec3} a new 3D vector
	 */
	vec3.fromValues = function(x, y, z) {
	    var out = new glMatrix.ARRAY_TYPE(3);
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    return out;
	};
	
	/**
	 * Copy the values from one vec3 to another
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the source vector
	 * @returns {vec3} out
	 */
	vec3.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    return out;
	};
	
	/**
	 * Set the components of a vec3 to the given values
	 *
	 * @param {vec3} out the receiving vector
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @returns {vec3} out
	 */
	vec3.set = function(out, x, y, z) {
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    return out;
	};
	
	/**
	 * Adds two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.add = function(out, a, b) {
	    out[0] = a[0] + b[0];
	    out[1] = a[1] + b[1];
	    out[2] = a[2] + b[2];
	    return out;
	};
	
	/**
	 * Subtracts vector b from vector a
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.subtract = function(out, a, b) {
	    out[0] = a[0] - b[0];
	    out[1] = a[1] - b[1];
	    out[2] = a[2] - b[2];
	    return out;
	};
	
	/**
	 * Alias for {@link vec3.subtract}
	 * @function
	 */
	vec3.sub = vec3.subtract;
	
	/**
	 * Multiplies two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.multiply = function(out, a, b) {
	    out[0] = a[0] * b[0];
	    out[1] = a[1] * b[1];
	    out[2] = a[2] * b[2];
	    return out;
	};
	
	/**
	 * Alias for {@link vec3.multiply}
	 * @function
	 */
	vec3.mul = vec3.multiply;
	
	/**
	 * Divides two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.divide = function(out, a, b) {
	    out[0] = a[0] / b[0];
	    out[1] = a[1] / b[1];
	    out[2] = a[2] / b[2];
	    return out;
	};
	
	/**
	 * Alias for {@link vec3.divide}
	 * @function
	 */
	vec3.div = vec3.divide;
	
	/**
	 * Returns the minimum of two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.min = function(out, a, b) {
	    out[0] = Math.min(a[0], b[0]);
	    out[1] = Math.min(a[1], b[1]);
	    out[2] = Math.min(a[2], b[2]);
	    return out;
	};
	
	/**
	 * Returns the maximum of two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.max = function(out, a, b) {
	    out[0] = Math.max(a[0], b[0]);
	    out[1] = Math.max(a[1], b[1]);
	    out[2] = Math.max(a[2], b[2]);
	    return out;
	};
	
	/**
	 * Scales a vec3 by a scalar number
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the vector to scale
	 * @param {Number} b amount to scale the vector by
	 * @returns {vec3} out
	 */
	vec3.scale = function(out, a, b) {
	    out[0] = a[0] * b;
	    out[1] = a[1] * b;
	    out[2] = a[2] * b;
	    return out;
	};
	
	/**
	 * Adds two vec3's after scaling the second operand by a scalar value
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @param {Number} scale the amount to scale b by before adding
	 * @returns {vec3} out
	 */
	vec3.scaleAndAdd = function(out, a, b, scale) {
	    out[0] = a[0] + (b[0] * scale);
	    out[1] = a[1] + (b[1] * scale);
	    out[2] = a[2] + (b[2] * scale);
	    return out;
	};
	
	/**
	 * Calculates the euclidian distance between two vec3's
	 *
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {Number} distance between a and b
	 */
	vec3.distance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1],
	        z = b[2] - a[2];
	    return Math.sqrt(x*x + y*y + z*z);
	};
	
	/**
	 * Alias for {@link vec3.distance}
	 * @function
	 */
	vec3.dist = vec3.distance;
	
	/**
	 * Calculates the squared euclidian distance between two vec3's
	 *
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {Number} squared distance between a and b
	 */
	vec3.squaredDistance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1],
	        z = b[2] - a[2];
	    return x*x + y*y + z*z;
	};
	
	/**
	 * Alias for {@link vec3.squaredDistance}
	 * @function
	 */
	vec3.sqrDist = vec3.squaredDistance;
	
	/**
	 * Calculates the length of a vec3
	 *
	 * @param {vec3} a vector to calculate length of
	 * @returns {Number} length of a
	 */
	vec3.length = function (a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2];
	    return Math.sqrt(x*x + y*y + z*z);
	};
	
	/**
	 * Alias for {@link vec3.length}
	 * @function
	 */
	vec3.len = vec3.length;
	
	/**
	 * Calculates the squared length of a vec3
	 *
	 * @param {vec3} a vector to calculate squared length of
	 * @returns {Number} squared length of a
	 */
	vec3.squaredLength = function (a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2];
	    return x*x + y*y + z*z;
	};
	
	/**
	 * Alias for {@link vec3.squaredLength}
	 * @function
	 */
	vec3.sqrLen = vec3.squaredLength;
	
	/**
	 * Negates the components of a vec3
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a vector to negate
	 * @returns {vec3} out
	 */
	vec3.negate = function(out, a) {
	    out[0] = -a[0];
	    out[1] = -a[1];
	    out[2] = -a[2];
	    return out;
	};
	
	/**
	 * Returns the inverse of the components of a vec3
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a vector to invert
	 * @returns {vec3} out
	 */
	vec3.inverse = function(out, a) {
	  out[0] = 1.0 / a[0];
	  out[1] = 1.0 / a[1];
	  out[2] = 1.0 / a[2];
	  return out;
	};
	
	/**
	 * Normalize a vec3
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a vector to normalize
	 * @returns {vec3} out
	 */
	vec3.normalize = function(out, a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2];
	    var len = x*x + y*y + z*z;
	    if (len > 0) {
	        //TODO: evaluate use of glm_invsqrt here?
	        len = 1 / Math.sqrt(len);
	        out[0] = a[0] * len;
	        out[1] = a[1] * len;
	        out[2] = a[2] * len;
	    }
	    return out;
	};
	
	/**
	 * Calculates the dot product of two vec3's
	 *
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {Number} dot product of a and b
	 */
	vec3.dot = function (a, b) {
	    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	};
	
	/**
	 * Computes the cross product of two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.cross = function(out, a, b) {
	    var ax = a[0], ay = a[1], az = a[2],
	        bx = b[0], by = b[1], bz = b[2];
	
	    out[0] = ay * bz - az * by;
	    out[1] = az * bx - ax * bz;
	    out[2] = ax * by - ay * bx;
	    return out;
	};
	
	/**
	 * Performs a linear interpolation between two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec3} out
	 */
	vec3.lerp = function (out, a, b, t) {
	    var ax = a[0],
	        ay = a[1],
	        az = a[2];
	    out[0] = ax + t * (b[0] - ax);
	    out[1] = ay + t * (b[1] - ay);
	    out[2] = az + t * (b[2] - az);
	    return out;
	};
	
	/**
	 * Performs a hermite interpolation with two control points
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @param {vec3} c the third operand
	 * @param {vec3} d the fourth operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec3} out
	 */
	vec3.hermite = function (out, a, b, c, d, t) {
	  var factorTimes2 = t * t,
	      factor1 = factorTimes2 * (2 * t - 3) + 1,
	      factor2 = factorTimes2 * (t - 2) + t,
	      factor3 = factorTimes2 * (t - 1),
	      factor4 = factorTimes2 * (3 - 2 * t);
	  
	  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
	  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
	  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
	  
	  return out;
	};
	
	/**
	 * Performs a bezier interpolation with two control points
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @param {vec3} c the third operand
	 * @param {vec3} d the fourth operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec3} out
	 */
	vec3.bezier = function (out, a, b, c, d, t) {
	  var inverseFactor = 1 - t,
	      inverseFactorTimesTwo = inverseFactor * inverseFactor,
	      factorTimes2 = t * t,
	      factor1 = inverseFactorTimesTwo * inverseFactor,
	      factor2 = 3 * t * inverseFactorTimesTwo,
	      factor3 = 3 * factorTimes2 * inverseFactor,
	      factor4 = factorTimes2 * t;
	  
	  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
	  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
	  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
	  
	  return out;
	};
	
	/**
	 * Generates a random vector with the given scale
	 *
	 * @param {vec3} out the receiving vector
	 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
	 * @returns {vec3} out
	 */
	vec3.random = function (out, scale) {
	    scale = scale || 1.0;
	
	    var r = glMatrix.RANDOM() * 2.0 * Math.PI;
	    var z = (glMatrix.RANDOM() * 2.0) - 1.0;
	    var zScale = Math.sqrt(1.0-z*z) * scale;
	
	    out[0] = Math.cos(r) * zScale;
	    out[1] = Math.sin(r) * zScale;
	    out[2] = z * scale;
	    return out;
	};
	
	/**
	 * Transforms the vec3 with a mat4.
	 * 4th vector component is implicitly '1'
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the vector to transform
	 * @param {mat4} m matrix to transform with
	 * @returns {vec3} out
	 */
	vec3.transformMat4 = function(out, a, m) {
	    var x = a[0], y = a[1], z = a[2],
	        w = m[3] * x + m[7] * y + m[11] * z + m[15];
	    w = w || 1.0;
	    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
	    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
	    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
	    return out;
	};
	
	/**
	 * Transforms the vec3 with a mat3.
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the vector to transform
	 * @param {mat4} m the 3x3 matrix to transform with
	 * @returns {vec3} out
	 */
	vec3.transformMat3 = function(out, a, m) {
	    var x = a[0], y = a[1], z = a[2];
	    out[0] = x * m[0] + y * m[3] + z * m[6];
	    out[1] = x * m[1] + y * m[4] + z * m[7];
	    out[2] = x * m[2] + y * m[5] + z * m[8];
	    return out;
	};
	
	/**
	 * Transforms the vec3 with a quat
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the vector to transform
	 * @param {quat} q quaternion to transform with
	 * @returns {vec3} out
	 */
	vec3.transformQuat = function(out, a, q) {
	    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations
	
	    var x = a[0], y = a[1], z = a[2],
	        qx = q[0], qy = q[1], qz = q[2], qw = q[3],
	
	        // calculate quat * vec
	        ix = qw * x + qy * z - qz * y,
	        iy = qw * y + qz * x - qx * z,
	        iz = qw * z + qx * y - qy * x,
	        iw = -qx * x - qy * y - qz * z;
	
	    // calculate result * inverse quat
	    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
	    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
	    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
	    return out;
	};
	
	/**
	 * Rotate a 3D vector around the x-axis
	 * @param {vec3} out The receiving vec3
	 * @param {vec3} a The vec3 point to rotate
	 * @param {vec3} b The origin of the rotation
	 * @param {Number} c The angle of rotation
	 * @returns {vec3} out
	 */
	vec3.rotateX = function(out, a, b, c){
	   var p = [], r=[];
		  //Translate point to the origin
		  p[0] = a[0] - b[0];
		  p[1] = a[1] - b[1];
	  	p[2] = a[2] - b[2];
	
		  //perform rotation
		  r[0] = p[0];
		  r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
		  r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);
	
		  //translate to correct position
		  out[0] = r[0] + b[0];
		  out[1] = r[1] + b[1];
		  out[2] = r[2] + b[2];
	
	  	return out;
	};
	
	/**
	 * Rotate a 3D vector around the y-axis
	 * @param {vec3} out The receiving vec3
	 * @param {vec3} a The vec3 point to rotate
	 * @param {vec3} b The origin of the rotation
	 * @param {Number} c The angle of rotation
	 * @returns {vec3} out
	 */
	vec3.rotateY = function(out, a, b, c){
	  	var p = [], r=[];
	  	//Translate point to the origin
	  	p[0] = a[0] - b[0];
	  	p[1] = a[1] - b[1];
	  	p[2] = a[2] - b[2];
	  
	  	//perform rotation
	  	r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
	  	r[1] = p[1];
	  	r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);
	  
	  	//translate to correct position
	  	out[0] = r[0] + b[0];
	  	out[1] = r[1] + b[1];
	  	out[2] = r[2] + b[2];
	  
	  	return out;
	};
	
	/**
	 * Rotate a 3D vector around the z-axis
	 * @param {vec3} out The receiving vec3
	 * @param {vec3} a The vec3 point to rotate
	 * @param {vec3} b The origin of the rotation
	 * @param {Number} c The angle of rotation
	 * @returns {vec3} out
	 */
	vec3.rotateZ = function(out, a, b, c){
	  	var p = [], r=[];
	  	//Translate point to the origin
	  	p[0] = a[0] - b[0];
	  	p[1] = a[1] - b[1];
	  	p[2] = a[2] - b[2];
	  
	  	//perform rotation
	  	r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
	  	r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
	  	r[2] = p[2];
	  
	  	//translate to correct position
	  	out[0] = r[0] + b[0];
	  	out[1] = r[1] + b[1];
	  	out[2] = r[2] + b[2];
	  
	  	return out;
	};
	
	/**
	 * Perform some operation over an array of vec3s.
	 *
	 * @param {Array} a the array of vectors to iterate over
	 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
	 * @param {Number} offset Number of elements to skip at the beginning of the array
	 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
	 * @param {Function} fn Function to call for each vector in the array
	 * @param {Object} [arg] additional argument to pass to fn
	 * @returns {Array} a
	 * @function
	 */
	vec3.forEach = (function() {
	    var vec = vec3.create();
	
	    return function(a, stride, offset, count, fn, arg) {
	        var i, l;
	        if(!stride) {
	            stride = 3;
	        }
	
	        if(!offset) {
	            offset = 0;
	        }
	        
	        if(count) {
	            l = Math.min((count * stride) + offset, a.length);
	        } else {
	            l = a.length;
	        }
	
	        for(i = offset; i < l; i += stride) {
	            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
	            fn(vec, vec, arg);
	            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
	        }
	        
	        return a;
	    };
	})();
	
	/**
	 * Get the angle between two 3D vectors
	 * @param {vec3} a The first operand
	 * @param {vec3} b The second operand
	 * @returns {Number} The angle in radians
	 */
	vec3.angle = function(a, b) {
	   
	    var tempA = vec3.fromValues(a[0], a[1], a[2]);
	    var tempB = vec3.fromValues(b[0], b[1], b[2]);
	 
	    vec3.normalize(tempA, tempA);
	    vec3.normalize(tempB, tempB);
	 
	    var cosine = vec3.dot(tempA, tempB);
	
	    if(cosine > 1.0){
	        return 0;
	    } else {
	        return Math.acos(cosine);
	    }     
	};
	
	/**
	 * Returns a string representation of a vector
	 *
	 * @param {vec3} vec vector to represent as a string
	 * @returns {String} string representation of the vector
	 */
	vec3.str = function (a) {
	    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
	};
	
	module.exports = vec3;


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	var glMatrix = __webpack_require__(16);
	
	/**
	 * @class 4 Dimensional Vector
	 * @name vec4
	 */
	var vec4 = {};
	
	/**
	 * Creates a new, empty vec4
	 *
	 * @returns {vec4} a new 4D vector
	 */
	vec4.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = 0;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    return out;
	};
	
	/**
	 * Creates a new vec4 initialized with values from an existing vector
	 *
	 * @param {vec4} a vector to clone
	 * @returns {vec4} a new 4D vector
	 */
	vec4.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    return out;
	};
	
	/**
	 * Creates a new vec4 initialized with the given values
	 *
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @param {Number} w W component
	 * @returns {vec4} a new 4D vector
	 */
	vec4.fromValues = function(x, y, z, w) {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    out[3] = w;
	    return out;
	};
	
	/**
	 * Copy the values from one vec4 to another
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the source vector
	 * @returns {vec4} out
	 */
	vec4.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    return out;
	};
	
	/**
	 * Set the components of a vec4 to the given values
	 *
	 * @param {vec4} out the receiving vector
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @param {Number} w W component
	 * @returns {vec4} out
	 */
	vec4.set = function(out, x, y, z, w) {
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    out[3] = w;
	    return out;
	};
	
	/**
	 * Adds two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.add = function(out, a, b) {
	    out[0] = a[0] + b[0];
	    out[1] = a[1] + b[1];
	    out[2] = a[2] + b[2];
	    out[3] = a[3] + b[3];
	    return out;
	};
	
	/**
	 * Subtracts vector b from vector a
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.subtract = function(out, a, b) {
	    out[0] = a[0] - b[0];
	    out[1] = a[1] - b[1];
	    out[2] = a[2] - b[2];
	    out[3] = a[3] - b[3];
	    return out;
	};
	
	/**
	 * Alias for {@link vec4.subtract}
	 * @function
	 */
	vec4.sub = vec4.subtract;
	
	/**
	 * Multiplies two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.multiply = function(out, a, b) {
	    out[0] = a[0] * b[0];
	    out[1] = a[1] * b[1];
	    out[2] = a[2] * b[2];
	    out[3] = a[3] * b[3];
	    return out;
	};
	
	/**
	 * Alias for {@link vec4.multiply}
	 * @function
	 */
	vec4.mul = vec4.multiply;
	
	/**
	 * Divides two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.divide = function(out, a, b) {
	    out[0] = a[0] / b[0];
	    out[1] = a[1] / b[1];
	    out[2] = a[2] / b[2];
	    out[3] = a[3] / b[3];
	    return out;
	};
	
	/**
	 * Alias for {@link vec4.divide}
	 * @function
	 */
	vec4.div = vec4.divide;
	
	/**
	 * Returns the minimum of two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.min = function(out, a, b) {
	    out[0] = Math.min(a[0], b[0]);
	    out[1] = Math.min(a[1], b[1]);
	    out[2] = Math.min(a[2], b[2]);
	    out[3] = Math.min(a[3], b[3]);
	    return out;
	};
	
	/**
	 * Returns the maximum of two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.max = function(out, a, b) {
	    out[0] = Math.max(a[0], b[0]);
	    out[1] = Math.max(a[1], b[1]);
	    out[2] = Math.max(a[2], b[2]);
	    out[3] = Math.max(a[3], b[3]);
	    return out;
	};
	
	/**
	 * Scales a vec4 by a scalar number
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the vector to scale
	 * @param {Number} b amount to scale the vector by
	 * @returns {vec4} out
	 */
	vec4.scale = function(out, a, b) {
	    out[0] = a[0] * b;
	    out[1] = a[1] * b;
	    out[2] = a[2] * b;
	    out[3] = a[3] * b;
	    return out;
	};
	
	/**
	 * Adds two vec4's after scaling the second operand by a scalar value
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @param {Number} scale the amount to scale b by before adding
	 * @returns {vec4} out
	 */
	vec4.scaleAndAdd = function(out, a, b, scale) {
	    out[0] = a[0] + (b[0] * scale);
	    out[1] = a[1] + (b[1] * scale);
	    out[2] = a[2] + (b[2] * scale);
	    out[3] = a[3] + (b[3] * scale);
	    return out;
	};
	
	/**
	 * Calculates the euclidian distance between two vec4's
	 *
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {Number} distance between a and b
	 */
	vec4.distance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1],
	        z = b[2] - a[2],
	        w = b[3] - a[3];
	    return Math.sqrt(x*x + y*y + z*z + w*w);
	};
	
	/**
	 * Alias for {@link vec4.distance}
	 * @function
	 */
	vec4.dist = vec4.distance;
	
	/**
	 * Calculates the squared euclidian distance between two vec4's
	 *
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {Number} squared distance between a and b
	 */
	vec4.squaredDistance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1],
	        z = b[2] - a[2],
	        w = b[3] - a[3];
	    return x*x + y*y + z*z + w*w;
	};
	
	/**
	 * Alias for {@link vec4.squaredDistance}
	 * @function
	 */
	vec4.sqrDist = vec4.squaredDistance;
	
	/**
	 * Calculates the length of a vec4
	 *
	 * @param {vec4} a vector to calculate length of
	 * @returns {Number} length of a
	 */
	vec4.length = function (a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2],
	        w = a[3];
	    return Math.sqrt(x*x + y*y + z*z + w*w);
	};
	
	/**
	 * Alias for {@link vec4.length}
	 * @function
	 */
	vec4.len = vec4.length;
	
	/**
	 * Calculates the squared length of a vec4
	 *
	 * @param {vec4} a vector to calculate squared length of
	 * @returns {Number} squared length of a
	 */
	vec4.squaredLength = function (a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2],
	        w = a[3];
	    return x*x + y*y + z*z + w*w;
	};
	
	/**
	 * Alias for {@link vec4.squaredLength}
	 * @function
	 */
	vec4.sqrLen = vec4.squaredLength;
	
	/**
	 * Negates the components of a vec4
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a vector to negate
	 * @returns {vec4} out
	 */
	vec4.negate = function(out, a) {
	    out[0] = -a[0];
	    out[1] = -a[1];
	    out[2] = -a[2];
	    out[3] = -a[3];
	    return out;
	};
	
	/**
	 * Returns the inverse of the components of a vec4
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a vector to invert
	 * @returns {vec4} out
	 */
	vec4.inverse = function(out, a) {
	  out[0] = 1.0 / a[0];
	  out[1] = 1.0 / a[1];
	  out[2] = 1.0 / a[2];
	  out[3] = 1.0 / a[3];
	  return out;
	};
	
	/**
	 * Normalize a vec4
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a vector to normalize
	 * @returns {vec4} out
	 */
	vec4.normalize = function(out, a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2],
	        w = a[3];
	    var len = x*x + y*y + z*z + w*w;
	    if (len > 0) {
	        len = 1 / Math.sqrt(len);
	        out[0] = x * len;
	        out[1] = y * len;
	        out[2] = z * len;
	        out[3] = w * len;
	    }
	    return out;
	};
	
	/**
	 * Calculates the dot product of two vec4's
	 *
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {Number} dot product of a and b
	 */
	vec4.dot = function (a, b) {
	    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
	};
	
	/**
	 * Performs a linear interpolation between two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec4} out
	 */
	vec4.lerp = function (out, a, b, t) {
	    var ax = a[0],
	        ay = a[1],
	        az = a[2],
	        aw = a[3];
	    out[0] = ax + t * (b[0] - ax);
	    out[1] = ay + t * (b[1] - ay);
	    out[2] = az + t * (b[2] - az);
	    out[3] = aw + t * (b[3] - aw);
	    return out;
	};
	
	/**
	 * Generates a random vector with the given scale
	 *
	 * @param {vec4} out the receiving vector
	 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
	 * @returns {vec4} out
	 */
	vec4.random = function (out, scale) {
	    scale = scale || 1.0;
	
	    //TODO: This is a pretty awful way of doing this. Find something better.
	    out[0] = glMatrix.RANDOM();
	    out[1] = glMatrix.RANDOM();
	    out[2] = glMatrix.RANDOM();
	    out[3] = glMatrix.RANDOM();
	    vec4.normalize(out, out);
	    vec4.scale(out, out, scale);
	    return out;
	};
	
	/**
	 * Transforms the vec4 with a mat4.
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the vector to transform
	 * @param {mat4} m matrix to transform with
	 * @returns {vec4} out
	 */
	vec4.transformMat4 = function(out, a, m) {
	    var x = a[0], y = a[1], z = a[2], w = a[3];
	    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
	    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
	    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
	    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
	    return out;
	};
	
	/**
	 * Transforms the vec4 with a quat
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the vector to transform
	 * @param {quat} q quaternion to transform with
	 * @returns {vec4} out
	 */
	vec4.transformQuat = function(out, a, q) {
	    var x = a[0], y = a[1], z = a[2],
	        qx = q[0], qy = q[1], qz = q[2], qw = q[3],
	
	        // calculate quat * vec
	        ix = qw * x + qy * z - qz * y,
	        iy = qw * y + qz * x - qx * z,
	        iz = qw * z + qx * y - qy * x,
	        iw = -qx * x - qy * y - qz * z;
	
	    // calculate result * inverse quat
	    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
	    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
	    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
	    out[3] = a[3];
	    return out;
	};
	
	/**
	 * Perform some operation over an array of vec4s.
	 *
	 * @param {Array} a the array of vectors to iterate over
	 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
	 * @param {Number} offset Number of elements to skip at the beginning of the array
	 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
	 * @param {Function} fn Function to call for each vector in the array
	 * @param {Object} [arg] additional argument to pass to fn
	 * @returns {Array} a
	 * @function
	 */
	vec4.forEach = (function() {
	    var vec = vec4.create();
	
	    return function(a, stride, offset, count, fn, arg) {
	        var i, l;
	        if(!stride) {
	            stride = 4;
	        }
	
	        if(!offset) {
	            offset = 0;
	        }
	        
	        if(count) {
	            l = Math.min((count * stride) + offset, a.length);
	        } else {
	            l = a.length;
	        }
	
	        for(i = offset; i < l; i += stride) {
	            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
	            fn(vec, vec, arg);
	            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
	        }
	        
	        return a;
	    };
	})();
	
	/**
	 * Returns a string representation of a vector
	 *
	 * @param {vec4} vec vector to represent as a string
	 * @returns {String} string representation of the vector
	 */
	vec4.str = function (a) {
	    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
	};
	
	module.exports = vec4;


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	
	var glMatrix = __webpack_require__(16);
	
	/**
	 * @class 2 Dimensional Vector
	 * @name vec2
	 */
	var vec2 = {};
	
	/**
	 * Creates a new, empty vec2
	 *
	 * @returns {vec2} a new 2D vector
	 */
	vec2.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(2);
	    out[0] = 0;
	    out[1] = 0;
	    return out;
	};
	
	/**
	 * Creates a new vec2 initialized with values from an existing vector
	 *
	 * @param {vec2} a vector to clone
	 * @returns {vec2} a new 2D vector
	 */
	vec2.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(2);
	    out[0] = a[0];
	    out[1] = a[1];
	    return out;
	};
	
	/**
	 * Creates a new vec2 initialized with the given values
	 *
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @returns {vec2} a new 2D vector
	 */
	vec2.fromValues = function(x, y) {
	    var out = new glMatrix.ARRAY_TYPE(2);
	    out[0] = x;
	    out[1] = y;
	    return out;
	};
	
	/**
	 * Copy the values from one vec2 to another
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the source vector
	 * @returns {vec2} out
	 */
	vec2.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    return out;
	};
	
	/**
	 * Set the components of a vec2 to the given values
	 *
	 * @param {vec2} out the receiving vector
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @returns {vec2} out
	 */
	vec2.set = function(out, x, y) {
	    out[0] = x;
	    out[1] = y;
	    return out;
	};
	
	/**
	 * Adds two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.add = function(out, a, b) {
	    out[0] = a[0] + b[0];
	    out[1] = a[1] + b[1];
	    return out;
	};
	
	/**
	 * Subtracts vector b from vector a
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.subtract = function(out, a, b) {
	    out[0] = a[0] - b[0];
	    out[1] = a[1] - b[1];
	    return out;
	};
	
	/**
	 * Alias for {@link vec2.subtract}
	 * @function
	 */
	vec2.sub = vec2.subtract;
	
	/**
	 * Multiplies two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.multiply = function(out, a, b) {
	    out[0] = a[0] * b[0];
	    out[1] = a[1] * b[1];
	    return out;
	};
	
	/**
	 * Alias for {@link vec2.multiply}
	 * @function
	 */
	vec2.mul = vec2.multiply;
	
	/**
	 * Divides two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.divide = function(out, a, b) {
	    out[0] = a[0] / b[0];
	    out[1] = a[1] / b[1];
	    return out;
	};
	
	/**
	 * Alias for {@link vec2.divide}
	 * @function
	 */
	vec2.div = vec2.divide;
	
	/**
	 * Returns the minimum of two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.min = function(out, a, b) {
	    out[0] = Math.min(a[0], b[0]);
	    out[1] = Math.min(a[1], b[1]);
	    return out;
	};
	
	/**
	 * Returns the maximum of two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.max = function(out, a, b) {
	    out[0] = Math.max(a[0], b[0]);
	    out[1] = Math.max(a[1], b[1]);
	    return out;
	};
	
	/**
	 * Scales a vec2 by a scalar number
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to scale
	 * @param {Number} b amount to scale the vector by
	 * @returns {vec2} out
	 */
	vec2.scale = function(out, a, b) {
	    out[0] = a[0] * b;
	    out[1] = a[1] * b;
	    return out;
	};
	
	/**
	 * Adds two vec2's after scaling the second operand by a scalar value
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @param {Number} scale the amount to scale b by before adding
	 * @returns {vec2} out
	 */
	vec2.scaleAndAdd = function(out, a, b, scale) {
	    out[0] = a[0] + (b[0] * scale);
	    out[1] = a[1] + (b[1] * scale);
	    return out;
	};
	
	/**
	 * Calculates the euclidian distance between two vec2's
	 *
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {Number} distance between a and b
	 */
	vec2.distance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1];
	    return Math.sqrt(x*x + y*y);
	};
	
	/**
	 * Alias for {@link vec2.distance}
	 * @function
	 */
	vec2.dist = vec2.distance;
	
	/**
	 * Calculates the squared euclidian distance between two vec2's
	 *
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {Number} squared distance between a and b
	 */
	vec2.squaredDistance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1];
	    return x*x + y*y;
	};
	
	/**
	 * Alias for {@link vec2.squaredDistance}
	 * @function
	 */
	vec2.sqrDist = vec2.squaredDistance;
	
	/**
	 * Calculates the length of a vec2
	 *
	 * @param {vec2} a vector to calculate length of
	 * @returns {Number} length of a
	 */
	vec2.length = function (a) {
	    var x = a[0],
	        y = a[1];
	    return Math.sqrt(x*x + y*y);
	};
	
	/**
	 * Alias for {@link vec2.length}
	 * @function
	 */
	vec2.len = vec2.length;
	
	/**
	 * Calculates the squared length of a vec2
	 *
	 * @param {vec2} a vector to calculate squared length of
	 * @returns {Number} squared length of a
	 */
	vec2.squaredLength = function (a) {
	    var x = a[0],
	        y = a[1];
	    return x*x + y*y;
	};
	
	/**
	 * Alias for {@link vec2.squaredLength}
	 * @function
	 */
	vec2.sqrLen = vec2.squaredLength;
	
	/**
	 * Negates the components of a vec2
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a vector to negate
	 * @returns {vec2} out
	 */
	vec2.negate = function(out, a) {
	    out[0] = -a[0];
	    out[1] = -a[1];
	    return out;
	};
	
	/**
	 * Returns the inverse of the components of a vec2
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a vector to invert
	 * @returns {vec2} out
	 */
	vec2.inverse = function(out, a) {
	  out[0] = 1.0 / a[0];
	  out[1] = 1.0 / a[1];
	  return out;
	};
	
	/**
	 * Normalize a vec2
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a vector to normalize
	 * @returns {vec2} out
	 */
	vec2.normalize = function(out, a) {
	    var x = a[0],
	        y = a[1];
	    var len = x*x + y*y;
	    if (len > 0) {
	        //TODO: evaluate use of glm_invsqrt here?
	        len = 1 / Math.sqrt(len);
	        out[0] = a[0] * len;
	        out[1] = a[1] * len;
	    }
	    return out;
	};
	
	/**
	 * Calculates the dot product of two vec2's
	 *
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {Number} dot product of a and b
	 */
	vec2.dot = function (a, b) {
	    return a[0] * b[0] + a[1] * b[1];
	};
	
	/**
	 * Computes the cross product of two vec2's
	 * Note that the cross product must by definition produce a 3D vector
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec3} out
	 */
	vec2.cross = function(out, a, b) {
	    var z = a[0] * b[1] - a[1] * b[0];
	    out[0] = out[1] = 0;
	    out[2] = z;
	    return out;
	};
	
	/**
	 * Performs a linear interpolation between two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec2} out
	 */
	vec2.lerp = function (out, a, b, t) {
	    var ax = a[0],
	        ay = a[1];
	    out[0] = ax + t * (b[0] - ax);
	    out[1] = ay + t * (b[1] - ay);
	    return out;
	};
	
	/**
	 * Generates a random vector with the given scale
	 *
	 * @param {vec2} out the receiving vector
	 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
	 * @returns {vec2} out
	 */
	vec2.random = function (out, scale) {
	    scale = scale || 1.0;
	    var r = glMatrix.RANDOM() * 2.0 * Math.PI;
	    out[0] = Math.cos(r) * scale;
	    out[1] = Math.sin(r) * scale;
	    return out;
	};
	
	/**
	 * Transforms the vec2 with a mat2
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to transform
	 * @param {mat2} m matrix to transform with
	 * @returns {vec2} out
	 */
	vec2.transformMat2 = function(out, a, m) {
	    var x = a[0],
	        y = a[1];
	    out[0] = m[0] * x + m[2] * y;
	    out[1] = m[1] * x + m[3] * y;
	    return out;
	};
	
	/**
	 * Transforms the vec2 with a mat2d
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to transform
	 * @param {mat2d} m matrix to transform with
	 * @returns {vec2} out
	 */
	vec2.transformMat2d = function(out, a, m) {
	    var x = a[0],
	        y = a[1];
	    out[0] = m[0] * x + m[2] * y + m[4];
	    out[1] = m[1] * x + m[3] * y + m[5];
	    return out;
	};
	
	/**
	 * Transforms the vec2 with a mat3
	 * 3rd vector component is implicitly '1'
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to transform
	 * @param {mat3} m matrix to transform with
	 * @returns {vec2} out
	 */
	vec2.transformMat3 = function(out, a, m) {
	    var x = a[0],
	        y = a[1];
	    out[0] = m[0] * x + m[3] * y + m[6];
	    out[1] = m[1] * x + m[4] * y + m[7];
	    return out;
	};
	
	/**
	 * Transforms the vec2 with a mat4
	 * 3rd vector component is implicitly '0'
	 * 4th vector component is implicitly '1'
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to transform
	 * @param {mat4} m matrix to transform with
	 * @returns {vec2} out
	 */
	vec2.transformMat4 = function(out, a, m) {
	    var x = a[0], 
	        y = a[1];
	    out[0] = m[0] * x + m[4] * y + m[12];
	    out[1] = m[1] * x + m[5] * y + m[13];
	    return out;
	};
	
	/**
	 * Perform some operation over an array of vec2s.
	 *
	 * @param {Array} a the array of vectors to iterate over
	 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
	 * @param {Number} offset Number of elements to skip at the beginning of the array
	 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
	 * @param {Function} fn Function to call for each vector in the array
	 * @param {Object} [arg] additional argument to pass to fn
	 * @returns {Array} a
	 * @function
	 */
	vec2.forEach = (function() {
	    var vec = vec2.create();
	
	    return function(a, stride, offset, count, fn, arg) {
	        var i, l;
	        if(!stride) {
	            stride = 2;
	        }
	
	        if(!offset) {
	            offset = 0;
	        }
	        
	        if(count) {
	            l = Math.min((count * stride) + offset, a.length);
	        } else {
	            l = a.length;
	        }
	
	        for(i = offset; i < l; i += stride) {
	            vec[0] = a[i]; vec[1] = a[i+1];
	            fn(vec, vec, arg);
	            a[i] = vec[0]; a[i+1] = vec[1];
	        }
	        
	        return a;
	    };
	})();
	
	/**
	 * Returns a string representation of a vector
	 *
	 * @param {vec2} vec vector to represent as a string
	 * @returns {String} string representation of the vector
	 */
	vec2.str = function (a) {
	    return 'vec2(' + a[0] + ', ' + a[1] + ')';
	};
	
	module.exports = vec2;


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	var Buffer = __webpack_require__(10).Buffer;
	
	var Mesh = function(numVertices, drawMode, vertexUsage, colorUsage,
	                    normalUsage, texCoordUsage) {
	    this.numVertices = numVertices;
	    this.drawMode = drawMode;
	    this.buffers = {};
	
	    this.createBuffer('vertex', numVertices, 3, vertexUsage);
	    if (colorUsage) {
	        this.createBuffer('color', numVertices, 4, colorUsage);
	    }
	    if (normalUsage) {
	        this.createBuffer('normal', numVertices, 3, normalUsage);
	    }
	    if (texCoordUsage) {
	        this.createBuffer('texCoord', numVertices, 2, texCoordUsage);
	    }
	};
	
	Mesh.prototype.createBuffer = function(name, numVertices, stride, usage) {
	    this.buffers[name] = new Buffer(numVertices, stride, usage);
	    // Also store the buffer in this, for ease of access and backwards
	    // compatibility
	    this[name + 'Buffer'] = this.buffers[name];
	};
	
	Mesh.prototype.associate = function(shaderProgram) {
	    for (var bufferName in this.buffers) {
	        var buffer = this.buffers[bufferName];
	        // Convert bufferName to aAttributeName
	        var attributeName = 'a' + bufferName.charAt(0).toUpperCase() +
	                            bufferName.slice(1);
	        var attribute = shaderProgram.getAttribute(attributeName);
	        if (!attribute) {
	            console.error('Could not associate ' + attributeName +
	                          ' attribute');
	        }
	        buffer.associate(attribute);
	    }
	};
	
	Mesh.prototype.render = function(offset, numberOfVertices) {
	    if (numberOfVertices == null) {
	        numberOfVertices = this.numVertices;
	    }
	    gl.drawArrays(this.drawMode, offset || 0, numberOfVertices);
	};
	
	exports.Mesh = Mesh;


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	var Mesh = __webpack_require__(25).Mesh;
	
	var RectMesh = function(width, height, vertexUsage, colorUsage, normalUsage,
	                        texCoordUsage) {
	    Mesh.call(this, 4, gl.TRIANGLE_STRIP, vertexUsage, colorUsage,
	              normalUsage, texCoordUsage);
	
	    this.vertexBuffer.setValues([0, 0, 0,
	                                 0, height, 0,
	                                 width, 0, 0,
	                                 width, height, 0]);
	    if (texCoordUsage) {
	        this.texCoordBuffer.setValues([0, 1,
	                                       0, 0,
	                                       1, 1,
	                                       1, 0]);
	    }
	};
	RectMesh.prototype = Object.create(Mesh.prototype);
	RectMesh.prototype.constructor = RectMesh;
	
	exports.RectMesh = RectMesh;


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	var glMatrix = __webpack_require__(15);
	var vec3 = glMatrix.vec3;
	var quat = glMatrix.quat;
	var mat4 = glMatrix.mat4;
	
	var Transformation = function() {
	    this.position = vec3.create();
	    this.rotation = quat.create();
	    this.scale = vec3.create();
	    vec3.set(this.scale, 1, 1, 1);
	};
	
	Transformation.prototype.apply = function(matrix) {
	    mat4.fromRotationTranslation(matrix, this.rotation, this.position);
	    mat4.scale(matrix, matrix, this.scale);
	};
	
	exports.Transformation = Transformation;


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	exports.scale = __webpack_require__(29);
	exports.tuning = __webpack_require__(35);


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	exports.Scale = __webpack_require__(30);
	exports.Major = __webpack_require__(33);
	exports.Minor = __webpack_require__(34);


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	var EqualTemperament = __webpack_require__(31);
	/**
	 * Representation of a generic musical scale.  Can be subclassed to produce
	 * specific scales.
	 *
	 * @constructor
	 * @param {Number[]} degrees Array of integer degrees.
	 * @param {Tuning} [tuning] The scale's tuning.  Defaults to 12-tone ET.
	 */
	var Scale = function(degrees, tuning) {
	    this.degrees = degrees;
	    this.tuning = tuning || new EqualTemperament(12);
	};
	
	/**
	 * Get the frequency of a note in the scale.
	 *
	 * @constructor
	 * @param {Number} degree The note's degree.
	 * @param {Number} rootFrequency  The root frequency of the scale.
	 * @param {Number} octave The octave of the note.
	 * @return {Number} The frequency of the note in hz.
	 */
	Scale.prototype.getFrequency = function(degree, rootFrequency, octave) {
	    var frequency = rootFrequency;
	    octave += Math.floor(degree / this.degrees.length);
	    degree %= this.degrees.length;
	    frequency *= Math.pow(this.tuning.octaveRatio, octave);
	    frequency *= this.tuning.ratios[this.degrees[degree]];
	    return frequency;
	};
	
	module.exports = Scale;


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	var Tuning = __webpack_require__(32);
	
	/**
	 * Equal temperament tuning.
	 *
	 * @constructor
	 * @extends Tuning
	 * @param {Number} pitchesPerOctave The number of notes in each octave.
	 */
	var EqualTemperament = function(pitchesPerOctave) {
	    var semitones = [];
	    for (var i = 0; i < pitchesPerOctave; i++) {
	        semitones.push(i);
	    }
	    Tuning.call(this, semitones, 2);
	};
	EqualTemperament.prototype = Object.create(Tuning.prototype);
	EqualTemperament.prototype.constructor = Tuning;
	
	module.exports = EqualTemperament;


/***/ },
/* 32 */
/***/ function(module, exports) {

	/**
	 *  Representation of a generic musical tuning.  Can be subclassed to produce
	 * specific tunings.
	 *
	 * @constructor
	 * @param {Number[]} semitones Array of semitone values for the tuning.
	 * @param {Number} [octaveRatio=2] Frequency ratio for notes an octave apart.
	 */
	
	var Tuning = function(semitones, octaveRatio) {
	    this.semitones = semitones;
	    this.octaveRatio = octaveRatio || 2;
	    this.ratios = [];
	    var tuningLength = this.semitones.length;
	    for (var i = 0; i < tuningLength; i++) {
	        this.ratios.push(Math.pow(2, this.semitones[i] / tuningLength));
	    }
	};
	
	module.exports = Tuning;


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	var Scale = __webpack_require__(30);
	
	/**
	 * Major scale.
	 *
	 * @constructor
	 * @extends Scale
	 */
	var Major = function() {
	    Scale.call(this, [0, 2, 4, 5, 7, 9, 11]);
	};
	Major.prototype = Object.create(Scale.prototype);
	Major.prototype.constructor = Scale;
	
	module.exports = Major;


/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	var Scale = __webpack_require__(30);
	
	/**
	 * Minor scale.
	 *
	 * @constructor
	 * @extends Scale
	 */
	
	var Minor = function() {
	    Scale.call(this, [0, 2, 3, 5, 7, 8, 10]);
	};
	Minor.prototype = Object.create(Scale.prototype);
	Minor.prototype.constructor = Scale;
	
	module.exports = Minor;


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	exports.Tuning = __webpack_require__(32);
	exports.EqualTemperament = __webpack_require__(31);
	


/***/ },
/* 36 */
/***/ function(module, exports) {

	var Kybrd = function(element) {
	    element = element || document;
	    element.addEventListener('keydown', this._onKeyDown.bind(this));
	    element.addEventListener('keyup', this._onKeyUp.bind(this));
	
	    this._keys = {};
	};
	
	Kybrd.prototype.isPressed = function(key) {
	    return this._keys.hasOwnProperty(key);
	}
	
	Kybrd.prototype._onKeyDown = function(event) {
	    var code = event.which || event.keyCode;
	    var key = this._codeToKey(code);
	    this._keys[key] = true;
	};
	
	Kybrd.prototype._onKeyUp = function(event) {
	    var code = event.which || event.keyCode;
	    var key = this._codeToKey(code);
	    delete this._keys[key];
	};
	
	Kybrd.prototype._codeToKey = function(code) {
	    var key = Kybrd.KEYS[code];
	    var fKey = code - 111;
	    if (fKey > 0 && fKey < 13) {
	        key = 'f' + fKey;
	    }
	
	    if (!key) {
	        key = String.fromCharCode(code).toLowerCase();
	    }
	    return key;
	};
	
	Kybrd.KEYS = {
	    13: 'enter',
	    38: 'up',
	    40: 'down',
	    37: 'left',
	    39: 'right',
	    27: 'esc',
	    32: 'space',
	    8: 'backspace',
	    9: 'tab',
	    46: 'delete'
	};
	
	module.exports = Kybrd;


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	var ParticleSystem = __webpack_require__(38);
	var Particle = __webpack_require__(40);
	
	var RecyclingParticleSystem = function () {
	    ParticleSystem.call(this);
	    this.oldParticles = [];
	    this.particles = [];
	};
	RecyclingParticleSystem.prototype = Object.create(ParticleSystem.prototype);
	RecyclingParticleSystem.prototype.constructor = RecyclingParticleSystem;
	
	RecyclingParticleSystem.prototype.createParticle = function () {
	    var particle;
	    if (!this.oldParticles.length) {
	        particle = new Particle();
	    } else {
	        particle = this.oldParticles.pop();
	    }
	    this.particles.push(particle);
	    return particle;
	};
	
	RecyclingParticleSystem.prototype.recycleParticle = function (particle) {
	    var particle = this.removeParticle(particle);
	    particle.reset();
	    this.oldParticles.push(particle);
	};
	
	RecyclingParticleSystem.prototype.recycleParticleByIndex = function (index) {
	    var particle = this.removeParticleByIndex(index);
	    particle.reset();
	    this.oldParticles.push(particle);
	};
	
	RecyclingParticleSystem.prototype.removeParticle = function (particle) {
	    var index = this.particles.indexOf(particle);
	    if (index != -1) {
	        return this.particles.splice(index, 1)[0];
	    }
	    return null;
	};
	
	RecyclingParticleSystem.prototype.removeParticleByIndex = function (index) {
	    if (index < this.particles.length) {
	        return this.particles.splice(index, 1)[0];
	    }
	    return null;
	};
	
	RecyclingParticleSystem.prototype.removeForce = function (force) {
	    var index = this.forces.indexOf(force);
	    if (index != -1) {
	        return this.forces.splice(index, 1)[0];
	    }
	    return null;
	};
	
	module.exports = RecyclingParticleSystem;

/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	var vec2 = __webpack_require__(15).vec2;
	
	var Integrator = __webpack_require__(39);
	
	var ParticleSystem = function () {
	    this.integrator = new Integrator(this);
	    this.particles = [];
	    this.forces = [];
	};
	
	ParticleSystem.prototype.createParticle = function () {
	    var particle = new Particle();
	    this.particles.push(particle);
	    return particle;
	};
	
	ParticleSystem.prototype.tick = function (time) {
	    this.integrator.step(time);
	};
	
	ParticleSystem.prototype.clear = function () {
	    this.particles = [];
	    this.forces = [];
	};
	
	ParticleSystem.prototype.applyForces = function () {
	    var forces = this.forces;
	    var numberOfForces = forces.length;
	    for (var i = 0; i < numberOfForces; i++) {
	        forces[i].apply();
	    }
	};
	
	ParticleSystem.prototype.clearForces = function () {
	    var particles = this.particles;
	    var numberOfParticles = particles.length;
	    for (var i = 0; i < numberOfParticles; i++) {
	        vec2.set(particles[i].force, 0, 0);
	    }
	};
	
	ParticleSystem.prototype.removeParticle = function (particle) {
	    var type = typeof particle;
	    if (type == 'number') {
	        return this.particles.splice(particle, 1)[0];
	    } else if (type == 'object') {
	        var index = this.particles.indexOf(particle);
	        if (index != -1) {
	            return this.particles.splice(index, 1)[0];
	        }
	    }
	    return null;
	};
	
	ParticleSystem.prototype.removeForce = function (force) {
	    var type = typeof force;
	    if (type == 'number') {
	        return this.forces.splice(force, 1)[0];
	    } else if (type == 'object') {
	        var index = this.forces.indexOf(force);
	        if (index != -1) {
	            return this.forces.splice(index, 1)[0];
	        }
	    }
	    return null;
	};
	
	module.exports = ParticleSystem;

/***/ },
/* 39 */
/***/ function(module, exports) {

	var Integrator = function (s) {
	    this.s = s;
	};
	
	Integrator.prototype.step = function (dt) {
	    var s = this.s;
	    s.clearForces();
	    s.applyForces();
	
	    var particles = s.particles;
	    var numberOfParticles = particles.length;
	    for (var i = 0; i < numberOfParticles; i++) {
	        var p = particles[i];
	        var position = p.position;
	        var velocity = p.velocity;
	        var force = p.force;
	        var mass = p.mass;
	        // Remove function calls in hot loops
	        //vec2.scaleAndAdd(velocity, velocity, force, dt / mass);
	        //vec2.scaleAndAdd(position, position, velocity, dt);
	        velocity[0] += force[0] * dt / mass;
	        velocity[1] += force[1] * dt / mass;
	        position[0] += velocity[0] * dt;
	        position[1] += velocity[1] * dt;
	        p.age += dt;
	    }
	};
	
	module.exports = Integrator;

/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	var vec2 = __webpack_require__(15).vec2;
	
	var Particle = function () {
	    this.mass = 1;
	    this.position = vec2.create();
	    this.velocity = vec2.create();
	    this.force = vec2.create();
	    this.age = 0;
	};
	
	Particle.prototype.toString = function () {
	    return 'position: ' + this.position + '\n velocity: ' + this.velocity + '\n force: ' + this.force + '\n age: ' + this.age;
	};
	
	Particle.prototype.reset = function () {
	    this.mass = 1;
	    vec2.set(this.position, 0, 0);
	    vec2.set(this.velocity, 0, 0);
	    vec2.set(this.force, 0, 0);
	    this.age = 0;
	};
	
	module.exports = Particle;

/***/ },
/* 41 */
/***/ function(module, exports) {

	var OctaveDistributor = function () {
	    this.octaves = [];
	};
	
	OctaveDistributor.prototype.getOctave = function () {
	    if (!this.octaves.length) {
	        this.octaves.push(2, 3, 4, 5, 6);
	    }
	    var index = Math.floor(Math.random() * this.octaves.length);
	    return this.octaves.splice(index, 1)[0];
	};
	
	module.exports = OctaveDistributor;

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	var webglet = __webpack_require__(2);
	
	var RecyclingParticleSystem = __webpack_require__(37);
	var CloudIntegrator = __webpack_require__(43);
	var Color = __webpack_require__(44);
	
	var Cloud = function (app) {
	    this.app = app;
	
	    this.particleSystem = new RecyclingParticleSystem();
	    this.particleSystem.integrator = new CloudIntegrator(this.particleSystem);
	
	    this.mesh = new webglet.Mesh(100, gl.POINTS, gl.STREAM_DRAW, gl.STREAM_DRAW);
	};
	
	Cloud.prototype.update = function (dt) {
	    this.particleSystem.tick(dt);
	
	    var halfHeight = this.app.height() / 2;
	    var level = this.app.level;
	    var score = this.app.score;
	
	    var particleSystem = this.particleSystem;
	    var particles = particleSystem.particles;
	    var numberOfParticles = particles.length;
	
	    var colors = Color.PARTICLE_TABLE;
	    var numberOfColors = colors.length;
	
	    if (numberOfParticles > this.mesh.numVertices) {
	        this.mesh = new webglet.Mesh(numberOfParticles * 3, gl.POINTS, gl.STREAM_DRAW, gl.STREAM_DRAW);
	    }
	
	    var vertexBuffer = this.mesh.vertexBuffer.array;
	    var colorBuffer = this.mesh.colorBuffer.array;
	
	    var vertexCount = 0;
	    var colorCount = 0;
	
	    var pool = this.app.vec2Pool;
	    var sides = pool.create();
	    for (var i = numberOfParticles - 1; i >= 0; i--) {
	        var particle = particles[i];
	        var position = particle.position;
	
	        var xPos = position[0];
	        var yPos = position[1];
	
	        level.getSides(yPos, sides);
	        var left = sides[0];
	        var right = sides[1];
	
	        // Change age approximately 1 step per frame
	        var age = Math.floor(particle.age * 60);
	        // Bithack because particle table is power of 2
	        //var hue = age % numberOfColors;
	        var hue = age & numberOfColors - 1;
	        var color = colors[hue];
	
	        if (age > 200 || yPos < -halfHeight || yPos > halfHeight || xPos < left || xPos > right) {
	            particleSystem.recycleParticleByIndex(i);
	            score.increase();
	
	            if (xPos < left) {
	                level.setLeftColor(yPos, color);
	            } else if (xPos > right) {
	                level.setRightColor(yPos, color);
	            }
	        } else {
	            vertexBuffer[vertexCount++] = xPos;
	            vertexBuffer[vertexCount++] = yPos;
	            vertexBuffer[vertexCount++] = 0;
	            colorBuffer[colorCount++] = color[0];
	            colorBuffer[colorCount++] = color[1];
	            colorBuffer[colorCount++] = color[2];
	            colorBuffer[colorCount++] = color[3];
	        }
	    }
	    pool.recycle(sides);
	
	    //    this.mesh.vertexBuffer.null();
	    //    this.mesh.colorBuffer.null();
	    this.mesh.vertexBuffer.setValues(null, 0, vertexCount);
	    this.mesh.colorBuffer.setValues(null, 0, colorCount);
	};
	
	Cloud.prototype.draw = function () {
	    this.app.renderer.render(this.mesh, 0, this.particleSystem.particles.length);
	};
	
	module.exports = Cloud;

/***/ },
/* 43 */
/***/ function(module, exports) {

	var CloudIntegrator = function (s) {
	    this.s = s;
	};
	
	CloudIntegrator.prototype.step = function (dt) {
	    var particles = this.s.particles;
	    var numberOfParticles = particles.length;
	    for (var i = 0; i < numberOfParticles; i++) {
	        var p = particles[i];
	        var position = p.position;
	        var velocity = p.velocity;
	
	        // Remove hot function call
	        // vec2.scaleAndAdd(position, position, velocity, dt);
	        position[0] += velocity[0] * dt;
	        position[1] += velocity[1] * dt;
	        p.age += dt;
	    }
	};
	
	module.exports = CloudIntegrator;

/***/ },
/* 44 */
/***/ function(module, exports) {

	var Color = {};
	Color.hsvaToRGBA = function (h, s, v, a) {
	    if (s == 0) {
	        return [v, v, v, a];
	    }
	    var i = Math.floor(h * 6);
	    var f = h * 6 - i;
	    var p = v * (1 - s);
	    var q = v * (1 - s * f);
	    var t = v * (1 - s * (1 - f));
	    var i = i % 6;
	    if (i == 0) {
	        return [v, t, p, a];
	    }
	    if (i == 1) {
	        return [q, v, p, a];
	    }
	    if (i == 2) {
	        return [p, v, t, a];
	    }
	    if (i == 3) {
	        return [p, q, v, a];
	    }
	    if (i == 4) {
	        return [t, p, v, a];
	    }
	    if (i == 5) {
	        return [v, p, q, a];
	    }
	};
	
	var numberOfColors = 128;
	Color.PARTICLE_TABLE = [];
	for (var i = 0; i < numberOfColors; i++) {
	    Color.PARTICLE_TABLE.push(Color.hsvaToRGBA(i / numberOfColors, 1, 1, 1));
	}
	
	module.exports = Color;

/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	var Noise = __webpack_require__(46).Noise;
	var Deque = __webpack_require__(47);
	var vec2 = __webpack_require__(15).vec2;
	
	var webglet = __webpack_require__(2);
	
	var settings = __webpack_require__(48);
	
	Math.mod = function (a, b) {
	    return (a % b + b) % b;
	};
	
	var Level = function (app) {
	    this.app = app;
	
	    this.simplex = new Noise(Math.random());
	
	    this.resolution = 2048;
	    this.top = -this.app.maxHeight() / 2;
	    this.offset = 0;
	
	    this.left = new Deque(this.resolution);
	    this.right = new Deque(this.resolution);
	
	    this.leftColors = new Array(this.resolution);
	    this.rightColors = new Array(this.resolution);
	
	    this.numberOfLeftColors = 0;
	    this.numberOfRightColors = 0;
	
	    this.initialOffset = 0.27;
	    this.offsetPerPoint = 1 / 400000;
	    this.minOffset = 0.1;
	
	    this.initialSlowDeviation = 0.23;
	    this.deviationPerPoint = 1 / 600000;
	    this.maxSlowDeviation = 0.7;
	
	    this.leftDetails = {
	        xOffset: -this.initialOffset,
	        slowOffset: 0,
	        slowDeviation: this.initialSlowDeviation,
	        slowStep: 1.2,
	        fastOffset: this.app.maxHeight(),
	        fastDeviation: 0.05,
	        fastStep: 4
	    };
	
	    this.rightDetails = {
	        xOffset: this.initialOffset,
	        slowOffset: 0,
	        slowDeviation: this.initialSlowDeviation,
	        slowStep: 1.2,
	        fastOffset: this.app.maxHeight() * 2,
	        fastDeviation: 0.05,
	        fastStep: 4
	    };
	
	    for (var i = 0; i < this.resolution; i++) {
	        var yPos = i * this.app.maxHeight() / this.resolution - this.app.maxHeight() / 2;
	        this.left.push(this.calculateSide(yPos, this.leftDetails));
	        this.right.push(this.calculateSide(yPos, this.rightDetails));
	        this.leftColors[i] = null;
	        this.rightColors[i] = null;
	    }
	
	    this.leftMesh = new webglet.Mesh(this.app.maxHeightPx(), gl.LINE_STRIP, gl.STREAM_DRAW, gl.STATIC_DRAW);
	    this.rightMesh = new webglet.Mesh(this.app.maxHeightPx(), gl.LINE_STRIP, gl.STREAM_DRAW, gl.STATIC_DRAW);
	
	    this.leftColorMesh = new webglet.Mesh(this.app.maxHeightPx() * 2, gl.LINES, gl.STREAM_DRAW, gl.STREAM_DRAW);
	    this.rightColorMesh = new webglet.Mesh(this.app.maxHeightPx() * 2, gl.LINES, gl.STREAM_DRAW, gl.STREAM_DRAW);
	    this.updateModels();
	};
	
	Level.prototype.update = function (dt) {
	    this.updateDetails();
	    this.addToBottom(dt);
	    this.updateModels();
	};
	
	Level.prototype.updateDetails = function () {
	    var score = this.app.score.score;
	    var offset = this.initialOffset;
	    offset -= score * this.offsetPerPoint;
	    if (offset < this.minOffset) {
	        offset = this.minOffset;
	    }
	    this.leftDetails.xOffset = -offset;
	    this.rightDetails.xOffset = offset;
	
	    var deviation = this.initialSlowDeviation;
	    deviation += score * this.deviationPerPoint;
	    if (deviation > this.maxSlowDeviation) {
	        deviation = this.maxSlowDeviation;
	    }
	    this.leftDetails.slowDeviation = deviation;
	    this.rightDetails.slowDeviation = deviation;
	};
	
	Level.prototype.addToBottom = function (dt) {
	    this.offset += settings.velocity * dt;
	    this.top -= settings.velocity * dt;
	    while (this.top < -this.app.maxHeight() / 2) {
	        this.left.shift();
	        this.right.shift();
	        this.left.push(this.calculateSide(this.offset + this.top + this.app.maxHeight(), this.leftDetails));
	        this.right.push(this.calculateSide(this.offset + this.top + this.app.maxHeight(), this.rightDetails));
	        this.leftColors.shift();
	        this.rightColors.shift();
	        this.leftColors.push(null);
	        this.rightColors.push(null);
	        this.top += this.app.maxHeight() / this.resolution;
	    }
	};
	
	Level.prototype.updateModels = function () {
	    var leftVertexBuffer = this.leftMesh.vertexBuffer.array;
	    var leftColorBuffer = this.leftMesh.colorBuffer.array;
	    var rightVertexBuffer = this.rightMesh.vertexBuffer.array;
	    var rightColorBuffer = this.rightMesh.colorBuffer.array;
	
	    var leftBarVertexBuffer = this.leftColorMesh.vertexBuffer.array;
	    var leftBarColorBuffer = this.leftColorMesh.colorBuffer.array;
	    var rightBarVertexBuffer = this.rightColorMesh.vertexBuffer.array;
	    var rightBarColorBuffer = this.rightColorMesh.colorBuffer.array;
	
	    var leftVertexCount = 0;
	    var leftColorCount = 0;
	    var rightVertexCount = 0;
	    var rightColorCount = 0;
	
	    var leftBarVertexCount = 0;
	    var leftBarColorCount = 0;
	    var rightBarVertexCount = 0;
	    var rightBarColorCount = 0;
	
	    var width = this.app.width();
	    var halfWidth = width / 2;
	    var heightPx = this.app.heightPx();
	    var top = -this.app.height() / 2;
	
	    var pool = this.app.vec2Pool;
	    var sides = pool.create();
	    var colors = Array(2);
	    for (var i = 0; i < heightPx; i++) {
	        var yPos = top + this.app.pxToLength(i);
	        this.getSides(yPos, sides);
	
	        leftVertexBuffer[leftVertexCount++] = sides[0];
	        leftVertexBuffer[leftVertexCount++] = yPos;
	        leftVertexBuffer[leftVertexCount++] = 0;
	
	        rightVertexBuffer[rightVertexCount++] = sides[1];
	        rightVertexBuffer[rightVertexCount++] = yPos;
	        rightVertexBuffer[rightVertexCount++] = 0;
	
	        leftColorBuffer[leftColorCount++] = 1;
	        leftColorBuffer[leftColorCount++] = 1;
	        leftColorBuffer[leftColorCount++] = 1;
	        leftColorBuffer[leftColorCount++] = 1;
	
	        rightColorBuffer[rightColorCount++] = 1;
	        rightColorBuffer[rightColorCount++] = 1;
	        rightColorBuffer[rightColorCount++] = 1;
	        rightColorBuffer[rightColorCount++] = 1;
	
	        this.getColors(yPos, colors);
	        var leftColor = colors[0];
	        var rightColor = colors[1];
	
	        if (leftColor != null) {
	            leftBarVertexBuffer[leftBarVertexCount++] = -halfWidth;
	            leftBarVertexBuffer[leftBarVertexCount++] = yPos;
	            leftBarVertexBuffer[leftBarVertexCount++] = 0;
	            leftBarVertexBuffer[leftBarVertexCount++] = sides[0];
	            leftBarVertexBuffer[leftBarVertexCount++] = yPos;
	            leftBarVertexBuffer[leftBarVertexCount++] = 0;
	
	            leftBarColorBuffer[leftBarColorCount++] = leftColor[0];
	            leftBarColorBuffer[leftBarColorCount++] = leftColor[1];
	            leftBarColorBuffer[leftBarColorCount++] = leftColor[2];
	            leftBarColorBuffer[leftBarColorCount++] = leftColor[3];
	            leftBarColorBuffer[leftBarColorCount++] = leftColor[0];
	            leftBarColorBuffer[leftBarColorCount++] = leftColor[1];
	            leftBarColorBuffer[leftBarColorCount++] = leftColor[2];
	            leftBarColorBuffer[leftBarColorCount++ * 8 + 7] = leftColor[3];
	        }
	        if (rightColor != null) {
	            rightBarVertexBuffer[rightBarVertexCount++] = sides[1];
	            rightBarVertexBuffer[rightBarVertexCount++] = yPos;
	            rightBarVertexBuffer[rightBarVertexCount++] = 0;
	            rightBarVertexBuffer[rightBarVertexCount++] = halfWidth;
	            rightBarVertexBuffer[rightBarVertexCount++] = yPos;
	            rightBarVertexBuffer[rightBarVertexCount++] = 0;
	
	            rightBarColorBuffer[rightBarColorCount++] = rightColor[0];
	            rightBarColorBuffer[rightBarColorCount++] = rightColor[1];
	            rightBarColorBuffer[rightBarColorCount++] = rightColor[2];
	            rightBarColorBuffer[rightBarColorCount++] = rightColor[3];
	            rightBarColorBuffer[rightBarColorCount++] = rightColor[0];
	            rightBarColorBuffer[rightBarColorCount++] = rightColor[1];
	            rightBarColorBuffer[rightBarColorCount++] = rightColor[2];
	            rightBarColorBuffer[rightBarColorCount++] = rightColor[3];
	        }
	    }
	    pool.recycle(sides);
	
	    this.leftMesh.vertexBuffer.setValues(null, 0, leftVertexCount);
	    this.leftMesh.colorBuffer.setValues(null, 0, leftColorCount);
	    this.rightMesh.vertexBuffer.setValues(null, 0, rightVertexCount);
	    this.rightMesh.colorBuffer.setValues(null, 0, rightColorCount);
	
	    this.leftColorMesh.vertexBuffer.setValues(null, 0, leftBarVertexCount);
	    this.leftColorMesh.colorBuffer.setValues(null, 0, leftBarColorCount);
	    this.rightColorMesh.vertexBuffer.setValues(null, 0, rightBarVertexCount);
	    this.rightColorMesh.colorBuffer.setValues(null, 0, rightBarColorCount);
	
	    this.numberOfLeftColors = leftBarVertexCount / 6;
	    this.numberOfRightColors = rightBarVertexCount / 6;
	};
	
	Level.prototype.draw = function () {
	    this.app.renderer.render(this.leftMesh, 0, this.app.heightPx());
	    this.app.renderer.render(this.rightMesh, 0, this.app.heightPx());
	
	    this.app.renderer.render(this.leftColorMesh, 0, this.numberOfLeftColors * 2);
	    this.app.renderer.render(this.rightColorMesh, 0, this.numberOfRightColors * 2);
	};
	
	Level.prototype.calculateSide = function (yPos, details) {
	    var x = 0;
	    x += details.xOffset;
	
	    var slowPos = details.slowOffset;
	    slowPos += yPos * details.slowStep;
	    x += details.slowDeviation * this.simplex.simplex2(0, slowPos);
	
	    var fastPos = details.fastOffset;
	    fastPos += yPos * details.fastStep;
	    x += details.fastDeviation * this.simplex.simplex2(0, fastPos);
	    return x;
	};
	
	Level.prototype.getSides = function (yPos, vec) {
	    var yPosAsPercentageOfMaxHeight = yPos / this.app.maxHeight() + 0.5;
	    var yIndex = yPosAsPercentageOfMaxHeight * this.resolution;
	
	    var yIndexFract = yIndex;
	    yIndex = Math.floor(yIndex);
	    yIndexFract = yIndexFract - yIndex;
	
	    var leftA = this.left.get(yIndex);
	    var leftB = this.left.get(yIndex + 1) || leftA;
	    var left = yIndexFract * leftB + (1 - yIndexFract) * leftA;
	
	    var rightA = this.right.get(yIndex);
	    var rightB = this.right.get(yIndex + 1) || rightA;
	    var right = yIndexFract * rightB + (1 - yIndexFract) * rightA;
	    vec2.set(vec, left, right);
	};
	
	Level.prototype.getColors = function (yPos, colors) {
	    var yPosAsPercentageOfMaxHeight = yPos / this.app.maxHeight() + 0.5;
	    var yIndex = Math.floor(yPosAsPercentageOfMaxHeight * this.resolution);
	    colors[0] = this.leftColors[yIndex];
	    colors[1] = this.rightColors[yIndex];
	};
	
	Level.prototype.setLeftColor = function (yPos, color) {
	    var yPosAsPercentageOfMaxHeight = yPos / this.app.maxHeight() + 0.5;
	    var yIndex = Math.floor(yPosAsPercentageOfMaxHeight * this.resolution);
	    this.leftColors[yIndex] = color;
	};
	
	Level.prototype.setRightColor = function (yPos, color) {
	    var yPosAsPercentageOfMaxHeight = yPos / this.app.maxHeight() + 0.5;
	    var yIndex = Math.floor(yPosAsPercentageOfMaxHeight * this.resolution);
	    this.rightColors[yIndex] = color;
	};
	
	module.exports = Level;

/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * A speed-improved perlin and simplex noise algorithms for 2D.
	 *
	 * Based on example code by Stefan Gustavson (stegu@itn.liu.se).
	 * Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
	 * Better rank ordering method by Stefan Gustavson in 2012.
	 * Converted to Javascript by Joseph Gentle.
	 *
	 * Version 2012-03-09
	 *
	 * This code was placed in the public domain by its original author,
	 * Stefan Gustavson. You may use it as you see fit, but
	 * attribution is appreciated.
	 *
	 */
	
	(function(global){
	
	  // Passing in seed will seed this Noise instance
	  function Noise(seed) {
	    function Grad(x, y, z) {
	      this.x = x; this.y = y; this.z = z;
	    }
	
	    Grad.prototype.dot2 = function(x, y) {
	      return this.x*x + this.y*y;
	    };
	
	    Grad.prototype.dot3 = function(x, y, z) {
	      return this.x*x + this.y*y + this.z*z;
	    };
	
	    this.grad3 = [new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
	                 new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
	                 new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1)];
	
	    this.p = [151,160,137,91,90,15,
	    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
	    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
	    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
	    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
	    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
	    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
	    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
	    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
	    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
	    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
	    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
	    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
	    // To remove the need for index wrapping, double the permutation table length
	    this.perm = new Array(512);
	    this.gradP = new Array(512);
	
	    this.seed(seed || 0);
	  }
	
	  // This isn't a very good seeding function, but it works ok. It supports 2^16
	  // different seed values. Write something better if you need more seeds.
	  Noise.prototype.seed = function(seed) {
	    if(seed > 0 && seed < 1) {
	      // Scale the seed out
	      seed *= 65536;
	    }
	
	    seed = Math.floor(seed);
	    if(seed < 256) {
	      seed |= seed << 8;
	    }
	
	    var p = this.p;
	    for(var i = 0; i < 256; i++) {
	      var v;
	      if (i & 1) {
	        v = p[i] ^ (seed & 255);
	      } else {
	        v = p[i] ^ ((seed>>8) & 255);
	      }
	
	      var perm = this.perm;
	      var gradP = this.gradP;
	      perm[i] = perm[i + 256] = v;
	      gradP[i] = gradP[i + 256] = this.grad3[v % 12];
	    }
	  };
	
	  /*
	  for(var i=0; i<256; i++) {
	    perm[i] = perm[i + 256] = p[i];
	    gradP[i] = gradP[i + 256] = grad3[perm[i] % 12];
	  }*/
	
	  // Skewing and unskewing factors for 2, 3, and 4 dimensions
	  var F2 = 0.5*(Math.sqrt(3)-1);
	  var G2 = (3-Math.sqrt(3))/6;
	
	  var F3 = 1/3;
	  var G3 = 1/6;
	
	  // 2D simplex noise
	  Noise.prototype.simplex2 = function(xin, yin) {
	    var n0, n1, n2; // Noise contributions from the three corners
	    // Skew the input space to determine which simplex cell we're in
	    var s = (xin+yin)*F2; // Hairy factor for 2D
	    var i = Math.floor(xin+s);
	    var j = Math.floor(yin+s);
	    var t = (i+j)*G2;
	    var x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
	    var y0 = yin-j+t;
	    // For the 2D case, the simplex shape is an equilateral triangle.
	    // Determine which simplex we are in.
	    var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
	    if(x0>y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
	      i1=1; j1=0;
	    } else {    // upper triangle, YX order: (0,0)->(0,1)->(1,1)
	      i1=0; j1=1;
	    }
	    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
	    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
	    // c = (3-sqrt(3))/6
	    var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
	    var y1 = y0 - j1 + G2;
	    var x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
	    var y2 = y0 - 1 + 2 * G2;
	    // Work out the hashed gradient indices of the three simplex corners
	    i &= 255;
	    j &= 255;
	
	    var perm = this.perm;
	    var gradP = this.gradP;
	    var gi0 = gradP[i+perm[j]];
	    var gi1 = gradP[i+i1+perm[j+j1]];
	    var gi2 = gradP[i+1+perm[j+1]];
	    // Calculate the contribution from the three corners
	    var t0 = 0.5 - x0*x0-y0*y0;
	    if(t0<0) {
	      n0 = 0;
	    } else {
	      t0 *= t0;
	      n0 = t0 * t0 * gi0.dot2(x0, y0);  // (x,y) of grad3 used for 2D gradient
	    }
	    var t1 = 0.5 - x1*x1-y1*y1;
	    if(t1<0) {
	      n1 = 0;
	    } else {
	      t1 *= t1;
	      n1 = t1 * t1 * gi1.dot2(x1, y1);
	    }
	    var t2 = 0.5 - x2*x2-y2*y2;
	    if(t2<0) {
	      n2 = 0;
	    } else {
	      t2 *= t2;
	      n2 = t2 * t2 * gi2.dot2(x2, y2);
	    }
	    // Add contributions from each corner to get the final noise value.
	    // The result is scaled to return values in the interval [-1,1].
	    return 70 * (n0 + n1 + n2);
	  };
	
	  // 3D simplex noise
	  Noise.prototype.simplex3 = function(xin, yin, zin) {
	    var n0, n1, n2, n3; // Noise contributions from the four corners
	
	    // Skew the input space to determine which simplex cell we're in
	    var s = (xin+yin+zin)*F3; // Hairy factor for 2D
	    var i = Math.floor(xin+s);
	    var j = Math.floor(yin+s);
	    var k = Math.floor(zin+s);
	
	    var t = (i+j+k)*G3;
	    var x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
	    var y0 = yin-j+t;
	    var z0 = zin-k+t;
	
	    // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
	    // Determine which simplex we are in.
	    var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
	    var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
	    if(x0 >= y0) {
	      if(y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
	      else if(x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
	      else              { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
	    } else {
	      if(y0 < z0)      { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
	      else if(x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
	      else             { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
	    }
	    // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
	    // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
	    // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
	    // c = 1/6.
	    var x1 = x0 - i1 + G3; // Offsets for second corner
	    var y1 = y0 - j1 + G3;
	    var z1 = z0 - k1 + G3;
	
	    var x2 = x0 - i2 + 2 * G3; // Offsets for third corner
	    var y2 = y0 - j2 + 2 * G3;
	    var z2 = z0 - k2 + 2 * G3;
	
	    var x3 = x0 - 1 + 3 * G3; // Offsets for fourth corner
	    var y3 = y0 - 1 + 3 * G3;
	    var z3 = z0 - 1 + 3 * G3;
	
	    // Work out the hashed gradient indices of the four simplex corners
	    i &= 255;
	    j &= 255;
	    k &= 255;
	
	    var perm = this.perm;
	    var gradP = this.gradP;
	    var gi0 = gradP[i+   perm[j+   perm[k   ]]];
	    var gi1 = gradP[i+i1+perm[j+j1+perm[k+k1]]];
	    var gi2 = gradP[i+i2+perm[j+j2+perm[k+k2]]];
	    var gi3 = gradP[i+ 1+perm[j+ 1+perm[k+ 1]]];
	
	    // Calculate the contribution from the four corners
	    var t0 = 0.5 - x0*x0-y0*y0-z0*z0;
	    if(t0<0) {
	      n0 = 0;
	    } else {
	      t0 *= t0;
	      n0 = t0 * t0 * gi0.dot3(x0, y0, z0);  // (x,y) of grad3 used for 2D gradient
	    }
	    var t1 = 0.5 - x1*x1-y1*y1-z1*z1;
	    if(t1<0) {
	      n1 = 0;
	    } else {
	      t1 *= t1;
	      n1 = t1 * t1 * gi1.dot3(x1, y1, z1);
	    }
	    var t2 = 0.5 - x2*x2-y2*y2-z2*z2;
	    if(t2<0) {
	      n2 = 0;
	    } else {
	      t2 *= t2;
	      n2 = t2 * t2 * gi2.dot3(x2, y2, z2);
	    }
	    var t3 = 0.5 - x3*x3-y3*y3-z3*z3;
	    if(t3<0) {
	      n3 = 0;
	    } else {
	      t3 *= t3;
	      n3 = t3 * t3 * gi3.dot3(x3, y3, z3);
	    }
	    // Add contributions from each corner to get the final noise value.
	    // The result is scaled to return values in the interval [-1,1].
	    return 32 * (n0 + n1 + n2 + n3);
	
	  };
	
	  // ##### Perlin noise stuff
	
	  function fade(t) {
	    return t*t*t*(t*(t*6-15)+10);
	  }
	
	  function lerp(a, b, t) {
	    return (1-t)*a + t*b;
	  }
	
	  // 2D Perlin Noise
	  Noise.prototype.perlin2 = function(x, y) {
	    // Find unit grid cell containing point
	    var X = Math.floor(x), Y = Math.floor(y);
	    // Get relative xy coordinates of point within that cell
	    x = x - X; y = y - Y;
	    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
	    X = X & 255; Y = Y & 255;
	
	    // Calculate noise contributions from each of the four corners
	    var perm = this.perm;
	    var gradP = this.gradP;
	    var n00 = gradP[X+perm[Y]].dot2(x, y);
	    var n01 = gradP[X+perm[Y+1]].dot2(x, y-1);
	    var n10 = gradP[X+1+perm[Y]].dot2(x-1, y);
	    var n11 = gradP[X+1+perm[Y+1]].dot2(x-1, y-1);
	
	    // Compute the fade curve value for x
	    var u = fade(x);
	
	    // Interpolate the four results
	    return lerp(
	        lerp(n00, n10, u),
	        lerp(n01, n11, u),
	       fade(y));
	  };
	
	  // 3D Perlin Noise
	  Noise.prototype.perlin3 = function(x, y, z) {
	    // Find unit grid cell containing point
	    var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
	    // Get relative xyz coordinates of point within that cell
	    x = x - X; y = y - Y; z = z - Z;
	    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
	    X = X & 255; Y = Y & 255; Z = Z & 255;
	
	    // Calculate noise contributions from each of the eight corners
	    var perm = this.perm;
	    var gradP = this.gradP;
	    var n000 = gradP[X+  perm[Y+  perm[Z  ]]].dot3(x,   y,     z);
	    var n001 = gradP[X+  perm[Y+  perm[Z+1]]].dot3(x,   y,   z-1);
	    var n010 = gradP[X+  perm[Y+1+perm[Z  ]]].dot3(x,   y-1,   z);
	    var n011 = gradP[X+  perm[Y+1+perm[Z+1]]].dot3(x,   y-1, z-1);
	    var n100 = gradP[X+1+perm[Y+  perm[Z  ]]].dot3(x-1,   y,   z);
	    var n101 = gradP[X+1+perm[Y+  perm[Z+1]]].dot3(x-1,   y, z-1);
	    var n110 = gradP[X+1+perm[Y+1+perm[Z  ]]].dot3(x-1, y-1,   z);
	    var n111 = gradP[X+1+perm[Y+1+perm[Z+1]]].dot3(x-1, y-1, z-1);
	
	    // Compute the fade curve value for x, y, z
	    var u = fade(x);
	    var v = fade(y);
	    var w = fade(z);
	
	    // Interpolate
	    return lerp(
	        lerp(
	          lerp(n000, n100, u),
	          lerp(n001, n101, u), w),
	        lerp(
	          lerp(n010, n110, u),
	          lerp(n011, n111, u), w),
	       v);
	  };
	
	  global.Noise = Noise;
	
	})( false ? this : module.exports);


/***/ },
/* 47 */
/***/ function(module, exports) {

	/**
	 * Copyright (c) 2013 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */
	"use strict";
	function Deque(capacity) {
	    this._capacity = getCapacity(capacity);
	    this._length = 0;
	    this._front = 0;
	    if (isArray(capacity)) {
	        var len = capacity.length;
	        for (var i = 0; i < len; ++i) {
	            this[i] = capacity[i];
	        }
	        this._length = len;
	    }
	}
	
	Deque.prototype.toArray = function Deque$toArray() {
	    var len = this._length;
	    var ret = new Array(len);
	    var front = this._front;
	    var capacity = this._capacity;
	    for (var j = 0; j < len; ++j) {
	        ret[j] = this[(front + j) & (capacity - 1)];
	    }
	    return ret;
	};
	
	Deque.prototype.push = function Deque$push(item) {
	    var argsLength = arguments.length;
	    var length = this._length;
	    if (argsLength > 1) {
	        var capacity = this._capacity;
	        if (length + argsLength > capacity) {
	            for (var i = 0; i < argsLength; ++i) {
	                this._checkCapacity(length + 1);
	                var j = (this._front + length) & (this._capacity - 1);
	                this[j] = arguments[i];
	                length++;
	                this._length = length;
	            }
	            return length;
	        }
	        else {
	            var j = this._front;
	            for (var i = 0; i < argsLength; ++i) {
	                this[(j + length) & (capacity - 1)] = arguments[i];
	                j++;
	            }
	            this._length = length + argsLength;
	            return length + argsLength;
	        }
	
	    }
	
	    if (argsLength === 0) return length;
	
	    this._checkCapacity(length + 1);
	    var i = (this._front + length) & (this._capacity - 1);
	    this[i] = item;
	    this._length = length + 1;
	    return length + 1;
	};
	
	Deque.prototype.pop = function Deque$pop() {
	    var length = this._length;
	    if (length === 0) {
	        return void 0;
	    }
	    var i = (this._front + length - 1) & (this._capacity - 1);
	    var ret = this[i];
	    this[i] = void 0;
	    this._length = length - 1;
	    return ret;
	};
	
	Deque.prototype.shift = function Deque$shift() {
	    var length = this._length;
	    if (length === 0) {
	        return void 0;
	    }
	    var front = this._front;
	    var ret = this[front];
	    this[front] = void 0;
	    this._front = (front + 1) & (this._capacity - 1);
	    this._length = length - 1;
	    return ret;
	};
	
	Deque.prototype.unshift = function Deque$unshift(item) {
	    var length = this._length;
	    var argsLength = arguments.length;
	
	
	    if (argsLength > 1) {
	        var capacity = this._capacity;
	        if (length + argsLength > capacity) {
	            for (var i = argsLength - 1; i >= 0; i--) {
	                this._checkCapacity(length + 1);
	                var capacity = this._capacity;
	                var j = (((( this._front - 1 ) &
	                    ( capacity - 1) ) ^ capacity ) - capacity );
	                this[j] = arguments[i];
	                length++;
	                this._length = length;
	                this._front = j;
	            }
	            return length;
	        }
	        else {
	            var front = this._front;
	            for (var i = argsLength - 1; i >= 0; i--) {
	                var j = (((( front - 1 ) &
	                    ( capacity - 1) ) ^ capacity ) - capacity );
	                this[j] = arguments[i];
	                front = j;
	            }
	            this._front = front;
	            this._length = length + argsLength;
	            return length + argsLength;
	        }
	    }
	
	    if (argsLength === 0) return length;
	
	    this._checkCapacity(length + 1);
	    var capacity = this._capacity;
	    var i = (((( this._front - 1 ) &
	        ( capacity - 1) ) ^ capacity ) - capacity );
	    this[i] = item;
	    this._length = length + 1;
	    this._front = i;
	    return length + 1;
	};
	
	Deque.prototype.peekBack = function Deque$peekBack() {
	    var length = this._length;
	    if (length === 0) {
	        return void 0;
	    }
	    var index = (this._front + length - 1) & (this._capacity - 1);
	    return this[index];
	};
	
	Deque.prototype.peekFront = function Deque$peekFront() {
	    if (this._length === 0) {
	        return void 0;
	    }
	    return this[this._front];
	};
	
	Deque.prototype.get = function Deque$get(index) {
	    var i = index;
	    if ((i !== (i | 0))) {
	        return void 0;
	    }
	    var len = this._length;
	    if (i < 0) {
	        i = i + len;
	    }
	    if (i < 0 || i >= len) {
	        return void 0;
	    }
	    return this[(this._front + i) & (this._capacity - 1)];
	};
	
	Deque.prototype.isEmpty = function Deque$isEmpty() {
	    return this._length === 0;
	};
	
	Deque.prototype.clear = function Deque$clear() {
	    var len = this._length;
	    var front = this._front;
	    var capacity = this._capacity;
	    for (var j = 0; j < len; ++j) {
	        this[(front + j) & (capacity - 1)] = void 0;
	    }
	    this._length = 0;
	    this._front = 0;
	};
	
	Deque.prototype.toString = function Deque$toString() {
	    return this.toArray().toString();
	};
	
	Deque.prototype.valueOf = Deque.prototype.toString;
	Deque.prototype.removeFront = Deque.prototype.shift;
	Deque.prototype.removeBack = Deque.prototype.pop;
	Deque.prototype.insertFront = Deque.prototype.unshift;
	Deque.prototype.insertBack = Deque.prototype.push;
	Deque.prototype.enqueue = Deque.prototype.push;
	Deque.prototype.dequeue = Deque.prototype.shift;
	Deque.prototype.toJSON = Deque.prototype.toArray;
	
	Object.defineProperty(Deque.prototype, "length", {
	    get: function() {
	        return this._length;
	    },
	    set: function() {
	        throw new RangeError("");
	    }
	});
	
	Deque.prototype._checkCapacity = function Deque$_checkCapacity(size) {
	    if (this._capacity < size) {
	        this._resizeTo(getCapacity(this._capacity * 1.5 + 16));
	    }
	};
	
	Deque.prototype._resizeTo = function Deque$_resizeTo(capacity) {
	    var oldCapacity = this._capacity;
	    this._capacity = capacity;
	    var front = this._front;
	    var length = this._length;
	    if (front + length > oldCapacity) {
	        var moveItemsCount = (front + length) & (oldCapacity - 1);
	        arrayMove(this, 0, this, oldCapacity, moveItemsCount);
	    }
	};
	
	
	var isArray = Array.isArray;
	
	function arrayMove(src, srcIndex, dst, dstIndex, len) {
	    for (var j = 0; j < len; ++j) {
	        dst[j + dstIndex] = src[j + srcIndex];
	        src[j + srcIndex] = void 0;
	    }
	}
	
	function pow2AtLeast(n) {
	    n = n >>> 0;
	    n = n - 1;
	    n = n | (n >> 1);
	    n = n | (n >> 2);
	    n = n | (n >> 4);
	    n = n | (n >> 8);
	    n = n | (n >> 16);
	    return n + 1;
	}
	
	function getCapacity(capacity) {
	    if (typeof capacity !== "number") {
	        if (isArray(capacity)) {
	            capacity = capacity.length;
	        }
	        else {
	            return 16;
	        }
	    }
	    return pow2AtLeast(
	        Math.min(
	            Math.max(16, capacity), 1073741824)
	    );
	}
	
	module.exports = Deque;


/***/ },
/* 48 */
/***/ function(module, exports) {

	/* Physics settings */
	exports.velocity = 0.25;
	exports.attractionConstant = 100;
	exports.minAttractionDistance = 0;
	exports.maxAttractionDistance = 0.05;
	exports.springConstant = 200;
	exports.springDampingConstant = 20;
	exports.springRestLength = 0.02;
	exports.cloudParticleVelocity = 0.06;
	exports.baseTurningSpeed = 0.005;
	exports.turningSpeedMultiplier = 7E-8;
	
	/* Audio settings */
	exports.bpm = 140;
	exports.bitRate = 6;
	
	/* UI settings */
	exports.countdownFontSize = 72;
	exports.scoreFontSizeLarge = 36;
	exports.scoreFontSizeSmall = 20;
	exports.scoreFontBreakWidth = 600;

/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	var webglet = __webpack_require__(2);
	var glMatrix = __webpack_require__(15);
	var vec2 = glMatrix.vec2;
	var quat = glMatrix.quat;
	
	var AudioReactiveMesh = __webpack_require__(50);
	var Color = __webpack_require__(44);
	
	var GoodGuy = function (app) {
	    this.app = app;
	
	    this.numberOfPoints = 100;
	    this.radius = 0.02;
	    this.springOut = null;
	
	    this.particle = this.app.particleSystem.createParticle();
	    this.center();
	
	    this.transformation = new webglet.Transformation();
	    this.angle = 0;
	
	    this.mesh = new webglet.Mesh(this.numberOfPoints, gl.LINE_STRIP, gl.STATIC_DRAW, gl.STATIC_DRAW);
	    this.initAudioReactiveMesh();
	    this.initColors();
	};
	
	for (var method in AudioReactiveMesh) {
	    GoodGuy.prototype[method] = AudioReactiveMesh[method];
	}
	
	GoodGuy.prototype.initColors = function () {
	    var colorBuffer = this.mesh.colorBuffer.array;
	
	    var dHue = 1 / this.numberOfPoints;
	    for (var i = 0; i < this.numberOfPoints; i++) {
	        var hue = i * dHue;
	        var color = Color.hsvaToRGBA(hue, 1, 1, 1);
	        var index = i * 4;
	        colorBuffer[index + 0] = color[0];
	        colorBuffer[index + 1] = color[1];
	        colorBuffer[index + 2] = color[2];
	        colorBuffer[index + 3] = color[3];
	    }
	    this.mesh.colorBuffer.setValues();
	};
	
	GoodGuy.prototype.center = function () {
	    var pool = this.app.vec2Pool;
	    var sides = pool.create();
	    this.app.level.getSides(0, sides);
	    this.particle.position[0] = (sides[0] + sides[1]) / 2;
	    pool.recycle(sides);
	};
	
	GoodGuy.prototype.update = function () {
	    var pool = this.app.vec2Pool;
	    var sides = pool.create();
	    this.app.level.getSides(0, sides);
	
	    var width = this.app.width();
	    var height = this.app.height();
	    var halfWidth = width / 2;
	    var halfHeight = height / 2;
	    var left = sides[0];
	    var right = sides[1];
	    pool.recycle(sides);
	
	    var xPos = this.particle.position[0];
	    var yPos = this.particle.position[1];
	
	    if (xPos < -halfWidth || xPos > halfWidth || yPos < -halfHeight || yPos > halfHeight) {
	        this.app.shouldUpdate = false;
	        this.particle.position[0] = (left + right) / 2;
	        this.particle.velocity[0] = 0;
	        this.app.ui.startCountdown();
	        return;
	    }
	
	    if (xPos < left || xPos > right) {
	        this.app.score.decrease();
	    }
	
	    this.handleSirenCollisions();
	
	    this.angle += 0.2;
	    var halfAngle = this.angle / 2;
	    quat.set(this.transformation.rotation, Math.cos(halfAngle), Math.sin(halfAngle), 0, 0);
	    vec2.copy(this.transformation.position, this.particle.position);
	};
	
	GoodGuy.prototype.draw = function () {
	    gl.lineWidth(3);
	    this.app.modelview.pushMatrix();
	    this.transformation.apply(this.app.modelview.matrix);
	    this.app.renderer.setUniform('uModelviewMatrix', this.app.modelview.matrix);
	    this.app.renderer.render(this.mesh);
	    this.app.modelview.popMatrix();
	    gl.lineWidth(1);
	};
	
	GoodGuy.prototype.handleSirenCollisions = function () {
	    var sirens = this.app.sirens;
	    var numberOfSirens = sirens.length;
	    var position = this.particle.position;
	    var pool = this.app.vec2Pool;
	    var diff = pool.create();
	    for (var i = 0; i < numberOfSirens; i++) {
	        var siren = sirens[i];
	        if (!siren.connected) {
	            vec2.subtract(diff, position, siren.particle.position);
	            var distance = vec2.length(diff);
	            if (distance < this.radius + siren.radius) {
	                siren.attach();
	                this.app.multiplier += 1;
	            }
	        }
	    }
	    pool.recycle(diff);
	};
	
	module.exports = GoodGuy;

/***/ },
/* 50 */
/***/ function(module, exports) {

	var AudioReactiveMesh = {};
	
	AudioReactiveMesh.initAudioReactiveMesh = function () {
	    this.lastChannel = null;
	    this.channelPosition = 0;
	    this.framesPerChannel = 0;
	
	    this.initVertices();
	};
	
	AudioReactiveMesh.initVertices = function () {
	    var vertexBuffer = this.mesh.vertexBuffer.array;
	
	    var dTheta = 2 * Math.PI / (this.numberOfPoints - 1);
	
	    for (var i = 0; i < this.numberOfPoints; i++) {
	        var theta = i * dTheta;
	        var index = i * 3;
	        vertexBuffer[index + 0] = this.radius * Math.sin(theta);
	        vertexBuffer[index + 1] = this.radius * Math.cos(theta);
	        vertexBuffer[index + 2] = 0;
	    }
	    this.mesh.vertexBuffer.setValues();
	};
	
	AudioReactiveMesh.updateVertices = function (channel) {
	    var vertexBuffer = this.mesh.vertexBuffer.array;
	
	    var dTheta = 2 * Math.PI / (this.numberOfPoints - 1);
	
	    var zeroCrossing = 0;
	    var last = 0;
	    while (zeroCrossing < channel.length) {
	        var value = channel[zeroCrossing];
	        if (channel[zeroCrossing] == 0) {
	            break;
	        } else if (channel[zeroCrossing] < 0) {
	            if (last > 0) {
	                break;
	            }
	        }
	        last = value;
	        zeroCrossing += 1;
	    }
	
	    for (var i = 0; i < this.numberOfPoints; i++) {
	        var theta = i * dTheta;
	        var index = i * 3;
	        //        var audioIndex = Math.floor(i * channel.length / this.numberOfPoints);
	        var audioIndex = Math.floor((zeroCrossing + i) * channel.length / this.numberOfPoints) % channel.length;
	        var sample = channel[audioIndex] * 0.1;
	        vertexBuffer[index + 0] = this.radius * (Math.sin(theta) + sample);
	        vertexBuffer[index + 1] = this.radius * (Math.cos(theta) + sample);
	        vertexBuffer[index + 2] = 0;
	    }
	
	    this.mesh.vertexBuffer.setValues();
	};
	
	module.exports = AudioReactiveMesh;

/***/ },
/* 51 */
/***/ function(module, exports) {

	var Score = function (app) {
	    this.app = app;
	    this.score = 0;
	    this.highScore = 0;
	};
	
	Score.prototype.increase = function () {
	    this.score += 1;
	    if (this.score > this.highScore) {
	        this.highScore = this.score;
	    }
	};
	
	Score.prototype.decrease = function () {
	    this.score = Math.floor(this.score * 0.995);
	};
	
	module.exports = Score;

/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	var settings = __webpack_require__(48);
	
	var UI = function (app) {
	    this.app = app;
	
	    this.canvas = document.getElementById('scores');
	    this.context = this.canvas.getContext('2d');
	
	    this.haveShownHighScore = false;
	
	    this.countdown = 3;
	    this.countdownInterval = null;
	    this.isCountingDown = false;
	    this.needDrawCountdown = false;
	    this.needClearCountdown = false;
	
	    this.flash = 0;
	    this.flashInterval = null;
	    this.isFlashing = false;
	    this.flashOn = false;
	    this.needDrawFlash = false;
	    this.needClearFlash = false;
	
	    this.lastScore = -1;
	    this.lastHighScore = -1;
	};
	
	UI.prototype.draw = function () {
	    var score = this.app.score.score;
	    var highScore = this.app.score.highScore;
	
	    var needDrawScore = score != this.lastScore;
	    var needDrawHighScore = highScore != this.lastHighScore;
	
	    if (this.canvas.clientWidth != this.canvas.width || this.canvas.clientHeight != this.canvas.height) {
	        this.canvas.width = this.canvas.clientWidth;
	        this.canvas.height = this.canvas.clientHeight;
	        needDrawScore = true;
	        needDrawHighScore = true;
	
	        this.context.shadowColor = '#000000';
	        this.context.shadowOffsetX = 3;
	        this.context.shadowOffsetY = 3;
	        this.context.textBaseline = 'middle';
	    }
	
	    var width = this.canvas.width;
	    var halfWidth = width / 2;
	    var thirdWidth = width / 3;
	    var height = this.canvas.height;
	    var halfHeight = height / 2;
	    // Clear a little extra on all sides
	    var extraClear = 4;
	
	    var scoreSize;
	    if (this.canvas.width > settings.scoreFontBreakWidth) {
	        scoreSize = settings.scoreFontSizeLarge;
	    } else {
	        scoreSize = settings.scoreFontSizeSmall;
	    }
	    var halfScoreSize = scoreSize / 2;
	
	    var countdownSize = settings.countdownFontSize;
	    var halfCountdownSize = countdownSize / 2;
	
	    if (needDrawScore || needDrawHighScore || this.needDrawFlash) {
	        var fontString = scoreSize + 'px \'Orbitron\', sans-serif';
	        if (this.context.font != fontString) {
	            this.context.font = fontString;
	        }
	    }
	
	    if (needDrawScore) {
	        this.context.clearRect(0, halfScoreSize - extraClear, thirdWidth, scoreSize + 2 * extraClear);
	        this.context.textAlign = 'left';
	        this.context.fillStyle = '#00FF00';
	        this.context.fillText(score.toString(), halfScoreSize, scoreSize);
	    }
	
	    if (needDrawHighScore) {
	        this.context.clearRect(2 * thirdWidth, halfScoreSize - extraClear, thirdWidth, scoreSize + 2 * extraClear);
	        this.context.textAlign = 'right';
	        this.context.fillStyle = '#FF0000';
	        this.context.fillText(highScore.toString(), width - halfScoreSize, scoreSize);
	    }
	
	    if (this.needDrawFlash || this.countdown) {
	        this.context.textAlign = 'center';
	        this.context.fillStyle = '#FFFFFF';
	    }
	
	    if (this.needDrawFlash) {
	        this.context.fillText('High Score', halfWidth, scoreSize);
	        this.needDrawFlash = false;
	    }
	
	    if (this.needClearFlash) {
	        this.context.clearRect(thirdWidth, halfScoreSize - extraClear, thirdWidth, scoreSize + 2 * extraClear);
	        this.needClearFlash = false;
	    }
	
	    if (this.needDrawCountdown || this.needClearCountdown) {
	        this.context.clearRect(halfWidth - halfCountdownSize - extraClear, halfHeight - halfCountdownSize - extraClear, countdownSize + 2 * extraClear, countdownSize + 2 * extraClear);
	        this.needClearCountdown = false;
	    }
	
	    if (this.needDrawCountdown) {
	        var fontString = countdownSize + 'px \'Orbitron\', sans-serif';
	        if (this.context.font != fontString) {
	            this.context.font = fontString;
	        }
	        this.context.fillText(this.countdown.toString(), halfWidth, halfHeight);
	        this.needDrawCountdown = false;
	    }
	
	    this.lastScore = score;
	    this.lastHighScore = highScore;
	};
	
	UI.prototype.updateScore = function () {
	    var score = this.app.score.score;
	    var highScore = this.app.score.highScore;
	
	    if (score == highScore && score != 0 && !this.haveShownHighScore) {
	        this.haveShownHighScore = true;
	        this.flashHighScore();
	    }
	    if (this.haveShownHighScore && score != highScore) {
	        this.haveShownHighScore = false;
	    }
	};
	
	UI.prototype.flashHighScore = function () {
	    if (this.isFlashing) {
	        return;
	    }
	    this.flash = 0;
	    this.isFlashing = true;
	    this.flashInterval = setInterval(this.doFlashHighScore.bind(this), 500);
	};
	
	UI.prototype.doFlashHighScore = function () {
	    this.flash += 1;
	    this.flashOn = !this.flashOn;
	    this.needDrawFlash = this.flashOn;
	    this.needClearFlash = !this.flashOn;
	
	    if (this.flash == 10) {
	        clearInterval(this.flashInterval);
	        this.isFlashing = false;
	        this.flashInterval = null;
	    }
	};
	
	UI.prototype.startCountdown = function () {
	    this.app.stopUpdates();
	    this.countdown = 3;
	    this.isCountingDown = true;
	    this.countdownInterval = setInterval(this.doCountdown.bind(this), 1000);
	    this.needDrawCountdown = true;
	};
	
	UI.prototype.doCountdown = function () {
	    this.countdown -= 1;
	    this.needDrawCountdown = true;
	
	    if (this.countdown == 0) {
	        clearInterval(this.countdownInterval);
	        this.isCountingDown = false;
	        this.countdownInterval = null;
	        this.needDrawCountdown = false;
	        this.needClearCountdown = true;
	
	        this.app.startUpdates();
	    }
	};
	
	module.exports = UI;

/***/ },
/* 53 */
/***/ function(module, exports) {

	var ObjectPool = function (constructor, numberOfObjects) {
	    this.constructor = constructor;
	    this.objects = [];
	};
	
	ObjectPool.prototype.create = function () {
	    if (!this.objects.length) {
	        var object = new this.constructor();
	    } else {
	        var object = this.objects.pop();
	    }
	    return object;
	};
	
	ObjectPool.prototype.recycle = function (object) {
	    this.objects.push(object);
	};
	
	module.exports = ObjectPool;

/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	var glMatrix = __webpack_require__(15);
	var vec2 = glMatrix.vec2;
	
	__webpack_require__(55);
	var Siren = __webpack_require__(56);
	var settings = __webpack_require__(48);
	
	var SpiralSiren = function (app) {
	    Siren.call(this, app);
	    this.phase = 0;
	    this.frequency = Math.randomBetween(-0.5, 0.5);
	    this.numberOfOutputs = Math.round(Math.randomBetween(1.5, 10.5));
	    // Cache values
	    this.dTheta = 2 * Math.PI / this.numberOfOutputs;
	    this.dPhase = this.frequency * 2 * Math.PI;
	};
	SpiralSiren.prototype = Object.create(Siren.prototype);
	SpiralSiren.prototype.constructor = SpiralSiren;
	
	SpiralSiren.prototype.createParticles = function () {
	    for (var i = 0; i < this.numberOfOutputs; i++) {
	        var angle = this.phase + i * this.dTheta;
	        var particle = this.app.cloud.particleSystem.createParticle();
	        vec2.copy(particle.position, this.particle.position);
	        particle.velocity[0] = settings.cloudParticleVelocity * Math.sin(angle);
	        particle.velocity[1] = this.particle.velocity[1] + settings.cloudParticleVelocity * Math.cos(angle);
	    }
	    this.phase += this.dPhase;
	};
	
	module.exports = SpiralSiren;

/***/ },
/* 55 */
/***/ function(module, exports) {

	Math.randomBetween = function (a, b) {
	    return a + Math.random() * (b - a);
	};

/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	var webglet = __webpack_require__(2);
	var glMatrix = __webpack_require__(15);
	var vec2 = glMatrix.vec2;
	
	__webpack_require__(55);
	var AudioReactiveMesh = __webpack_require__(50);
	var AttractionToGoodGuy = __webpack_require__(57);
	var SpringToGoodGuy = __webpack_require__(58);
	var SirenAudio = __webpack_require__(59);
	var Spring = __webpack_require__(60);
	var settings = __webpack_require__(48);
	
	var Siren = function (app) {
	    this.app = app;
	
	    this.numberOfPoints = 100;
	    this.radius = 0.01;
	    this.connected = false;
	    this.springIn = null;
	    this.springOut = null;
	
	    var yPos = app.height() / 2 - 0.0001;
	    var pool = this.app.vec2Pool;
	    var sides = pool.create(sides);
	    this.app.level.getSides(yPos, sides);
	    var xPos = Math.randomBetween(sides[0] + this.radius * 2, sides[1] - this.radius * 2);
	    pool.recycle(sides);
	    this.particle = this.app.particleSystem.createParticle();
	    this.particle.position[0] = xPos;
	    this.particle.position[1] = yPos;
	    this.particle.velocity[1] = -settings.velocity;
	
	    this.transformation = new webglet.Transformation();
	
	    this.createAttraction();
	
	    this.mesh = new webglet.Mesh(this.numberOfPoints, gl.LINE_STRIP, gl.STATIC_DRAW, gl.STATIC_DRAW);
	    this.initAudioReactiveMesh();
	    this.initColors();
	
	    this.audio = null;
	};
	
	for (var method in AudioReactiveMesh) {
	    Siren.prototype[method] = AudioReactiveMesh[method];
	}
	
	Siren.prototype.initColors = function () {
	    var colorBuffer = this.mesh.colorBuffer.array;
	
	    for (var i = 0; i < this.numberOfPoints; i++) {
	        colorBuffer[i * 4 + 0] = 1;
	        colorBuffer[i * 4 + 1] = 1;
	        colorBuffer[i * 4 + 2] = 1;
	        colorBuffer[i * 4 + 3] = 1;
	    }
	    this.mesh.colorBuffer.setValues();
	};
	
	Siren.prototype.createAttraction = function () {
	    this.attraction = new AttractionToGoodGuy(this.app, this.app.goodGuy.particle, this.particle, settings.attractionConstant, settings.minAttractionDistance, settings.maxAttractionDistance);
	    this.app.particleSystem.forces.push(this.attraction);
	};
	
	Siren.prototype.removeAttraction = function () {
	    this.app.particleSystem.removeForce(this.attraction);
	};
	
	Siren.prototype.update = function () {
	    var position = this.particle.position;
	    var xPos = position[0];
	    var yPos = position[1];
	
	    var height = this.app.height();
	    var halfHeight = height / 2;
	    if (yPos < -halfHeight || yPos > halfHeight) {
	        this.remove();
	        return;
	    }
	
	    var pool = this.app.vec2Pool;
	    var sides = pool.create();
	    this.app.level.getSides(yPos, sides);
	    var left = sides[0];
	    var right = sides[1];
	    pool.recycle(sides);
	
	    if (xPos < left || xPos > right) {
	        this.remove();
	        return;
	    }
	
	    vec2.copy(this.transformation.position, this.particle.position);
	    if (this.connected) {
	        var channel = this.audio.getOutputChannel();
	        this.updateVertices(channel, 3);
	        this.createParticles();
	    }
	};
	
	Siren.prototype.draw = function () {
	    this.app.modelview.pushMatrix();
	    this.transformation.apply(this.app.modelview.matrix);
	    this.app.renderer.setUniform('uModelviewMatrix', this.app.modelview.matrix);
	    this.app.renderer.render(this.mesh);
	    this.app.modelview.popMatrix();
	};
	
	Siren.prototype.attach = function () {
	    var chain = this.app.chain;
	    var to = chain[chain.length - 1];
	
	    var spring;
	    if (to == this.app.goodGuy) {
	        // Connect to goodGuy
	        spring = new SpringToGoodGuy(this.app, to.particle, this.particle, settings.springConstant, settings.springDampingConstant, settings.springRestLength);
	    } else {
	        spring = new Spring(this.app, to.particle, this.particle, settings.springConstant, settings.springDampingConstant, settings.springRestLength);
	    }
	    this.app.particleSystem.forces.push(spring);
	    to.springOut = spring;
	    this.springIn = spring;
	
	    this.connected = true;
	    this.removeAttraction();
	    this.audio = new SirenAudio(this.app);
	    chain.push(this);
	};
	
	Siren.prototype.remove = function () {
	    this.app.particleSystem.recycleParticle(this.particle);
	
	    var index = this.app.sirens.indexOf(this);
	    if (index != -1) {
	        this.app.sirens.splice(index, 1);
	    }
	
	    if (this.connected) {
	        this.connected = false;
	        var chain = this.app.chain;
	        var chainIndex = chain.indexOf(this);
	        var before = chain[chainIndex - 1];
	        var after = null;
	
	        if (chainIndex != chainIndex.length - 1) {
	            after = chain[chainIndex + 1];
	        }
	
	        this.app.particleSystem.removeForce(this.springIn);
	        this.springIn = null;
	        before.springOut = null;
	
	        if (after) {
	            this.app.particleSystem.removeForce(this.springOut);
	            this.springOut = null;
	            after.springIn = null;
	
	            // Create new spring
	            var spring;
	            if (before == this.app.goodGuy) {
	                spring = new SpringToGoodGuy(this.app, before.particle, after.particle, settings.springConstant, settings.springDampingConstant, settings.springRestLength);
	            } else {
	                spring = new Spring(this.app, before.particle, after.particle, settings.springConstant, settings.springDampingConstant, settings.springRestLength);
	            }
	            this.app.particleSystem.forces.push(spring);
	            before.springOut = spring;
	            after.springIn = spring;
	        }
	        chain.splice(chainIndex, 1);
	
	        this.audio.stop();
	    } else {
	        this.removeAttraction();
	    }
	};
	
	Siren.prototype.createParticles = function () {};
	
	module.exports = Siren;

/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	var glMatrix = __webpack_require__(15);
	var vec2 = glMatrix.vec2;
	
	var AttractionToGoodGuy = function (app, a, b, k, distanceMin, distanceMax) {
	    this.app = app;
	    this.a = a;
	    this.b = b;
	    this.k = k;
	    this.distanceMin = distanceMin;
	    this.distanceMax = distanceMax;
	
	    this.distanceMinSquared = Math.pow(this.distanceMin, 2);
	    this.distanceMaxSquared = Math.pow(this.distanceMax, 2);
	};
	
	AttractionToGoodGuy.prototype.toString = function () {
	    return 'a: ' + this.a + '\nb: ' + this.b + '\nk: ' + this.k + '\ndistanceMin ' + this.distanceMin + '\ndistanceMax ' + this.distanceMax;
	};
	
	AttractionToGoodGuy.prototype.setMinimumDistance = function (d) {
	    this.distanceMin = d;
	    this.distanceMinSquared = Math.pow(d, 2);
	};
	
	AttractionToGoodGuy.prototype.setMaximumDistance = function (d) {
	    this.distanceMax = d;
	    this.distanceMaxSquared = Math.pow(d, 2);
	};
	
	AttractionToGoodGuy.prototype.apply = function () {
	    var a = this.a;
	    var b = this.b;
	    var k = this.k;
	    var distanceMinSquared = this.distanceMinSquared;
	    var distanceMaxSquared = this.distanceMaxSquared;
	
	    var pool = this.app.vec2Pool;
	
	    var a2b = pool.create();
	    vec2.subtract(a2b, a.position, b.position);
	    var a2bDistance = vec2.length(a2b);
	    var a2bDistanceSquared = Math.pow(a2bDistance, 2);
	
	    if (a2bDistanceSquared < distanceMaxSquared) {
	        if (a2bDistanceSquared < distanceMinSquared) {
	            a2bDistanceSquared = distanceMinSquared;
	        }
	
	        var force = k * a.mass * b.mass / (1 + a2bDistanceSquared);
	        vec2.scale(a2b, a2b, 1 + a2bDistanceSquared);
	        vec2.scale(a2b, a2b, force);
	
	        vec2.add(b.force, b.force, a2b);
	    }
	    pool.recycle(a2b);
	};
	
	module.exports = AttractionToGoodGuy;

/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	var glMatrix = __webpack_require__(15);
	var vec2 = glMatrix.vec2;
	
	var SpringToGoodGuy = function (app, a, b, springConstant, damping, restLength) {
	    this.app = app;
	    this.a = a;
	    this.b = b;
	    this.springConstant = springConstant;
	    this.damping = damping;
	    this.restLength = restLength;
	};
	
	SpringToGoodGuy.prototype.toString = function () {
	    return 'a: ' + this.a + '\nb: ' + this.b + '\nspringConstant: ' + this.springConstant + '\ndamping: ' + this.damping + '\nrestLength: ' + this.restLength;
	};
	
	SpringToGoodGuy.prototype.apply = function () {
	    var a = this.a;
	    var b = this.b;
	    var restLength = this.restLength;
	    var springConstant = this.springConstant;
	    var damping = this.damping;
	    var pool = this.app.vec2Pool;
	
	    var a2b = pool.create();
	    vec2.subtract(a2b, a.position, b.position);
	    var a2bDistance = vec2.length(a2b);
	
	    if (a2bDistance == 0) {
	        vec2.set(a2b, 0, 0);
	    } else {
	        vec2.scale(a2b, a2b, 1 / a2bDistance);
	    }
	
	    var springForce = -(a2bDistance - restLength) * springConstant;
	    var vA2b = pool.create();
	    vec2.subtract(vA2b, a.velocity, b.velocity);
	    var dampingForce = -damping * vec2.dot(a2b, vA2b);
	    var r = springForce + dampingForce;
	
	    vec2.scale(a2b, a2b, r);
	    vec2.negate(a2b, a2b);
	
	    vec2.add(b.force, b.force, a2b);
	
	    pool.recycle(a2b);
	    pool.recycle(vA2b);
	};
	
	module.exports = SpringToGoodGuy;

/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	var settings = __webpack_require__(48);
	
	var SirenAudio = function (app) {
	    this.app = app;
	    this.context = this.app.context;
	
	    this.done = false;
	
	    this.scale = this.app.scale;
	    this.rootFrequency = this.app.rootFrequency;
	    this.octave = this.app.octaveDistributor.getOctave();
	
	    this.schedulerLatency = 0.1;
	
	    var frequencies = SirenAudio.FREQUENCIES;
	    var index = Math.floor(Math.random() * frequencies.length);
	    this.frequencyPattern = frequencies[index];
	    this.frequencyIndex = 0;
	
	    var durations = SirenAudio.DURATIONS;
	    var index = Math.floor(Math.random() * durations.length);
	    this.durationPattern = durations[index];
	    this.durationIndex = 0;
	
	    // TODO: Pulse waves
	    var pulseWidths = [0.125, 0.25, 0.5, 0.75];
	    var index = Math.floor(Math.random() * pulseWidths.length);
	
	    this.osc = this.context.createOscillator();
	    this.osc.type = 'square';
	
	    this.env = this.context.createGain();
	    this.osc.connect(this.env);
	    this.env.connect(this.app.input);
	
	    this.analyser = this.context.createAnalyser();
	    this.analyser.fftSize = 256;
	    this.outputChannel = new Float32Array(this.analyser.fftSize);
	    this.osc.connect(this.analyser);
	
	    this.start();
	};
	
	SirenAudio.prototype.start = function () {
	    this.playNote(this.context.currentTime);
	    this.env.gain.setValueAtTime(0, this.context.currentTime);
	    this.env.gain.linearRampToValueAtTime(0.1, this.context.currentTime + 1);
	    this.osc.start();
	};
	
	SirenAudio.prototype.scheduleNote = function () {
	    var nextNoteTime = this.nextNoteTime();
	    var schedulerTime = nextNoteTime - this.schedulerLatency;
	    var timeoutTime = schedulerTime - this.context.currentTime;
	    setTimeout(this.playNote.bind(this, nextNoteTime), timeoutTime * 1000);
	};
	
	SirenAudio.prototype.playNote = function (noteTime) {
	    if (this.done) {
	        return;
	    }
	    var frequency = this.nextFrequency();
	    this.osc.frequency.setValueAtTime(frequency, noteTime);
	    this.lastNoteTime = noteTime;
	    this.scheduleNote();
	};
	
	SirenAudio.prototype.nextFrequency = function () {
	    var degree = this.frequencyPattern[this.frequencyIndex];
	    var frequency = this.scale.getFrequency(degree, this.rootFrequency, this.octave);
	    this.frequencyIndex += 1;
	    this.frequencyIndex %= this.frequencyPattern.length;
	    return frequency;
	};
	
	SirenAudio.prototype.nextNoteTime = function () {
	    var duration = this.durationPattern[this.durationIndex];
	    this.durationIndex += 1;
	    this.durationIndex %= this.durationPattern.length;
	    return this.lastNoteTime + duration * 60 / settings.bpm;
	};
	
	SirenAudio.prototype.stop = function () {
	    this.env.gain.linearRampToValueAtTime(0, this.context.currentTime + 1);
	    setTimeout(this.disconnect.bind(this), 2000);
	};
	
	SirenAudio.prototype.disconnect = function () {
	    this.env.disconnect(this.app.input);
	    this.done = true;
	};
	
	SirenAudio.prototype.getOutputChannel = function () {
	    this.analyser.getFloatTimeDomainData(this.outputChannel);
	    return this.outputChannel;
	};
	
	SirenAudio.DURATIONS = [[1 / 4], [1 / 8]];
	SirenAudio.FREQUENCIES = [[0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]];
	
	module.exports = SirenAudio;

/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	var glMatrix = __webpack_require__(15);
	var vec2 = glMatrix.vec2;
	
	var Spring = function (app, a, b, springConstant, damping, restLength) {
	    this.app = app;
	    this.a = a;
	    this.b = b;
	    this.springConstant = springConstant;
	    this.damping = damping;
	    this.restLength = restLength;
	};
	
	Spring.prototype.toString = function () {
	    return 'a: ' + this.a + '\nb: ' + this.b + '\nspringConstant: ' + this.springConstant + '\ndamping: ' + this.damping + '\nrestLength: ' + this.restLength;
	};
	
	Spring.prototype.apply = function () {
	    var a = this.a;
	    var b = this.b;
	    var restLength = this.restLength;
	    var springConstant = this.springConstant;
	    var damping = this.damping;
	    var pool = this.app.vec2Pool;
	
	    var a2b = pool.create();
	    vec2.subtract(a2b, a.position, b.position);
	    var a2bDistance = vec2.length(a2b);
	
	    if (a2bDistance == 0) {
	        vec2.set(a2b, 0, 0);
	    } else {
	        vec2.scale(a2b, a2b, 1 / a2bDistance);
	    }
	
	    var springForce = -(a2bDistance - restLength) * springConstant;
	    var vA2b = pool.create();
	    vec2.subtract(vA2b, a.velocity, b.velocity);
	    var dampingForce = -damping * vec2.dot(a2b, vA2b);
	    var r = springForce + dampingForce;
	
	    vec2.scale(a2b, a2b, r);
	
	    vec2.add(a.force, a.force, a2b);
	    // Can negate without a new vec2 as we don't use a2b again
	    vec2.negate(a2b, a2b);
	    vec2.add(b.force, b.force, a2b);
	
	    pool.recycle(a2b);
	    pool.recycle(vA2b);
	};
	
	module.exports = Spring;

/***/ },
/* 61 */
/***/ function(module, exports) {

	module.exports = function (context, length, decay) {
	    var buffer = context.createBuffer(2, length * context.sampleRate, context.sampleRate);
	    var left = buffer.getChannelData(0);
	    var right = buffer.getChannelData(1);
	    for (var i = 0; i < left.length; i++) {
	        left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / left.length, decay);
	        right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / left.length, decay);
	    }
	    return buffer;
	};

/***/ }
/******/ ]);
//# sourceMappingURL=siren-song.0.2.0.js.map