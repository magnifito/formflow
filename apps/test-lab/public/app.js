const $ = (id) => document.getElementById(id);

const els = {
  baseUrl: $("baseUrl"),
  submitHash: $("submitHash"),
  apiKey: $("apiKey"),
  loginEmail: $("loginEmail"),
  loginPassword: $("loginPassword"),
  loginBtn: $("loginBtn"),
  logoutBtn: $("logoutBtn"),
  refreshDataBtn: $("refreshDataBtn"),
  authStatus: $("authStatus"),
  apiKeyDisplay: $("apiKeyDisplay"),
  useApiKeyBtn: $("useApiKeyBtn"),
  createApiKeyBtn: $("createApiKeyBtn"),
  orgContextGroup: $("orgContextGroup"),
  orgContextSelect: $("orgContextSelect"),
  formsSelect: $("formsSelect"),
  useFormBtn: $("useFormBtn"),
  copyFormUrlBtn: $("copyFormUrlBtn"),
  dataHint: $("dataHint"),
  submitHashGroup: $("submitHashGroup"),
  apiKeyGroup: $("apiKeyGroup"),
  formatRow: $("formatRow"),
  endpointPreview: $("endpointPreview"),
  originValue: $("originValue"),
  fetchCsrfBtn: $("fetchCsrfBtn"),
  autoCsrf: $("autoCsrf"),
  csrfToken: $("csrfToken"),
  csrfExpiry: $("csrfExpiry"),
  payloadForm: $("payloadForm"),
  useRawJson: $("useRawJson"),
  rawJson: $("rawJson"),
  requestPreview: $("requestPreview"),
  responseLog: $("responseLog"),
  historyList: $("historyList"),
  addCustomField: $("addCustomField"),
  fillSample: $("fillSample"),
  resetBtn: $("resetBtn"),
  includeFileMeta: $("includeFileMeta"),
  includeFileData: $("includeFileData"),
  fileInput: $("fileInput"),
};

const state = {
  csrfToken: "",
  csrfExpiresAt: 0,
  history: [],
  auth: {
    token: "",
    userId: null,
    name: "",
    email: "",
    apiKey: "",
    isSuperAdmin: false,
  },
  organizations: [],
  forms: [],
  orgContextId: null,
};

const storage = {
  get(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  },
  set(key, value) {
    localStorage.setItem(key, value);
  },
};

const setAuthStatus = (message, isGood) => {
  els.authStatus.textContent = message;
  els.authStatus.classList.toggle("good", Boolean(isGood));
};

const clearAuthState = (message) => {
  state.auth = {
    token: "",
    userId: null,
    name: "",
    email: "",
    apiKey: "",
    isSuperAdmin: false,
  };
  state.forms = [];
  state.organizations = [];
  state.orgContextId = null;
  els.apiKeyDisplay.value = "";
  els.formsSelect.innerHTML = "";
  els.orgContextSelect.innerHTML = "";
  els.orgContextGroup.classList.add("hidden");
  els.dataHint.textContent = message || "No data loaded.";
  setAuthStatus(message || "Not logged in.", false);
};

const getAuthHeaders = (extra = {}) => {
  const headers = { ...extra };
  if (state.auth.token) {
    headers.Authorization = `Bearer ${state.auth.token}`;
  }
  if (state.auth.isSuperAdmin && state.orgContextId !== null) {
    headers["X-Organization-Context"] = String(state.orgContextId);
  }
  return headers;
};

const getMode = () => {
  const mode = document.querySelector("input[name='targetMode']:checked");
  return mode ? mode.value : "submit";
};

const setMode = (mode) => {
  document.querySelectorAll("input[name='targetMode']").forEach((input) => {
    input.checked = input.value === mode;
  });
};

const getFormat = () => {
  const format = document.querySelector("input[name='requestFormat']:checked");
  return format ? format.value : "json";
};

const setFormat = (format) => {
  document.querySelectorAll("input[name='requestFormat']").forEach((input) => {
    input.checked = input.value === format;
  });
};

const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/+$/, "");

// Get form API URL (defaults to port 3001, or can derive from dashboard API URL)
const getFormApiUrl = () => {
  const baseUrl = normalizeBaseUrl(els.baseUrl.value.trim());
  if (!baseUrl) return "";
  // If baseUrl is dashboard API (3000), use form API (3001), otherwise use baseUrl as-is
  return baseUrl.replace(/:3000$/, ":3001");
};

const getEndpoint = () => {
  const formApiUrl = getFormApiUrl();
  if (!formApiUrl) return "";

  const mode = getMode();
  if (mode === "apikey") {
    const apiKey = els.apiKey.value.trim();
    return apiKey ? `${formApiUrl}/formflow/${apiKey}` : "";
  }

  const submitHash = els.submitHash.value.trim();
  return submitHash ? `${formApiUrl}/submit/${submitHash}` : "";
};

const updateEndpointPreview = () => {
  const mode = getMode();
  els.submitHashGroup.classList.toggle("hidden", mode !== "submit");
  els.apiKeyGroup.classList.toggle("hidden", mode !== "apikey");
  els.endpointPreview.textContent = getEndpoint() || "-";
  els.fetchCsrfBtn.disabled = mode !== "submit";
  els.autoCsrf.disabled = mode !== "submit";
  if (mode === "submit") {
    setFormat("json");
    els.formatRow.classList.add("hidden");
  } else {
    els.formatRow.classList.remove("hidden");
  }
};

const formatExpiry = (timestamp) => {
  if (!timestamp) return "No token yet.";
  const remaining = Math.max(0, timestamp - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `Expires in ${minutes}m ${seconds}s`;
};

const setCsrfToken = (token, expiresInSeconds) => {
  state.csrfToken = token;
  state.csrfExpiresAt = Date.now() + expiresInSeconds * 1000;
  els.csrfToken.value = token;
  els.csrfExpiry.textContent = formatExpiry(state.csrfExpiresAt);
};

const clearCsrfToken = (message) => {
  state.csrfToken = "";
  state.csrfExpiresAt = 0;
  els.csrfToken.value = "";
  els.csrfExpiry.textContent = message || "No token yet.";
};

const renderForms = () => {
  els.formsSelect.innerHTML = "";
  if (!state.forms.length) {
    const option = document.createElement("option");
    option.textContent = "No forms found";
    option.disabled = true;
    option.selected = true;
    els.formsSelect.appendChild(option);
    return;
  }

  state.forms.forEach((form) => {
    const option = document.createElement("option");
    option.value = String(form.id);
    option.textContent = `${form.name} (${form.submitHash.slice(0, 8)}...)`;
    option.dataset.submitHash = form.submitHash;
    els.formsSelect.appendChild(option);
  });
};

const renderOrganizations = () => {
  els.orgContextSelect.innerHTML = "";
  if (!state.auth.isSuperAdmin) {
    els.orgContextGroup.classList.add("hidden");
    return;
  }

  els.orgContextGroup.classList.remove("hidden");
  const personalOption = document.createElement("option");
  personalOption.value = "";
  personalOption.textContent = "Personal (no org)";
  els.orgContextSelect.appendChild(personalOption);

  state.organizations.forEach((org) => {
    const option = document.createElement("option");
    option.value = String(org.id);
    option.textContent = org.name;
    els.orgContextSelect.appendChild(option);
  });

  const selectedValue = state.orgContextId === null ? "" : String(state.orgContextId);
  els.orgContextSelect.value = selectedValue;
  state.orgContextId = els.orgContextSelect.value === ""
    ? null
    : Number.parseInt(els.orgContextSelect.value, 10);
};

const updateDataHint = () => {
  const formCount = state.forms.length;
  const apiKey = state.auth.apiKey ? "API key loaded" : "No API key";
  els.dataHint.textContent = `Forms: ${formCount} | ${apiKey}`;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = text;
  }
  return { response, data };
};

const loadUserProfile = async () => {
  if (!state.auth.token || !state.auth.userId) return false;
  const baseUrl = normalizeBaseUrl(els.baseUrl.value.trim());
  if (!baseUrl) return false;

  const { response, data } = await fetchJson(`${baseUrl}/api/user/${state.auth.userId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    logResponse({ error: "Failed to load user.", status: response.status, response: data });
    return false;
  }

  state.auth.email = data.email || state.auth.email;
  state.auth.name = data.name || state.auth.name;
  state.auth.apiKey = data.apiKey || "";
  state.auth.isSuperAdmin = Boolean(data.isSuperAdmin);
  if (!state.auth.isSuperAdmin) {
    state.orgContextId = null;
    els.orgContextGroup.classList.add("hidden");
  }

  els.apiKeyDisplay.value = state.auth.apiKey || "";
  if (!els.apiKey.value && state.auth.apiKey) {
    els.apiKey.value = state.auth.apiKey;
  }
  setAuthStatus(
    `Logged in as ${state.auth.name || state.auth.email || "user"}.`,
    true
  );
  persistConfig();
  return true;
};

const loadOrganizations = async () => {
  if (!state.auth.isSuperAdmin) return;
  const baseUrl = normalizeBaseUrl(els.baseUrl.value.trim());
  if (!baseUrl) return;

  const { response, data } = await fetchJson(`${baseUrl}/admin/organizations?limit=200`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    logResponse({ error: "Failed to load organizations.", status: response.status, response: data });
    return;
  }

  state.organizations = Array.isArray(data.data) ? data.data : [];
  renderOrganizations();
};

const loadForms = async () => {
  if (!state.auth.token) return;
  const baseUrl = normalizeBaseUrl(els.baseUrl.value.trim());
  if (!baseUrl) return;

  const headers = getAuthHeaders();
  const { response, data } = await fetchJson(`${baseUrl}/org/forms`, { headers });
  if (!response.ok) {
    logResponse({ error: "Failed to load forms.", status: response.status, response: data });
    return;
  }

  state.forms = Array.isArray(data) ? data : [];
  renderForms();
  if (!els.submitHash.value && state.forms.length) {
    els.submitHash.value = state.forms[0].submitHash;
    updateEndpointPreview();
  }
  updateDataHint();
};

const login = async () => {
  const baseUrl = normalizeBaseUrl(els.baseUrl.value.trim());
  if (!baseUrl) {
    logResponse({ error: "Base URL is required for login." });
    return;
  }

  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value;
  if (!email || !password) {
    logResponse({ error: "Email and password are required." });
    return;
  }

  const { response, data } = await fetchJson(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    logResponse({ error: "Login failed.", status: response.status, response: data });
    setAuthStatus("Login failed.", false);
    return;
  }

  state.auth.token = data.token;
  state.auth.userId = data.userId;
  state.auth.name = data.name || "";
  state.auth.email = data.email || email;

  persistConfig();
  await loadUserProfile();
  await loadOrganizations();
  await loadForms();
  updateDataHint();
  persistConfig();
};

const logout = () => {
  storage.set("lab.authToken", "");
  storage.set("lab.userId", "");
  storage.set("lab.isSuperAdmin", "false");
  storage.set("lab.apiKey", "");
  storage.set("lab.orgContextId", "");
  clearAuthState("Logged out.");
};

const refreshData = async () => {
  if (!state.auth.token) {
    logResponse({ error: "Login required to refresh data." });
    return;
  }
  await loadUserProfile();
  await loadOrganizations();
  await loadForms();
  updateDataHint();
};

const createApiKey = async () => {
  if (!state.auth.token || !state.auth.userId) {
    logResponse({ error: "Login required to generate API key." });
    return;
  }
  const baseUrl = normalizeBaseUrl(els.baseUrl.value.trim());
  if (!baseUrl) return;

  const { response, data } = await fetchJson(`${baseUrl}/create-api-key/${state.auth.userId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    logResponse({ error: "Failed to create API key.", status: response.status, response: data });
    return;
  }

  state.auth.apiKey = data.apiKey || "";
  els.apiKeyDisplay.value = state.auth.apiKey;
  persistConfig();
  updateDataHint();
};

const useApiKey = () => {
  if (!state.auth.apiKey) {
    logResponse({ error: "No API key loaded." });
    return;
  }
  els.apiKey.value = state.auth.apiKey;
  setMode("apikey");
  updateEndpointPreview();
  persistConfig();
};

const useSelectedForm = () => {
  const selected = els.formsSelect.options[els.formsSelect.selectedIndex];
  const submitHash = selected ? selected.dataset.submitHash : "";
  if (!submitHash) {
    logResponse({ error: "Select a form first." });
    return;
  }
  els.submitHash.value = submitHash;
  setMode("submit");
  updateEndpointPreview();
  persistConfig();
};

const copySelectedFormUrl = async () => {
  const formApiUrl = getFormApiUrl();
  if (!formApiUrl) {
    logResponse({ error: "Form API URL is required." });
    return;
  }
  const selected = els.formsSelect.options[els.formsSelect.selectedIndex];
  const submitHash = selected ? selected.dataset.submitHash : els.submitHash.value.trim();
  if (!submitHash) {
    logResponse({ error: "No submit hash available." });
    return;
  }
  const url = `${formApiUrl}/submit/${submitHash}`;
  await navigator.clipboard.writeText(url);
  logResponse({ status: "Copied submit URL.", url });
};

const fetchCsrfToken = async () => {
  const formApiUrl = getFormApiUrl();
  const submitHash = els.submitHash.value.trim();
  if (!formApiUrl || !submitHash) {
    logResponse({ error: "Form API URL and submit hash are required for CSRF." });
    return false;
  }

  try {
    const response = await fetch(`${formApiUrl}/submit/${submitHash}/csrf`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      clearCsrfToken("Token request failed.");
      logResponse({
        error: "Failed to fetch CSRF token.",
        status: response.status,
        response: data,
      });
      return false;
    }

    setCsrfToken(data.token || "", data.expiresInSeconds || 0);
    return true;
  } catch (error) {
    clearCsrfToken("Token request failed.");
    logResponse({ error: "Failed to fetch CSRF token.", detail: error.message });
    return false;
  }
};

const getCheckedValues = (name) =>
  Array.from(document.querySelectorAll(`input[name='${name}']:checked`)).map(
    (input) => input.value
  );

const getRadioValue = (name) => {
  const selected = document.querySelector(`input[name='${name}']:checked`);
  return selected ? selected.value : undefined;
};

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const compact = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => compact(item))
      .filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === "object") {
    const result = {};
    Object.entries(value).forEach(([key, val]) => {
      const cleaned = compact(val);
      if (cleaned !== undefined) result[key] = cleaned;
    });
    return Object.keys(result).length ? result : undefined;
  }
  return value;
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });

const buildPayload = async (format) => {
  const tags = $("tags").value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const interests = getCheckedValues("interests");

  const rawPayload = {
    fullName: $("fullName").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    company: $("company").value.trim(),
    jobTitle: $("jobTitle").value.trim(),
    website: $("website").value.trim(),
    preferredContact: getRadioValue("preferredContact"),
    priority: $("priority").value,
    interests,
    tags,
    colorPreference: $("colorPreference").value,
    subscribeNewsletter: $("subscribeNewsletter").checked,
    budgetUsd: toNumber($("budgetUsd").value),
    teamSize: toNumber($("teamSize").value),
    rating: toNumber($("rating").value),
    satisfaction: toNumber($("satisfaction").value),
    startDate: $("startDate").value,
    meetingTime: $("meetingTime").value,
    meetingAt: $("meetingAt").value,
    message: $("message").value.trim(),
    address: {
      line1: $("addressLine1").value.trim(),
      line2: $("addressLine2").value.trim(),
      city: $("city").value.trim(),
      state: $("state").value.trim(),
      postalCode: $("postalCode").value.trim(),
      country: $("country").value.trim(),
    },
    metadata: {
      utmSource: $("utmSource").value.trim(),
      utmCampaign: $("utmCampaign").value.trim(),
      source: "lab",
    },
  };

  const file = els.fileInput.files[0];
  if (file && format === "json" && els.includeFileMeta.checked) {
    const filePayload = {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    };
    if (els.includeFileData.checked) {
      filePayload.base64 = await readFileAsBase64(file);
    }
    rawPayload.file = filePayload;
  }

  if (file && format === "multipart" && els.includeFileMeta.checked) {
    rawPayload.fileMeta = {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    };
  }

  if (file && format === "multipart" && els.includeFileData.checked) {
    rawPayload.fileBase64 = await readFileAsBase64(file);
  }

  document.querySelectorAll(".custom-field-row").forEach((row) => {
    const key = row.querySelector(".custom-key").value.trim();
    const type = row.querySelector(".custom-type").value;
    const value = row.querySelector(".custom-value").value.trim();
    if (!key || value === "") return;

    let parsedValue = value;
    if (type === "number") {
      parsedValue = toNumber(value);
    } else if (type === "boolean") {
      parsedValue = value.toLowerCase() === "true";
    } else if (type === "json") {
      try {
        parsedValue = JSON.parse(value);
      } catch (error) {
        throw new Error(`Invalid JSON for custom field "${key}"`);
      }
    }

    rawPayload[key] = parsedValue;
  });

  return compact(rawPayload) || {};
};

const appendFormData = (formData, data) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value instanceof Blob) {
      formData.append(key, value);
      return;
    }
    if (typeof value === "object" && value !== null) {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  });
};

const logResponse = (payload) => {
  els.responseLog.textContent = JSON.stringify(payload, null, 2);
};

const addHistoryItem = (entry) => {
  state.history.unshift(entry);
  state.history = state.history.slice(0, 12);
  els.historyList.innerHTML = "";
  state.history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<span>${item.time}</span><strong>${item.status}</strong><span>${item.endpoint}</span>`;
    els.historyList.appendChild(div);
  });
};

const updateRequestPreview = (endpoint, headers, payload, note) => {
  const preview = {
    method: "POST",
    endpoint,
    headers,
    payload,
    note,
  };
  els.requestPreview.textContent = JSON.stringify(preview, null, 2);
};

const handleSubmit = async () => {
  const endpoint = getEndpoint();
  if (!endpoint) {
    logResponse({ error: "Please provide a valid endpoint target." });
    return;
  }

  const mode = getMode();
  const format = mode === "submit" ? "json" : getFormat();
  let payload = {};
  try {
    if (els.useRawJson.checked) {
      payload = JSON.parse(els.rawJson.value || "{}");
    } else {
      payload = await buildPayload(format);
    }
  } catch (error) {
    logResponse({ error: error.message });
    return;
  }

  const headers = {};
  let note = "";
  let body;

  if (format === "json") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload);
  } else {
    const formData = new FormData();
    appendFormData(formData, payload);
    const file = els.fileInput.files[0];
    if (file) {
      formData.append("file", file, file.name);
      note = note ? `${note} | file: ${file.name}` : `file: ${file.name}`;
    }
    body = formData;
  }

  if (mode === "submit") {
    if (els.autoCsrf.checked && (!state.csrfToken || state.csrfExpiresAt < Date.now())) {
      await fetchCsrfToken();
    }
    if (state.csrfToken && state.csrfExpiresAt > Date.now()) {
      headers["X-CSRF-Token"] = state.csrfToken;
    } else {
      note = "No CSRF token attached.";
    }
  }

  const previewNote = note ? `${note} | format: ${format}` : `format: ${format}`;
  updateRequestPreview(endpoint, { ...headers }, payload, previewNote);

  const startedAt = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    });

    const text = await response.text();
    let parsed = text;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      parsed = text || null;
    }

    const result = {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      response: parsed,
    };
    logResponse(result);
    addHistoryItem({
      time: new Date().toLocaleTimeString(),
      status: `${response.status} ${response.ok ? "OK" : "ERR"}`,
      endpoint,
    });
  } catch (error) {
    logResponse({ error: "Request failed.", detail: error.message });
    addHistoryItem({
      time: new Date().toLocaleTimeString(),
      status: "NETWORK ERR",
      endpoint,
    });
  }
};

const addCustomFieldRow = () => {
  const row = document.createElement("div");
  row.className = "custom-field-row";
  row.innerHTML = `
    <input class="custom-key" type="text" placeholder="fieldName" />
    <select class="custom-type">
      <option value="string">string</option>
      <option value="number">number</option>
      <option value="boolean">boolean</option>
      <option value="json">json</option>
    </select>
    <input class="custom-value" type="text" placeholder="value" />
    <button type="button" title="Remove">Remove</button>
  `;
  row.querySelector("button").addEventListener("click", () => row.remove());
  $("customFields").appendChild(row);
};

const fillSampleData = () => {
  $("fullName").value = "Jamie Rivera";
  $("email").value = "jamie.rivera@example.com";
  $("phone").value = "+1-415-555-0199";
  $("company").value = "Acme Labs";
  $("jobTitle").value = "Senior Product Designer";
  $("website").value = "https://example.com";
  $("priority").value = "high";
  $("tags").value = "enterprise, security, integrations";
  $("budgetUsd").value = "12500.75";
  $("teamSize").value = "42";
  $("rating").value = "4.7";
  $("message").value = "Testing integrations with a rich payload.";
  $("addressLine1").value = "123 Market St";
  $("city").value = "San Francisco";
  $("state").value = "CA";
  $("postalCode").value = "94105";
  $("country").value = "US";
  $("utmSource").value = "lab";
  $("utmCampaign").value = "integration-test";
  document.querySelector("input[name='preferredContact'][value='email']").checked = true;
  document.querySelectorAll("input[name='interests']").forEach((input) => {
    input.checked = ["email", "webhooks", "slack"].includes(input.value);
  });
  $("subscribeNewsletter").checked = true;
};

const resetForm = () => {
  els.payloadForm.reset();
  els.rawJson.value = "";
  $("customFields").innerHTML = "";
  clearCsrfToken("No token yet.");
  logResponse({ status: "Form cleared." });
};

const persistConfig = () => {
  storage.set("lab.baseUrl", els.baseUrl.value);
  storage.set("lab.submitHash", els.submitHash.value);
  storage.set("lab.apiKey", els.apiKey.value);
  storage.set("lab.mode", getMode());
  storage.set("lab.format", getFormat());
  storage.set("lab.autoCsrf", String(els.autoCsrf.checked));
  storage.set("lab.useRawJson", String(els.useRawJson.checked));
  storage.set("lab.authToken", state.auth.token || "");
  storage.set("lab.userId", state.auth.userId ? String(state.auth.userId) : "");
  storage.set("lab.userName", state.auth.name || "");
  storage.set("lab.userEmail", state.auth.email || "");
  storage.set("lab.isSuperAdmin", String(state.auth.isSuperAdmin));
  storage.set("lab.apiKeyDisplay", state.auth.apiKey || "");
  storage.set("lab.orgContextId", state.orgContextId === null ? "" : String(state.orgContextId));
};

const restoreConfig = () => {
  els.baseUrl.value = storage.get("lab.baseUrl", "http://localhost:3000");
  els.submitHash.value = storage.get(
    "lab.submitHash",
    "173bf09b-ac2a-49cc-85c7-8af95f8c2281"
  );
  els.apiKey.value = storage.get("lab.apiKey", "");
  setMode(storage.get("lab.mode", "submit"));
  setFormat(storage.get("lab.format", "json"));
  els.autoCsrf.checked = storage.get("lab.autoCsrf", "true") === "true";
  els.useRawJson.checked = storage.get("lab.useRawJson", "false") === "true";

  state.auth.token = storage.get("lab.authToken", "");
  const storedUserId = storage.get("lab.userId", "");
  state.auth.userId = storedUserId ? Number.parseInt(storedUserId, 10) : null;
  state.auth.name = storage.get("lab.userName", "");
  state.auth.email = storage.get("lab.userEmail", "");
  state.auth.isSuperAdmin = storage.get("lab.isSuperAdmin", "false") === "true";
  state.auth.apiKey = storage.get("lab.apiKeyDisplay", "");
  const storedOrgContext = storage.get("lab.orgContextId", "");
  state.orgContextId = storedOrgContext === "" ? null : Number.parseInt(storedOrgContext, 10);
  els.apiKeyDisplay.value = state.auth.apiKey || "";
};

const init = () => {
  els.originValue.textContent = window.location.origin;
  restoreConfig();
  updateEndpointPreview();
  logResponse({ status: "Ready." });

  if (state.auth.token && state.auth.userId) {
    setAuthStatus(`Restoring session for ${state.auth.email || "user"}...`, true);
    refreshData();
  } else {
    clearAuthState("Not logged in.");
  }

  document.querySelectorAll("input[name='targetMode']").forEach((input) => {
    input.addEventListener("change", () => {
      updateEndpointPreview();
      persistConfig();
    });
  });

  document.querySelectorAll("input[name='requestFormat']").forEach((input) => {
    input.addEventListener("change", () => {
      updateEndpointPreview();
      persistConfig();
    });
  });

  [els.baseUrl, els.submitHash, els.apiKey].forEach((input) => {
    input.addEventListener("input", () => {
      updateEndpointPreview();
      persistConfig();
    });
  });

  els.loginBtn.addEventListener("click", login);
  els.logoutBtn.addEventListener("click", logout);
  els.refreshDataBtn.addEventListener("click", refreshData);
  els.useApiKeyBtn.addEventListener("click", useApiKey);
  els.createApiKeyBtn.addEventListener("click", createApiKey);
  els.useFormBtn.addEventListener("click", useSelectedForm);
  els.copyFormUrlBtn.addEventListener("click", copySelectedFormUrl);
  els.orgContextSelect.addEventListener("change", async () => {
    const value = els.orgContextSelect.value;
    state.orgContextId = value === "" ? null : Number.parseInt(value, 10);
    persistConfig();
    await loadForms();
  });

  els.autoCsrf.addEventListener("change", persistConfig);
  els.useRawJson.addEventListener("change", persistConfig);

  els.fetchCsrfBtn.addEventListener("click", async () => {
    await fetchCsrfToken();
  });

  els.payloadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleSubmit();
  });

  els.addCustomField.addEventListener("click", addCustomFieldRow);
  els.fillSample.addEventListener("click", fillSampleData);
  els.resetBtn.addEventListener("click", resetForm);
};

init();
