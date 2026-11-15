(function () {
  'use strict';

  // ---------- Analytics helper (gtag loads after page load in production) ----------
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  // ---------- Mobile nav ----------
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // ---------- Phone / email clicks ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!a) return;
    track(a.href.indexOf('tel:') === 0 ? 'phone_click' : 'email_click', { link_url: a.href, page_path: location.pathname });
  });

  // ---------- Resources category filter ----------
  var chips = document.querySelectorAll('.chip[data-filter]');
  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      Array.prototype.forEach.call(chips, function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      Array.prototype.forEach.call(document.querySelectorAll('.article-card'), function (card) {
        card.hidden = f !== 'all' && card.getAttribute('data-category') !== f;
      });
    });
  });

  // ---------- Forms ----------
  // All forms post to the existing Google Apps Script, which expects:
  // firstName, lastName, email, company, service, message, timestamp.
  // Extra fields are folded into `message` so nothing is lost.
  var KNOWN = ['firstName', 'lastName', 'email', 'company', 'service', 'message', 'timestamp'];
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(field, msg) {
    var wrap = field.closest('.field');
    if (!wrap) return;
    var el = wrap.querySelector('.error');
    if (msg) {
      wrap.classList.add('has-error');
      field.setAttribute('aria-invalid', 'true');
      if (!el) {
        el = document.createElement('span');
        el.className = 'error';
        el.id = field.id + '-error';
        wrap.appendChild(el);
        field.setAttribute('aria-describedby', el.id);
      }
      el.textContent = msg;
    } else {
      wrap.classList.remove('has-error');
      field.removeAttribute('aria-invalid');
      if (el) el.textContent = '';
    }
  }

  function validate(form) {
    var first = null;
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (f) {
      if (f.type === 'hidden' || f.type === 'checkbox') return;
      var v = (f.value || '').trim();
      var msg = '';
      if (f.required && !v) msg = 'This field is required';
      else if (f.type === 'email' && v && !EMAIL.test(v)) msg = 'Enter a valid email address';
      setError(f, msg);
      if (msg && !first) first = f;
    });
    if (first) first.focus();
    return !first;
  }

  function payload(form) {
    var data = new FormData(form);
    var out = new URLSearchParams();
    var extras = [];
    // A single "name" field (sidebar form) is split into first and last name.
    if (data.has('name')) {
      var parts = String(data.get('name')).trim().split(/\s+/);
      out.set('firstName', parts.shift() || '');
      out.set('lastName', parts.join(' ') || '-');
      data.delete('name');
    }
    data.forEach(function (value, key) {
      value = String(value).trim();
      if (!value) return;
      if (KNOWN.indexOf(key) !== -1) out.set(key, value);
      else extras.push(form.querySelector('[name="' + key + '"]').getAttribute('data-label') + ': ' + value);
    });
    extras.push('Sent from: ' + location.pathname);
    var msg = out.get('message') || '';
    out.set('message', (msg ? msg + '\n\n' : '') + extras.join('\n'));
    if (!out.get('lastName')) out.set('lastName', '-');
    out.set('timestamp', new Date().toLocaleString());
    return out;
  }

  Array.prototype.forEach.call(document.querySelectorAll('form[data-jade-form]'), function (form) {
    var status = form.querySelector('[data-form-status]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      btn.disabled = true;
      btn.textContent = 'Sending...';
      status.hidden = true;

      fetch(form.action, { method: 'POST', mode: 'no-cors', body: payload(form) })
        .then(function () {
          status.className = 'form-success';
          status.innerHTML = '<strong>Thank you.</strong> We will reply within 24 hours.';
          status.hidden = false;
          form.reset();
          track('generate_lead', { form_id: form.id, page_path: location.pathname });
        })
        .catch(function () {
          status.className = 'form-error';
          status.innerHTML = 'Your message could not be sent. Please email <a href="mailto:info@jadetitleservices.com">info@jadetitleservices.com</a> or call (817) 409-8408.';
          status.hidden = false;
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = label;
          status.focus();
        });
    });

    form.addEventListener('input', function (e) {
      if (e.target.closest('.field.has-error')) setError(e.target, '');
    });
  });
})();
