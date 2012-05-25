(function(){

var Animator = window.Animator = new Class({

	Implements: [Options, Events],

	options: {
		duration: 500,
		tween: 'easeOutSine',

		styleKey: '-webkit-transform',
		styleProperty: 'translate3d({value}px,0,0)'
	},

	running		 : false,
	fromValue	 : 0,
	currentValue : 0,
	toValue		 : 0,
	startTime	 : 0,
	tween		 : null,
	duration	 : 0,

	initialize: function(element, options){
		this.element = document.id(element);
		this.setOptions(options);
		this._iterate = this._iterate.bind(this);
	},

	start: function(from, to, duration){
		// Currently you can only start an animation if one is not currently running
		if (this.running) return this;

		// Set starting variables
		this.running		  = true;
		this.fromValue		  = (from	  !== undefined) ? from		: this.fromValue;
		this.toValue		  = (to		  !== undefined) ? to		: this.toValue;
		this.duration		  = (duration !== undefined) ? duration : this.options.duration;
		this.tween			  = Animator.Tweens[this.options.tween] || Animator.Tweens.linear;
		this.startTime		  = 0;
		this.currentValue	  = this.fromValue;

		// Add animation iterate to be managed by internal timer
		Animator.addInstance(this._iterate);
		return this;
	},

	// Used to stop an existing animation, fails silently
	cancel: function(toValue){
		if (!this.running) return this;
		this._halt(toValue);
		this.fireEvent('cancel', this);
		return this;
	},

	// Internal iteration handler
	_iterate: function(now){
		var change = this.toValue - this.fromValue,
			time = now - this.startTime;

		// First frame of animation
		if (!this.startTime) {
			this.startTime = now;
			this.currentValue = this.fromValue;
			return this._setStyle(this.fromValue);
		}

		// End of animation
		if (time >= this.duration){
			this.startTime = null;
			this._halt(this.toValue);
			return this.fireEvent('complete', this);
		}

		// Run current value through easing method
		this.currentValue = this.tween(time, this.fromValue, change, this.duration);

		// Set style - To be deprecated
		this._setStyle(this.currentValue);
	},

	// Halt the animation
	_halt: function(toValue){
		Animator.removeInstance(this._iterate);
		this.currentValue = (toValue !== undefined) ? toValue : this.currentValue;
		this._setStyle(this.currentValue);
		this.running = false;
	},

	// Set style of element - to be deprecated
	_setStyle: function(value){
		var o = this.options;
		this.element.setStyle(o.styleKey, o.styleProperty.substitute({
			value: value
		}));
	}

});

// Global methods and tweens
Animator.extend({

	// Add animator instance to animate
	addInstance: function(iterateFunc){
		I.instances.push(iterateFunc);
		I.startTimer();
	},

	// Queue the removal of an instance - actual removal occurs after next frame is processed
	removeInstance: function(iterateFunc){
		I.toRemove.push(iterateFunc);
	},

	// Sets the framerate and also restarts the timer if it's running to use the new FPS
	setFramerate: function(fps){
		I.fps = fps;
		I.startTimer();
	},

	// Various tweens supported
	Tweens: {

		linear: function(t, b, c, d){
			return c * t / d + b;
		},

		easeInQuad: function(t, b, c, d) {
			return c * (t /= d) * t + b;
		},

		easeOutQuad: function(t, b, c, d) {
			return -c * (t /= d) * (t - 2) + b;
		},

		easeOutSine: function (t, b, c, d) {
			return c * Math.sin(t/d * (Math.PI/2)) + b;
		}

	}

});

// Internal timer and supporting methods
var I = {

	// Status of whether the internal timer is animating or not
	running   : false,
	// All animator instances currently animating
	instances : [],
	// Animator removal queue
	toRemove  : [],
	// Current animator FPS
	fps		  : 100,
	// Reference to timer instance
	timer	  : null,

	// Starts internal timer, called by addInstance
	startTimer: function(){
		// Dissallow start to execute if a timer is running or if there are no instances
		if (!I.instances.length) return I.stopTimer();
		if (I.running) return;

		// Good practice to ALWAYS stop timer before starting it since you can end up with ghost timers
		I.stopTimer();
		I.running = true;
		I.timer = setInterval(I.iterate, 1000 / I.fps);
	},

	// Stops the timer and clears the timer instance
	stopTimer: function(){
		clearInterval(this.timer);
		this.timer = null;
		I.running = false;
	},

	// Animation frame handler, called every frame, executes all added instances
	iterate: function(){
		// Stop the timer if all instances have been removed
		if (!I.instances.length) return I.stopTimer();

		// Get time in milliseconds and execute all animator instances
		var now = Date.now();
		for (var i = 0, len = I.instances.length; i < len; i++)
			I.instances[i](now);

		// We handle removals after the frame has finished firing
		while (I.toRemove.length)
			I.removeInstance(I.toRemove.splice(0,1)[0]);
	},

	// Remove an instance
	removeInstance: function(iterateFunc){
		var index = I.instances.indexOf(iterateFunc);
		if (index < 0) return;
		I.instances.splice(index, 1);
	}

};

}).call(this);
