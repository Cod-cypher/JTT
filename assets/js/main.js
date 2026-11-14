// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
  });
});

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

// ========== CONVERSION EVENTS (GA4) ==========
function track(name, params) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
}
document.addEventListener('click', function (e) {
  const a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
  if (!a) return;
  track(a.href.startsWith('tel:') ? 'phone_click' : 'email_click', { link_url: a.href, page_path: location.pathname });
});

// ========== GOOGLE SHEETS FORM SUBMISSION ==========
const contactForm = document.getElementById('contactForm');
if (contactForm) contactForm.addEventListener('submit', function() {
  // Set the timestamp
  document.getElementById('timestamp').value = new Date().toLocaleString();
  track('generate_lead', { form_id: 'contactForm', page_path: location.pathname });

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
