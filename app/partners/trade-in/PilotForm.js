"use client";

import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  MONTHLY_ORDERS,
  ROLES,
  validatePartnerLead,
} from "@/lib/partnersTradeIn";

const INITIAL = {
  name: "",
  company: "",
  website: "",
  role: "",
  email: "",
  phone: "",
  monthlyOrders: "",
  categories: [],
  message: "",
  honeypot: "",
};

export default function PilotForm() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [formError, setFormError] = useState("");
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function setField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(name) {
    setValues((current) => {
      const has = current.categories.includes(name);
      return {
        ...current,
        categories: has
          ? current.categories.filter((item) => item !== name)
          : [...current.categories, name],
      };
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setFormError("");
    const checked = validatePartnerLead(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      setStatus("idle");
      return;
    }
    setErrors({});
    setStatus("submitting");

    try {
      const response = await fetch("/api/partners/trade-in", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...checked.data, honeypot: values.honeypot, startedAt: startedAt.current }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not send that just now.");
      }
      setStatus("success");
    } catch {
      window.location.href = mailtoHref(checked.data);
    }
  }

  if (status === "success") {
    return (
      <div className="ep-success" role="status">
        <h3>Thanks. We will reply within 2 business days.</h3>
        <p>A short note to sell@epicdeals.co.za if your timeline is tighter.</p>
      </div>
    );
  }

  return (
    <form className="ep-form" onSubmit={onSubmit} noValidate aria-label="Pilot partnership application">
      <div className="ep-hp" aria-hidden="true">
        <label>
          Company fax
          <input
            tabIndex={-1}
            autoComplete="off"
            value={values.honeypot}
            onChange={(event) => setField("honeypot", event.target.value)}
          />
        </label>
      </div>

      <div className="ep-fields ep-fields--2">
        <Field label="Name" error={errors.name}>
          <input
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </Field>
        <Field label="Company" error={errors.company}>
          <input
            name="company"
            autoComplete="organization"
            value={values.company}
            onChange={(event) => setField("company", event.target.value)}
          />
        </Field>
        <Field label="Website" error={errors.website}>
          <input
            name="website"
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="https://"
            value={values.website}
            onChange={(event) => setField("website", event.target.value)}
          />
        </Field>
        <Field label="Role" error={errors.role}>
          <select
            name="role"
            autoComplete="organization-title"
            value={values.role}
            onChange={(event) => setField("role", event.target.value)}
          >
            <option value="">Select</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email" error={errors.email}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
          />
        </Field>
        <Field label="Phone (SA)" error={errors.phone}>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="082 123 4567"
            value={values.phone}
            onChange={(event) => setField("phone", event.target.value)}
          />
        </Field>
        <Field label="Monthly orders (approx)" error={errors.monthlyOrders}>
          <select
            name="monthlyOrders"
            value={values.monthlyOrders}
            onChange={(event) => setField("monthlyOrders", event.target.value)}
          >
            <option value="">Select</option>
            {MONTHLY_ORDERS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="ep-checks">
        <legend>Categories you sell</legend>
        <div className="ep-check-grid">
          {CATEGORIES.map((category) => (
            <label key={category} className="ep-check">
              <input
                type="checkbox"
                name="categories"
                value={category}
                checked={values.categories.includes(category)}
                onChange={() => toggleCategory(category)}
              />
              {category}
            </label>
          ))}
        </div>
        {errors.categories ? <p className="ep-error">{errors.categories}</p> : null}
      </fieldset>

      <Field label="Message (optional)" error={errors.message}>
        <textarea
          name="message"
          rows={4}
          value={values.message}
          onChange={(event) => setField("message", event.target.value)}
        />
      </Field>

      {formError ? (
        <p className="ep-form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <button className="ep-btn" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending..." : "Request pilot access"}
      </button>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="ep-field">
      <span>{label}</span>
      {children}
      {error ? <em className="ep-error">{error}</em> : null}
    </label>
  );
}

function mailtoHref(data) {
  const body = [
    `Name: ${data.name}`,
    `Company: ${data.company}`,
    `Website: ${data.website}`,
    `Role: ${data.role}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Monthly orders: ${data.monthlyOrders}`,
    `Categories: ${data.categories.join(", ")}`,
    data.message ? `Message: ${data.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `mailto:sell@epicdeals.co.za?subject=${encodeURIComponent(
    "Pilot partnership: " + data.company
  )}&body=${encodeURIComponent(body)}`;
}
