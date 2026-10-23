/* =========================================================
   A SONG OF ICE AND FIRE — The Story of Westeros
   script.js

   What this file does, in order:
   1.  Small helper functions
   2.  Splits headings into words and letters (for the reveal animation)
   3.  Fades photos in once they have loaded
   4.  Reveals text and timeline events as they scroll into view
   5.  Scroll effects: progress bar, parallax, image zoom, text scrub,
       timeline line
   6.  Tracks which chapter you are in (chapter dots + particle mood)
   7.  The Seven Kingdoms region picker
   8.  Floating particles (embers, dust and snow)
   ========================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------
     1. HELPERS
     ------------------------------------------------------- */
  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };
  var clamp = function (value, min, max) { return Math.min(max, Math.max(min, value)); };
  var escapeHTML = function (text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // People who ask their device for less motion get a calmer page
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasObserver = 'IntersectionObserver' in window;


  /* -------------------------------------------------------
     2. SPLIT HEADINGS INTO WORDS AND LETTERS
     ------------------------------------------------------- */

  // The main title: every letter animates separately
  $$('[data-letters]').forEach(function (el) {
    var text = el.textContent.trim();
    var index = 0;
    el.innerHTML = text.split(/\s+/).map(function (word) {
      var letters = Array.from(word).map(function (letter) {
        var html = '<span class="ch" aria-hidden="true" style="--i:' + index + '">' + escapeHTML(letter) + '</span>';
        index += 1;
        return html;
      }).join('');
      return '<span class="word">' + letters + '</span>';
    }).join(' ');
  });

  // Other headings: every word rises into place
  $$('[data-words]').forEach(function (el) {
    var text = el.textContent.trim();
    if (!el.hasAttribute('aria-label')) { el.setAttribute('aria-label', text); }
    el.innerHTML = text.split(/\s+/).map(function (word, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + escapeHTML(word) + '</span></span>';
    }).join(' ');
  });


  /* -------------------------------------------------------
     3. PHOTOS FADE IN WHEN THEY LOAD
     (a missing photo is removed by the onerror attribute in the HTML,
      and the CSS-drawn background stays visible)
     ------------------------------------------------------- */
  $$('img.bg-img').forEach(function (img) {
    var show = function () { img.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth > 0) {
      show();
    } else {
      img.addEventListener('load', show, { once: true });
    }
  });


  /* -------------------------------------------------------
     4. REVEAL ON SCROLL
     ------------------------------------------------------- */
  var revealTargets = $$('[data-reveal], [data-words], [data-letters], .event');

  if (hasObserver) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    // Very old browsers: just show everything
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }


  /* -------------------------------------------------------
     5. SCROLL EFFECTS
     ------------------------------------------------------- */
  var progressBar = $('.progress__bar');
  var timeline = $('.timeline');
  var timelineFill = $('.timeline__line span');
  var scrubLines = $$('[data-scrub]');

  // Parallax: an element drifts slower than the page.
  // "ref" is the box we measure to know how far along the scroll is.
  var parallaxItems = $$('[data-parallax]').map(function (el) {
    var ref = el.hasAttribute('data-parallax-local')
      ? el.parentElement
      : el.parentElement.closest('section, .world__landscape');
    return { el: el, ref: ref, speed: parseFloat(el.getAttribute('data-parallax')) || 0 };
  });

  // Zoom: an image slowly grows while its section passes through the screen
  var zoomItems = $$('[data-zoom]').map(function (el) {
    return {
      el: el,
      ref: el.closest('.world__landscape, section, article'),
      amount: parseFloat(el.getAttribute('data-zoom')) || 0
    };
  });

  // Only animate things that are near the screen
  var visibleRefs = new Set();
  parallaxItems.concat(zoomItems).forEach(function (item) { visibleRefs.add(item.ref); });

  if (hasObserver) {
    var visibilityObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { visibleRefs.add(entry.target); }
        else { visibleRefs.delete(entry.target); }
      });
    }, { rootMargin: '15% 0px 15% 0px' });

    var observedRefs = new Set();
    parallaxItems.concat(zoomItems).forEach(function (item) {
      if (item.ref && !observedRefs.has(item.ref)) {
        observedRefs.add(item.ref);
        visibilityObserver.observe(item.ref);
      }
    });
  }

  function updateScrollEffects() {
    ticking = false;

    var vh = window.innerHeight;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var maxScroll = document.documentElement.scrollHeight - vh;

    // Progress bar at the top of the page
    if (progressBar) {
      var progress = maxScroll > 0 ? clamp(y / maxScroll, 0, 1) : 0;
      progressBar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
    }

    if (reduceMotion) { return; }

    // Parallax
    parallaxItems.forEach(function (item) {
      if (!item.ref || !visibleRefs.has(item.ref)) { return; }
      var rect = item.ref.getBoundingClientRect();
      var offset = (rect.top + rect.height / 2) - vh / 2;
      item.el.style.transform = 'translate3d(0,' + (-offset * item.speed).toFixed(1) + 'px,0)';
    });

    // Slow zoom
    zoomItems.forEach(function (item) {
      if (!item.ref || !visibleRefs.has(item.ref)) { return; }
      var rect = item.ref.getBoundingClientRect();
      var p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      item.el.style.transform = 'scale(' + (1 + p * item.amount).toFixed(4) + ')';
    });

    // Iron Throne text: each line fades in as it reaches the reading area,
    // and fades out gently once it leaves the top of the screen
    scrubLines.forEach(function (line) {
      var rect = line.getBoundingClientRect();
      var fadeIn = clamp((vh * 0.88 - rect.top) / (vh * 0.3), 0, 1);
      var fadeOut = clamp((rect.bottom - vh * 0.08) / (vh * 0.22), 0, 1);
      line.style.opacity = Math.min(fadeIn, fadeOut).toFixed(3);
    });

    // The gold line that grows down the war timeline
    if (timeline && timelineFill) {
      var tRect = timeline.getBoundingClientRect();
      var tp = clamp((vh * 0.6 - tRect.top) / tRect.height, 0, 1);
      timelineFill.style.transform = 'scaleY(' + tp.toFixed(4) + ')';
    }
  }

  // Run the scroll code at most once per screen refresh, so it never lags
  var ticking = false;
  function requestTick() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScrollEffects);
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);

  if (reduceMotion) {
    // Show the throne text and the full timeline line without animation
    scrubLines.forEach(function (line) { line.style.opacity = '1'; });
    if (timelineFill) { timelineFill.style.transform = 'scaleY(1)'; }
  }

  updateScrollEffects();


  /* -------------------------------------------------------
     6. WHICH CHAPTER ARE WE IN?
     Updates the chapter dots on the right and the mood of the particles.
     ------------------------------------------------------- */
  var moodElements = $$('[data-mood]');
  var navLinks = $$('.chapters a');
  var navSections = navLinks.map(function (link) { return $(link.getAttribute('href')); });

  var activeMoodElements = new Set();
  var activeNavSections = new Set();
  var currentMood = 'ember';

  function applyMood() {
    // Of all sections crossing the middle of the screen, the last one in the page wins
    var chosen = null;
    moodElements.forEach(function (el) { if (activeMoodElements.has(el)) { chosen = el; } });
    if (chosen) {
      currentMood = chosen.getAttribute('data-mood');
      if (typeof window.__setParticleMood === 'function') { window.__setParticleMood(currentMood); }
    }
  }

  function applyNav() {
    var chosenIndex = -1;
    navSections.forEach(function (section, i) { if (section && activeNavSections.has(section)) { chosenIndex = i; } });
    navLinks.forEach(function (link, i) {
      var isActive = i === chosenIndex;
      link.classList.toggle('is-active', isActive);
      if (isActive) { link.setAttribute('aria-current', 'true'); }
      else { link.removeAttribute('aria-current'); }
    });
  }

  if (hasObserver) {
    var chapterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activeMoodElements.add(entry.target);
          activeNavSections.add(entry.target);
        } else {
          activeMoodElements.delete(entry.target);
          activeNavSections.delete(entry.target);
        }
      });
      applyMood();
      applyNav();
    }, { rootMargin: '-50% 0px -50% 0px' });

    var chapterTargets = new Set(moodElements);
    navSections.forEach(function (section) { if (section) { chapterTargets.add(section); } });
    chapterTargets.forEach(function (el) { chapterObserver.observe(el); });
  }


  /* -------------------------------------------------------
     7. THE SEVEN KINGDOMS PICKER
     ------------------------------------------------------- */
  var regionPanel = $('.region-panel');
  var regionButtons = $$('.region');

  if (regionPanel && regionButtons.length) {
    var panelBody = $('.region-panel__body', regionPanel);
    var panelHouse = $('.region-panel__house', regionPanel);
    var panelName = $('.region-panel__name', regionPanel);
    var panelSeat = $('.region-panel__seat', regionPanel);
    var panelText = $('.region-panel__text', regionPanel);
    var panelTimer = null;

    var selectRegion = function (button) {
      if (button.classList.contains('is-active')) { return; }

      regionButtons.forEach(function (b) { b.classList.toggle('is-active', b === button); });

      // The colours change straight away, the words fade out and back in
      regionPanel.setAttribute('data-region', button.getAttribute('data-region'));
      panelBody.classList.add('is-changing');

      window.clearTimeout(panelTimer);
      panelTimer = window.setTimeout(function () {
        panelHouse.textContent = button.getAttribute('data-house');
        panelName.textContent = $('.region__name', button).textContent;
        panelSeat.textContent = 'Seat: ' + button.getAttribute('data-seat');
        panelText.textContent = button.getAttribute('data-text');
        panelBody.classList.remove('is-changing');
      }, 300);
    };

    regionButtons.forEach(function (button) {
      button.addEventListener('click', function () { selectRegion(button); });
      button.addEventListener('mouseenter', function () { selectRegion(button); });
      button.addEventListener('focus', function () { selectRegion(button); });
    });
  }


  /* -------------------------------------------------------
     8. FLOATING PARTICLES
     Embers rise, dust drifts and snow falls, depending on the chapter.
     ------------------------------------------------------- */
  var canvas = $('.particles');

  if (canvas && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var width = 0;
    var height = 0;

    var MOODS = {
      ember: { dir: -1,   speed: 0.55, size: 1.5, alpha: 0.75, sway: 0.5, color: [226, 122, 58] },
      dust:  { dir: -0.1, speed: 0.18, size: 1.1, alpha: 0.3,  sway: 0.3, color: [205, 200, 188] },
      snow:  { dir: 1,    speed: 0.7,  size: 1.9, alpha: 0.7,  sway: 0.8, color: [228, 236, 246] }
    };

    // "current" slowly moves towards "target", so changes feel smooth
    var current = {
      dir: MOODS.ember.dir, speed: MOODS.ember.speed, size: MOODS.ember.size,
      alpha: MOODS.ember.alpha, sway: MOODS.ember.sway, color: MOODS.ember.color.slice()
    };
    var target = MOODS.ember;

    window.__setParticleMood = function (name) { target = MOODS[name] || MOODS.dust; };

    var resizeCanvas = function () {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    var particleCount = window.innerWidth < 700 ? 34 : 64;
    var particles = [];
    for (var n = 0; n < particleCount; n += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.5 + Math.random(),
        s: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2
      });
    }

    var drawParticles = function (time) {
      window.requestAnimationFrame(drawParticles);
      if (document.hidden) { return; }

      ['dir', 'speed', 'size', 'alpha', 'sway'].forEach(function (key) {
        current[key] += (target[key] - current[key]) * 0.03;
      });
      for (var c = 0; c < 3; c += 1) {
        current.color[c] += (target.color[c] - current.color[c]) * 0.03;
      }

      ctx.clearRect(0, 0, width, height);

      var red = Math.round(current.color[0]);
      var green = Math.round(current.color[1]);
      var blue = Math.round(current.color[2]);

      for (var i = 0; i < particles.length; i += 1) {
        var p = particles[i];

        p.y += current.dir * current.speed * p.s * 1.4;
        p.x += Math.sin(time * 0.0006 + p.phase) * current.sway * p.s * 0.6;

        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        if (p.y > height + 10) { p.y = -10; p.x = Math.random() * width; }
        if (p.x < -10) { p.x = width + 10; }
        if (p.x > width + 10) { p.x = -10; }

        var alpha = current.alpha * (0.55 + 0.45 * Math.sin(time * 0.002 + p.phase * 3));

        ctx.fillStyle = 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, current.size * p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    window.requestAnimationFrame(drawParticles);
  }

})();

const bgMusic = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicBtn");

musicBtn.addEventListener("click", async () => {
  if (bgMusic.paused) {
    try {
      await bgMusic.play();
      musicBtn.textContent = "Pause Music";
    } catch (error) {
      musicBtn.textContent = "Play Music";
    }
  } else {
    bgMusic.pause();
    musicBtn.textContent = "Play Music";
  }
});
