/**
 * Random form data generator for testing forms
 * Provides realistic fake data for common form field types
 */

const FIRST_NAMES = [
  'James',
  'Mary',
  'Robert',
  'Patricia',
  'John',
  'Jennifer',
  'Michael',
  'Linda',
  'David',
  'Elizabeth',
  'William',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Christopher',
  'Karen',
  'Daniel',
  'Lisa',
  'Matthew',
  'Nancy',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
];

const COMPANIES = [
  'Acme Inc.',
  'TechCorp',
  'GlobalSoft',
  'InnovateTech',
  'DataFlow Systems',
  'CloudNine Solutions',
  'Nexus Digital',
  'Vertex Industries',
  'Pinnacle Group',
  'Quantum Labs',
  'Atlas Ventures',
  'Horizon Dynamics',
  'Catalyst Partners',
];

const JOB_TITLES = [
  'Software Engineer',
  'Product Manager',
  'Marketing Director',
  'CEO',
  'CTO',
  'Sales Manager',
  'Operations Lead',
  'Designer',
  'Data Analyst',
  'HR Manager',
  'VP of Engineering',
  'Founder',
  'Customer Success Manager',
  'DevOps Engineer',
];

const EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'company.com',
  'example.org',
  'techcorp.io',
  'startup.co',
  'enterprise.com',
];

const SUBJECTS = [
  'Question about pricing',
  'Technical support needed',
  'Feature request',
  'Partnership opportunity',
  'Billing inquiry',
  'General feedback',
  'Login issues',
  'Product demo request',
  'Integration help needed',
];

const MESSAGES = [
  "I'm interested in your enterprise plan. Could you please send me more information about the volume discounts?",
  "I'm encountering an issue when trying to export my data. The process seems to hang at 99%.",
  'It would be great if you could add dark mode to the dashboard. My eyes would appreciate it!',
  'We are a digital agency looking to partner with you. Do you have a referral program?',
  "I think I was charged twice for this month's subscription. Can you please check?",
  'Just wanted to say I really like the new update. The interface is much cleaner now.',
  "I forgot my password and the reset link isn't arriving in my inbox. Please assist.",
  'Could you provide more details about your API rate limits for the Pro plan?',
  "We're evaluating your solution for our team of 50+ people. What are the next steps?",
];

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
];

const USE_CASES = [
  'lead-capture',
  'surveys',
  'registrations',
  'applications',
  'orders',
  'feedback',
  'other',
];

const PHONE_PREFIXES = ['+1', '+44', '+49', '+33', '+61'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  const prefix = randomItem(PHONE_PREFIXES);
  const area = Math.floor(Math.random() * 900) + 100;
  const first = Math.floor(Math.random() * 900) + 100;
  const last = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix} (${area}) ${first}-${last}`;
}

function randomUrl(type: 'linkedin' | 'portfolio' | 'website'): string {
  const name =
    randomItem(FIRST_NAMES).toLowerCase() +
    randomItem(LAST_NAMES).toLowerCase();
  switch (type) {
    case 'linkedin':
      return `https://linkedin.com/in/${name}`;
    case 'portfolio':
      return `https://${name}.dev`;
    case 'website':
      return `https://www.${name.slice(0, 8)}.com`;
  }
}

export interface RandomFormData {
  // Personal
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;

  // Professional
  company: string;
  jobTitle: string;
  companySize: string;

  // Content
  subject: string;
  message: string;
  useCase: string;

  // Links
  linkedin: string;
  portfolio: string;
  website: string;
}

/**
 * Generate a complete set of random form data
 */
export function generateRandomFormData(): RandomFormData {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const emailDomain = randomItem(EMAIL_DOMAINS);

  return {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`,
    phone: randomPhone(),

    company: randomItem(COMPANIES),
    jobTitle: randomItem(JOB_TITLES),
    companySize: randomItem(COMPANY_SIZES),

    subject: randomItem(SUBJECTS),
    message: randomItem(MESSAGES),
    useCase: randomItem(USE_CASES),

    linkedin: randomUrl('linkedin'),
    portfolio: randomUrl('portfolio'),
    website: randomUrl('website'),
  };
}

/**
 * Fill a form element with random data
 * Matches input names/ids to appropriate random values
 */
export function fillFormWithRandomData(formElement: HTMLFormElement): void {
  const data = generateRandomFormData();

  const fieldMappings: Record<
    string,
    keyof RandomFormData | ((data: RandomFormData) => string)
  > = {
    // Name variations
    name: 'name',
    fullName: 'name',
    full_name: 'name',
    firstName: 'firstName',
    first_name: 'firstName',
    'first-name': 'firstName',
    lastname: 'lastName',
    lastName: 'lastName',
    last_name: 'lastName',
    'last-name': 'lastName',

    // Email
    email: 'email',
    emailAddress: 'email',
    email_address: 'email',
    workEmail: 'email',
    work_email: 'email',

    // Phone
    phone: 'phone',
    phoneNumber: 'phone',
    phone_number: 'phone',
    telephone: 'phone',
    tel: 'phone',

    // Company
    company: 'company',
    companyName: 'company',
    company_name: 'company',
    organization: 'company',

    // Job
    jobTitle: 'jobTitle',
    job_title: 'jobTitle',
    title: 'jobTitle',
    role: 'jobTitle',
    position: 'jobTitle',

    // Company size
    companySize: 'companySize',
    company_size: 'companySize',
    teamSize: 'companySize',
    team_size: 'companySize',

    // Content
    subject: 'subject',
    message: 'message',
    comments: 'message',
    feedback: 'message',
    description: 'message',
    coverLetter: 'message',
    cover_letter: 'message',

    // Use case
    useCase: 'useCase',
    use_case: 'useCase',

    // Links
    linkedin: 'linkedin',
    linkedinUrl: 'linkedin',
    portfolio: 'portfolio',
    portfolioUrl: 'portfolio',
    website: 'website',
    websiteUrl: 'website',
  };

  const elements = formElement.elements;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    const fieldName = element.name || element.id;

    if (!fieldName) continue;

    // Skip hidden fields, submit buttons, checkboxes, etc.
    if (element instanceof HTMLInputElement) {
      if (
        ['hidden', 'submit', 'button', 'checkbox', 'radio', 'file'].includes(
          element.type,
        )
      ) {
        continue;
      }
    }

    // Find matching field
    const mapping = fieldMappings[fieldName];
    if (mapping) {
      const value =
        typeof mapping === 'function' ? mapping(data) : data[mapping];
      if (element instanceof HTMLSelectElement) {
        // Try to find a matching option
        const options = Array.from(element.options);
        const match = options.find(
          (opt) =>
            opt.value === value ||
            opt.value.toLowerCase() === value.toLowerCase(),
        );
        if (match) {
          element.value = match.value;
        } else if (options.length > 1) {
          // Select a random non-empty option
          const nonEmptyOptions = options.filter((opt) => opt.value);
          if (nonEmptyOptions.length > 0) {
            element.value = randomItem(nonEmptyOptions).value;
          }
        }
      } else {
        element.value = value;
      }
    }
  }
}

/**
 * Get random data for specific fields
 */
export function getRandomFieldData(fields: string[]): Record<string, string> {
  const data = generateRandomFormData();
  const result: Record<string, string> = {};

  for (const field of fields) {
    const key = field as keyof RandomFormData;
    if (key in data) {
      result[field] = data[key];
    }
  }

  return result;
}
