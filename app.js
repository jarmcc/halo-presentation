/* Halo sprint reflections. Local, self-contained Reveal.js presentation. */
(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactLayout = matchMedia('(max-width: 600px)');
  const params = new URLSearchParams(location.search);
  let sections = [...document.querySelectorAll('.slides > section')];
  const counter = document.querySelector('#slide-counter');
  const chapter = document.querySelector('#chapter-label');
  const viewToggle = document.querySelector('#view-toggle');
  const help = document.querySelector('#help-dialog');
  let demoStep = 0;
  let lastJourneyProgress = null;
  let openingElement = null;
  let openingGeneration = 0;
  const openingTimers = new Set();
  const openingReply = 'abc sec, u?';

  if (!window.Reveal) {
    document.body.innerHTML = '<p style="padding:40px;font:20px/1.5 system-ui">The presentation framework could not load. Keep the assets folder beside index.html, then refresh.</p>';
    return;
  }

  // The journey lives on the authored canvas, so it is part of every slide.
  // The little halo moves with the presenter, including individual points.
  sections.forEach((slide, index) => {
    const journey = document.createElement('div');
    journey.className = 'journey-progress';
    const label = slide.dataset.week ? `${slide.dataset.week} / ${slide.dataset.title}` : slide.dataset.title;
    const percent = index / (sections.length - 1) * 100;
    journey.innerHTML = `<div class="journey-track" role="group" aria-label="Sprint navigation">
      <span class="journey-line"></span><span class="journey-fill" style="width:${percent}%" role="progressbar" aria-label="Presentation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}"></span>
      ${sections.map((target, i) => `<button class="journey-stop${i < index ? ' completed' : ''}" type="button" data-goto="${i}" style="left:${i / (sections.length - 1) * 100}%" aria-label="Go to slide ${i + 1}: ${target.dataset.title}"${i === index ? ' aria-current="step"' : ''}></button>`).join('')}
      <span class="journey-marker" style="left:${percent}%" aria-hidden="true"><span class="journey-halo"></span></span>
    </div><div class="journey-labels"><span>${label}</span><span>${String(index + 1).padStart(2, '0')} / ${sections.length}</span></div>`;
    slide.querySelector('.slide-content').append(journey);
  });

  // These layers are siblings of .slides. Reveal moves the foreground, while
  // the same physical progress bar remains on screen and one background pans.
  const panorama = document.createElement('div');
  panorama.className = 'panorama-viewport';
  panorama.setAttribute('aria-hidden', 'true');
  panorama.innerHTML = '<div class="panorama-stage"><div class="panorama-camera"><div class="panorama-world"><img src="assets/halo-panorama.svg" alt=""></div></div></div>';
  const overlay = document.createElement('div');
  overlay.className = 'presentation-overlay';
  overlay.innerHTML = '<div class="persistent-stage"></div>';
  const persistentJourney = sections[0].querySelector('.journey-progress').cloneNode(true);
  overlay.querySelector('.persistent-stage').append(persistentJourney);
  const revealRoot = document.querySelector('.reveal');
  revealRoot.append(panorama, overlay);

  // A physical shared-element expansion. The outgoing words are copied at
  // their actual screen position, then translated and uniformly scaled into
  // the next slide. Neither the copy nor its line breaks change in flight.
  const purposeSnapshots = new Map();
  let purposeFlight = null;
  const purposeStyles = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'display', 'white-space'];

  function rememberPurpose() {
    if (!Reveal.isReady() || purposeFlight || Reveal.isOverview()) return;
    const slide = Reveal.getCurrentSlide();
    const phrase = slide?.querySelector('[data-zoom-phrase]');
    if (!phrase || !phrase.checkVisibility({ checkVisibilityCSS: true })) return;
    const fragment = phrase.closest('.fragment');
    if (fragment && !fragment.classList.contains('visible')) return;
    const rect = phrase.getBoundingClientRect();
    const style = getComputedStyle(phrase);
    const logicalWidth = parseFloat(style.width);
    if (!rect.width || !logicalWidth) return;
    const copy = phrase.cloneNode(true);
    const originals = [phrase, ...phrase.querySelectorAll('*')];
    const copies = [copy, ...copy.querySelectorAll('*')];
    originals.forEach((node, index) => {
      const computed = getComputedStyle(node);
      purposeStyles.forEach(property => copies[index].style.setProperty(property, computed.getPropertyValue(property)));
    });
    copy.removeAttribute('data-zoom-phrase');
    copy.style.cssText += `;width:${style.width};height:${style.height};margin:0;padding:0;opacity:1;transform:scale(${rect.width / logicalWidth});transform-origin:top left;`;
    purposeSnapshots.set(slide.id, { rect, copy });
  }

  function endPurposeFlight() {
    if (!purposeFlight) return;
    const flight = purposeFlight;
    purposeFlight = null;
    flight.animation.cancel();
    flight.layer.remove();
    document.body.classList.remove('purpose-in-flight');
  }

  function animatePurposeBetween(previous, current) {
    endPurposeFlight();
    const pair = (previous.id === 'reframing' && current.id === 'focusing') || (previous.id === 'focusing' && current.id === 'reframing');
    if (!pair || reducedMotion || Reveal.isScrollView() || Reveal.isOverview()) return;
    const snapshot = purposeSnapshots.get(previous.id);
    const target = current.querySelector('[data-zoom-phrase]');
    if (!snapshot || !target) return;
    const destination = target.getBoundingClientRect();
    if (!destination.width) return;
    const layer = document.createElement('div');
    layer.className = 'purpose-zoom-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = `left:${snapshot.rect.left}px;top:${snapshot.rect.top}px;width:${snapshot.rect.width}px;height:${snapshot.rect.height}px;`;
    layer.append(snapshot.copy.cloneNode(true));
    revealRoot.append(layer);
    document.body.classList.add('purpose-in-flight');
    const dx = destination.left - snapshot.rect.left;
    const dy = destination.top - snapshot.rect.top;
    const scale = destination.width / snapshot.rect.width;
    const animation = layer.animate([
      { transform: 'translate3d(0,0,0) scale(1)' },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(${scale})` }
    ], { duration: 1400, easing: 'cubic-bezier(.4,0,.15,1)', fill: 'forwards' });
    const flight = { layer, animation };
    purposeFlight = flight;
    animation.finished.then(() => {
      if (purposeFlight !== flight) return;
      purposeFlight = null;
      layer.remove();
      document.body.classList.remove('purpose-in-flight');
      rememberPurpose();
    }).catch(() => {});
  }

  // Read geometry before any input can move Reveal away from the source.
  document.addEventListener('pointerdown', rememberPurpose, true);
  document.addEventListener('keydown', rememberPurpose, true);
  window.addEventListener('wheel', rememberPurpose, { capture: true, passive: true });

  function syncScenery() {
    const config = Reveal.getConfig();
    const scale = Reveal.getScale();
    let rect = Reveal.getSlidesElement().getBoundingClientRect();
    if (Reveal.isScrollView()) {
      rect = { left: (innerWidth - config.width * scale) / 2, top: (innerHeight - config.height * scale) / 2 };
    }
    const geometry = `left:${rect.left}px;top:${rect.top}px;width:${config.width}px;height:${config.height}px;transform:scale(${scale});`;
    panorama.querySelector('.panorama-stage').style.cssText = geometry;
    overlay.querySelector('.persistent-stage').style.cssText = geometry;
    const index = Reveal.getIndices().h;
    const world = panorama.querySelector('.panorama-world');
    world.style.width = `${config.width * sections.length}px`;
    world.style.height = `${config.height}px`;
    world.style.transform = `translate3d(${-index * config.width}px,0,0)`;
    panorama.querySelector('.panorama-camera').style.transform = Reveal.getCurrentSlide()?.id === 'focusing' ? 'scale(1.06)' : 'scale(1)';
    document.body.classList.toggle('is-overview', Reveal.isOverview());
  }

  function syncJourney(slide, index) {
    let fraction = 0;
    if (slide.id !== 'beginning') {
      const steps = [...new Set([...slide.querySelectorAll('.fragment')].map(el => el.dataset.fragmentIndex))];
      if (steps.length) {
        const visibleSteps = new Set([...slide.querySelectorAll('.fragment.visible')].map(el => el.dataset.fragmentIndex));
        fraction = visibleSteps.size / steps.length;
      }
    }
    const value = Math.min(100, (index + fraction * 0.7) / (sections.length - 1) * 100);
    const localFill = slide.querySelector('.journey-fill');
    const localMarker = slide.querySelector('.journey-marker');
    localFill.style.width = `${value}%`;
    localFill.setAttribute('aria-valuenow', String(Math.round(value)));
    localMarker.style.left = `${value}%`;
    const fill = persistentJourney.querySelector('.journey-fill');
    const marker = persistentJourney.querySelector('.journey-marker');
    const label = slide.dataset.week ? `${slide.dataset.week} / ${slide.dataset.title}` : slide.dataset.title;
    persistentJourney.querySelector('.journey-labels').firstElementChild.textContent = label;
    persistentJourney.querySelector('.journey-labels').lastElementChild.textContent = `${String(index + 1).padStart(2, '0')} / ${sections.length}`;
    persistentJourney.querySelectorAll('.journey-stop').forEach((button, i) => {
      button.classList.toggle('completed', i < index);
      if (i === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    const previous = lastJourneyProgress ?? value;
    fill.style.width = `${value}%`;
    fill.setAttribute('aria-valuenow', String(Math.round(value)));
    marker.style.left = `${value}%`;
    if (!reducedMotion && previous !== value && !Reveal.isOverview()) {
      const options = { duration: 850, easing: 'cubic-bezier(.22,.68,0,1)' };
      fill.getAnimations().forEach(animation => animation.cancel());
      marker.getAnimations().forEach(animation => animation.cancel());
      fill.animate([{ width: `${previous}%` }, { width: `${value}%` }], options);
      marker.animate([{ left: `${previous}%` }, { left: `${value}%` }], options);
    }
    lastJourneyProgress = value;
  }

  function stopOpening() {
    openingGeneration++;
    openingTimers.forEach(timer => clearTimeout(timer));
    openingTimers.clear();
  }

  function setOpeningStage(stage) {
    const scene = document.querySelector('#beginning .opening-scene');
    if (!scene) return;
    scene.dataset.stage = String(stage);
    const typed = scene.querySelector('#opening-typed');
    if (stage < 2) typed.textContent = '';
    if (stage >= 3) typed.textContent = openingReply;
    const statuses = ['A conversation begins.', 'A new message arrives.', 'A reply takes shape.', 'The send button is pressed.', 'Halo offers a pause before sending.', 'Nothing sent. Keep editing your draft.', 'The next everyday moment…'];
    scene.querySelector('#opening-status').textContent = statuses[stage];
    scene.querySelector('.incoming-message').setAttribute('aria-hidden', String(stage < 1));
    scene.querySelector('.opening-nudge').setAttribute('aria-hidden', String(stage !== 4));
    const takeaway = document.querySelector('#opening-takeaway');
    takeaway.classList.toggle('is-visible', stage === 4 || stage === 5);
    const current = Reveal.getCurrentSlide();
    if (current?.id === 'beginning') syncJourney(current, 0);
  }

  function queueOpening(callback, delay, generation = openingGeneration, scene = openingElement) {
    const timer = setTimeout(() => {
      openingTimers.delete(timer);
      if (generation === openingGeneration && scene?.isConnected && Reveal.getCurrentSlide()?.id === 'beginning') callback();
    }, delay);
    openingTimers.add(timer);
  }

  function playOpening() {
    stopOpening();
    const scene = document.querySelector('#beginning .opening-scene');
    openingElement = scene;
    if (reducedMotion) { setOpeningStage(4); return; }
    setOpeningStage(0);
    queueOpening(() => setOpeningStage(1), 850);
    queueOpening(() => {
      setOpeningStage(2);
      [...openingReply].forEach((letter, index) => queueOpening(() => {
        scene.querySelector('#opening-typed').textContent = openingReply.slice(0, index + 1);
      }, index * 76));
    }, 2300);
    queueOpening(() => setOpeningStage(3), 4800);
    queueOpening(() => setOpeningStage(4), 5650);
    queueOpening(() => setOpeningStage(6), 10000);
    queueOpening(() => playOpening(), 11100);
  }

  function syncOpening(slide) {
    if (slide.id === 'beginning') {
      const scene = slide.querySelector('.opening-scene');
      if (openingElement !== scene) playOpening();
    } else if (openingElement) {
      stopOpening();
      openingElement = null;
    }
  }

  // Each revision is a real Reveal fragment, so click, keyboard and scroll
  // controls all reveal the same progression of copy, colour and visual style.
  let demoSlide = document.querySelector('#refining');
  let refinementElement = null;
  let displayedRevision = -1;
  const revisions = [
    { label: '01 / THE FIRST WORDING', heading: 'WARNING', copy: 'Do not disclose your educational institution.', action: 'Dismiss', caption: 'This reads like a warning notice.' },
    { label: '02 / EXPLAINING THE RISK', heading: 'BEFORE SHARING', copy: 'Sharing your school may reveal your location. Please reconsider.', action: 'Go back', caption: 'The reason is clearer. The wording still sounds formal.' },
    { label: '03 / A MORE HUMAN VOICE', heading: 'QUICK CHECK', copy: 'Quick pause. Your school could help someone find you. Keep it private?', action: 'Keep editing', caption: 'A shorter explanation gives the young person a choice.' },
    { label: '04 / BRINGING HALO TOGETHER', heading: 'A MOMENT WITH HALO', copy: 'Quick pause. Your school could help someone find you. Keep it private?', action: 'Keep editing', caption: 'The colours and controls now support the same gentle voice.' }
  ];
  for (let index = 0; index < 3; index++) {
    const cue = document.createElement('span');
    cue.className = 'fragment revision-cue';
    cue.dataset.fragmentIndex = String(index);
    cue.setAttribute('aria-hidden', 'true');
    cue.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    demoSlide.append(cue);
  }

  function syncDemo() {
    const frame = demoSlide.querySelector('.refinement-demo');
    if (frame !== refinementElement) { refinementElement = frame; displayedRevision = -1; }
    const step = Math.min(3, demoSlide.querySelectorAll('.revision-cue.visible').length);
    demoStep = step;
    if (displayedRevision === step) return;
    const revision = revisions[step];
    frame.dataset.revision = String(step);
    frame.querySelector('#revision-label').textContent = revision.label;
    frame.querySelector('#revision-heading').textContent = revision.heading;
    frame.querySelector('#revision-copy').textContent = revision.copy;
    frame.querySelector('.refinement-action').textContent = revision.action;
    frame.querySelector('#revision-counter').textContent = `${String(step + 1).padStart(2, '0')} / 04`;
    frame.querySelector('#revision-next').innerHTML = step === 3 ? 'Replay revisions <span aria-hidden="true">↻</span>' : 'Next revision <span aria-hidden="true">→</span>';
    document.querySelector('#revision-caption').textContent = revision.caption;
    if (!reducedMotion && displayedRevision >= 0) {
      frame.querySelector('#revision-copy').animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, easing: 'ease-out' });
    }
    displayedRevision = step;
  }
  // Scroll view restores the slide DOM when it closes. Delegated handlers and
  // refreshed references keep the illustration and navigation working afterward.
  document.addEventListener('click', event => {
    const stop = event.target.closest('[data-goto]');
    if (stop) Reveal.slide(Number(stop.dataset.goto), 0, -1);
    if (event.target.closest('.opening-replay')) playOpening();
    if (event.target.closest('.opening-keep')) {
      stopOpening(); setOpeningStage(5);
      if (!reducedMotion) { queueOpening(() => setOpeningStage(6), 4000); queueOpening(() => playOpening(), 5100); }
    }
    if (event.target.closest('.composer-send')) {
      stopOpening(); setOpeningStage(3);
      queueOpening(() => setOpeningStage(4), reducedMotion ? 0 : 700);
      if (!reducedMotion) { queueOpening(() => setOpeningStage(6), 5000); queueOpening(() => playOpening(), 6100); }
    }
    if (event.target.closest('#revision-next')) {
      if (demoStep === 3) Reveal.slide(sections.indexOf(demoSlide), 0, -1);
      else Reveal.next();
    }
    if (event.target.closest('.refinement-action')) {
      if (demoStep < 3) Reveal.next();
      else document.querySelector('#revision-caption').textContent = 'Nothing sent. The young person chooses what to share.';
    }
  });

  function refreshSlideReferences() {
    sections = [...document.querySelectorAll('.slides section')];
    demoSlide = document.querySelector('#refining');
    refinementElement = null;
    displayedRevision = -1;
    purposeSnapshots.clear();
  }

  function syncChrome(event = {}) {
    if (!sections[0].isConnected) refreshSlideReferences();
    const slide = Reveal.getCurrentSlide();
    const index = sections.indexOf(slide);
    if (index < 0) return;
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${sections.length}`;
    chapter.textContent = slide.dataset.chapter;
    document.querySelector('#previous').disabled = index === 0 && !Reveal.availableFragments().prev;
    document.querySelector('#next-step').disabled = index === sections.length - 1 && !Reveal.availableFragments().next;
    document.title = `Halo · ${slide.dataset.title}`;
    syncViewLabel();
    syncDemo();
    syncJourney(slide, index);
    syncScenery();
    syncOpening(slide);
    if (event.previousSlide) animatePurposeBetween(event.previousSlide, slide);
    requestAnimationFrame(rememberPurpose);
  }
  function syncViewLabel() {
    const scroll = Reveal.isScrollView();
    viewToggle.textContent = scroll ? 'Slide view' : 'Scroll view';
    viewToggle.setAttribute('aria-label', `Switch to ${scroll ? 'slide' : 'scroll'} view`);
    viewToggle.title = `Switch to ${scroll ? 'slide' : 'scroll'} view (R)`;
    document.body.classList.toggle('is-scroll-view', scroll);
  }
  function toggleView() {
    Reveal.toggleScrollView();
    refreshSlideReferences();
    syncChrome();
    syncViewLabel();
    const url = new URL(location.href);
    if (Reveal.isScrollView()) url.searchParams.set('view', 'scroll');
    else url.searchParams.delete('view');
    history.replaceState(null, '', url);
  }
  function toggleHelp() { if (help.open) help.close(); else help.showModal(); }

  viewToggle.addEventListener('click', toggleView);
  document.querySelector('#help-toggle').addEventListener('click', toggleHelp);
  document.querySelector('#help-close').addEventListener('click', () => help.close());
  help.addEventListener('click', event => { if (event.target === help) help.close(); });
  document.querySelector('#previous').addEventListener('click', () => Reveal.prev());
  document.querySelector('#next-step').addEventListener('click', () => Reveal.next());

  // A deliberate wheel gesture advances one point. A trackpad's momentum is
  // ignored until it settles, preventing an accidental run through the deck.
  let wheelTotal = 0;
  let wheelTimer;
  let wheelLocked = false;
  window.addEventListener('wheel', event => {
    if (!Reveal.isReady() || Reveal.isScrollView() || Reveal.isOverview() || help.open || event.ctrlKey) return;
    if (event.target.closest('button, a, input, textarea, dialog')) return;
    event.preventDefault();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelTotal = 0; wheelLocked = false; }, 190);
    if (wheelLocked) return;
    wheelTotal += event.deltaY * (event.deltaMode === 1 ? 20 : 1);
    if (Math.abs(wheelTotal) > 45) {
      if (wheelTotal > 0) Reveal.next(); else Reveal.prev();
      wheelTotal = 0;
      wheelLocked = true;
    }
  }, { passive: false });

  Reveal.initialize({
    width: compactLayout.matches ? 600 : 1280,
    height: compactLayout.matches ? 1000 : 720,
    margin: 0.055,
    minScale: 0.1,
    maxScale: 2,
    center: false,
    hash: true,
    history: true,
    controls: false,
    progress: false,
    slideNumber: false,
    transition: reducedMotion ? 'none' : 'slide',
    transitionSpeed: 'default',
    backgroundTransition: reducedMotion ? 'none' : 'fade',
    autoAnimate: !reducedMotion,
    autoAnimateDuration: 0.7,
    autoAnimateEasing: 'cubic-bezier(0.22, 0.68, 0, 1)',
    autoAnimateUnmatched: true,
    fragments: true,
    fragmentInURL: false,
    view: params.get('view') === 'scroll' ? 'scroll' : 'slide',
    scrollActivationWidth: null,
    scrollProgress: true,
    scrollSnap: 'proximity',
    scrollLayout: 'full',
    totalTime: 600,
    display: 'block',
    keyboardCondition: () => !help.open,
    keyboard: {
      82: toggleView,
      79: () => Reveal.toggleOverview(),
      72: toggleHelp
    },
    plugins: [RevealNotes]
  }).then(() => {
    // Leave space for the navigation bar without altering the authored canvas.
    syncChrome();
    Reveal.on('slidechanged', syncChrome);
    Reveal.on('fragmentshown', syncChrome);
    Reveal.on('fragmenthidden', syncChrome);
    Reveal.on('slidetransitionend', rememberPurpose);
    Reveal.on('resize', () => { syncViewLabel(); syncScenery(); });
    window.addEventListener('resize', () => { if (Reveal.isReady()) syncScenery(); });
    Reveal.on('overviewshown', () => { stopOpening(); endPurposeFlight(); syncScenery(); });
    Reveal.on('overviewhidden', () => {
      syncScenery();
      if (Reveal.getCurrentSlide()?.id === 'beginning') playOpening();
    });
    compactLayout.addEventListener('change', event => {
      Reveal.configure({ width: event.matches ? 600 : 1280, height: event.matches ? 1000 : 720 });
      Reveal.layout();
    });
    window.haloDeck = { version: '1.3.0', timing: sections.reduce((sum, s) => sum + Number(s.dataset.timing), 0) };
  });
})();
