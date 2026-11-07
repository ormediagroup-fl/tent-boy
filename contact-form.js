// The public form endpoint is not an API key. No private credentials belong here.
export const CONTACT_SUBJECTS = ['Gear Question','Quick Start Guide','Collaboration / Sponsorship','General Question'];
export function isAtlasEndpoint(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === 'atlasforms.app' && !u.port && !u.username && !u.password && !u.search && !u.hash && /^\/f\/[A-Za-z0-9_-]{1,100}$/.test(u.pathname) && !/YOUR_FORM_ID/i.test(u.pathname);
  } catch { return false; }
}

export function validateContact(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Please enter your name.';
  else if (values.name.length > 120) errors.name = 'Please keep your name under 120 characters.';
  if (!values.email?.trim()) errors.email = 'Please enter your email address.';
  else if (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Please enter a valid email address, like name@example.com.';
  if (!CONTACT_SUBJECTS.includes(values.subject)) errors.subject = 'Please choose a subject.';
  if (!values.message?.trim()) errors.message = 'Please enter a message.';
  else if (values.message.length > 6000) errors.message = 'Please keep your message under 6,000 characters.';
  return errors;
}

const unconfirmed = 'We couldn’t confirm delivery. Your message is still here. Please wait a moment before trying again.';
export async function sendContact(endpoint, values, {fetchImpl = globalThis.fetch, signal} = {}) {
  if (!isAtlasEndpoint(endpoint)) throw new Error('The contact form is not accepting messages yet. Please check back soon.');
  const response = await fetchImpl(endpoint, {
    method: 'POST', headers: {'Content-Type':'application/json', Accept:'application/json'},
    credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'strict-origin-when-cross-origin', signal,
    body: JSON.stringify({name:values.name.trim(), email:values.email.trim(), subject:values.subject, message:values.message.trim(), _gotcha:values._gotcha || ''})
  });
  if (!response.ok) {
    const message = response.status === 429 ? 'The contact form is receiving too many messages or has reached its message limit. Please try again later.'
      : response.status === 403 ? 'The contact form is temporarily unavailable. Please try again later.'
      : response.status === 400 || response.status === 422 ? 'Your message couldn’t be sent. Please check the fields and try again.'
      : 'The message service is having trouble. Your message is still here; please try again later.';
    throw new Error(message);
  }
  let result;
  try { result = await response.json(); } catch { throw new Error(unconfirmed); }
  if (result?.success !== true || typeof result.submission_id !== 'string' || !result.submission_id.trim()) throw new Error(unconfirmed);
  return result.submission_id;
}

export function initializeContactForm(form, {fetchImpl = globalThis.fetch, navigate = path => globalThis.location.assign(path), timeoutMs = 30000} = {}) {
  const fields = ['name','email','subject','message'];
  const group = form.querySelector('fieldset'), button = form.querySelector('button[type="submit"]');
  const error = form.querySelector('#form-error'), status = form.querySelector('#form-status');
  const configured = isAtlasEndpoint(form.dataset.atlasEndpoint);
  form.noValidate = true;
  group.disabled = !configured; button.disabled = !configured;
  form.querySelector('#form-unavailable').hidden = configured;
  let sending = false;
  function clearField(name) {
    form.elements.namedItem(name).removeAttribute('aria-invalid');
    const message = form.querySelector('#'+name+'-error'); message.hidden = true; message.textContent = '';
  }
  for (const name of fields) form.elements.namedItem(name).addEventListener('input', () => clearField(name));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!configured || sending) return;
    error.hidden = true; error.textContent = ''; fields.forEach(clearField);
    const values = Object.fromEntries([...fields,'_gotcha'].map(name => [name, form.elements.namedItem(name).value]));
    values.email = values.email.trim();
    const errors = validateContact(values);
    for (const [name, text] of Object.entries(errors)) {
      const field = form.elements.namedItem(name), message = form.querySelector('#'+name+'-error');
      field.setAttribute('aria-invalid','true'); message.textContent = text; message.hidden = false;
    }
    if (Object.keys(errors).length) {
      error.textContent = 'Please check the highlighted fields below.'; error.hidden = false;
      form.elements.namedItem(Object.keys(errors)[0]).focus(); return;
    }
    sending = true; group.disabled = true; button.disabled = true;
    button.textContent = 'Sending…'; status.textContent = 'Sending your message…'; form.setAttribute('aria-busy','true');
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    let sent = false;
    try {
      await sendContact(form.dataset.atlasEndpoint, values, {fetchImpl, signal:controller.signal});
      // Fixed local path: never follow a redirect URL from the response or form input.
      navigate('/thank-you/'); sent = true;
    } catch (cause) {
      error.textContent = cause?.name === 'AbortError' || cause instanceof TypeError ? unconfirmed : cause.message || unconfirmed;
      error.hidden = false; error.focus(); status.textContent = '';
    } finally {
      clearTimeout(timer); form.removeAttribute('aria-busy');
      if (!sent) { sending = false; group.disabled = false; button.disabled = false; button.textContent = 'Send message ↗'; }
    }
  });
}
