// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
  });
});

// Active nav highlighting on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

function setActiveNav() {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (current && link.getAttribute('href') === '#' + current) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', setActiveNav);
setActiveNav();

// ========== SCROLL ANIMATIONS (IntersectionObserver) ==========
const animateElements = document.querySelectorAll('[data-animate]');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animated');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px'
});

animateElements.forEach(el => observer.observe(el));

// ========== COUNT-UP ANIMATION ==========
function animateCount(el, delay) {
  const target = parseInt(el.getAttribute('data-count'), 10);
  const suffix = el.getAttribute('data-suffix') || '';
  const duration = 2200;

  setTimeout(() => {
    const start = performance.now();
    let prev = -1;

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out expo — fast start, very smooth deceleration
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(eased * target);
      if (current !== prev) {
        el.textContent = current + suffix;
        prev = current;
      }
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }, delay);
}

function animateCountGroup(container) {
  const nums = container.querySelectorAll('[data-count]');
  nums.forEach((el, i) => animateCount(el, i * 150));
}

const countContainers = document.querySelectorAll('.hero-stats, .stat-grid');
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCountGroup(entry.target);
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

countContainers.forEach(el => countObserver.observe(el));

// ========== GOOGLE SHEETS FORM SUBMISSION ==========
const contactForm = document.getElementById('contactForm');
if (contactForm) contactForm.addEventListener('submit', function() {
  // Set the timestamp
  document.getElementById('timestamp').value = new Date().toLocaleString();

  const btn = document.getElementById('submitBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  const status = document.getElementById('formStatus');

  // Show loading state
  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  status.style.display = 'none';

  // After a short delay, show success and reset
  setTimeout(function() {
    status.style.display = 'block';
    status.style.background = '#e6f4ea';
    status.style.color = '#1e7e34';
    status.style.border = '1px solid #b7dfb9';
    status.textContent = '\u2713 Message sent successfully! We\'ll get back to you soon.';

    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';

    contactForm.reset();
  }, 2000);
});
