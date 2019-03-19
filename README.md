# FpsAutoTuner

I've got a situation my physics simulation is running at high framerate (60fps), but some devices my app runs on cannot run the graphics (PIXI) at 60fps without causing the physics simulation to stutter and jump, causing undesired artifacts.

So, in pursuit of performance, I shoved the physics simulator (in my case, matter.js) into a web worker, but then still found that some devices couldn't handle updates at 60fps in the main thread. So I started setting an interval to apply updates from the simulation to PIXI at a fixed rate - 30 fps to start. However, sometimes even on some devices that was unsustainable. So, the question came down to - what FPS *should* my app run at? And when I say "run", I'm talking about changing the position of PIXI objects base on updates from the physics simulation, not about changing the speed of the PIXI's ticker.

Since the speed at which I could apply updates from the physics simulation and still achieve sustainable render speeds without lagging varied from device to device, I decided the best way to decide on the FPS to run at would be ... let the app itself decide at run time. So instead of coding a fixed FPS, or giving the user a slider to adjust, I let my app measure and adjust it's FPS based on what it measures as sustainable while it's running.

Enter my solution for my app, FpsAutoTuner: https://gist.github.com/josiahbryan/c4716f7c9f051d7c084b1536bc8240a0 - contributed here to the community in case it may help someone else solve a similar problem.

It's framework-agnostic, no external dependencies, written as an ES6 class, but could easily be rewritten as a ES5 if you wanted. 

FpsAutoTuner works by measuring the FPS (which you tell it by calling  `countFrame()`) and then every so often (at `tuningInteval`ms), it compares  that measured FPS to the `fpsTarget`. When the measured FPS goes below `fpsTarget` less `tuningMargin`, the `fpsTarget` will be decreased by  `tuningRate` and the `callback` will be execute with the new `fpsTarget`. Likewise, when the measured FPS exceeds `fpsTarget` less `tuningMargin`, then `fpsTarget` will be increased by `tuningRate` and `callback` will be called with the new target.

# Install

No formal install right now, just grab `FpsAutoTuner.js` from this repo and put it somehwere you can `import` from.

# Usage

Example usage:

```javascript
// Somewhere at the top of your file
import { FpsAutoTuner } from './FpsAutoTuner';

// Then later in your code, probably in your constructor of your game object
this.fpsAutoTuner = new FpsAutoTuner({
	fsTarget:  30
	callback:  fps => this.setFpsTarget(fps)
});
```

This assumes that you have a function called `setFpsTarget()` on your class, probably that does something like this: 

```javascript
// This is just an example method, on your own class...
setFpsTarget(fps) {
	clearInterval(this._fpsTid);
	this._fpsTid = setInterval(this._render, 1000 / fps);
}
```

Then later in the rendering portion of your code:
 
```javascript
// inside the render loop of your code, call:
this.fpsAutoTuner.countFrame();
```

That's it! Your app will now automatically adjust it's FPS as needed when it detects lower/higher frame rates available. (FpsAutoTuner automatically starts it's auto-tuning timer in it's constructor.) There are plenty of options you can pass to FpsAutoTuner to tweak it - they are all documented at the top of the gist. Specifically of interest, you can set `tuningInterval` (default 5000ms) to change how often it measures/changes the FPS.

# Contrib

This all has just been a humble attempt to give back to the community. Use and enjoy. Contributions/changes/suggestions (as PRs) welcome!

