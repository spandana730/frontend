
import React, { useState, useRef } from "react";

// Format currency with 2 decimals, dollar sign, and commas
function formatMoney(amount) {
  if (amount === undefined || amount === null) return "$0";
  const amt = Number(amount);
  return amt < 0
    ? `-$${Math.abs(amt).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`
    : `$${amt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}

// Stepper at top
const steps = [
  "Upload Documents",
  "Personal Info",
  "Summary & Download",
];

function Stepper({ step }) {
  return (
    <div style={{
      display: "flex", gap: 12, justifyContent: "center", margin: "0 0 30px 0",
    }}>
      {steps.map((label, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              width: 38, height: 38,
              borderRadius: "50%",
              background: step === i ? "#2563eb" : "#f1f5f9",
              color: step === i ? "#fff" : "#2d354d",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 18, marginBottom: 3, border: step === i ? "2.5px solid #2563eb" : "2.5px solid #dbeafe",
              transition: "all .17s",
            }}
          >
            {i + 1}
          </div>
          <div style={{
            fontSize: 15, color: step === i ? "#2563eb" : "#64748b",
            fontWeight: step === i ? 600 : 500,
            marginTop: 3,
          }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UploadForm() {
  // Steps state
  const [step, setStep] = useState(0);

  // File upload
  const [files, setFiles] = useState([]);
  const dropRef = useRef();

  // Personal info
  const [formValues, setFormValues] = useState({
    first_name: "", middle_initial: "", last_name: "", ssn: "",
    spouse_first_name: "", spouse_middle_initial: "", spouse_last_name: "", spouse_ssn: "",
    address_line1: "", address_apt: "", city: "", state: "", zip_code: "",
    filing_status: "single", dependents: "[]",
    routing_number: "", account_number: "",
    taxpayer_signature: "", signature_date: "",
  });

  // NEW: Dynamic dependents state (list of objects)
  const [dependents, setDependents] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]); // <--- NEW

  // Loading/result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Drag/drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    let f = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    setFiles(f);
    dropRef.current.style.borderColor = "#dbeafe";
    dropRef.current.style.background = "#f9fafb";
  };
  const handleBrowse = (e) => setFiles(Array.from(e.target.files));
  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current.style.borderColor = "#2563eb";
    dropRef.current.style.background = "#e0e7ef";
  };
  const handleDragLeave = (e) => {
    dropRef.current.style.borderColor = "#dbeafe";
    dropRef.current.style.background = "#f9fafb";
  };

  // Personal info handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((v) => ({ ...v, [name]: value }));
  };

  // ---- DEPENDENTS DYNAMIC FIELDS ----
  const addDependent = () =>
    setDependents([...dependents, { first_name: "", last_name: "", ssn: "", relationship: "" }]);
  const updateDependent = (idx, field, value) => {
    const updated = dependents.slice();
    updated[idx][field] = value;
    setDependents(updated);
  };
  const removeDependent = (idx) => {
    setDependents(dependents.filter((_, i) => i !== idx));
  };

  // Show/hide spouse and dependents
  const showSpouse =
    formValues.filing_status === "married_joint" ||
    formValues.filing_status === "qualifying_surviving_spouse";
  const showDependents =
    ["married_joint", "head_of_household", "qualifying_surviving_spouse"].includes(
      formValues.filing_status
    );

  // ---- SUBMIT AND BACKEND ERROR HANDLING ----
  const handleCalculate = async () => {
    setLoading(true);
    setValidationErrors([]); // Clear any previous
    const data = new FormData();
    Object.entries(formValues).forEach(([k, v]) => data.append(k, v));
    data.set("dependents", JSON.stringify(dependents)); // Send dependents array as JSON string
    files.forEach((f) => data.append("files", f));
    try {
      const res = await fetch("https://agent-tax-1.onrender.com/process", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) {
        setValidationErrors(json.fields || [json.error || "Unknown error"]);
        return;
      }
      setResult(json);
      setStep(2); // Show summary
    } catch (err) {
      setValidationErrors(["Failed to calculate tax."]);
    } finally {
      setLoading(false);
    }
  };

  // Per-step content
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: "2.5px dashed #dbeafe",
                background: "#f9fafb",
                borderRadius: 18,
                minHeight: 130,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontSize: 18,
                cursor: "pointer",
                transition: "border-color .2s, background .2s",
              }}
              onClick={() => dropRef.current.querySelector("input").click()}
            >
              <div style={{ fontSize: 42, marginBottom: 10 }}>📄</div>
              Drag & drop PDF(s) here
              <br />
              <span style={{ fontSize: 15, color: "#2563eb" }}>or click to browse</span>
              <input
                type="file"
                accept="application/pdf"
                multiple
                style={{ display: "none" }}
                onChange={handleBrowse}
              />
            </div>
            {files.length > 0 && (
              <div style={{ marginTop: 18, color: "#334155" }}>
                <b>Files:</b>
                <ul style={{ paddingLeft: 24, margin: 0, fontSize: 15 }}>
                  {files.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={files.length === 0}
              style={{
                marginTop: 28,
                padding: "13px 0",
                width: "100%",
                background: files.length ? "#2563eb" : "#cbd5e1",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 18,
                cursor: files.length ? "pointer" : "not-allowed",
                boxShadow: files.length ? "0 2px 8px #dbeafe" : "none",
                transition: "background .2s",
              }}
            >
              Next: Personal Info →
            </button>
          </div>
        );
      case 1:
        return (
          <div>
            {/* ---- Display backend validation errors, if any ---- */}
            {validationErrors.length > 0 && (
              <div style={{ color: "red", marginBottom: 16 }}>
                <b>Please correct:</b> {validationErrors.join(", ")}
              </div>
            )}
            <div style={{ display: "grid", gap: 11 }}>
              <input name="first_name" placeholder="First Name" value={formValues.first_name} onChange={handleChange} required />
              <input name="middle_initial" placeholder="MI" value={formValues.middle_initial} onChange={handleChange} style={{ width: 60 }} />
              <input name="last_name" placeholder="Last Name" value={formValues.last_name} onChange={handleChange} required />
              <input name="ssn" placeholder="SSN" value={formValues.ssn} onChange={handleChange} required />

              {/* ---- SPOUSE DYNAMIC FIELDS ---- */}
              {showSpouse && (
                <>
                  <input name="spouse_first_name" placeholder="Spouse First" value={formValues.spouse_first_name} onChange={handleChange} required={showSpouse} />
                  <input name="spouse_middle_initial" placeholder="Spouse MI" value={formValues.spouse_middle_initial} onChange={handleChange} style={{ width: 60 }} />
                  <input name="spouse_last_name" placeholder="Spouse Last" value={formValues.spouse_last_name} onChange={handleChange} required={showSpouse} />
                  <input name="spouse_ssn" placeholder="Spouse SSN" value={formValues.spouse_ssn} onChange={handleChange} required={showSpouse} />
                </>
              )}

              <input name="address_line1" placeholder="Street Address" value={formValues.address_line1} onChange={handleChange} required />
              <input name="address_apt" placeholder="Apt/Suite" value={formValues.address_apt} onChange={handleChange} />
              <input name="city" placeholder="City" value={formValues.city} onChange={handleChange} required />
              <input name="state" placeholder="State" value={formValues.state} onChange={handleChange} required style={{ width: 60 }} />
              <input name="zip_code" placeholder="ZIP" value={formValues.zip_code} onChange={handleChange} required style={{ width: 80 }} />
              <select name="filing_status" value={formValues.filing_status} onChange={handleChange}>
                <option value="single">Single</option>
                <option value="married_joint">Married Filing Jointly</option>
                <option value="married_separate">Married Filing Separately</option>
                <option value="head_of_household">Head of Household</option>
                <option value="qualifying_surviving_spouse">Qualifying Surviving Spouse</option>
              </select>

              {/* ---- DEPENDENTS DYNAMIC FIELDS ---- */}
              {showDependents && (
                <div style={{ margin: "10px 0" }}>
                  <b>Dependents:</b>
                  {dependents.map((dep, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      <input
                        placeholder="First Name"
                        value={dep.first_name}
                        onChange={e => updateDependent(idx, "first_name", e.target.value)}
                        required
                      />
                      <input
                        placeholder="Last Name"
                        value={dep.last_name}
                        onChange={e => updateDependent(idx, "last_name", e.target.value)}
                        required
                      />
                      <input
                        placeholder="SSN"
                        value={dep.ssn}
                        onChange={e => updateDependent(idx, "ssn", e.target.value)}
                        required
                      />
                      <input
                        placeholder="Relationship"
                        value={dep.relationship}
                        onChange={e => updateDependent(idx, "relationship", e.target.value)}
                        required
                      />
                      <button type="button" onClick={() => removeDependent(idx)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addDependent}>
                    Add Dependent
                  </button>
                </div>
              )}

              {/* hidden field for backend compatibility */}
              <input type="hidden" name="dependents" value="[]" />

              <input name="routing_number" placeholder="Routing #" value={formValues.routing_number} onChange={handleChange} />
              <input name="account_number" placeholder="Account #" value={formValues.account_number} onChange={handleChange} />
              <input name="taxpayer_signature" placeholder="Signature Name" value={formValues.taxpayer_signature} onChange={handleChange} required />
              <input name="signature_date" type="date" value={formValues.signature_date} onChange={handleChange} required />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{
                  background: "#e0e7ef",
                  color: "#2563eb",
                  border: "none",
                  padding: "13px 0",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  width: "48%",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleCalculate}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "13px 0",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 17,
                  width: "48%",
                  cursor: "pointer",
                }}
                disabled={loading}
              >
                {loading ? "Processing…" : "Next: See Summary →"}
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minHeight: 520,
            justifyContent: "center"
          }}>
            <div
              style={{
                margin: "0 auto",
                padding: "2.2rem 2.3rem 1.5rem 2.3rem",
                borderRadius: 22,
                background: "#fff",
                boxShadow: "0 4px 24px rgba(37,99,235,0.08)",
                border: "1.7px solid #e0e7ef",
                maxWidth: 440,
                width: "100%",
                minWidth: 310,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{
                fontWeight: 700,
                fontSize: 27,
                marginBottom: 19,
                color: "#18213b",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}>
                <span role="img" aria-label="doc" style={{ fontSize: 33, marginRight: 5 }}>🧾</span>
                1040 Summary
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.7rem 1.2rem",
                  width: "100%",
                  fontSize: 17,
                  marginBottom: 21,
                }}
              >
                <span style={{ color: "#5c6370" }}>Total Wages</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(result?.summary.total_wages)}</span>
                <span style={{ color: "#5c6370" }}>Interest Income</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(result?.summary.total_interest)}</span>
                <span style={{ color: "#5c6370" }}>Nonemployee Comp</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(result?.summary.total_nonemployee_comp)}</span>
                <span style={{ color: "#5c6370" }}>Gross Income</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(result?.summary.gross_income)}</span>
                <span style={{ color: "#5c6370" }}>Std. Deduction</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(result?.summary.standard_deduction)}</span>
                <span style={{ color: "#5c6370" }}>Taxable Income</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(result?.summary.taxable_income)}</span>
                <span style={{ color: "#5c6370" }}>Tax Liability</span>
                <span style={{ fontWeight: 700, color: "#2563eb", textDecoration: "underline" }}>
                  {formatMoney(result?.summary.tax_liability)}
                </span>
                <span style={{ color: "#5c6370" }}>Total Withheld</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(result?.summary.total_withheld)}</span>
                <span style={{ color: "#13b158", fontWeight: 700 }}>Refund</span>
                <span style={{ color: "#13b158", fontWeight: 700 }}>
                  {formatMoney(result?.summary.refund)}
                </span>
                <span style={{ color: "#e11d48", fontWeight: 700 }}>Amount Due</span>
                <span style={{ color: "#e11d48", fontWeight: 700 }}>
                  {formatMoney(result?.summary.amount_due)}
                </span>
              </div>
              {result?.download_url && (
                <a
                  href={`https://agent-tax-1.onrender.com/{result.download_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    margin: "15px 0 7px 0",
                    padding: "12px 32px",
                    background: "#2563eb",
                    color: "#fff",
                    borderRadius: 11,
                    fontWeight: 700,
                    fontSize: 17,
                    textDecoration: "none",
                    boxShadow: "0 2px 10px #dbeafe"
                  }}
                >
                  Download Filled 1040 PDF
                </a>
              )}
              <button
                style={{
                  marginTop: 15,
                  background: "#e0e7ef",
                  color: "#2563eb",
                  border: "none",
                  borderRadius: 7,
                  fontWeight: 600,
                  fontSize: 16,
                  padding: "11px 0",
                  width: "100%",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setStep(0);
                  setFiles([]);
                  setResult(null);
                  setFormValues({
                    first_name: "",
                    middle_initial: "",
                    last_name: "",
                    ssn: "",
                    spouse_first_name: "",
                    spouse_middle_initial: "",
                    spouse_last_name: "",
                    spouse_ssn: "",
                    address_line1: "",
                    address_apt: "",
                    city: "",
                    state: "",
                    zip_code: "",
                    filing_status: "single",
                    dependents: "[]",
                    routing_number: "",
                    account_number: "",
                    taxpayer_signature: "",
                    signature_date: "",
                  });
                  setDependents([]);
                  setValidationErrors([]);
                }}
              >
                ← Start Over
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        background: "#f5f8fc",
        padding: "28px 30px",
        borderRadius: 22,
        boxShadow: "0 8px 32px #e0e7ef",
        minHeight: 640,
        fontFamily: "Inter, Arial, sans-serif"
      }}
    >
      <Stepper step={step} />
      {renderStep()}
    </div>
  );
}

