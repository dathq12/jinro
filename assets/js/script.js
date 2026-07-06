// ===== JINRO Landing Page - fit down below 1920, full-bleed above =====
(function () {
    var DESIGN_W = 1920;
    var DESIGN_H = 6926;
    var canvas = document.querySelector('.canvas');
    var viewport = document.querySelector('.viewport');
    var header = document.querySelector('.site-header');
    if (!canvas || !viewport) return;

    function fit() {
        var w = window.innerWidth;
        var scale = Math.min(1, w / DESIGN_W);
        canvas.style.transform = 'scale(' + scale + ')';
        if (header) {
            header.style.transform = 'scale(' + scale + ')';
        }
        document.documentElement.style.height = (DESIGN_H * scale) + 'px';
    }

    fit();
    window.addEventListener('resize', fit);
})();


// ===== STICKY HEADER STYLE CHANGE =====
(function () {
    var header = document.querySelector('.site-header');
    var pickup = document.querySelector('.pickup');

    if (!header || !pickup) return;

    var ticking = false;

    function updateHeaderStyle() {
        var pickupTop = pickup.getBoundingClientRect().top;
        var headerHeight = header.getBoundingClientRect().height;

        if (pickupTop <= headerHeight) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
            ticking = false;
            updateHeaderStyle();
        });
    }

    window.addEventListener('scroll', requestUpdate);
    window.addEventListener('resize', requestUpdate);
    updateHeaderStyle();
})();

// ===== Hero video banner =====
(function () {
    var hero = document.querySelector('.hero-video-banner');
    if (!hero) return;

    var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero-slide'));
    if (!slides.length) return;

    var index = 0;
    var fallbackTimer = null;

    function clearFallbackTimer() {
        if (fallbackTimer) {
            window.clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
    }

    function scheduleNext(video, slideIndex) {
        clearFallbackTimer();
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

        var remaining = Math.max(0.2, video.duration - video.currentTime);
        fallbackTimer = window.setTimeout(function () {
            if (index === slideIndex) {
                show(slideIndex + 1);
            }
        }, remaining * 1000 + 120);
    }

    function playActiveVideo(video, slideIndex) {
        if (!video) return;

        video.muted = true;
        video.play().catch(function () {});

        window.setTimeout(function () {
            if (index === slideIndex && video.paused && !video.ended) {
                video.play().catch(function () {});
            }
        }, 160);
    }

    function show(n) {
        clearFallbackTimer();
        var newIndex = (n + slides.length) % slides.length;
        var oldVideo = slides[index] ? slides[index].querySelector('video') : null;
        var newVideo = slides[newIndex].querySelector('video');

        slides.forEach(function (slide, slideIndex) {
            slide.classList.toggle('is-active', slideIndex === newIndex);
        });

        if (oldVideo && oldVideo !== newVideo) {
            oldVideo.pause();
            oldVideo.currentTime = 0;
        }

        index = newIndex;
        if (!newVideo) return;

        newVideo.muted = true;
        newVideo.currentTime = 0;
        playActiveVideo(newVideo, newIndex);
        scheduleNext(newVideo, newIndex);
    }

    slides.forEach(function (slide, slideIndex) {
        var video = slide.querySelector('video');
        if (!video) return;

        video.addEventListener('ended', function () {
            if (index === slideIndex) {
                show(slideIndex + 1);
            }
        });

        video.addEventListener('loadedmetadata', function () {
            if (index === slideIndex) {
                scheduleNext(video, slideIndex);
            }
        });

        video.addEventListener('pause', function () {
            if (index === slideIndex && !video.ended) {
                window.setTimeout(function () {
                    if (index === slideIndex && video.paused && !video.ended) {
                        video.play().catch(function () {});
                    }
                }, 160);
            }
        });
    });

    show(0);
})();

// ===== Section reveal on scroll (Pickup, SNS, Cocktail & Movie, News) =====
(function () {
    var sections = document.querySelectorAll('.pickup, .sns, .cocktail-movie, .news');
    if (!sections.length) return;

    // Fallback: show everything immediately if IntersectionObserver is unsupported
    if (!('IntersectionObserver' in window)) {
        Array.prototype.forEach.call(sections, function (s) {
            s.classList.add('in-view');
        });
        return;
    }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    Array.prototype.forEach.call(sections, function (s) {
        observer.observe(s);
    });
})();

// ===== Products Carousel =====
function initCarousel() {
    var carousel = document.querySelector('.carousel');
    var carouselNav = document.querySelector('.carousel-nav');
    if (!carousel || !carouselNav) {
        console.warn('Carousel or carousel-nav not found');
        return;
    }

    var prevBtn = carouselNav.querySelector('.prev');
    var nextBtn = carouselNav.querySelector('.next');
    if (!prevBtn || !nextBtn) {
        console.warn('Prev or next button not found');
        return;
    }

    var sourceItems = Array.prototype.slice.call(carousel.querySelectorAll('.product')).filter(function (item) {
        return !item.hasAttribute('data-clone');
    });
    if (sourceItems.length > 1) {
        sourceItems = sourceItems.slice(0, -1);
    }
    if (!sourceItems.length) return;

    // Rebuild the track as: [clones of all items] + [original items] + [clones of all items]
    // This keeps a full item sequence on both sides, so the next card is always available.
    carousel.innerHTML = '';

    var fragment = document.createDocumentFragment();

    function appendSet(items, cloneZone) {
        items.forEach(function (item) {
            var node = item.cloneNode(true);
            if (cloneZone) {
                node.setAttribute('data-clone', 'true');
                node.setAttribute('data-clone-zone', cloneZone);
                node.setAttribute('aria-hidden', 'true');
            } else {
                node.removeAttribute('data-clone');
                node.removeAttribute('data-clone-zone');
                node.removeAttribute('aria-hidden');
            }
            fragment.appendChild(node);
        });
    }

    appendSet(sourceItems, 'start');
    appendSet(sourceItems, '');
    appendSet(sourceItems, 'end');
    carousel.appendChild(fragment);

    var items = Array.prototype.slice.call(carousel.querySelectorAll('.product'));
    var realCount = sourceItems.length;
    var firstRealIndex = realCount;
    var lastRealIndex = realCount * 2 - 1;
    var carouselIndex = firstRealIndex;
    var isTransitioning = false;
    var transitionTimer = null;
    var ITEM_WIDTH = 560; // 480px item + 80px gap

    function setPosition(withTransition) {
        carousel.style.transition = withTransition ? 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none';
        carousel.style.transform = 'translateX(' + (-carouselIndex * ITEM_WIDTH) + 'px)';
    }

    function jumpTo(index) {
        if (transitionTimer) {
            clearTimeout(transitionTimer);
            transitionTimer = null;
        }
        carouselIndex = index;
        setPosition(false);
        requestAnimationFrame(function () {
            isTransitioning = false;
            carousel.style.transition = 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';
        });
    }

    function finishTransition() {
        if (!isTransitioning) return;

        if (transitionTimer) {
            clearTimeout(transitionTimer);
            transitionTimer = null;
        }

        if (carouselIndex < firstRealIndex) {
            jumpTo(carouselIndex + realCount);
        } else if (carouselIndex > lastRealIndex) {
            jumpTo(carouselIndex - realCount);
        } else {
            isTransitioning = false;
        }
    }

    function goTo(index) {
        if (isTransitioning) return;
        if (transitionTimer) {
            clearTimeout(transitionTimer);
            transitionTimer = null;
        }
        carouselIndex = index;
        isTransitioning = true;
        setPosition(true);
        transitionTimer = window.setTimeout(finishTransition, 750);
    }

    carousel.addEventListener('transitionend', function (e) {
        if (e.target !== carousel || e.propertyName !== 'transform') return;
        finishTransition();
    });

    prevBtn.addEventListener('click', function (e) {
        e.preventDefault();
        goTo(carouselIndex - 1);
    });

    nextBtn.addEventListener('click', function (e) {
        e.preventDefault();
        goTo(carouselIndex + 1);
    });

    // Start from the first real item so the edge clones can wrap seamlessly.
    setPosition(false);

    console.log('Products carousel loaded:', {
        carousel: carousel ? 'found' : 'NOT found',
        prevBtn: prevBtn ? 'found' : 'NOT found',
        nextBtn: nextBtn ? 'found' : 'NOT found',
        realItems: realCount,
        totalItems: items.length
    });
}

// Try DOMContentLoaded first
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousel);
} else {
    // If DOM is already loaded, run immediately
    initCarousel();
}

// ===== SNS video rail =====
(function () {
    var section = document.querySelector('.sns');
    var track = document.querySelector('.sns-track');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.sns-card'));
    var modal = document.getElementById('snsModal');
    var modalVideo = modal ? modal.querySelector('.sns-modal-video') : null;
    var closeBtn = modal ? modal.querySelector('.sns-modal-close') : null;

    if (!section || !track || !cards.length || !modal || !modalVideo || !closeBtn) return;

    var firstCard = cards[0];
    var firstVideo = firstCard.querySelector('video');
    var sectionInView = false;

    function playCard(card) {
        var video = card.querySelector('video');
        if (!video) return;
        video.muted = true;
        video.play().then(function () {
            card.classList.add('is-playing');
        }).catch(function () {});
    }

    function stopCard(card, resetTime) {
        var video = card.querySelector('video');
        if (!video) return;
        video.pause();
        if (resetTime) {
            video.currentTime = 0;
        }
        card.classList.remove('is-playing');
    }

    function stopOtherCards(activeCard) {
        cards.forEach(function (item) {
            if (item !== activeCard) stopCard(item, true);
        });
    }

    function resumeFirstCard() {
        if (sectionInView && !modal.classList.contains('is-open')) {
            playCard(firstCard);
        }
    }

    cards.forEach(function (card) {
        function handleEnter() {
            stopOtherCards(card);
            playCard(card);
        }

        function handleLeave() {
            if (card === firstCard && sectionInView && !modal.classList.contains('is-open')) {
                playCard(firstCard);
                return;
            }
            stopCard(card, true);
            if (card !== firstCard) resumeFirstCard();
        }

        card.addEventListener('pointerenter', handleEnter);
        card.addEventListener('mouseenter', handleEnter);
        card.addEventListener('pointerleave', handleLeave);
        card.addEventListener('mouseleave', handleLeave);

        card.addEventListener('click', function () {
            var src = card.getAttribute('data-video');
            if (!src) return;
            cards.forEach(function (item) {
                stopCard(item, false);
            });
            modalVideo.src = src;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            modalVideo.play().catch(function () {});
        });
    });

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modalVideo.pause();
        modalVideo.removeAttribute('src');
        modalVideo.load();
        if (sectionInView && firstVideo) playCard(firstCard);
    }

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                sectionInView = entry.isIntersecting;
                if (entry.isIntersecting) {
                    resumeFirstCard();
                } else {
                    stopCard(firstCard, true);
                }
            });
        }, { threshold: 0.35 });
        observer.observe(section);
    } else {
        sectionInView = true;
        playCard(firstCard);
    }
})();
