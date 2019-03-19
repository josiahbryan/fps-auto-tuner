/**
 * FpsAutoTuner works by measuring the FPS (which you tell it by calling 
 * `countFrame()`) and then every so often (at `tuningInteval`ms), it compares 
 * that measured FPS to the `fpsTarget`. When the measured FPS goes below `fpsTarget` less
 * `tuningMargin`, the `fpsTarget` will be decreased by 
 * `tuningRate` and the `callback` will be execute with the new `fpsTarget`. Likewise,
 * when the measured FPS exceeds `fpsTarget` less `tuningMargin`, then `fpsTarget`
 * will be increased by `tuningRate` and `callback` will be called with the new target.
 * 
 * Example usage:
 * 
 * this.fpsAutoTuner = new FpsAutoTuner({
 *	   fsTarget:  30
 *     callback:  fps => this.setFpsTarget(fps)
 * });
 * 
 * This assumes that you have a function called setFpsTarget, probably that does something like this:
 * 
 * setFpsTarget(fps) {
 *     clearInterval(this._fpsTid);
 *     this._fpsTid = setInterval(this._render, 1000 / fps);
 * }
 * 
 * Then later in the rendering portion of your code:
 * ...
 * this.fpsAutoTuner.countFrame();
 * ...
 * 
 * @export
 * @class FpsAutoTuner
 */
export class FpsAutoTuner {
	/**
	 * Default options for the constructor.
	 *
	 * @static
	 * @memberof FpsAutoTuner
	 */
	static DefaultOptions = {
		/**
		 * @property {number} [fpsTarget=30] - target fps, this is the number we start at
		 * and the number we will auto-tune
		 * Note: Only the intial fpsTarget is set via the constructor, changing it 
		 * later externally has no effect, since the auto-tuning routine manages
		 * this automatically.
		 * @readonly 
		 * @memberof FpsAutoTuner
		 */
		fpsTarget:      30,

		/**
		 * @property {Function} [callback=()=>{}] - When the auto-tuner decides to change
		 * the FPS target, it will execute this callback with the new target FPS to hit
		 * @memberof FpsAutoTuner
		 */
		callback:       (newFpsTarget=30) => {},

		/** 
		 * @property {number} [tuningInterval=5000] - This is the interval (in milliseconds) that 
		 * determines how frequently the auto-tuner executes the auto-tuning routine.
		 * This can only be set in the constructor, or as an argument to the `start()` method.
		 * Changing the property on the instance has no effect
		 * @readonly
		 * @memberof FpsAutoTuner
		 */
		tuningInterval: 5000,

		/**
		 * @property {boolean} [autoIgnoreLongIntervals=true] If enabled, if the tuner
		 * routine is executed with an elapsed time greater than
		 * (tuningInterval * autoIgnoreIntervalMultiplier) milliseconds since the last
		 * executing, it will NOT auto-tune that cycle, it will simply reset and try again
		 * on next timer execution. This is so we can account for things like
		 * the tab or the app getting suspended in the background, which, without this,
		 * would cause our auto-tuner to think FPS all of a sudden took a nose dive and try
		 * to drop FPS target as soon as the app/tab resumed. With this enabled, this will
		 * just discard intervals that took too long to execute and start tuning again at
		 * the next interval.
		 * Note: Can only be set in the constructor.
		 * @readonly
		 * @memberof FpsAutoTuner
		 */
		autoIgnoreLongIntervals: true,

		/**
		 * @property {number} [autoIgnoreIntervalMultiplier=3] Used in conjunction with
		 * `autoIgnoreLongIntervals`. See documentation there.
		 * Can only be set in constructor.
		 * @readonly
		 * @memberof FpsAutoTuner
		 */
		autoIgnoreIntervalMultiplier: 3,

		/**
		 * @property {number} [bottomLimit=6] Bottom limit (in FPS) to the auto-tuning. The 
		 * tuner will not drop FPS below this limit.
		 * @memberof FpsAutoTuner
		 */
		bottomLimit:    6,

		/**
		 * @property {number} [topLimit=60] Upper limit (in FPS) to the auto-tuning. The
		 * tuner will not attempt to exceed this limit.
		 * @memberof FpsAutoTuner
		 */
		topLimit:       60,

		/** 
		 * @property {number} [tuningRate=2] Number of frames to increase/decrease FPS
		 * target when the measured FPS drops above/below the target +/- margin.
		 * @memberof FpsAutoTuner
		 */
		tuningRate:     2,

		/**
		 * @property {number} [tuningMargin=null] This number is applied to the `fpsTarget`,
		 * and used to guage when the measured fps needs adjusting. If this number is null
		 * (the default), the `tuningRate` is used as the margin adjustment. When the measured
		 * fps exceeds `fpsTarget` - `margin`, the `fpsTarget` will be increased by 
		 * `tuningRate` and the `callback` will be execute with the new `fpsTarget`. Likewise,
		 * when the measured FPS dips below `fpsTarget` - `margin`, then `fpsTarget`
		 * will be reduced by `tuningRate` and `callback` will be called with the new target.
		 */
		tuningMargin:   null,

		/**
		 * @property {boolean} [debug=false] If true, the auto-tuner will output it's 
		 * tuning decisions to the console on every interval, prefixed with "[${`debugTag`}]"
		 */
		debug:          false,

		/**
		 * @property {string} [debugTag="FpsAutoTuner"] If `debug` is true, this will be used
		 * to prefix debug output.
		 */
		debugTag:       "FpsAutoTuner",

		/**
		 * @property {boolean} [enableCordovaPausing=true] If true, FpsAutoTuner will
		 * automatically add event listeners for `pause` and `resume` events and call
		 * the `stop()` and `start()` methods (respectively).
		 * Note: You should call `destroy()` to remove those listeners.
		 */
		enableCordovaPausing: true,
	}	
	
	/**
	 * Creates an instance of FpsAutoTuner. See documentation on `DefaultOptions` 
	 * for properties that can be used here. At minimum, you should provide
	 * a `callback` function like `callback: (newFpsTarget) => {...your code...}`.
	 * 
	 * FpsAutoTuner works by measuring the FPS (which you tell it by calling 
	 * `countFrame()`) and then every so often (at `tuningInteval`ms), it compares 
	 * that measured FPS to the `fpsTarget`. When the measured FPS goes below `fpsTarget` less
	 * `tuningMargin`, the `fpsTarget` will be decreased by 
	 * `tuningRate` and the `callback` will be execute with the new `fpsTarget`. Likewise,
	 * when the measured FPS exceeds `fpsTarget` less `tuningMargin`, then `fpsTarget`
	 * will be increased by `tuningRate` and `callback` will be called with the new target.
	 * 
	 * @param {*} [opts=FpsAutoTuner.DefaultOptions]
	 * @memberof FpsAutoTuner
	 */
	constructor(opts=FpsAutoTuner.DefaultOptions) {
		Object.assign(this,
			FpsAutoTuner.DefaultOptions,
			(opts || {}),
		);

		this._resetCounter();
		this.start();
		this.addPauseResumeListeners();
	}

	/**
	 * Stops the interval and removes any event listeners added to the document.
	 *
	 * @memberof FpsAutoTuner
	 */
	destroy() {
		this.stop();
		this.removePauseResumeListeners();
	}

	/**
	 * Used to add pause/resume listeners to stop/start the auto-tune interval
	 *
	 * @memberof FpsAutoTuner
	 */
	addPauseResumeListeners() {
		if(this.enableCordovaPausing) {
			document.addEventListener('pause',  this.stop);
			document.addEventListener('resume', this.start);
		}
	}

	/**
	 * Used to remove pause/resume listeners from the document.
	 *
	 * @memberof FpsAutoTuner
	 */
	removePauseResumeListeners() {
		if(this.enableCordovaPausing) {
			document.removeEventListener('pause',  this.stop);
			document.removeEventListener('resume', this.start);
		}
	}

	/**
	 * Count this frame for purpose of measuring the FPS for auto-tuning.
	 * This is the one and only critical method you must call externally.
	 * If your code does not call `countFrame()`, then the auto-tuner will
	 * not be able to measure the FPS of your code.
	 *
	 * @memberof FpsAutoTuner
	 */
	countFrame() {
		this.frameCount ++;
	}

	/**
	 * Starts the auto-tuner interval. Note that the constructor will start
	 * the auto-tuner automatically. You only need to call this manually
	 * if you have called `stop()` previously.
	 * 
	 * Note that it will execute your `callback` with the current `fpsTarget`
	 * during this function.
	 * 
	 * @memberof FpsAutoTuner
	 */
	start = () => {
		this.stop();
		this.debug && console.warn("[" + this.debugTag + "] FpsAutoTuner started with initial target", this.fpsTarget);
		this._tuningInterval  = setInterval(this._autoTune, this.tuningInterval);
		this._resetCounter();
		this.callback && this.callback(this.fpsTarget);
	}

	/**
	 * Stops the auto-tuner interval. You can re-start the auto-tuner with `start()`.
	 *
	 * @memberof FpsAutoTuner
	 */
	stop = () => {
		if(this._tuningInterval) {
			clearInterval(this._tuningInterval);
			this.debug && console.warn("[" + this.debugTag + "] FpsAutoTuner stopped, ending fpsTarget", this.fpsTarget);
		}
	}

	
	/**
	 * Used to reset counters at the end of each tuning interval and at start. Not for
	 * external use.
	 * @private
	 *
	 * @memberof FpsAutoTuner
	 */
	_resetCounter() {
		this.frameCount = 0;
		this.startTime  = Date.now();
	}

	/**
	 * Core auto-tuning routine. Called automatically based on `tuningInterval`. Not
	 * designed to be called manually.
	 * @private
	 *
	 * @memberof FpsAutoTuner
	 */
	_autoTune = () => {
		const {
				tuningRate, 
				bottomLimit, 
				topLimit, 
				tuningMargin,
				frameCount,
				startTime,
				fpsTarget,
				debug,
				debugTag,
				autoIgnoreLongIntervals,
				autoIgnoreIntervalMultiplier,
				tuningInterval,
				callback
			}  = this,
			// Calculate floor for measured fps to exceed to trigger raising/lowering target
			fpsWithMargin     = Math.floor(fpsTarget - (tuningMargin || tuningRate)),
			now               = Date.now(),
			elapsed           = (now - startTime) / 1000,
			// Our measured FPS is simply the number of frames since we last ran the tuner
			// divided by the elapsed time since we last ran the tuner. Can't get much simpler.
			measuredFps       = Math.floor(frameCount / elapsed),
			debugPacket       = debug && {
				measuredFps,
				fpsWithMargin,
				fpsTarget,
				elapsed,
				frameCount
			};

		// If time exceeded autoIgnoreIntervalMultiplier, reset and return
		if(autoIgnoreLongIntervals &&
			elapsed > tuningInterval & autoIgnoreIntervalMultiplier) {
			debug && console.warn("[" + debugTag + "] .autoIgnoreLongIntervals.", {elapsed});
			this._resetCounter();
			return;
		}

		// If measuredFps dipped to low (below bottom of margin) ...
		if (measuredFps < fpsWithMargin) {
			const newTarget = fpsTarget - tuningRate;

			// If not lower than the bottom...
			if(newTarget >= bottomLimit) {
				debug && console.warn("[" + debugTag + "] missing targets, reducing by "+tuningRate+"fps to ", newTarget, debugPacket);

				callback && callback(newTarget);
					this.fpsTarget = newTarget;
			} else {
				// Would go too low...
				debug && console.warn("[" + debugTag + "] :( cannot reduce further, new target would be below limit of "+bottomLimit+"fps:", newTarget, debugPacket);
			}
		} else 
		// If measuredFps exceeded bottom of margin...
		if(measuredFps >= fpsWithMargin) {
			const newTarget = fpsTarget + tuningRate;

			// If not too high...
			if(newTarget <= topLimit) {
				debug && console.warn("[" + debugTag + "] +++ exceeding margin, seeing if we can handle ", newTarget, debugPacket);

				callback && callback(newTarget);
				this.fpsTarget = newTarget;
			} else {
				// Would go too high...
				debug && console.warn("[" + debugTag + "] // exceeding margin, but limiting to "+topLimit+"+fps, not attempting ", newTarget, debugPacket);
			}
		} else
		// measuredFps is within margin of the fpsTarget, no change needed
		{
			debug && console.log("[" + debugTag + "] running fps:", measuredFps, debugPacket);
		}
		
		// Reset counter for next auto-tuning interval
		this._resetCounter();
	}
}