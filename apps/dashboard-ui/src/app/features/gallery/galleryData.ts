export interface GalleryTemplate {
    id: string;
    name: string;
    description: string;
    category: 'marketing' | 'lead-gen' | 'application' | 'general';
    features: string[];
    embedCode: string;
}

export const galleryTemplates: GalleryTemplate[] = [
    {
        id: 'contact-form',
        name: 'Contact Form with ALTCHA',
        description: 'A simple contact form with proof-of-work CAPTCHA for spam protection. Perfect for company websites, portfolios, and landing pages.',
        category: 'general',
        features: ['ALTCHA CAPTCHA', 'CSRF Protection', 'Responsive Design', 'Success Feedback'],
        embedCode: `<!-- FormFlow Contact Form with ALTCHA -->
<script async defer src="https://cdn.altcha.org/js/latest/altcha.min.js" type="module"></script>
<form id="ff-contact" style="max-width:500px;font-family:system-ui,sans-serif;">
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Name *</label>
    <input type="text" name="name" required placeholder="Your name" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Email *</label>
    <input type="email" name="email" required placeholder="your@email.com" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Subject</label>
    <input type="text" name="subject" placeholder="What is this about?" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Message *</label>
    <textarea name="message" required placeholder="Your message..." style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;min-height:100px;resize:vertical;"></textarea>
  </div>
  <div style="margin:20px 0;">
    <altcha-widget challengeurl="" id="ff-altcha" auto="onsubmit" hidefooter></altcha-widget>
  </div>
  <button type="submit" style="width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Send Message</button>
  <p id="ff-status" style="margin-top:12px;padding:10px;border-radius:6px;font-size:14px;display:none;"></p>
</form>
<script>
(function(){
  const API = 'https://api.formflow.fyi';
  const HASH = 'YOUR_FORM_SUBMIT_HASH';
  const form = document.getElementById('ff-contact');
  const status = document.getElementById('ff-status');
  const altcha = document.getElementById('ff-altcha');

  if (altcha) altcha.setAttribute('challengeurl', API + '/s/' + HASH + '/challenge');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const altchaInput = form.querySelector('input[name="altcha"]');
    const altchaPayload = altchaInput?.value || null;

    btn.disabled = true;
    btn.textContent = 'Sending...';
    status.style.display = 'none';

    try {
      const csrf = await fetch(API + '/s/' + HASH + '/csrf', {credentials:'include'}).then(r => r.json());
      const headers = {'Content-Type':'application/json','X-CSRF-Token':csrf.token};
      if (altchaPayload) headers['x-altcha-spam-filter'] = altchaPayload;

      const res = await fetch(API + '/s/' + HASH, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          subject: form.subject.value || '(No subject)',
          message: form.message.value
        }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      status.style.display = 'block';
      status.style.background = '#dcfce7';
      status.style.color = '#166534';
      status.textContent = 'Message sent successfully!';
      form.reset();
      if (altcha.reset) altcha.reset();
    } catch (err) {
      status.style.display = 'block';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = err.message || 'Something went wrong';
    }
    btn.disabled = false;
    btn.textContent = 'Send Message';
  });
})();
</script>`
    },
    {
        id: 'newsletter-signup',
        name: 'Newsletter Signup',
        description: 'A minimal, high-converting newsletter signup form. Perfect for blog sidebars, landing pages, and exit-intent popups.',
        category: 'marketing',
        features: ['Clean Design', 'Optional Name Field', 'Success Confirmation', 'Benefits List'],
        embedCode: `<!-- FormFlow Newsletter Signup -->
<form id="ff-newsletter" style="max-width:400px;font-family:system-ui,sans-serif;">
  <div style="margin-bottom:12px;">
    <input type="text" name="firstName" placeholder="First name" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:12px;">
    <input type="email" name="email" placeholder="Email address" required style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <button type="submit" style="width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Subscribe</button>
  <p id="ff-status" style="margin-top:12px;padding:10px;border-radius:6px;font-size:14px;display:none;"></p>
</form>
<script>
(function(){
  const API = 'https://api.formflow.fyi';
  const HASH = 'YOUR_FORM_SUBMIT_HASH';
  const form = document.getElementById('ff-newsletter');
  const status = document.getElementById('ff-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Subscribing...';
    status.style.display = 'none';

    try {
      const csrf = await fetch(API + '/s/' + HASH + '/csrf', {credentials:'include'}).then(r => r.json());
      const res = await fetch(API + '/s/' + HASH, {
        method: 'POST',
        headers: {'Content-Type':'application/json','X-CSRF-Token':csrf.token},
        body: JSON.stringify({
          firstName: form.firstName.value,
          email: form.email.value,
          source: 'Newsletter'
        }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      status.style.display = 'block';
      status.style.background = '#dcfce7';
      status.style.color = '#166534';
      status.textContent = 'Thanks for subscribing!';
      form.reset();
    } catch (err) {
      status.style.display = 'block';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = err.message || 'Something went wrong';
    }
    btn.disabled = false;
    btn.textContent = 'Subscribe';
  });
})();
</script>`
    },
    {
        id: 'waitlist-signup',
        name: 'Waitlist / Early Access',
        description: 'A sleek waitlist form for product launches. Perfect for coming soon pages, beta signups, and product launches.',
        category: 'marketing',
        features: ['Minimal Friction', 'Position Number', 'Social Share Buttons', 'Dark Theme Ready'],
        embedCode: `<!-- FormFlow Waitlist Signup -->
<form id="ff-waitlist" style="max-width:400px;font-family:system-ui,sans-serif;">
  <div style="margin-bottom:12px;">
    <input type="text" name="name" placeholder="Your name" style="width:100%;padding:14px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:12px;">
    <input type="email" name="email" required placeholder="Email address" style="width:100%;padding:14px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <button type="submit" style="width:100%;padding:14px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Join the Waitlist</button>
  <p id="ff-status" style="margin-top:12px;padding:10px;border-radius:6px;font-size:14px;display:none;"></p>
</form>
<script>
(function(){
  const API = 'https://api.formflow.fyi';
  const HASH = 'YOUR_FORM_SUBMIT_HASH';
  const form = document.getElementById('ff-waitlist');
  const status = document.getElementById('ff-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Joining...';
    status.style.display = 'none';

    try {
      const csrf = await fetch(API + '/s/' + HASH + '/csrf', {credentials:'include'}).then(r => r.json());
      const res = await fetch(API + '/s/' + HASH, {
        method: 'POST',
        headers: {'Content-Type':'application/json','X-CSRF-Token':csrf.token},
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          source: 'Waitlist'
        }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      status.style.display = 'block';
      status.style.background = '#dcfce7';
      status.style.color = '#166534';
      status.textContent = "You're on the list!";
      form.reset();
    } catch (err) {
      status.style.display = 'block';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = err.message || 'Something went wrong';
    }
    btn.disabled = false;
    btn.textContent = 'Join the Waitlist';
  });
})();
</script>`
    },
    {
        id: 'demo-request',
        name: 'Demo Request',
        description: 'A B2B demo request form with social proof. Perfect for SaaS products, enterprise software, and sales-led businesses.',
        category: 'lead-gen',
        features: ['Company Info Fields', 'Use Case Selection', 'Social Proof Section', 'Professional Design'],
        embedCode: `<!-- FormFlow Demo Request -->
<form id="ff-demo" style="max-width:500px;font-family:system-ui,sans-serif;">
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Full Name *</label>
    <input type="text" name="name" required placeholder="John Smith" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Work Email *</label>
    <input type="email" name="email" required placeholder="john@company.com" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Company *</label>
    <input type="text" name="company" required placeholder="Acme Inc." style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Company Size</label>
    <select name="companySize" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
      <option value="">Select...</option>
      <option value="1-10">1-10 employees</option>
      <option value="11-50">11-50 employees</option>
      <option value="51-200">51-200 employees</option>
      <option value="201-500">201-500 employees</option>
      <option value="500+">500+ employees</option>
    </select>
  </div>
  <button type="submit" style="width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Request Demo</button>
  <p id="ff-status" style="margin-top:12px;padding:10px;border-radius:6px;font-size:14px;display:none;"></p>
</form>
<script>
(function(){
  const API = 'https://api.formflow.fyi';
  const HASH = 'YOUR_FORM_SUBMIT_HASH';
  const form = document.getElementById('ff-demo');
  const status = document.getElementById('ff-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    status.style.display = 'none';

    try {
      const csrf = await fetch(API + '/s/' + HASH + '/csrf', {credentials:'include'}).then(r => r.json());
      const res = await fetch(API + '/s/' + HASH, {
        method: 'POST',
        headers: {'Content-Type':'application/json','X-CSRF-Token':csrf.token},
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          company: form.company.value,
          companySize: form.companySize.value,
          source: 'Demo Request'
        }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      status.style.display = 'block';
      status.style.background = '#dcfce7';
      status.style.color = '#166534';
      status.textContent = 'Thanks! We will contact you shortly.';
      form.reset();
    } catch (err) {
      status.style.display = 'block';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = err.message || 'Something went wrong';
    }
    btn.disabled = false;
    btn.textContent = 'Request Demo';
  });
})();
</script>`
    },
    {
        id: 'resource-download',
        name: 'Resource Download (Lead Gen)',
        description: 'A gated content form for downloadable resources. Perfect for eBooks, guides, whitepapers, and marketing lead generation.',
        category: 'lead-gen',
        features: ['Company Info', 'Job Title Field', 'Newsletter Opt-in', 'Instant Download'],
        embedCode: `<!-- FormFlow Resource Download -->
<form id="ff-download" style="max-width:500px;font-family:system-ui,sans-serif;">
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Full Name *</label>
    <input type="text" name="name" required placeholder="Your name" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Work Email *</label>
    <input type="email" name="email" required placeholder="you@company.com" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Company</label>
    <input type="text" name="company" placeholder="Your company" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;">
      <input type="checkbox" name="newsletter" style="width:18px;height:18px;">
      <span>Send me product updates and tips</span>
    </label>
  </div>
  <button type="submit" style="width:100%;padding:14px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Download Now</button>
  <p id="ff-status" style="margin-top:12px;padding:10px;border-radius:6px;font-size:14px;display:none;"></p>
</form>
<script>
(function(){
  const API = 'https://api.formflow.fyi';
  const HASH = 'YOUR_FORM_SUBMIT_HASH';
  const DOWNLOAD_URL = 'YOUR_RESOURCE_URL'; // Replace with your actual download URL
  const form = document.getElementById('ff-download');
  const status = document.getElementById('ff-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    status.style.display = 'none';

    try {
      const csrf = await fetch(API + '/s/' + HASH + '/csrf', {credentials:'include'}).then(r => r.json());
      const res = await fetch(API + '/s/' + HASH, {
        method: 'POST',
        headers: {'Content-Type':'application/json','X-CSRF-Token':csrf.token},
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          company: form.company.value,
          newsletter: form.newsletter.checked,
          source: 'Resource Download'
        }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      status.style.display = 'block';
      status.style.background = '#dcfce7';
      status.style.color = '#166534';
      status.textContent = 'Success! Your download will start shortly.';
      form.reset();
      // Trigger download
      window.open(DOWNLOAD_URL, '_blank');
    } catch (err) {
      status.style.display = 'block';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = err.message || 'Something went wrong';
    }
    btn.disabled = false;
    btn.textContent = 'Download Now';
  });
})();
</script>`
    },
    {
        id: 'webinar-registration',
        name: 'Webinar/Event Registration',
        description: 'A professional event registration form with speaker info and event details. Perfect for webinars, conferences, and workshops.',
        category: 'marketing',
        features: ['Event Details Sidebar', 'Timezone Selection', 'Company/Role Fields', 'Calendar Integration'],
        embedCode: `<!-- FormFlow Webinar Registration -->
<form id="ff-webinar" style="max-width:500px;font-family:system-ui,sans-serif;">
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Full Name *</label>
    <input type="text" name="name" required placeholder="Your name" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Email *</label>
    <input type="email" name="email" required placeholder="you@company.com" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Company</label>
    <input type="text" name="company" placeholder="Your company" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Job Title</label>
    <input type="text" name="jobTitle" placeholder="Your role" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <button type="submit" style="width:100%;padding:14px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Register Now</button>
  <p id="ff-status" style="margin-top:12px;padding:10px;border-radius:6px;font-size:14px;display:none;"></p>
</form>
<script>
(function(){
  const API = 'https://api.formflow.fyi';
  const HASH = 'YOUR_FORM_SUBMIT_HASH';
  const form = document.getElementById('ff-webinar');
  const status = document.getElementById('ff-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Registering...';
    status.style.display = 'none';

    try {
      const csrf = await fetch(API + '/s/' + HASH + '/csrf', {credentials:'include'}).then(r => r.json());
      const res = await fetch(API + '/s/' + HASH, {
        method: 'POST',
        headers: {'Content-Type':'application/json','X-CSRF-Token':csrf.token},
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          company: form.company.value,
          jobTitle: form.jobTitle.value,
          source: 'Webinar Registration'
        }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      status.style.display = 'block';
      status.style.background = '#dcfce7';
      status.style.color = '#166534';
      status.textContent = 'You are registered! Check your email for details.';
      form.reset();
    } catch (err) {
      status.style.display = 'block';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = err.message || 'Something went wrong';
    }
    btn.disabled = false;
    btn.textContent = 'Register Now';
  });
})();
</script>`
    },
    {
        id: 'job-application',
        name: 'Job Application Form',
        description: 'A comprehensive job application form with file upload support. Perfect for career pages, recruitment websites, and HR departments.',
        category: 'application',
        features: ['Resume Upload', 'Cover Letter', 'Work Preferences', 'GDPR Consent'],
        embedCode: `<!-- FormFlow Job Application -->
<form id="ff-job" style="max-width:550px;font-family:system-ui,sans-serif;">
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Full Name *</label>
    <input type="text" name="name" required placeholder="Your full name" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Email *</label>
    <input type="email" name="email" required placeholder="you@example.com" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Phone</label>
    <input type="tel" name="phone" placeholder="+1 (555) 000-0000" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">LinkedIn Profile</label>
    <input type="url" name="linkedin" placeholder="https://linkedin.com/in/yourname" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Resume URL</label>
    <input type="url" name="resumeUrl" placeholder="Link to your resume (Google Drive, Dropbox, etc.)" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;">
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-weight:500;">Cover Letter</label>
    <textarea name="coverLetter" placeholder="Tell us why you're a great fit..." style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;min-height:120px;resize:vertical;"></textarea>
  </div>
  <div style="margin-bottom:15px;">
    <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:13px;line-height:1.4;">
      <input type="checkbox" name="consent" required style="width:18px;height:18px;margin-top:2px;">
      <span>I consent to the processing of my personal data for recruitment purposes. *</span>
    </label>
  </div>
  <button type="submit" style="width:100%;padding:14px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Submit Application</button>
  <p id="ff-status" style="margin-top:12px;padding:10px;border-radius:6px;font-size:14px;display:none;"></p>
</form>
<script>
(function(){
  const API = 'https://api.formflow.fyi';
  const HASH = 'YOUR_FORM_SUBMIT_HASH';
  const form = document.getElementById('ff-job');
  const status = document.getElementById('ff-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    status.style.display = 'none';

    try {
      const csrf = await fetch(API + '/s/' + HASH + '/csrf', {credentials:'include'}).then(r => r.json());
      const res = await fetch(API + '/s/' + HASH, {
        method: 'POST',
        headers: {'Content-Type':'application/json','X-CSRF-Token':csrf.token},
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          phone: form.phone.value,
          linkedin: form.linkedin.value,
          resumeUrl: form.resumeUrl.value,
          coverLetter: form.coverLetter.value,
          consentGiven: form.consent.checked,
          source: 'Job Application'
        }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      status.style.display = 'block';
      status.style.background = '#dcfce7';
      status.style.color = '#166534';
      status.textContent = 'Application submitted! We will be in touch.';
      form.reset();
    } catch (err) {
      status.style.display = 'block';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = err.message || 'Something went wrong';
    }
    btn.disabled = false;
    btn.textContent = 'Submit Application';
  });
})();
</script>`
    }
];

export const categoryLabels: Record<string, string> = {
    'marketing': 'Marketing',
    'lead-gen': 'Lead Generation',
    'application': 'Applications',
    'general': 'General'
};
