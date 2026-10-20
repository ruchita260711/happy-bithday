"use strict";

/* ============================================================
   BIRTHDAY SURPRISE WEBSITE
   FILE: script.js

   DESIGN:
   Soft classic birthday website
   Seven full-screen pages

   DEPENDENCIES:
   None.

   REQUIRED FILES:
   index.html
   style.css
   script.js

   IMPORTANT:
   This script must match the IDs and data attributes
   used by the new index.html.
============================================================ */


(() => {

    /* ========================================================
       01. CONFIGURATION
    ======================================================== */

    const CONFIG = Object.freeze({

        // The website contains seven pages numbered 0 to 6.
        totalSlides: 7,

        // The opening page.
        initialSlide: 0,

        // The welcome button opens the second page.
        firstSurpriseSlide: 1,

        /*
         * CSS uses a 700ms maximum slide transition.
         * Wait slightly longer before hiding an outgoing slide.
         */
        slideTransitionDuration: 760,

        // Floating decorations.
        petalCount: 12,

        // Speech settings.
        speechLanguage: "hi-IN",
        speechRate: 0.88,
        speechPitch: 1.0,
        speechVolume: 1.0,

        // Background audio volume.
        backgroundMusicVolume: 0.35,

        // Birthday song volume.
        birthdaySongVolume: 0.75,

        // Birthday video volume.
        birthdayVideoVolume: 0.8,

        // Audio feedback.
        statusClearDelay: 4500

    });



    /* ========================================================
       02. DOM ELEMENT REFERENCES
    ======================================================== */

    /*
     * Keep DOM references in one place.
     *
     * This makes the script easier to maintain and prevents
     * repeatedly searching the entire document.
     */

    const websiteWrapper =
        document.getElementById("websiteWrapper");

    const slideDeck =
        document.getElementById("slideDeck");

    const progressNavigation =
        document.getElementById("slideProgress");

    const openSurpriseButton =
        document.getElementById("openSurprise");

    const speakGreetingButton =
        document.getElementById("speakGreeting");

    const statusMessage =
        document.getElementById("statusMessage");

    const petalLayer =
        document.getElementById("petalLayer");


    // Audio controls.

    const backgroundMusic =
        document.getElementById("backgroundMusic");

    const birthdaySong =
        document.getElementById("birthdaySong");

    const birthdayVideo =
        document.getElementById("birthdayVideo");


    // Background music button.

    const musicToggle =
        document.getElementById("musicToggle");

    const musicToggleIcon =
        document.getElementById("musicToggleIcon");

    const musicToggleLabel =
        document.getElementById("musicToggleLabel");


    // Optional video download link.

    const downloadVideo =
        document.getElementById("downloadVideo");



    /* ========================================================
       03. COLLECT AND VALIDATE THE SLIDES
    ======================================================== */

    if (!slideDeck) {

        console.error(
            "Website initialization failed: #slideDeck was not found. " +
            "Check index.html."
        );

        return;

    }


    /*
     * Select only actual slides.
     *
     * Progress dots also use data-go-to, but they are not slides.
     */

    const slides = Array.from(
        slideDeck.querySelectorAll(".slide[data-slide]")
    );


    if (slides.length === 0) {

        console.error(
            "Website initialization failed: no slides were found."
        );

        return;

    }


    /*
     * Sort slides by their data-slide number.
     *
     * Correct order:
     * 0 = Welcome
     * 1 = Blessings
     * 2 = Photos
     * 3 = Birthday song
     * 4 = Video
     * 5 = Personal message
     * 6 = Final blessings
     */

    slides.sort((slideA, slideB) => {

        const indexA = Number(slideA.dataset.slide);

        const indexB = Number(slideB.dataset.slide);

        return indexA - indexB;

    });


    /*
     * Normalize slide numbering to a continuous sequence.
     *
     * This prevents navigation from breaking if a slide's
     * data-slide number was accidentally changed.
     */

    slides.forEach((slide, index) => {

        slide.dataset.slide = String(index);

    });


    const TOTAL_SLIDES = slides.length;

    const lastSlideIndex = TOTAL_SLIDES - 1;


    /*
     * Keep track of transition timers.
     *
     * A slide may be reopened before its previous fade-out
     * finishes. Its pending hide timer must then be cancelled.
     */

    const pendingHideTimers = new Map();


    /*
     * An explicit state value is more reliable than deciding
     * which page is active from a collection of click events.
     */

    let currentSlideIndex = -1;


    /*
     * This flag prevents speech from continuing after the
     * visitor navigates to another page.
     */

    let speechIsAvailable =
        "speechSynthesis" in window &&
        "SpeechSynthesisUtterance" in window;


    /*
     * Background music is considered enabled only after
     * the visitor deliberately turns it on.
     */

    let backgroundMusicEnabled = false;


    /*
     * If the music file fails, remember the problem instead
     * of repeatedly attempting to play a nonexistent file.
     */

    let backgroundMusicUnavailable = false;


    /*
     * Timers for the temporary welcome-page message.
     */

    let statusMessageTimer = null;


    /*
     * Match the visitor's motion preferences.
     */

    const reducedMotionQuery =
        window.matchMedia
            ? window.matchMedia("(prefers-reduced-motion: reduce)")
            : null;



    /* ========================================================
       04. GENERAL UTILITIES
    ======================================================== */


    /**
     * Checks whether an optional element is present.
     */
    function elementExists(element) {

        return element instanceof Element;

    }


    /**
     * Checks whether an audio or video element is playing.
     */
    function isMediaPlaying(mediaElement) {

        return Boolean(

            mediaElement &&
            !mediaElement.paused &&
            !mediaElement.ended &&
            !mediaElement.error

        );

    }


    /**
     * Checks whether either birthday media element is playing.
     *
     * Background music should not overlap the birthday song
     * or the birthday video.
     */
    function isBirthdayMediaPlaying() {

        return (

            isMediaPlaying(birthdaySong) ||
            isMediaPlaying(birthdayVideo)

        );

    }


    /**
     * Checks whether the visitor requested reduced motion.
     */
    function prefersReducedMotion() {

        return Boolean(
            reducedMotionQuery &&
            reducedMotionQuery.matches
        );

    }



    /* ========================================================
       05. STATUS MESSAGES
    ======================================================== */


    /**
     * Displays a short status message on the welcome page.
     *
     * The site continues working even if the status element
     * is absent from the HTML.
     */
    function setStatusMessage(message, clearAfter = 0) {

        if (!statusMessage) {
            return;
        }


        if (statusMessageTimer !== null) {

            window.clearTimeout(statusMessageTimer);

            statusMessageTimer = null;

        }


        statusMessage.textContent = message;


        if (clearAfter > 0 && message) {

            statusMessageTimer = window.setTimeout(() => {

                statusMessage.textContent = "";

                statusMessageTimer = null;

            }, clearAfter);

        }

    }


    /**
     * Uses the music button's title for audio feedback
     * when the visitor is not on the welcome page.
     */
    function setMusicFeedback(message) {

        if (musicToggle) {

            musicToggle.title = message;

        }


        if (currentSlideIndex === CONFIG.initialSlide) {

            setStatusMessage(
                message,
                CONFIG.statusClearDelay
            );

        }

    }



    /* ========================================================
       06. SLIDE PROGRESS INDICATORS
    ======================================================== */


    /**
     * Updates the seven progress dots.
     *
     * Every button uses data-go-to="0" through "6".
     */
    function updateProgressIndicators(activeIndex) {

        if (!progressNavigation) {
            return;
        }


        const progressDots =
            progressNavigation.querySelectorAll(
                ".progress-dot[data-go-to]"
            );


        progressDots.forEach((dot) => {

            const targetIndex =
                Number(dot.dataset.goTo);

            const isCurrent =
                targetIndex === activeIndex;


            dot.classList.toggle(
                "is-current",
                isCurrent
            );


            if (isCurrent) {

                dot.setAttribute(
                    "aria-current",
                    "step"
                );

            } else {

                dot.removeAttribute(
                    "aria-current"
                );

            }

        });

    }



    /* ========================================================
       07. CANCEL A PENDING SLIDE-HIDE TIMER
    ======================================================== */


    /**
     * Cancels a previous timer for a particular slide.
     *
     * This matters when a user returns to a slide before
     * its fade-out animation has finished.
     */
    function cancelPendingHide(slide) {

        const timer = pendingHideTimers.get(slide);


        if (timer !== undefined) {

            window.clearTimeout(timer);

            pendingHideTimers.delete(slide);

        }

    }



    /* ========================================================
       08. HIDE A SLIDE AFTER ITS TRANSITION
    ======================================================== */


    /**
     * Waits for the outgoing slide's CSS transition before
     * applying the HTML hidden attribute.
     *
     * IMPORTANT:
     *
     * Hiding a slide immediately after removing is-active
     * would cancel its fade-out animation.
     */
    function scheduleSlideHide(slide) {

        if (!slide) {
            return;
        }


        cancelPendingHide(slide);


        const timer = window.setTimeout(() => {

            /*
             * Never hide a slide that has already become active
             * again during a rapid series of clicks.
             */

            if (!slide.classList.contains("is-active")) {

                slide.hidden = true;

            }


            pendingHideTimers.delete(slide);


        }, CONFIG.slideTransitionDuration);


        pendingHideTimers.set(
            slide,
            timer
        );

    }



    /* ========================================================
       09. STOP SPEECH
    ======================================================== */


    /**
     * Cancels the current spoken greeting.
     */
    function stopSpeech() {

        if (!speechIsAvailable) {
            return;
        }


        try {

            window.speechSynthesis.cancel();

        } catch (error) {

            /*
             * Speech synthesis is an optional browser feature.
             * Its failure must not interrupt page navigation.
             */

            console.warn(
                "Speech synthesis could not be stopped.",
                error
            );

        }

    }



    /* ========================================================
       10. PAUSE BIRTHDAY MEDIA WHEN CHANGING PAGES
    ======================================================== */


    /**
     * Stops the birthday song and video when the visitor
     * leaves their respective page.
     *
     * The background music system separately decides whether
     * background music should resume.
     */
    function pauseBirthdayMedia() {

        if (birthdaySong && !birthdaySong.paused) {

            birthdaySong.pause();

        }


        if (birthdayVideo && !birthdayVideo.paused) {

            birthdayVideo.pause();

        }

    }



    /* ========================================================
       11. MAIN NAVIGATION FUNCTION
    ======================================================== */


    /**
     * Opens exactly one requested page.
     *
     * @param {number|string} requestedIndex
     *   The requested page number, from 0 to the final page.
     *
     * @returns {boolean}
     *   True if a valid page was opened or was already active.
     *
     * Important details:
     *
     * 1. Numeric input is validated.
     * 2. The target index is clamped to valid boundaries.
     * 3. The old page is allowed to animate out.
     * 4. The new page is revealed before its active class is added.
     * 5. Old hide timers are cancelled when necessary.
     * 6. Repeated clicks cannot create competing active pages.
     */
    function showSlide(requestedIndex) {

        const parsedIndex = Number(requestedIndex);


        /*
         * Reject NaN, fractional values, and other invalid input.
         */

        if (!Number.isInteger(parsedIndex)) {

            return false;

        }


        /*
         * Do not permit indexes outside the available slides.
         */

        const targetIndex = Math.min(

            lastSlideIndex,

            Math.max(0, parsedIndex)

        );


        const targetSlide = slides[targetIndex];


        if (!targetSlide) {

            return false;

        }


        /*
         * If the requested page is already active, do nothing.
         *
         * This prevents redundant animations and repeated
         * audio interruptions from rapid duplicate clicks.
         */

        if (

            targetIndex === currentSlideIndex &&
            targetSlide.classList.contains("is-active")

        ) {

            updateProgressIndicators(targetIndex);

            return true;

        }


        /*
         * Identify the currently active page before changing
         * the stored index.
         */

        const previousSlide = slides.find((slide) => {

            return slide.classList.contains("is-active");

        });


        /*
         * Stop page-specific speech and media.
         */

        stopSpeech();

        pauseBirthdayMedia();


        /*
         * Clear any previous welcome-page status.
         */

        setStatusMessage("");



        /* ----------------------------------------------------
           DEACTIVATE THE PREVIOUS PAGE
        ---------------------------------------------------- */

        if (previousSlide && previousSlide !== targetSlide) {

            previousSlide.classList.remove("is-active");

            previousSlide.setAttribute(
                "aria-hidden",
                "true"
            );


            /*
             * Prevent keyboard or pointer interaction with
             * a page that is currently fading out.
             */

            previousSlide.inert = true;


            /*
             * Do not set hidden=true here.
             *
             * That would immediately remove the element from
             * rendering and cancel the fade-out transition.
             */

            scheduleSlideHide(previousSlide);

        }



        /* ----------------------------------------------------
           PREPARE THE NEW PAGE
        ---------------------------------------------------- */

        cancelPendingHide(targetSlide);


        /*
         * An element with hidden=true cannot animate in.
         * Reveal it before adding is-active.
         */

        targetSlide.hidden = false;


        /*
         * Remove inert so its buttons become interactive.
         */

        targetSlide.inert = false;


        targetSlide.setAttribute(
            "aria-hidden",
            "false"
        );


        /*
         * Force a style/layout calculation.
         *
         * This lets the browser register the inactive state
         * before the active class is applied, improving the
         * reliability of the CSS entrance transition.
         */

        void targetSlide.offsetWidth;


        /*
         * Activate the requested page.
         */

        targetSlide.classList.add("is-active");


        /*
         * Store the active index.
         */

        currentSlideIndex = targetIndex;


        /*
         * Synchronize the page indicators.
         */

        updateProgressIndicators(
            currentSlideIndex
        );


        /*
         * If background music is enabled, let the audio
         * synchronization function decide whether it should
         * resume after any birthday media has stopped.
         */

        synchronizeBackgroundMusic();


        return true;

    }



    /* ========================================================
       12. INITIALIZE THE SLIDE SYSTEM
    ======================================================== */


    /**
     * Selects a valid initial page and normalizes every slide.
     *
     * After initialization:
     * - exactly one slide is active;
     * - the active slide is not hidden;
     * - every inactive slide is hidden;
     * - inactive slides are not interactive.
     */
    function initializeSlides() {

        let initialSlide = slides.find((slide) => {

            return slide.classList.contains("is-active");

        });


        /*
         * Prefer page 0 when no active page exists.
         */

        if (!initialSlide) {

            initialSlide = slides.find((slide) => {

                return Number(slide.dataset.slide) ===
                    CONFIG.initialSlide;

            });

        }


        /*
         * Final fallback: use the first available slide.
         */

        if (!initialSlide) {

            initialSlide = slides[0];

        }


        const initialIndex =
            slides.indexOf(initialSlide);


        slides.forEach((slide) => {

            const isInitial =
                slide === initialSlide;


            cancelPendingHide(slide);


            slide.classList.toggle(
                "is-active",
                isInitial
            );


            slide.hidden = !isInitial;


            slide.inert = !isInitial;


            slide.setAttribute(
                "aria-hidden",
                String(!isInitial)
            );

        });


        currentSlideIndex = initialIndex;


        updateProgressIndicators(
            currentSlideIndex
        );

    }



    /* ========================================================
       13. NEXT AND PREVIOUS BUTTONS
    ======================================================== */


    /**
     * Handles Next and Previous buttons with event delegation.
     *
     * This means the script only needs one click handler for
     * every page's navigation buttons.
     *
     * Each Next click advances by exactly one index.
     */
    function initializeSlideButtons() {

        slideDeck.addEventListener("click", (event) => {

            const target = event.target;


            if (!(target instanceof Element)) {

                return;

            }


            const navigationButton =
                target.closest("[data-next], [data-prev]");


            if (!navigationButton) {

                return;

            }


            /*
             * Verify that the control belongs to the current
             * slide. Controls from outgoing pages must not
             * trigger a second navigation.
             */

            const parentSlide =
                navigationButton.closest(".slide[data-slide]");


            if (!parentSlide) {

                return;

            }


            const parentIndex =
                Number(parentSlide.dataset.slide);


            if (parentIndex !== currentSlideIndex) {

                return;

            }


            event.preventDefault();


            if (navigationButton.hasAttribute("data-next")) {

                showSlide(
                    currentSlideIndex + 1
                );

            } else if (
                navigationButton.hasAttribute("data-prev")
            ) {

                showSlide(
                    currentSlideIndex - 1
                );

            }

        });

    }



    /* ========================================================
       14. WELCOME SURPRISE BUTTON
    ======================================================== */


    /**
     * The welcome button opens the blessings page.
     *
     * It does not reload the HTML document.
     */
    function initializeSurpriseButton() {

        if (!openSurpriseButton) {

            return;

        }


        openSurpriseButton.addEventListener("click", (event) => {

            event.preventDefault();


            showSlide(
                CONFIG.firstSurpriseSlide
            );

        });

    }



    /* ========================================================
       15. PROGRESS DOTS AND DIRECT PAGE NAVIGATION
    ======================================================== */


    /**
     * Any element with data-go-to="0" through "6" may
     * navigate to a specific page.
     *
     * This handles:
     * - The seven progress dots.
     * - The Restart button on the final page.
     *
     * There is one delegated event handler, avoiding
     * duplicate listeners for individual controls.
     */
    function initializeDirectNavigation() {

        document.addEventListener("click", (event) => {

            const target = event.target;


            if (!(target instanceof Element)) {

                return;

            }


            const navigationControl =
                target.closest("[data-go-to]");


            if (!navigationControl) {

                return;

            }


            const rawIndex =
                navigationControl.dataset.goTo;


            if (rawIndex === undefined) {

                return;

            }


            const destination =
                Number(rawIndex);


            if (!Number.isInteger(destination)) {

                return;

            }


            event.preventDefault();


            showSlide(destination);

        });

    }



    /* ========================================================
       16. KEYBOARD NAVIGATION
    ======================================================== */


    /**
     * Keyboard support:
     *
     * ArrowRight / PageDown = next page
     * ArrowLeft  / PageUp   = previous page
     * Home                  = first page
     * End                   = final page
     *
     * Keys are ignored while the visitor is interacting
     * with buttons, links, audio/video controls or text inputs.
     */
    function initializeKeyboardNavigation() {

        document.addEventListener("keydown", (event) => {

            /*
             * Do not override browser or operating-system
             * keyboard shortcuts.
             */

            if (

                event.altKey ||
                event.ctrlKey ||
                event.metaKey

            ) {

                return;

            }


            const target = event.target;


            if (target instanceof Element) {

                const interactiveElement = target.closest(

                    "button, a, input, textarea, select, " +
                    "audio, video, [contenteditable='true']"

                );


                if (interactiveElement) {

                    return;

                }

            }


            switch (event.key) {

                case "ArrowRight":
                case "PageDown":

                    if (
                        currentSlideIndex < lastSlideIndex
                    ) {

                        event.preventDefault();

                        showSlide(
                            currentSlideIndex + 1
                        );

                    }

                    break;


                case "ArrowLeft":
                case "PageUp":

                    if (currentSlideIndex > 0) {

                        event.preventDefault();

                        showSlide(
                            currentSlideIndex - 1
                        );

                    }

                    break;


                case "Home":

                    event.preventDefault();

                    showSlide(0);

                    break;


                case "End":

                    event.preventDefault();

                    showSlide(lastSlideIndex);

                    break;

            }

        });

    }



    /* ========================================================
       17. BIRTHDAY GREETING THROUGH SPEECH SYNTHESIS
    ======================================================== */


    /**
     * Speaks the greeting when the visitor presses the
     * spoken-message button.
     *
     * Browsers without speech synthesis receive a useful
     * message instead of an uncaught JavaScript error.
     */
    function speakBirthdayGreeting() {

        if (!speechIsAvailable) {

            setStatusMessage(
                "इस ब्राउज़र में आवाज़ वाला संदेश उपलब्ध नहीं है।"
            );

            return;

        }


        /*
         * Cancel any greeting that is already being spoken.
         */

        stopSpeech();


        /*
         * Keep the words simple and suitable for this website.
         */

        const greetingText =

            "माँ सा, थांने जन्मदिन री घणी घणी बधाई। " +
            "भगवान थांने हमेशा खुश राखै, " +
            "स्वस्थ राखै अर थांरे जीवन में सुख, शांति " +
            "अर प्रेम बनाय राखै। " +
            "जय जिनेन्द्र सा।";


        try {

            const utterance =
                new SpeechSynthesisUtterance(
                    greetingText
                );


            utterance.lang =
                CONFIG.speechLanguage;


            utterance.rate =
                CONFIG.speechRate;


            utterance.pitch =
                CONFIG.speechPitch;


            utterance.volume =
                CONFIG.speechVolume;


            utterance.onstart = () => {

                setStatusMessage(
                    "प्यार भर्यो संदेश सुनायो जा रह्यो है..."
                );

            };


            utterance.onend = () => {

                setStatusMessage("");

            };


            utterance.onerror = (event) => {

                /*
                 * Some devices have no suitable Hindi voice.
                 * Report the limitation without breaking the site.
                 */

                if (event.error !== "canceled") {

                    setStatusMessage(
                        "आवाज़ उपलब्ध नहीं है।"
                    );

                }

            };


            window.speechSynthesis.speak(
                utterance
            );

        } catch (error) {

            console.warn(
                "Could not start the spoken greeting.",
                error
            );


            setStatusMessage(
                "इस डिवाइस पर आवाज़ वाला संदेश नहीं चल पाया।"
            );

        }

    }


    /**
     * Connects the spoken greeting button.
     */
    function initializeSpeechGreeting() {

        if (!speakGreetingButton) {

            return;

        }


        speakGreetingButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                speakBirthdayGreeting();

            }
        );

    }



    /* ========================================================
       18. UPDATE THE MUSIC BUTTON
    ======================================================== */


    /**
     * Synchronizes the button with the background-music state.
     */
    function updateMusicButton() {

        if (!musicToggle) {

            return;

        }


        const isPlaying =
            isMediaPlaying(backgroundMusic);


        /*
         * The enabled state means the visitor has requested
         * music. The actual audio may be temporarily paused
         * while the birthday song or video is playing.
         */

        musicToggle.setAttribute(

            "aria-pressed",

            String(backgroundMusicEnabled)

        );


        musicToggle.classList.toggle(

            "is-playing",

            isPlaying

        );


        if (backgroundMusicUnavailable) {

            if (musicToggleLabel) {

                musicToggleLabel.textContent =
                    "Music Unavailable";

            }


            musicToggle.setAttribute(

                "aria-label",

                "Background music unavailable. Check the audio file."

            );


            return;

        }


        if (musicToggleLabel) {

            musicToggleLabel.textContent =
                backgroundMusicEnabled
                    ? "Music On"
                    : "Music Off";

        }


        musicToggle.setAttribute(

            "aria-label",

            backgroundMusicEnabled
                ? "बैकग्राउंड संगीत बंद करो"
                : "बैकग्राउंड संगीत चालू करो"

        );


        if (musicToggleIcon) {

            musicToggleIcon.textContent =
                isPlaying ? "♫" : "♪";

        }

    }



    /* ========================================================
       19. HANDLE BACKGROUND MUSIC ERRORS
    ======================================================== */


    /**
     * Reports a missing or unsupported background music file.
     */
    function handleBackgroundMusicError() {

        backgroundMusicUnavailable = true;

        backgroundMusicEnabled = false;


        if (
            backgroundMusic &&
            !backgroundMusic.paused
        ) {

            backgroundMusic.pause();

        }


        updateMusicButton();


        setMusicFeedback(

            "Background music could not be loaded. " +
            "Check assets/audio/background-devotional.mp3."

        );

    }



    /* ========================================================
       20. PLAY BACKGROUND MUSIC
    ======================================================== */


    /**
     * Starts background music only when permitted.
     *
     * Music is not started automatically when the website loads.
     * It is started following a visitor's interaction.
     *
     * @param {boolean} reportFailure
     *   Whether playback errors should be announced.
     */
    async function startBackgroundMusic(
        reportFailure = false
    ) {

        if (!backgroundMusic) {

            return false;

        }


        if (!backgroundMusicEnabled) {

            return false;

        }


        if (backgroundMusicUnavailable) {

            return false;

        }


        /*
         * Never start background audio while the browser tab
         * is hidden.
         */

        if (document.hidden) {

            return false;

        }


        /*
         * Birthday audio takes priority over ambient music.
         */

        if (isBirthdayMediaPlaying()) {

            updateMusicButton();

            return false;

        }


        /*
         * No reason to call play() if the audio is already playing.
         */

        if (isMediaPlaying(backgroundMusic)) {

            updateMusicButton();

            return true;

        }


        try {

            backgroundMusic.volume =
                CONFIG.backgroundMusicVolume;


            await backgroundMusic.play();


            updateMusicButton();


            return true;

        } catch (error) {

            /*
             * A rejected play() promise is expected in some
             * browser or media-file situations.
             *
             * Catching it avoids an unhandled promise rejection.
             */

            console.warn(
                "Background music could not start.",
                error
            );


            const fileProblem = Boolean(

                backgroundMusic.error ||
                error.name === "NotSupportedError"

            );


            if (fileProblem) {

                handleBackgroundMusicError();

            } else {

                /*
                 * A temporary playback restriction does not
                 * necessarily mean that the file is missing.
                 */

                updateMusicButton();


                if (reportFailure) {

                    setMusicFeedback(

                        "Music could not start. " +
                        "Check the audio file and try again."

                    );

                }

            }


            return false;

        }

    }



    /* ========================================================
       21. PAUSE BACKGROUND MUSIC
    ======================================================== */


    /**
     * Pauses the background track without changing the
     * visitor's enabled preference.
     *
     * This distinction matters when a birthday song starts:
     * background music should pause and then resume afterward.
     */
    function pauseBackgroundMusic() {

        if (
            backgroundMusic &&
            !backgroundMusic.paused
        ) {

            backgroundMusic.pause();

        }


        updateMusicButton();

    }



    /* ========================================================
       22. SYNCHRONIZE BACKGROUND MUSIC
    ======================================================== */


    /**
     * Makes background music follow the current audio state.
     *
     * Rule:
     *
     * If the visitor enabled background music and neither
     * the birthday song nor the video is playing, background
     * music may play.
     *
     * If birthday audio is playing, background music pauses.
     */
    function synchronizeBackgroundMusic() {

        if (!backgroundMusic) {

            return;

        }


        if (
            !backgroundMusicEnabled ||
            backgroundMusicUnavailable ||
            document.hidden
        ) {

            pauseBackgroundMusic();

            return;

        }


        if (isBirthdayMediaPlaying()) {

            pauseBackgroundMusic();

            return;

        }


        /*
         * When music is enabled and no other media is playing,
         * restore the ambient soundtrack.
         */

        void startBackgroundMusic(false);

    }



    /* ========================================================
       23. MUSIC TOGGLE BUTTON
    ======================================================== */


    /**
     * Handles manual changes to background music.
     *
     * Visitor actions:
     *
     * Music Off -> Music On
     * Music On  -> Music Off
     */
    function initializeMusicToggle() {

        if (!musicToggle) {

            return;

        }


        if (backgroundMusic) {

            backgroundMusic.volume =
                CONFIG.backgroundMusicVolume;

        }


        updateMusicButton();


        musicToggle.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();


                if (backgroundMusicUnavailable) {

                    setMusicFeedback(

                        "Please check the background music file."

                    );

                    return;

                }


                /*
                 * TURN MUSIC OFF
                 */

                if (backgroundMusicEnabled) {

                    backgroundMusicEnabled = false;

                    pauseBackgroundMusic();

                    updateMusicButton();


                    setMusicFeedback(
                        "Background music is off."
                    );


                    return;

                }


                /*
                 * TURN MUSIC ON
                 */

                backgroundMusicEnabled = true;


                updateMusicButton();


                /*
                 * A birthday song or video currently playing
                 * takes priority.
                 *
                 * Background music remains enabled and resumes
                 * when that media stops.
                 */

                if (isBirthdayMediaPlaying()) {

                    setMusicFeedback(

                        "Background music will resume " +
                        "after the birthday audio finishes."

                    );


                    return;

                }


                const success =
                    await startBackgroundMusic(true);


                if (success) {

                    setMusicFeedback(
                        "Background music is on."
                    );

                }

            }
        );

    }



    /* ========================================================
       24. BIRTHDAY SONG AND VIDEO CONTROLS
    ======================================================== */


    /**
     * Configures birthday-specific media.
     *
     * It stops overlapping playback and lets background music
     * resume when birthday media is paused or finishes.
     */
    function initializeBirthdayMedia() {

        const birthdayMedia = [

            birthdaySong,
            birthdayVideo

        ].filter(Boolean);


        /*
         * Apply suitable default volume levels.
         */

        if (birthdaySong) {

            birthdaySong.volume =
                CONFIG.birthdaySongVolume;

        }


        if (birthdayVideo) {

            birthdayVideo.volume =
                CONFIG.birthdayVideoVolume;

        }


        birthdayMedia.forEach((mediaElement) => {


            /* -----------------------------------------------
               WHEN BIRTHDAY MEDIA STARTS
            ----------------------------------------------- */

            mediaElement.addEventListener(
                "play",
                () => {

                    /*
                     * Pause the other birthday media element.
                     *
                     * This avoids the birthday song and video
                     * playing over one another.
                     */

                    birthdayMedia.forEach((otherMedia) => {

                        if (
                            otherMedia !== mediaElement &&
                            !otherMedia.paused
                        ) {

                            otherMedia.pause();

                        }

                    });


                    /*
                     * Birthday audio takes priority.
                     */

                    pauseBackgroundMusic();

                }
            );



            /* -----------------------------------------------
               WHEN BIRTHDAY MEDIA STOPS
            ----------------------------------------------- */

            const handleMediaStopped = () => {

                /*
                 * Wait one event-loop turn before deciding
                 * whether background music can resume.
                 *
                 * This is important when one birthday medium
                 * replaces another.
                 */

                window.setTimeout(() => {

                    synchronizeBackgroundMusic();

                }, 0);

            };


            mediaElement.addEventListener(

                "pause",

                handleMediaStopped

            );


            mediaElement.addEventListener(

                "ended",

                handleMediaStopped

            );

        });



        /* -----------------------------------------------
           BIRTHDAY SONG FILE ERROR
        ----------------------------------------------- */

        if (birthdaySong) {

            birthdaySong.addEventListener(
                "error",
                () => {

                    const audioHelp =
                        slideDeck.querySelector(".audio-help");


                    if (audioHelp) {

                        audioHelp.textContent =

                            "गानो नहीं चल पायो। " +
                            "assets/audio/birthday-song.mp3 " +
                            "फाइल चेक करो।";

                    }

                }
            );

        }



        /* -----------------------------------------------
           BIRTHDAY VIDEO FILE ERROR
        ----------------------------------------------- */

        if (birthdayVideo) {

            birthdayVideo.addEventListener(
                "error",
                () => {

                    const videoCaption =
                        slideDeck.querySelector(".video-caption");


                    if (videoCaption) {

                        videoCaption.textContent =

                            "वीडियो नहीं चल पायो। " +
                            "assets/video/birthday-memory.mp4 " +
                            "फाइल चेक करो।";

                    }

                }
            );

        }

    }



    /* ========================================================
       25. VIDEO DOWNLOAD LINK
    ======================================================== */


    /**
     * Prevents following the download link once the browser
     * knows that the associated video source has failed.
     *
     * The actual video file must still exist at the location
     * declared in index.html.
     */
    function initializeVideoDownload() {

        if (!downloadVideo) {

            return;

        }


        downloadVideo.addEventListener(
            "click",
            (event) => {

                if (
                    birthdayVideo &&
                    birthdayVideo.error
                ) {

                    event.preventDefault();


                    const videoCaption =
                        slideDeck.querySelector(".video-caption");


                    if (videoCaption) {

                        videoCaption.textContent =

                            "वीडियो फाइल उपलब्ध नहीं है। " +
                            "पहले सही वीडियो फाइल जोड़ो।";

                    }

                }

            }
        );

    }



    /* ========================================================
       26. FLOATING PETALS
    ======================================================== */


    /**
     * Creates a small number of decorative petals.
     *
     * A DocumentFragment avoids inserting every petal into
     * the page separately.
     *
     * Petals are disabled when reduced motion is requested.
     */
    function createFloatingPetals() {

        if (!petalLayer) {

            return;

        }


        /*
         * Remove any petals created by an earlier initialization.
         */

        petalLayer.replaceChildren();


        if (prefersReducedMotion()) {

            return;

        }


        const fragment =
            document.createDocumentFragment();


        for (
            let index = 0;
            index < CONFIG.petalCount;
            index++
        ) {

            const petal =
                document.createElement("span");


            petal.className = "petal";


            petal.setAttribute(
                "aria-hidden",
                "true"
            );


            /*
             * Distribute petals across the viewport.
             */

            petal.style.left =
                `${Math.random() * 100}%`;


            /*
             * Stagger animation starts to prevent all petals
             * from appearing at the same moment.
             */

            petal.style.animationDelay =
                `${-Math.random() * 18}s`;


            /*
             * Vary the animation speed slightly.
             */

            petal.style.animationDuration =
                `${12 + Math.random() * 10}s`;


            /*
             * Avoid excessive visual intensity.
             */

            petal.style.opacity =
                `${0.25 + Math.random() * 0.35}`;


            fragment.appendChild(petal);

        }


        petalLayer.appendChild(fragment);

    }



    /* ========================================================
       27. HANDLE MISSING IMAGES
    ======================================================== */


    /**
     * If an image cannot load, hide the broken-image icon.
     *
     * Existing frame backgrounds remain visible.
     *
     * The visitor still needs to add the actual image files
     * for the intended visual appearance.
     */
    function initializeImageFallbacks() {

        const images =
            slideDeck.querySelectorAll("img");


        images.forEach((imageElement) => {

            const hideUnavailableImage = () => {

                imageElement.hidden = true;


                const parent =
                    imageElement.parentElement;


                if (parent) {

                    parent.dataset.imageUnavailable =
                        "true";

                }

            };


            imageElement.addEventListener(
                "error",
                hideUnavailableImage
            );


            /*
             * Account for images that failed before the
             * listener was attached.
             */

            if (
                imageElement.complete &&
                imageElement.naturalWidth === 0
            ) {

                hideUnavailableImage();

            }

        });

    }



    /* ========================================================
       28. HANDLE BROWSER VISIBILITY
    ======================================================== */


    /**
     * Pause media when the visitor hides the tab or switches
     * applications.
     *
     * When the visitor returns, background music resumes only
     * if they previously enabled it.
     */
    function initializeVisibilityHandling() {

        document.addEventListener(
            "visibilitychange",
            () => {

                if (document.hidden) {

                    /*
                     * Pause background music but do not change
                     * the visitor's preference.
                     */

                    pauseBackgroundMusic();


                    /*
                     * Stop page-specific media in the hidden tab.
                     */

                    pauseBirthdayMedia();


                    /*
                     * Stop spoken text as well.
                     */

                    stopSpeech();


                    return;

                }


                /*
                 * On returning to the page, synchronization
                 * determines which media can resume.
                 */

                synchronizeBackgroundMusic();

            }
        );

    }



    /* ========================================================
       29. DYNAMIC REDUCED-MOTION CHANGES
    ======================================================== */


    /**
     * Rebuilds the decoration layer if the visitor changes
     * their operating-system motion preference.
     */
    function initializeMotionPreferenceListener() {

        if (
            !reducedMotionQuery ||
            typeof reducedMotionQuery.addEventListener !== "function"
        ) {

            return;

        }


        reducedMotionQuery.addEventListener(
            "change",
            () => {

                createFloatingPetals();

            }
        );

    }



    /* ========================================================
       30. INITIALIZE THE WEBSITE
    ======================================================== */


    /**
     * Sets up the website once all required DOM elements exist.
     *
     * Each subsystem initializes independently. Missing
     * optional audio or image elements do not prevent the
     * main slide navigation from working.
     */
    function initializeWebsite() {

        /*
         * 1. Initialize the page state.
         */

        initializeSlides();


        /*
         * 2. Set up page-navigation controls.
         */

        initializeSlideButtons();

        initializeSurpriseButton();

        initializeDirectNavigation();

        initializeKeyboardNavigation();


        /*
         * 3. Spoken greeting.
         */

        initializeSpeechGreeting();


        /*
         * 4. Audio and video.
         */

        initializeBirthdayMedia();

        initializeMusicToggle();

        initializeVideoDownload();


        /*
         * 5. Visual details.
         */

        initializeImageFallbacks();

        createFloatingPetals();


        /*
         * 6. Browser and accessibility support.
         */

        initializeVisibilityHandling();

        initializeMotionPreferenceListener();


        /*
         * 7. Establish a consistent initial music state.
         *
         * The music starts OFF; it does not autoplay.
         */

        backgroundMusicEnabled = false;


        if (backgroundMusic) {

            backgroundMusic.pause();

        }


        updateMusicButton();


        /*
         * Expose a tiny, intentional public interface for
         * optional debugging from the browser console.
         *
         * Navigation still works through the regular buttons.
         */

        window.BirthdayWebsite = Object.freeze({

            goToSlide: showSlide,

            getCurrentSlide: () => currentSlideIndex,

            getTotalSlides: () => TOTAL_SLIDES

        });


        console.info(
            `Birthday website initialized. ` +
            `${TOTAL_SLIDES} slides are ready.`
        );

    }



    /* ========================================================
       31. SAFE STARTUP
    ======================================================== */


    /*
     * Since the HTML loads script.js with "defer", the document
     * will normally already be parsed when this code runs.
     *
     * This check also supports loading the script dynamically.
     */
    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initializeWebsite,
            { once: true }
        );

    } else {

        initializeWebsite();

    }


})();
document.addEventListener("DOMContentLoaded", () => {
    const music = document.getElementById("backgroundMusic");

    if (!music) return;

    music.volume = 0.35;

    music.play().catch((error) => {
        console.log("Browser blocked automatic music playback:", error);
    });
});
