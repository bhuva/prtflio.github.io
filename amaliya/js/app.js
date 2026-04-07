window.whatInput = (function() {

  'use strict';

  /*
    ---------------
    variables
    ---------------
  */

  // array of actively pressed keys
  var activeKeys = [];

  // cache document.body
  var body;

  // boolean: true if touch buffer timer is running
  var buffer = false;

  // the last used input type
  var currentInput = null;

  // `input` types that don't accept text
  var nonTypingInputs = [
    'button',
    'checkbox',
    'file',
    'image',
    'radio',
    'reset',
    'submit'
  ];

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  var mouseWheel = detectWheel();

  // list of modifier keys commonly used with the mouse and
  // can be safely ignored to prevent false keyboard detection
  var ignoreMap = [
    16, // shift
    17, // control
    18, // alt
    91, // Windows key / left Apple cmd
    93  // Windows menu / right Apple cmd
  ];

  // mapping of events to input types
  var inputMap = {
    'keydown': 'keyboard',
    'keyup': 'keyboard',
    'mousedown': 'mouse',
    'mousemove': 'mouse',
    'MSPointerDown': 'pointer',
    'MSPointerMove': 'pointer',
    'pointerdown': 'pointer',
    'pointermove': 'pointer',
    'touchstart': 'touch'
  };

  // add correct mouse wheel event mapping to `inputMap`
  inputMap[detectWheel()] = 'mouse';

  // array of all used input types
  var inputTypes = [];

  // mapping of key codes to a common name
  var keyMap = {
    9: 'tab',
    13: 'enter',
    16: 'shift',
    27: 'esc',
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
  };

  // map of IE 10 pointer events
  var pointerMap = {
    2: 'touch',
    3: 'touch', // treat pen like touch
    4: 'mouse'
  };

  // touch buffer timer
  var timer;


  /*
    ---------------
    functions
    ---------------
  */

  // allows events that are also triggered to be filtered out for `touchstart`
  function eventBuffer() {
    clearTimer();
    setInput(event);

    buffer = true;
    timer = window.setTimeout(function() {
      buffer = false;
    }, 650);
  }

  function bufferedEvent(event) {
    if (!buffer) setInput(event);
  }

  function unBufferedEvent(event) {
    clearTimer();
    setInput(event);
  }

  function clearTimer() {
    window.clearTimeout(timer);
  }

  function setInput(event) {
    var eventKey = key(event);
    var value = inputMap[event.type];
    if (value === 'pointer') value = pointerType(event);

    // don't do anything if the value matches the input type already set
    if (currentInput !== value) {
      var eventTarget = target(event);
      var eventTargetNode = eventTarget.nodeName.toLowerCase();
      var eventTargetType = (eventTargetNode === 'input') ? eventTarget.getAttribute('type') : null;

      if (
        (// only if the user flag to allow typing in form fields isn't set
        !body.hasAttribute('data-whatinput-formtyping') &&

        // only if currentInput has a value
        currentInput &&

        // only if the input is `keyboard`
        value === 'keyboard' &&

        // not if the key is `TAB`
        keyMap[eventKey] !== 'tab' &&

        // only if the target is a form input that accepts text
        (
           eventTargetNode === 'textarea' ||
           eventTargetNode === 'select' ||
           (eventTargetNode === 'input' && nonTypingInputs.indexOf(eventTargetType) < 0)
        )) || (
          // ignore modifier keys
          ignoreMap.indexOf(eventKey) > -1
        )
      ) {
        // ignore keyboard typing
      } else {
        switchInput(value);
      }
    }

    if (value === 'keyboard') logKeys(eventKey);
  }

  function switchInput(string) {
    currentInput = string;
    body.setAttribute('data-whatinput', currentInput);

    if (inputTypes.indexOf(currentInput) === -1) inputTypes.push(currentInput);
  }

  function key(event) {
    return (event.keyCode) ? event.keyCode : event.which;
  }

  function target(event) {
    return event.target || event.srcElement;
  }

  function pointerType(event) {
    if (typeof event.pointerType === 'number') {
      return pointerMap[event.pointerType];
    } else {
      return (event.pointerType === 'pen') ? 'touch' : event.pointerType; // treat pen like touch
    }
  }

  // keyboard logging
  function logKeys(eventKey) {
    if (activeKeys.indexOf(keyMap[eventKey]) === -1 && keyMap[eventKey]) activeKeys.push(keyMap[eventKey]);
  }

  function unLogKeys(event) {
    var eventKey = key(event);
    var arrayPos = activeKeys.indexOf(keyMap[eventKey]);

    if (arrayPos !== -1) activeKeys.splice(arrayPos, 1);
  }

  function bindEvents() {
    body = document.body;

    // pointer events (mouse, pen, touch)
    if (window.PointerEvent) {
      body.addEventListener('pointerdown', bufferedEvent);
      body.addEventListener('pointermove', bufferedEvent);
    } else if (window.MSPointerEvent) {
      body.addEventListener('MSPointerDown', bufferedEvent);
      body.addEventListener('MSPointerMove', bufferedEvent);
    } else {

      // mouse events
      body.addEventListener('mousedown', bufferedEvent);
      body.addEventListener('mousemove', bufferedEvent);

      // touch events
      if ('ontouchstart' in window) {
        body.addEventListener('touchstart', eventBuffer);
      }
    }

    // mouse wheel
    body.addEventListener(mouseWheel, bufferedEvent);

    // keyboard events
    body.addEventListener('keydown', unBufferedEvent);
    body.addEventListener('keyup', unBufferedEvent);
    document.addEventListener('keyup', unLogKeys);
  }


  /*
    ---------------
    utilities
    ---------------
  */

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  function detectWheel() {
    return mouseWheel = 'onwheel' in document.createElement('div') ?
      'wheel' : // Modern browsers support "wheel"

      document.onmousewheel !== undefined ?
        'mousewheel' : // Webkit and IE support at least "mousewheel"
        'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox
  }


  /*
    ---------------
    init

    don't start script unless browser cuts the mustard,
    also passes if polyfills are used
    ---------------
  */

  if (
    'addEventListener' in window &&
    Array.prototype.indexOf
  ) {

    // if the dom is already ready already (script was placed at bottom of <body>)
    if (document.body) {
      bindEvents();

    // otherwise wait for the dom to load (script was placed in the <head>)
    } else {
      document.addEventListener('DOMContentLoaded', bindEvents);
    }
  }


  /*
    ---------------
    api
    ---------------
  */

  return {

    // returns string: the current input type
    ask: function() { return currentInput; },

    // returns array: currently pressed keys
    keys: function() { return activeKeys; },

    // returns array: all the detected input types
    types: function() { return inputTypes; },

    // accepts string: manually set the input type
    set: switchInput
  };

}());

var debug = false;

var md = new MobileDetect(window.navigator.userAgent);

var _mobileMode = (md.phone() != null || md.tablet() != null);
var controller;

var screenHeight = 0;

var footer = $("#footer");

if (debug) {
	$("body").addClass("debug");
}

$("body").on("click", ".link-anchor", function() {
	var self = $(this);
	var id = self.attr("href");
	var target = $(id);
	if(target.length == 0) return false;
	var whh = window.innerHeight / 2;
	return false;
});


function initStream() {
	controller = new ScrollMagic.Controller();
	
	var scene;
	if(!_mobileMode){
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-amalia-opacity",
			duration: (screenHeight)+"px",
		})
		.setTween("#amalia", 1, {
			opacity: 0
		})
		.addTo(controller);
		
	
	
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-news-pin",
			duration: (screenHeight * 1)+"px"
		})
		.setPin("#news")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-red-pin",
			duration: (screenHeight * 2.1)+"px"
		})
		.setPin("#red")
		.addTo(controller);
	
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-concept-pin",
			duration: (screenHeight * 1.5)+"px"
		})
		.setPin("#concept")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-concept-menu-pin",
			duration: (screenHeight * 1)+"px"
		})
		.setPin("#concept-menu")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-book-pin",
			duration: (screenHeight * 2.5)+"px"
		})
		.setPin("#book")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-book-title-pin",
			duration: (screenHeight * 2)+"px"
		})
		.setPin("#book-title")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-book-menu-pin",
			duration: (screenHeight * 1)+"px"
		})
		.setPin("#book-menu")
		.addTo(controller);
	/*
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-book-title-top",
			duration: (screenHeight * 6)+"px",
		})
		.setTween("#book-title", 0.5, {
			top: "-=1000px"
		})
		.addTo(controller);
	*/
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-gold-pin",
			duration: (screenHeight * 3)+"px"
		})
		.setPin("#gold")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-white-pin",
			duration: (screenHeight * 3)+"px"
		})
		.setPin("#white")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-translations-pin",
			duration: (screenHeight * 2)+"px"
		})
		.setPin("#translations")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-translations-menu-pin",
			duration: (screenHeight * 1)+"px"
		})
		.setPin("#translations-menu")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-gold2-pin",
			duration: (screenHeight * 2.5)+"px"
		})
		.setPin("#gold2")
		.addTo(controller);
	
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-gold2-title-pin",
			duration: (screenHeight * 2)+"px"
		})
		.setPin("#gold2-title")
		.addTo(controller);
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-gold2-menu-pin",
			duration: (screenHeight * 1)+"px"
		})
		.setPin("#gold2-menu")
		.addTo(controller);
	
		
	scene = new ScrollMagic
		.Scene({
			triggerElement: "#_bp-start-amalia-opacity-show",
			duration: (screenHeight)+"px",
		})
		.setTween("#amalia", 1, {
			opacity: 1
		})
		.addTo(controller);
	
	}
	
}
$("body").on("click","#responsive-menu-toggle button", function(){
	var menu = $("#responsive-menu");
	menu.slideToggle();
	return false;
});

$(document).on("ready scroll resize", function(e) {
	///var pageHeight = $("body")[0].scrollHeight;
	console.log('ready')
	if($("body").hasClass("page-main")){
		var lastSection = $("section").last();
		var offsetTop = lastSection[0].offsetTop;
		var height = lastSection.outerHeight(true);
		
		//footer.css("top",(offsetTop+height)+"px");
		//console.log('o',offsetTop,lastSection.outerHeight(true))
		
	}
});

$(window).on("load", function() {
	var w = $(window);
	var h = w.innerHeight();
	screenHeight = h;
	initStream();
	
	if(_mobileMode) $("body").addClass("_mode-mobile");
	
	if(md.tablet()) $("body").addClass("_mode-mobile-tablet");
	if(md.phone()) $("body").addClass("_mode-mobile-phone");
});
$(window).on("load", function() {
	$(document).foundation();
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJhcHAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy53aGF0SW5wdXQgPSAoZnVuY3Rpb24oKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgdmFyaWFibGVzXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gYXJyYXkgb2YgYWN0aXZlbHkgcHJlc3NlZCBrZXlzXG4gIHZhciBhY3RpdmVLZXlzID0gW107XG5cbiAgLy8gY2FjaGUgZG9jdW1lbnQuYm9keVxuICB2YXIgYm9keTtcblxuICAvLyBib29sZWFuOiB0cnVlIGlmIHRvdWNoIGJ1ZmZlciB0aW1lciBpcyBydW5uaW5nXG4gIHZhciBidWZmZXIgPSBmYWxzZTtcblxuICAvLyB0aGUgbGFzdCB1c2VkIGlucHV0IHR5cGVcbiAgdmFyIGN1cnJlbnRJbnB1dCA9IG51bGw7XG5cbiAgLy8gYGlucHV0YCB0eXBlcyB0aGF0IGRvbid0IGFjY2VwdCB0ZXh0XG4gIHZhciBub25UeXBpbmdJbnB1dHMgPSBbXG4gICAgJ2J1dHRvbicsXG4gICAgJ2NoZWNrYm94JyxcbiAgICAnZmlsZScsXG4gICAgJ2ltYWdlJyxcbiAgICAncmFkaW8nLFxuICAgICdyZXNldCcsXG4gICAgJ3N1Ym1pdCdcbiAgXTtcblxuICAvLyBkZXRlY3QgdmVyc2lvbiBvZiBtb3VzZSB3aGVlbCBldmVudCB0byB1c2VcbiAgLy8gdmlhIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbFxuICB2YXIgbW91c2VXaGVlbCA9IGRldGVjdFdoZWVsKCk7XG5cbiAgLy8gbGlzdCBvZiBtb2RpZmllciBrZXlzIGNvbW1vbmx5IHVzZWQgd2l0aCB0aGUgbW91c2UgYW5kXG4gIC8vIGNhbiBiZSBzYWZlbHkgaWdub3JlZCB0byBwcmV2ZW50IGZhbHNlIGtleWJvYXJkIGRldGVjdGlvblxuICB2YXIgaWdub3JlTWFwID0gW1xuICAgIDE2LCAvLyBzaGlmdFxuICAgIDE3LCAvLyBjb250cm9sXG4gICAgMTgsIC8vIGFsdFxuICAgIDkxLCAvLyBXaW5kb3dzIGtleSAvIGxlZnQgQXBwbGUgY21kXG4gICAgOTMgIC8vIFdpbmRvd3MgbWVudSAvIHJpZ2h0IEFwcGxlIGNtZFxuICBdO1xuXG4gIC8vIG1hcHBpbmcgb2YgZXZlbnRzIHRvIGlucHV0IHR5cGVzXG4gIHZhciBpbnB1dE1hcCA9IHtcbiAgICAna2V5ZG93bic6ICdrZXlib2FyZCcsXG4gICAgJ2tleXVwJzogJ2tleWJvYXJkJyxcbiAgICAnbW91c2Vkb3duJzogJ21vdXNlJyxcbiAgICAnbW91c2Vtb3ZlJzogJ21vdXNlJyxcbiAgICAnTVNQb2ludGVyRG93bic6ICdwb2ludGVyJyxcbiAgICAnTVNQb2ludGVyTW92ZSc6ICdwb2ludGVyJyxcbiAgICAncG9pbnRlcmRvd24nOiAncG9pbnRlcicsXG4gICAgJ3BvaW50ZXJtb3ZlJzogJ3BvaW50ZXInLFxuICAgICd0b3VjaHN0YXJ0JzogJ3RvdWNoJ1xuICB9O1xuXG4gIC8vIGFkZCBjb3JyZWN0IG1vdXNlIHdoZWVsIGV2ZW50IG1hcHBpbmcgdG8gYGlucHV0TWFwYFxuICBpbnB1dE1hcFtkZXRlY3RXaGVlbCgpXSA9ICdtb3VzZSc7XG5cbiAgLy8gYXJyYXkgb2YgYWxsIHVzZWQgaW5wdXQgdHlwZXNcbiAgdmFyIGlucHV0VHlwZXMgPSBbXTtcblxuICAvLyBtYXBwaW5nIG9mIGtleSBjb2RlcyB0byBhIGNvbW1vbiBuYW1lXG4gIHZhciBrZXlNYXAgPSB7XG4gICAgOTogJ3RhYicsXG4gICAgMTM6ICdlbnRlcicsXG4gICAgMTY6ICdzaGlmdCcsXG4gICAgMjc6ICdlc2MnLFxuICAgIDMyOiAnc3BhY2UnLFxuICAgIDM3OiAnbGVmdCcsXG4gICAgMzg6ICd1cCcsXG4gICAgMzk6ICdyaWdodCcsXG4gICAgNDA6ICdkb3duJ1xuICB9O1xuXG4gIC8vIG1hcCBvZiBJRSAxMCBwb2ludGVyIGV2ZW50c1xuICB2YXIgcG9pbnRlck1hcCA9IHtcbiAgICAyOiAndG91Y2gnLFxuICAgIDM6ICd0b3VjaCcsIC8vIHRyZWF0IHBlbiBsaWtlIHRvdWNoXG4gICAgNDogJ21vdXNlJ1xuICB9O1xuXG4gIC8vIHRvdWNoIGJ1ZmZlciB0aW1lclxuICB2YXIgdGltZXI7XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGFsbG93cyBldmVudHMgdGhhdCBhcmUgYWxzbyB0cmlnZ2VyZWQgdG8gYmUgZmlsdGVyZWQgb3V0IGZvciBgdG91Y2hzdGFydGBcbiAgZnVuY3Rpb24gZXZlbnRCdWZmZXIoKSB7XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIHNldElucHV0KGV2ZW50KTtcblxuICAgIGJ1ZmZlciA9IHRydWU7XG4gICAgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGJ1ZmZlciA9IGZhbHNlO1xuICAgIH0sIDY1MCk7XG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJlZEV2ZW50KGV2ZW50KSB7XG4gICAgaWYgKCFidWZmZXIpIHNldElucHV0KGV2ZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVuQnVmZmVyZWRFdmVudChldmVudCkge1xuICAgIGNsZWFyVGltZXIoKTtcbiAgICBzZXRJbnB1dChldmVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhclRpbWVyKCkge1xuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0SW5wdXQoZXZlbnQpIHtcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xuICAgIHZhciB2YWx1ZSA9IGlucHV0TWFwW2V2ZW50LnR5cGVdO1xuICAgIGlmICh2YWx1ZSA9PT0gJ3BvaW50ZXInKSB2YWx1ZSA9IHBvaW50ZXJUeXBlKGV2ZW50KTtcblxuICAgIC8vIGRvbid0IGRvIGFueXRoaW5nIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBpbnB1dCB0eXBlIGFscmVhZHkgc2V0XG4gICAgaWYgKGN1cnJlbnRJbnB1dCAhPT0gdmFsdWUpIHtcbiAgICAgIHZhciBldmVudFRhcmdldCA9IHRhcmdldChldmVudCk7XG4gICAgICB2YXIgZXZlbnRUYXJnZXROb2RlID0gZXZlbnRUYXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciBldmVudFRhcmdldFR5cGUgPSAoZXZlbnRUYXJnZXROb2RlID09PSAnaW5wdXQnKSA/IGV2ZW50VGFyZ2V0LmdldEF0dHJpYnV0ZSgndHlwZScpIDogbnVsbDtcblxuICAgICAgaWYgKFxuICAgICAgICAoLy8gb25seSBpZiB0aGUgdXNlciBmbGFnIHRvIGFsbG93IHR5cGluZyBpbiBmb3JtIGZpZWxkcyBpc24ndCBzZXRcbiAgICAgICAgIWJvZHkuaGFzQXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dC1mb3JtdHlwaW5nJykgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIGN1cnJlbnRJbnB1dCBoYXMgYSB2YWx1ZVxuICAgICAgICBjdXJyZW50SW5wdXQgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIHRoZSBpbnB1dCBpcyBga2V5Ym9hcmRgXG4gICAgICAgIHZhbHVlID09PSAna2V5Ym9hcmQnICYmXG5cbiAgICAgICAgLy8gbm90IGlmIHRoZSBrZXkgaXMgYFRBQmBcbiAgICAgICAga2V5TWFwW2V2ZW50S2V5XSAhPT0gJ3RhYicgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIHRoZSB0YXJnZXQgaXMgYSBmb3JtIGlucHV0IHRoYXQgYWNjZXB0cyB0ZXh0XG4gICAgICAgIChcbiAgICAgICAgICAgZXZlbnRUYXJnZXROb2RlID09PSAndGV4dGFyZWEnIHx8XG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3NlbGVjdCcgfHxcbiAgICAgICAgICAgKGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ2lucHV0JyAmJiBub25UeXBpbmdJbnB1dHMuaW5kZXhPZihldmVudFRhcmdldFR5cGUpIDwgMClcbiAgICAgICAgKSkgfHwgKFxuICAgICAgICAgIC8vIGlnbm9yZSBtb2RpZmllciBrZXlzXG4gICAgICAgICAgaWdub3JlTWFwLmluZGV4T2YoZXZlbnRLZXkpID4gLTFcbiAgICAgICAgKVxuICAgICAgKSB7XG4gICAgICAgIC8vIGlnbm9yZSBrZXlib2FyZCB0eXBpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaElucHV0KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09ICdrZXlib2FyZCcpIGxvZ0tleXMoZXZlbnRLZXkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3dpdGNoSW5wdXQoc3RyaW5nKSB7XG4gICAgY3VycmVudElucHV0ID0gc3RyaW5nO1xuICAgIGJvZHkuc2V0QXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dCcsIGN1cnJlbnRJbnB1dCk7XG5cbiAgICBpZiAoaW5wdXRUeXBlcy5pbmRleE9mKGN1cnJlbnRJbnB1dCkgPT09IC0xKSBpbnB1dFR5cGVzLnB1c2goY3VycmVudElucHV0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleShldmVudCkge1xuICAgIHJldHVybiAoZXZlbnQua2V5Q29kZSkgPyBldmVudC5rZXlDb2RlIDogZXZlbnQud2hpY2g7XG4gIH1cblxuICBmdW5jdGlvbiB0YXJnZXQoZXZlbnQpIHtcbiAgICByZXR1cm4gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LnNyY0VsZW1lbnQ7XG4gIH1cblxuICBmdW5jdGlvbiBwb2ludGVyVHlwZShldmVudCkge1xuICAgIGlmICh0eXBlb2YgZXZlbnQucG9pbnRlclR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gcG9pbnRlck1hcFtldmVudC5wb2ludGVyVHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAoZXZlbnQucG9pbnRlclR5cGUgPT09ICdwZW4nKSA/ICd0b3VjaCcgOiBldmVudC5wb2ludGVyVHlwZTsgLy8gdHJlYXQgcGVuIGxpa2UgdG91Y2hcbiAgICB9XG4gIH1cblxuICAvLyBrZXlib2FyZCBsb2dnaW5nXG4gIGZ1bmN0aW9uIGxvZ0tleXMoZXZlbnRLZXkpIHtcbiAgICBpZiAoYWN0aXZlS2V5cy5pbmRleE9mKGtleU1hcFtldmVudEtleV0pID09PSAtMSAmJiBrZXlNYXBbZXZlbnRLZXldKSBhY3RpdmVLZXlzLnB1c2goa2V5TWFwW2V2ZW50S2V5XSk7XG4gIH1cblxuICBmdW5jdGlvbiB1bkxvZ0tleXMoZXZlbnQpIHtcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xuICAgIHZhciBhcnJheVBvcyA9IGFjdGl2ZUtleXMuaW5kZXhPZihrZXlNYXBbZXZlbnRLZXldKTtcblxuICAgIGlmIChhcnJheVBvcyAhPT0gLTEpIGFjdGl2ZUtleXMuc3BsaWNlKGFycmF5UG9zLCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJpbmRFdmVudHMoKSB7XG4gICAgYm9keSA9IGRvY3VtZW50LmJvZHk7XG5cbiAgICAvLyBwb2ludGVyIGV2ZW50cyAobW91c2UsIHBlbiwgdG91Y2gpXG4gICAgaWYgKHdpbmRvdy5Qb2ludGVyRXZlbnQpIHtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCBidWZmZXJlZEV2ZW50KTtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBidWZmZXJlZEV2ZW50KTtcbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5NU1BvaW50ZXJFdmVudCkge1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdNU1BvaW50ZXJEb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ01TUG9pbnRlck1vdmUnLCBidWZmZXJlZEV2ZW50KTtcbiAgICB9IGVsc2Uge1xuXG4gICAgICAvLyBtb3VzZSBldmVudHNcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGJ1ZmZlcmVkRXZlbnQpO1xuXG4gICAgICAvLyB0b3VjaCBldmVudHNcbiAgICAgIGlmICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHtcbiAgICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZXZlbnRCdWZmZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1vdXNlIHdoZWVsXG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKG1vdXNlV2hlZWwsIGJ1ZmZlcmVkRXZlbnQpO1xuXG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdW5CdWZmZXJlZEV2ZW50KTtcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdW5CdWZmZXJlZEV2ZW50KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHVuTG9nS2V5cyk7XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgdXRpbGl0aWVzXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gZGV0ZWN0IHZlcnNpb24gb2YgbW91c2Ugd2hlZWwgZXZlbnQgdG8gdXNlXG4gIC8vIHZpYSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWxcbiAgZnVuY3Rpb24gZGV0ZWN0V2hlZWwoKSB7XG4gICAgcmV0dXJuIG1vdXNlV2hlZWwgPSAnb253aGVlbCcgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykgP1xuICAgICAgJ3doZWVsJyA6IC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxuXG4gICAgICBkb2N1bWVudC5vbm1vdXNld2hlZWwgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgICdtb3VzZXdoZWVsJyA6IC8vIFdlYmtpdCBhbmQgSUUgc3VwcG9ydCBhdCBsZWFzdCBcIm1vdXNld2hlZWxcIlxuICAgICAgICAnRE9NTW91c2VTY3JvbGwnOyAvLyBsZXQncyBhc3N1bWUgdGhhdCByZW1haW5pbmcgYnJvd3NlcnMgYXJlIG9sZGVyIEZpcmVmb3hcbiAgfVxuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICBpbml0XG5cbiAgICBkb24ndCBzdGFydCBzY3JpcHQgdW5sZXNzIGJyb3dzZXIgY3V0cyB0aGUgbXVzdGFyZCxcbiAgICBhbHNvIHBhc3NlcyBpZiBwb2x5ZmlsbHMgYXJlIHVzZWRcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICBpZiAoXG4gICAgJ2FkZEV2ZW50TGlzdGVuZXInIGluIHdpbmRvdyAmJlxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mXG4gICkge1xuXG4gICAgLy8gaWYgdGhlIGRvbSBpcyBhbHJlYWR5IHJlYWR5IGFscmVhZHkgKHNjcmlwdCB3YXMgcGxhY2VkIGF0IGJvdHRvbSBvZiA8Ym9keT4pXG4gICAgaWYgKGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIGJpbmRFdmVudHMoKTtcblxuICAgIC8vIG90aGVyd2lzZSB3YWl0IGZvciB0aGUgZG9tIHRvIGxvYWQgKHNjcmlwdCB3YXMgcGxhY2VkIGluIHRoZSA8aGVhZD4pXG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBiaW5kRXZlbnRzKTtcbiAgICB9XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgYXBpXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgcmV0dXJuIHtcblxuICAgIC8vIHJldHVybnMgc3RyaW5nOiB0aGUgY3VycmVudCBpbnB1dCB0eXBlXG4gICAgYXNrOiBmdW5jdGlvbigpIHsgcmV0dXJuIGN1cnJlbnRJbnB1dDsgfSxcblxuICAgIC8vIHJldHVybnMgYXJyYXk6IGN1cnJlbnRseSBwcmVzc2VkIGtleXNcbiAgICBrZXlzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGFjdGl2ZUtleXM7IH0sXG5cbiAgICAvLyByZXR1cm5zIGFycmF5OiBhbGwgdGhlIGRldGVjdGVkIGlucHV0IHR5cGVzXG4gICAgdHlwZXM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gaW5wdXRUeXBlczsgfSxcblxuICAgIC8vIGFjY2VwdHMgc3RyaW5nOiBtYW51YWxseSBzZXQgdGhlIGlucHV0IHR5cGVcbiAgICBzZXQ6IHN3aXRjaElucHV0XG4gIH07XG5cbn0oKSk7XG4iLCJ2YXIgZGVidWcgPSBmYWxzZTtcblxudmFyIG1kID0gbmV3IE1vYmlsZURldGVjdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XG5cbnZhciBfbW9iaWxlTW9kZSA9IChtZC5waG9uZSgpICE9IG51bGwgfHwgbWQudGFibGV0KCkgIT0gbnVsbCk7XG52YXIgY29udHJvbGxlcjtcblxudmFyIHNjcmVlbkhlaWdodCA9IDA7XG5cbnZhciBmb290ZXIgPSAkKFwiI2Zvb3RlclwiKTtcblxuaWYgKGRlYnVnKSB7XG5cdCQoXCJib2R5XCIpLmFkZENsYXNzKFwiZGVidWdcIik7XG59XG5cbiQoXCJib2R5XCIpLm9uKFwiY2xpY2tcIiwgXCIubGluay1hbmNob3JcIiwgZnVuY3Rpb24oKSB7XG5cdHZhciBzZWxmID0gJCh0aGlzKTtcblx0dmFyIGlkID0gc2VsZi5hdHRyKFwiaHJlZlwiKTtcblx0dmFyIHRhcmdldCA9ICQoaWQpO1xuXHRpZih0YXJnZXQubGVuZ3RoID09IDApIHJldHVybiBmYWxzZTtcblx0dmFyIHdoaCA9IHdpbmRvdy5pbm5lckhlaWdodCAvIDI7XG5cdHJldHVybiBmYWxzZTtcbn0pO1xuXG5cbmZ1bmN0aW9uIGluaXRTdHJlYW0oKSB7XG5cdGNvbnRyb2xsZXIgPSBuZXcgU2Nyb2xsTWFnaWMuQ29udHJvbGxlcigpO1xuXHRcblx0dmFyIHNjZW5lO1xuXHRpZighX21vYmlsZU1vZGUpe1xuXHRcdFxuXHRzY2VuZSA9IG5ldyBTY3JvbGxNYWdpY1xuXHRcdC5TY2VuZSh7XG5cdFx0XHR0cmlnZ2VyRWxlbWVudDogXCIjX2JwLXN0YXJ0LWFtYWxpYS1vcGFjaXR5XCIsXG5cdFx0XHRkdXJhdGlvbjogKHNjcmVlbkhlaWdodCkrXCJweFwiLFxuXHRcdH0pXG5cdFx0LnNldFR3ZWVuKFwiI2FtYWxpYVwiLCAxLCB7XG5cdFx0XHRvcGFjaXR5OiAwXG5cdFx0fSlcblx0XHQuYWRkVG8oY29udHJvbGxlcik7XG5cdFx0XG5cdFxuXHRcblx0c2NlbmUgPSBuZXcgU2Nyb2xsTWFnaWNcblx0XHQuU2NlbmUoe1xuXHRcdFx0dHJpZ2dlckVsZW1lbnQ6IFwiI19icC1zdGFydC1uZXdzLXBpblwiLFxuXHRcdFx0ZHVyYXRpb246IChzY3JlZW5IZWlnaHQgKiAxKStcInB4XCJcblx0XHR9KVxuXHRcdC5zZXRQaW4oXCIjbmV3c1wiKVxuXHRcdC5hZGRUbyhjb250cm9sbGVyKTtcblx0XHRcblx0c2NlbmUgPSBuZXcgU2Nyb2xsTWFnaWNcblx0XHQuU2NlbmUoe1xuXHRcdFx0dHJpZ2dlckVsZW1lbnQ6IFwiI19icC1zdGFydC1yZWQtcGluXCIsXG5cdFx0XHRkdXJhdGlvbjogKHNjcmVlbkhlaWdodCAqIDIuMSkrXCJweFwiXG5cdFx0fSlcblx0XHQuc2V0UGluKFwiI3JlZFwiKVxuXHRcdC5hZGRUbyhjb250cm9sbGVyKTtcblx0XG5cdHNjZW5lID0gbmV3IFNjcm9sbE1hZ2ljXG5cdFx0LlNjZW5lKHtcblx0XHRcdHRyaWdnZXJFbGVtZW50OiBcIiNfYnAtc3RhcnQtY29uY2VwdC1waW5cIixcblx0XHRcdGR1cmF0aW9uOiAoc2NyZWVuSGVpZ2h0ICogMS41KStcInB4XCJcblx0XHR9KVxuXHRcdC5zZXRQaW4oXCIjY29uY2VwdFwiKVxuXHRcdC5hZGRUbyhjb250cm9sbGVyKTtcblx0XHRcblx0c2NlbmUgPSBuZXcgU2Nyb2xsTWFnaWNcblx0XHQuU2NlbmUoe1xuXHRcdFx0dHJpZ2dlckVsZW1lbnQ6IFwiI19icC1zdGFydC1jb25jZXB0LW1lbnUtcGluXCIsXG5cdFx0XHRkdXJhdGlvbjogKHNjcmVlbkhlaWdodCAqIDEpK1wicHhcIlxuXHRcdH0pXG5cdFx0LnNldFBpbihcIiNjb25jZXB0LW1lbnVcIilcblx0XHQuYWRkVG8oY29udHJvbGxlcik7XG5cdFx0XG5cdHNjZW5lID0gbmV3IFNjcm9sbE1hZ2ljXG5cdFx0LlNjZW5lKHtcblx0XHRcdHRyaWdnZXJFbGVtZW50OiBcIiNfYnAtc3RhcnQtYm9vay1waW5cIixcblx0XHRcdGR1cmF0aW9uOiAoc2NyZWVuSGVpZ2h0ICogMi41KStcInB4XCJcblx0XHR9KVxuXHRcdC5zZXRQaW4oXCIjYm9va1wiKVxuXHRcdC5hZGRUbyhjb250cm9sbGVyKTtcblx0XHRcblx0c2NlbmUgPSBuZXcgU2Nyb2xsTWFnaWNcblx0XHQuU2NlbmUoe1xuXHRcdFx0dHJpZ2dlckVsZW1lbnQ6IFwiI19icC1zdGFydC1ib29rLXRpdGxlLXBpblwiLFxuXHRcdFx0ZHVyYXRpb246IChzY3JlZW5IZWlnaHQgKiAyKStcInB4XCJcblx0XHR9KVxuXHRcdC5zZXRQaW4oXCIjYm9vay10aXRsZVwiKVxuXHRcdC5hZGRUbyhjb250cm9sbGVyKTtcblx0XHRcblx0c2NlbmUgPSBuZXcgU2Nyb2xsTWFnaWNcblx0XHQuU2NlbmUoe1xuXHRcdFx0dHJpZ2dlckVsZW1lbnQ6IFwiI19icC1zdGFydC1ib29rLW1lbnUtcGluXCIsXG5cdFx0XHRkdXJhdGlvbjogKHNjcmVlbkhlaWdodCAqIDEpK1wicHhcIlxuXHRcdH0pXG5cdFx0LnNldFBpbihcIiNib29rLW1lbnVcIilcblx0XHQuYWRkVG8oY29udHJvbGxlcik7XG5cdC8qXG5cdHNjZW5lID0gbmV3IFNjcm9sbE1hZ2ljXG5cdFx0LlNjZW5lKHtcblx0XHRcdHRyaWdnZXJFbGVtZW50OiBcIiNfYnAtc3RhcnQtYm9vay10aXRsZS10b3BcIixcblx0XHRcdGR1cmF0aW9uOiAoc2NyZWVuSGVpZ2h0ICogNikrXCJweFwiLFxuXHRcdH0pXG5cdFx0LnNldFR3ZWVuKFwiI2Jvb2stdGl0bGVcIiwgMC41LCB7XG5cdFx0XHR0b3A6IFwiLT0xMDAwcHhcIlxuXHRcdH0pXG5cdFx0LmFkZFRvKGNvbnRyb2xsZXIpO1xuXHQqL1xuXHRcdFxuXHRzY2VuZSA9IG5ldyBTY3JvbGxNYWdpY1xuXHRcdC5TY2VuZSh7XG5cdFx0XHR0cmlnZ2VyRWxlbWVudDogXCIjX2JwLXN0YXJ0LWdvbGQtcGluXCIsXG5cdFx0XHRkdXJhdGlvbjogKHNjcmVlbkhlaWdodCAqIDMpK1wicHhcIlxuXHRcdH0pXG5cdFx0LnNldFBpbihcIiNnb2xkXCIpXG5cdFx0LmFkZFRvKGNvbnRyb2xsZXIpO1xuXHRcdFxuXHRzY2VuZSA9IG5ldyBTY3JvbGxNYWdpY1xuXHRcdC5TY2VuZSh7XG5cdFx0XHR0cmlnZ2VyRWxlbWVudDogXCIjX2JwLXN0YXJ0LXdoaXRlLXBpblwiLFxuXHRcdFx0ZHVyYXRpb246IChzY3JlZW5IZWlnaHQgKiAzKStcInB4XCJcblx0XHR9KVxuXHRcdC5zZXRQaW4oXCIjd2hpdGVcIilcblx0XHQuYWRkVG8oY29udHJvbGxlcik7XG5cdFx0XG5cdHNjZW5lID0gbmV3IFNjcm9sbE1hZ2ljXG5cdFx0LlNjZW5lKHtcblx0XHRcdHRyaWdnZXJFbGVtZW50OiBcIiNfYnAtc3RhcnQtdHJhbnNsYXRpb25zLXBpblwiLFxuXHRcdFx0ZHVyYXRpb246IChzY3JlZW5IZWlnaHQgKiAyKStcInB4XCJcblx0XHR9KVxuXHRcdC5zZXRQaW4oXCIjdHJhbnNsYXRpb25zXCIpXG5cdFx0LmFkZFRvKGNvbnRyb2xsZXIpO1xuXHRcdFxuXHRzY2VuZSA9IG5ldyBTY3JvbGxNYWdpY1xuXHRcdC5TY2VuZSh7XG5cdFx0XHR0cmlnZ2VyRWxlbWVudDogXCIjX2JwLXN0YXJ0LXRyYW5zbGF0aW9ucy1tZW51LXBpblwiLFxuXHRcdFx0ZHVyYXRpb246IChzY3JlZW5IZWlnaHQgKiAxKStcInB4XCJcblx0XHR9KVxuXHRcdC5zZXRQaW4oXCIjdHJhbnNsYXRpb25zLW1lbnVcIilcblx0XHQuYWRkVG8oY29udHJvbGxlcik7XG5cdFx0XG5cdHNjZW5lID0gbmV3IFNjcm9sbE1hZ2ljXG5cdFx0LlNjZW5lKHtcblx0XHRcdHRyaWdnZXJFbGVtZW50OiBcIiNfYnAtc3RhcnQtZ29sZDItcGluXCIsXG5cdFx0XHRkdXJhdGlvbjogKHNjcmVlbkhlaWdodCAqIDIuNSkrXCJweFwiXG5cdFx0fSlcblx0XHQuc2V0UGluKFwiI2dvbGQyXCIpXG5cdFx0LmFkZFRvKGNvbnRyb2xsZXIpO1xuXHRcblx0c2NlbmUgPSBuZXcgU2Nyb2xsTWFnaWNcblx0XHQuU2NlbmUoe1xuXHRcdFx0dHJpZ2dlckVsZW1lbnQ6IFwiI19icC1zdGFydC1nb2xkMi10aXRsZS1waW5cIixcblx0XHRcdGR1cmF0aW9uOiAoc2NyZWVuSGVpZ2h0ICogMikrXCJweFwiXG5cdFx0fSlcblx0XHQuc2V0UGluKFwiI2dvbGQyLXRpdGxlXCIpXG5cdFx0LmFkZFRvKGNvbnRyb2xsZXIpO1xuXHRcdFxuXHRzY2VuZSA9IG5ldyBTY3JvbGxNYWdpY1xuXHRcdC5TY2VuZSh7XG5cdFx0XHR0cmlnZ2VyRWxlbWVudDogXCIjX2JwLXN0YXJ0LWdvbGQyLW1lbnUtcGluXCIsXG5cdFx0XHRkdXJhdGlvbjogKHNjcmVlbkhlaWdodCAqIDEpK1wicHhcIlxuXHRcdH0pXG5cdFx0LnNldFBpbihcIiNnb2xkMi1tZW51XCIpXG5cdFx0LmFkZFRvKGNvbnRyb2xsZXIpO1xuXHRcblx0XHRcblx0c2NlbmUgPSBuZXcgU2Nyb2xsTWFnaWNcblx0XHQuU2NlbmUoe1xuXHRcdFx0dHJpZ2dlckVsZW1lbnQ6IFwiI19icC1zdGFydC1hbWFsaWEtb3BhY2l0eS1zaG93XCIsXG5cdFx0XHRkdXJhdGlvbjogKHNjcmVlbkhlaWdodCkrXCJweFwiLFxuXHRcdH0pXG5cdFx0LnNldFR3ZWVuKFwiI2FtYWxpYVwiLCAxLCB7XG5cdFx0XHRvcGFjaXR5OiAxXG5cdFx0fSlcblx0XHQuYWRkVG8oY29udHJvbGxlcik7XG5cdFxuXHR9XG5cdFxufVxuJChcImJvZHlcIikub24oXCJjbGlja1wiLFwiI3Jlc3BvbnNpdmUtbWVudS10b2dnbGUgYnV0dG9uXCIsIGZ1bmN0aW9uKCl7XG5cdHZhciBtZW51ID0gJChcIiNyZXNwb25zaXZlLW1lbnVcIik7XG5cdG1lbnUuc2xpZGVUb2dnbGUoKTtcblx0cmV0dXJuIGZhbHNlO1xufSk7XG5cbiQoZG9jdW1lbnQpLm9uKFwicmVhZHkgc2Nyb2xsIHJlc2l6ZVwiLCBmdW5jdGlvbihlKSB7XG5cdC8vL3ZhciBwYWdlSGVpZ2h0ID0gJChcImJvZHlcIilbMF0uc2Nyb2xsSGVpZ2h0O1xuXHRjb25zb2xlLmxvZygncmVhZHknKVxuXHRpZigkKFwiYm9keVwiKS5oYXNDbGFzcyhcInBhZ2UtbWFpblwiKSl7XG5cdFx0dmFyIGxhc3RTZWN0aW9uID0gJChcInNlY3Rpb25cIikubGFzdCgpO1xuXHRcdHZhciBvZmZzZXRUb3AgPSBsYXN0U2VjdGlvblswXS5vZmZzZXRUb3A7XG5cdFx0dmFyIGhlaWdodCA9IGxhc3RTZWN0aW9uLm91dGVySGVpZ2h0KHRydWUpO1xuXHRcdFxuXHRcdC8vZm9vdGVyLmNzcyhcInRvcFwiLChvZmZzZXRUb3AraGVpZ2h0KStcInB4XCIpO1xuXHRcdC8vY29uc29sZS5sb2coJ28nLG9mZnNldFRvcCxsYXN0U2VjdGlvbi5vdXRlckhlaWdodCh0cnVlKSlcblx0XHRcblx0fVxufSk7XG5cbiQod2luZG93KS5vbihcImxvYWRcIiwgZnVuY3Rpb24oKSB7XG5cdHZhciB3ID0gJCh3aW5kb3cpO1xuXHR2YXIgaCA9IHcuaW5uZXJIZWlnaHQoKTtcblx0c2NyZWVuSGVpZ2h0ID0gaDtcblx0aW5pdFN0cmVhbSgpO1xuXHRcblx0aWYoX21vYmlsZU1vZGUpICQoXCJib2R5XCIpLmFkZENsYXNzKFwiX21vZGUtbW9iaWxlXCIpO1xuXHRcblx0aWYobWQudGFibGV0KCkpICQoXCJib2R5XCIpLmFkZENsYXNzKFwiX21vZGUtbW9iaWxlLXRhYmxldFwiKTtcblx0aWYobWQucGhvbmUoKSkgJChcImJvZHlcIikuYWRkQ2xhc3MoXCJfbW9kZS1tb2JpbGUtcGhvbmVcIik7XG59KTtcbiQod2luZG93KS5vbihcImxvYWRcIiwgZnVuY3Rpb24oKSB7XG5cdCQoZG9jdW1lbnQpLmZvdW5kYXRpb24oKTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
