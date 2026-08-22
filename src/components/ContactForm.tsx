import { useId, useRef, useState, type FormEvent, type ReactElement } from 'react';

import { site, whatsappLink } from '../site.config';

type FieldName = 'name' | 'email' | 'phone' | 'message';
type Errors = Partial<Record<FieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[\d+\-() ]{9,}$/;

const LABELS: Record<FieldName, string> = {
  name: 'שם מלא',
  email: 'אימייל',
  phone: 'טלפון',
  message: 'ספרו לנו על הפרויקט שלכם',
};

const ICONS: Record<FieldName, ReactElement> = {
  name: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="5.6" r="3.1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.6 16.2c0-3.2 2.9-5.2 6.4-5.2s6.4 2 6.4 5.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  phone: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <path
        d="M6.1 2.4 7.6 5.5 6.2 7a9.8 9.8 0 0 0 4.8 4.8l1.5-1.4 3.1 1.5v2.6c0 .8-.7 1.4-1.5 1.3C7.5 15.3 2.7 10.5 2.1 4C2 3.2 2.6 2.4 3.4 2.4z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  email: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <rect x="2.2" y="4.2" width="13.6" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 5.2 9 10.2 15 5.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  message: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <path d="M12.3 2.4 15.6 5.7 6.4 15H3.1v-3.3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
};

function validate(values: Record<FieldName, string>): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = 'נא למלא שם מלא.';
  if (!PHONE_PATTERN.test(values.phone.trim())) errors.phone = 'נא למלא מספר טלפון תקין.';
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim()))
    errors.email = 'כתובת האימייל אינה תקינה.';
  return errors;
}

export function ContactForm() {
  const formId = useId();
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const refs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});

  const fieldId = (name: FieldName) => `${formId}-${name}`;
  const errorId = (name: FieldName) => `${formId}-${name}-error`;

  const update = (name: FieldName) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const found = validate(values);
    setErrors(found);

    const firstInvalid = (['name', 'email', 'phone'] as const).find((name) => found[name]);
    if (firstInvalid) {
      refs.current[firstInvalid]?.focus();
      return;
    }

    setStatus('sending');

    if (site.contactEndpoint) {
      try {
        const response = await fetch(site.contactEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(values),
        });
        setStatus(response.ok ? 'sent' : 'failed');
      } catch {
        setStatus('failed');
      }
      return;
    }

    // No endpoint wired yet: hand the details to WhatsApp or the mail client so
    // no enquiry is ever silently dropped.
    const summary = `שלום, אשמח לשמוע פרטים על בניית אתר.\nשם: ${values.name}\nטלפון: ${values.phone}${
      values.email ? `\nאימייל: ${values.email}` : ''
    }${values.message ? `\nעל הפרויקט: ${values.message}` : ''}`;

    const target =
      whatsappLink(summary) ??
      `mailto:${site.email}?subject=${encodeURIComponent('פנייה מהאתר')}&body=${encodeURIComponent(summary)}`;
    window.open(target, '_blank', 'noopener');
    setStatus('sent');
  };

  if (status === 'sent') {
    return (
      <div className="contact-form contact-form--done" role="status">
        <p className="contact-form__done-title">תודה, הפרטים התקבלו.</p>
        <p className="contact-form__done-copy">
          נחזור אליכם בהקדם. אפשר גם לכתוב לנו ישירות ל־
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </div>
    );
  }

  const invalid = (Object.keys(errors) as FieldName[]).filter((name) => errors[name]);

  const field = (name: FieldName) => (
    <p className="field" key={name}>
      <span className="field__icon" aria-hidden="true">
        {ICONS[name]}
      </span>
      {name === 'message' ? (
        <textarea
          id={fieldId(name)}
          ref={(node) => {
            refs.current[name] = node;
          }}
          className="field__control field__control--area"
          rows={4}
          placeholder=" "
          value={values[name]}
          onChange={update(name)}
        />
      ) : (
        <input
          id={fieldId(name)}
          ref={(node) => {
            refs.current[name] = node;
          }}
          className="field__control"
          type={name === 'phone' ? 'tel' : name === 'email' ? 'email' : 'text'}
          autoComplete={name === 'phone' ? 'tel' : name === 'email' ? 'email' : 'name'}
          inputMode={name === 'email' ? 'email' : undefined}
          placeholder=" "
          value={values[name]}
          onChange={update(name)}
          required={name !== 'email'}
          aria-required={name !== 'email' ? 'true' : undefined}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? errorId(name) : undefined}
        />
      )}
      <label className="field__label" htmlFor={fieldId(name)}>
        {LABELS[name]}
      </label>
      {errors[name] && (
        <span className="field__error" id={errorId(name)}>
          {errors[name]}
        </span>
      )}
    </p>
  );

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate aria-labelledby={`${formId}-title`}>
      <h3 className="visually-hidden" id={`${formId}-title`}>
        טופס יצירת קשר
      </h3>

      {invalid.length > 0 && (
        <p className="contact-form__summary" role="alert">
          יש לתקן {invalid.length === 1 ? 'שדה אחד' : `${invalid.length} שדות`} לפני השליחה.
        </p>
      )}

      {(['name', 'email', 'phone', 'message'] as const).map(field)}

      <button type="submit" className="contact-form__submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'שולח…' : 'שלחו פרטים'}
        <svg width="16" height="14" viewBox="0 0 18 16" fill="none" aria-hidden="true">
          <path d="M1.2 8 16.5 1.2 8.4 14.8 7.4 9.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </button>

      {status === 'failed' && (
        <p className="contact-form__summary" role="alert">
          השליחה נכשלה. אפשר לנסות שוב או לכתוב לנו ל־<a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      )}
    </form>
  );
}
