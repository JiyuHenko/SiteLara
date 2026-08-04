(() => {
  "use strict";

  const config = window.LBFIT_FORM_CONFIG || {};
  const form = document.getElementById("applicationForm");
  const steps = [...document.querySelectorAll(".step")];
  const navigation = document.getElementById("formNavigation");
  const nextButton = document.getElementById("nextButton");
  const submitButton = document.getElementById("submitButton");
  const progressBar = document.getElementById("progressBar");
  const stepCounter = document.getElementById("stepCounter");
  const toast = document.getElementById("toast");
  const formAlert = document.getElementById("formAlert");
  const motivation = document.getElementById("motivation");
  const motivationCount = document.getElementById("motivationCount");
  const receiver = document.getElementById("googleSheetsReceiver");
  const reviewSummary = document.getElementById("reviewSummary");
  const successReference = document.getElementById("successReference");

  const TOTAL_QUESTION_STEPS = 7;
  const STEP_LABELS = {
    0: "Apresentação",
    1: "Etapa 1 de 7",
    2: "Etapa 2 de 7",
    3: "Etapa 3 de 7",
    4: "Etapa 4 de 7",
    5: "Etapa 5 de 7",
    6: "Etapa 6 de 7",
    7: "Etapa 7 de 7",
    8: "Concluído"
  };

  let currentStep = 0;
  let toastTimer;
  let saveTimer;
  let submitTimer;
  let pendingSubmissionId = "";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2100);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function showStep(stepNumber, options = {}) {
    const target = steps.find((step) => Number(step.dataset.step) === stepNumber);
    if (!target) return;

    steps.forEach((step) => {
      const active = step === target;
      step.hidden = !active;
      step.classList.toggle("is-active", active);
    });

    currentStep = stepNumber;
    stepCounter.textContent = STEP_LABELS[stepNumber] || "";

    if (stepNumber === 0) {
      progressBar.style.width = "0%";
      navigation.hidden = true;
    } else if (stepNumber === 8) {
      progressBar.style.width = "100%";
      navigation.hidden = true;
    } else {
      progressBar.style.width = `${Math.min(100, (stepNumber / TOTAL_QUESTION_STEPS) * 100)}%`;
      navigation.hidden = false;
      nextButton.hidden = stepNumber === 7;
      submitButton.hidden = stepNumber !== 7;
      nextButton.querySelector("span").textContent = stepNumber === 6 ? "Revisar e finalizar" : "Continuar";
    }

    if (stepNumber === 7) buildReview();
    if (stepNumber >= 1 && stepNumber <= 7) scheduleDraftSave();

    if (options.scroll !== false) scrollToTop();

    if (options.focus !== false && stepNumber > 0 && stepNumber < 8) {
      const heading = target.querySelector("h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        window.setTimeout(() => heading.focus({ preventScroll: true }), 260);
      }
    }
  }

  function setError(name, message) {
    const error = document.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
    if (error) error.textContent = message;

    const control = form.elements[name];
    if (control && control instanceof HTMLElement) control.classList.add("is-invalid");

    const group = document.querySelector(`[data-group="${CSS.escape(name)}"]`);
    if (group) group.classList.add("is-invalid");

    if (name === "consent") $(".consent-card")?.classList.add("is-invalid");
  }

  function clearError(name) {
    const error = document.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
    if (error) error.textContent = "";

    const control = form.elements[name];
    if (control && control instanceof HTMLElement) control.classList.remove("is-invalid");

    const group = document.querySelector(`[data-group="${CSS.escape(name)}"]`);
    if (group) group.classList.remove("is-invalid");

    if (name === "consent") $(".consent-card")?.classList.remove("is-invalid");
  }

  function clearStepErrors(stepNumber) {
    const step = steps.find((item) => Number(item.dataset.step) === stepNumber);
    if (!step) return;
    $$(".field-error", step).forEach((error) => { error.textContent = ""; });
    $$(".is-invalid", step).forEach((element) => element.classList.remove("is-invalid"));
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function nationalPhoneDigits(value) {
    let valueDigits = digits(value);
    if (valueDigits.startsWith("55") && valueDigits.length > 11) valueDigits = valueDigits.slice(2);
    return valueDigits.slice(0, 11);
  }

  function formatPhoneInput(value) {
    const number = nationalPhoneDigits(value);
    if (!number) return "";
    if (number.length <= 2) return `(${number}`;
    if (number.length <= 6) return `(${number.slice(0, 2)}) ${number.slice(2)}`;
    if (number.length <= 10) return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
    return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
  }

  function formatPhoneForSheet(value) {
    const number = nationalPhoneDigits(value);
    if (number.length === 10) return `+55 ${number.slice(0, 2)} ${number.slice(2, 6)}-${number.slice(6)}`;
    if (number.length === 11) return `+55 ${number.slice(0, 2)} ${number.slice(2, 7)}-${number.slice(7)}`;
    return value.trim();
  }

  function titleCase(value) {
    const particles = new Set(["da", "das", "de", "do", "dos", "e"]);
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR")
      .split(" ")
      .map((part, index) => (index > 0 && particles.has(part)) ? part : part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1))
      .join(" ");
  }

  function normalizeSocialHandle(value, platform) {
    let text = String(value || "").trim();
    if (!text) return "";

    text = text.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    const lower = text.toLowerCase();

    if (platform === "instagram" && lower.includes("instagram.com/")) {
      text = text.split(/instagram\.com\//i)[1] || "";
    }
    if (platform === "tiktok" && lower.includes("tiktok.com/")) {
      text = text.split(/tiktok\.com\//i)[1] || "";
    }

    text = text.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
    if (text.includes("/")) text = text.split("/")[0];
    text = text.replace(/^@+/, "").replace(/\s+/g, "");
    return text ? `@${text}` : "";
  }

  function normalizeGenericProfile(value) {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    if (!text) return "";
    if (/^www\./i.test(text)) return `https://${text}`;
    return text;
  }

  function checkedValue(name) {
    return form.querySelector(`input[name="${CSS.escape(name)}"]:checked`)?.value || "";
  }

  function checkedValues(name) {
    return $$(`input[name="${CSS.escape(name)}"]:checked`, form).map((input) => input.value);
  }

  function isSocialSelected(value) {
    return checkedValues("socialNetworks").includes(value);
  }

  function validateStep(stepNumber) {
    clearStepErrors(stepNumber);
    let valid = true;
    let firstInvalid = null;

    const fail = (name, message, focusTarget) => {
      if (!firstInvalid) firstInvalid = focusTarget || form.elements[name] || document.querySelector(`[data-group="${CSS.escape(name)}"]`);
      setError(name, message);
      valid = false;
    };

    if (stepNumber === 1) {
      const fullName = form.fullName.value.trim();
      const age = Number(form.age.value);
      const city = form.city.value.trim();
      if (fullName.length < 5 || fullName.split(/\s+/).length < 2) fail("fullName", "Informe seu nome completo, com nome e sobrenome.");
      if (!Number.isInteger(age) || age < 13 || age > 99) fail("age", "Informe uma idade válida entre 13 e 99 anos.");
      if (city.length < 2) fail("city", "Informe sua cidade.");
      if (!form.state.value) fail("state", "Selecione o estado onde você mora.");
    }

    if (stepNumber === 2) {
      const phone = nationalPhoneDigits(form.whatsapp.value);
      const email = form.email.value.trim();
      if (![10, 11].includes(phone.length)) fail("whatsapp", "Informe um WhatsApp válido com DDD.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) fail("email", "Informe um e-mail válido.");
    }

    if (stepNumber === 3) {
      const instagram = normalizeSocialHandle(form.instagram.value, "instagram");
      const networks = checkedValues("socialNetworks");
      if (instagram.length < 3) fail("instagram", "Informe um usuário ou link válido do Instagram.");
      if (!networks.length) fail("socialNetworks", "Selecione pelo menos uma opção.", document.querySelector('[data-group="socialNetworks"]'));
      if (networks.includes("TikTok") && normalizeSocialHandle(form.tiktok.value, "tiktok").length < 3) fail("tiktok", "Informe seu @ ou link do TikTok.");
      if (networks.includes("YouTube") && form.youtube.value.trim().length < 3) fail("youtube", "Informe seu @ ou link do YouTube.");
      if (networks.includes("Outra")) {
        if (form.otherNetworkName.value.trim().length < 2) fail("otherNetworkName", "Informe o nome da outra rede.");
        if (form.otherNetworkLink.value.trim().length < 3) fail("otherNetworkLink", "Informe seu @ ou link nessa rede.");
      }
    }

    if (stepNumber === 4) {
      if (!checkedValue("followers")) fail("followers", "Selecione sua faixa de seguidores.", document.querySelector('[data-group="followers"]'));
      if (!checkedValue("contentType")) fail("contentType", "Selecione o tipo de conteúdo que você mais produz.", document.querySelector('[data-group="contentType"]'));
      if (checkedValue("contentType") === "Outro" && form.contentOther.value.trim().length < 2) fail("contentOther", "Descreva qual conteúdo você produz.");
      if (!checkedValue("frequency")) fail("frequency", "Selecione sua frequência de publicação.", document.querySelector('[data-group="frequency"]'));
    }

    if (stepNumber === 5) {
      if (!checkedValue("comfortableVideo")) fail("comfortableVideo", "Selecione uma opção.", document.querySelector('[data-group="comfortableVideo"]'));
      if (!checkedValue("discoveredBy")) fail("discoveredBy", "Conte como conheceu a LB Fit.", document.querySelector('[data-group="discoveredBy"]'));
      if (checkedValue("discoveredBy") === "Outro" && form.discoveredOther.value.trim().length < 2) fail("discoveredOther", "Conte como você conheceu a marca.");
      if (form.motivation.value.trim().length < 25) fail("motivation", "Conte um pouco mais — use pelo menos 25 caracteres.");
    }

    if (stepNumber === 7 && !form.consent.checked) {
      fail("consent", "É necessário concordar com as condições para enviar.", $(".consent-card"));
    }

    if (!valid && firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        if (typeof firstInvalid.focus === "function") firstInvalid.focus({ preventScroll: true });
        else firstInvalid.querySelector?.("input")?.focus({ preventScroll: true });
      }, 260);
    }

    return valid;
  }

  function goNext() {
    if (currentStep === 0) {
      const draft = loadDraft(false);
      const resumeStep = draft?._lastStep && draft._lastStep >= 1 && draft._lastStep <= 5 ? draft._lastStep : 1;
      showStep(resumeStep);
      if (resumeStep > 1) showToast("Seu rascunho foi recuperado 💗");
      return;
    }

    if (!validateStep(currentStep)) return;
    showStep(Math.min(7, currentStep + 1));
  }

  function goBack() {
    if (currentStep <= 1) showStep(0);
    else showStep(currentStep - 1);
  }

  function updateConditionalFields() {
    const selectedNetworks = checkedValues("socialNetworks");
    $("#tiktokFields").hidden = !selectedNetworks.includes("TikTok");
    $("#youtubeFields").hidden = !selectedNetworks.includes("YouTube");
    $("#otherNetworkFields").hidden = !selectedNetworks.includes("Outra");
    $("#contentOtherFields").hidden = checkedValue("contentType") !== "Outro";
    $("#discoveredOtherFields").hidden = checkedValue("discoveredBy") !== "Outro";
  }

  function handleSocialNetworkChoice(event) {
    const changed = event.target;
    if (!(changed instanceof HTMLInputElement) || changed.name !== "socialNetworks") return;

    const group = $$('input[name="socialNetworks"]', form);
    if (changed.dataset.exclusive !== undefined && changed.checked) {
      group.forEach((input) => { if (input !== changed) input.checked = false; });
    } else if (changed.checked) {
      group.find((input) => input.dataset.exclusive !== undefined)?.removeAttribute("checked");
      group.forEach((input) => {
        if (input.dataset.exclusive !== undefined) input.checked = false;
      });
    }

    updateConditionalFields();
    clearError("socialNetworks");
  }

  function normalizeFieldOnBlur(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;

    if (input.name === "fullName" || input.name === "city") input.value = titleCase(input.value);
    if (input.name === "email") input.value = input.value.trim().toLocaleLowerCase("pt-BR");
    if (input.name === "instagram") input.value = normalizeSocialHandle(input.value, "instagram").replace(/^@/, "");
    if (input.name === "tiktok") input.value = normalizeSocialHandle(input.value, "tiktok");
    if (["youtube", "otherNetworkLink"].includes(input.name)) input.value = normalizeGenericProfile(input.value);
    scheduleDraftSave();
  }

  function serializeDraft() {
    const data = { _lastStep: Math.min(5, Math.max(1, currentStep)) };
    $$('input, select, textarea', form).forEach((input) => {
      if (!input.name || input.name === "website" || input.name === "consent") return;
      if (input.type === "checkbox") {
        data[input.name] ||= [];
        if (input.checked) data[input.name].push(input.value);
      } else if (input.type === "radio") {
        if (input.checked) data[input.name] = input.value;
      } else {
        data[input.name] = input.value;
      }
    });
    return data;
  }

  function scheduleDraftSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(config.draftStorageKey || "lbfit-influencer-application-v1", JSON.stringify(serializeDraft()));
      } catch { /* armazenamento indisponível */ }
    }, 260);
  }

  function loadDraft(apply = true) {
    try {
      const raw = localStorage.getItem(config.draftStorageKey || "lbfit-influencer-application-v1");
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!apply) return data;

      $$('input, select, textarea', form).forEach((input) => {
        if (!input.name || !(input.name in data)) return;
        if (input.type === "checkbox") input.checked = Array.isArray(data[input.name]) && data[input.name].includes(input.value);
        else if (input.type === "radio") input.checked = data[input.name] === input.value;
        else input.value = data[input.name] || "";
      });
      updateConditionalFields();
      updateMotivationCount();
      return data;
    } catch {
      return null;
    }
  }

  function clearDraft() {
    try { localStorage.removeItem(config.draftStorageKey || "lbfit-influencer-application-v1"); } catch { /* noop */ }
  }

  function updateMotivationCount() {
    motivationCount.textContent = `${motivation.value.length}/1200`;
  }

  function createReviewGroup(title, step, items) {
    const group = document.createElement("section");
    group.className = "review-group";

    const header = document.createElement("div");
    header.className = "review-group-header";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const edit = document.createElement("button");
    edit.type = "button";
    edit.dataset.goStep = String(step);
    edit.textContent = "Editar";
    header.append(heading, edit);

    const list = document.createElement("div");
    list.className = "review-items";
    items.filter((item) => item.value).forEach((item) => {
      const row = document.createElement("div");
      row.className = "review-item";
      const label = document.createElement("span");
      label.textContent = item.label;
      const value = document.createElement("strong");
      value.textContent = item.value;
      row.append(label, value);
      list.append(row);
    });

    group.append(header, list);
    return group;
  }

  function buildReview() {
    reviewSummary.replaceChildren();
    const networks = checkedValues("socialNetworks");
    const networkDetails = [
      networks.join(", "),
      isSocialSelected("TikTok") ? normalizeSocialHandle(form.tiktok.value, "tiktok") : "",
      isSocialSelected("YouTube") ? normalizeGenericProfile(form.youtube.value) : "",
      isSocialSelected("Outra") ? `${form.otherNetworkName.value.trim()}: ${normalizeGenericProfile(form.otherNetworkLink.value)}` : ""
    ].filter(Boolean).join(" • ");

    reviewSummary.append(
      createReviewGroup("Sobre você", 1, [
        { label: "Nome", value: titleCase(form.fullName.value) },
        { label: "Idade", value: form.age.value ? `${form.age.value} anos` : "" },
        { label: "Cidade", value: `${titleCase(form.city.value)}${form.state.value ? ` / ${form.state.value}` : ""}` }
      ]),
      createReviewGroup("Contato", 2, [
        { label: "WhatsApp", value: formatPhoneForSheet(form.whatsapp.value) },
        { label: "E-mail", value: form.email.value.trim().toLocaleLowerCase("pt-BR") }
      ]),
      createReviewGroup("Redes sociais", 3, [
        { label: "Instagram", value: normalizeSocialHandle(form.instagram.value, "instagram") },
        { label: "Outras redes", value: networkDetails }
      ]),
      createReviewGroup("Conteúdo", 4, [
        { label: "Seguidores", value: checkedValue("followers") },
        { label: "Conteúdo principal", value: checkedValue("contentType") === "Outro" ? form.contentOther.value.trim() : checkedValue("contentType") },
        { label: "Frequência", value: checkedValue("frequency") }
      ]),
      createReviewGroup("Você + LB Fit", 5, [
        { label: "Vídeos com looks", value: checkedValue("comfortableVideo") },
        { label: "Como conheceu", value: checkedValue("discoveredBy") === "Outro" ? form.discoveredOther.value.trim() : checkedValue("discoveredBy") },
        { label: "Por que quer participar", value: form.motivation.value.trim() }
      ])
    );
  }

  function createSubmissionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `LB-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  }

  function collectPayload(submissionId) {
    const params = new URLSearchParams(window.location.search);
    const networks = checkedValues("socialNetworks");

    return {
      submissionId,
      fullName: titleCase(form.fullName.value),
      age: String(Number(form.age.value)),
      city: titleCase(form.city.value),
      state: form.state.value,
      whatsapp: formatPhoneForSheet(form.whatsapp.value),
      email: form.email.value.trim().toLocaleLowerCase("pt-BR"),
      instagram: normalizeSocialHandle(form.instagram.value, "instagram"),
      socialNetworks: networks.join(", "),
      tiktok: networks.includes("TikTok") ? normalizeSocialHandle(form.tiktok.value, "tiktok") : "",
      youtube: networks.includes("YouTube") ? normalizeGenericProfile(form.youtube.value) : "",
      otherNetwork: networks.includes("Outra") ? `${titleCase(form.otherNetworkName.value)} — ${normalizeGenericProfile(form.otherNetworkLink.value)}` : "",
      followers: checkedValue("followers"),
      contentType: checkedValue("contentType"),
      contentOther: checkedValue("contentType") === "Outro" ? form.contentOther.value.trim() : "",
      frequency: checkedValue("frequency"),
      comfortableVideo: checkedValue("comfortableVideo"),
      discoveredBy: checkedValue("discoveredBy"),
      discoveredOther: checkedValue("discoveredBy") === "Outro" ? form.discoveredOther.value.trim() : "",
      motivation: form.motivation.value.trim(),
      consent: form.consent.checked ? "Sim" : "Não",
      origin: "Site Lara Biagioni — Programa de Influenciadoras LB Fit",
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      pageReferrer: document.referrer || "Acesso direto",
      callbackUrl: /^https?:$/.test(window.location.protocol)
        ? new URL("retorno.html", window.location.href).href.split("#")[0].split("?")[0]
        : "",
      website: form.website.value,
      clientTimestamp: new Date().toISOString()
    };
  }

  function isEndpointConfigured() {
    const url = String(config.googleAppsScriptUrl || "").trim();
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(url);
  }

  function showFormAlert(message, success = false) {
    formAlert.textContent = message;
    formAlert.hidden = false;
    formAlert.classList.toggle("success", success);
    formAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearFormAlert() {
    formAlert.hidden = true;
    formAlert.textContent = "";
    formAlert.classList.remove("success");
  }

  function setSubmitting(active) {
    submitButton.disabled = active;
    submitButton.classList.toggle("is-loading", active);
  }

  function postToGoogleSheets(payload) {
    const bridgeForm = document.createElement("form");
    bridgeForm.method = "POST";
    bridgeForm.action = config.googleAppsScriptUrl;
    bridgeForm.target = receiver.name;
    bridgeForm.acceptCharset = "UTF-8";
    bridgeForm.style.display = "none";

    Object.entries(payload).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = String(value ?? "");
      bridgeForm.appendChild(input);
    });

    document.body.appendChild(bridgeForm);
    bridgeForm.submit();
    window.setTimeout(() => bridgeForm.remove(), 1200);
  }

  function handleSubmissionMessage(event) {
    const data = event.data;
    if (!data || data.source !== "lbfit-influencer-form") return;

    const allowedOrigins = config.messageOrigins || [];
    const allowed = event.origin === window.location.origin
      || allowedOrigins.includes(event.origin)
      || event.origin.endsWith(".googleusercontent.com");
    if (!allowed) return;
    if (!pendingSubmissionId || data.submissionId !== pendingSubmissionId) return;

    clearTimeout(submitTimer);
    setSubmitting(false);

    if (data.status === "success") {
      clearDraft();
      clearFormAlert();
      if (data.reference) {
        successReference.textContent = `Protocolo: ${data.reference}`;
        successReference.hidden = false;
      }
      showStep(8);
      form.reset();
      updateConditionalFields();
      pendingSubmissionId = "";
      return;
    }

    pendingSubmissionId = "";
    showFormAlert(data.message || "Não foi possível registrar a inscrição. Confira sua conexão e tente novamente.");
  }

  function validateAllQuestionSteps() {
    for (let step = 1; step <= 5; step += 1) {
      if (!validateStep(step)) {
        showStep(step, { focus: false });
        showToast("Revise a etapa destacada antes de enviar.");
        return false;
      }
    }
    return true;
  }

  function submitApplication(event) {
    event.preventDefault();

    if (currentStep < 7) {
      goNext();
      return;
    }

    clearFormAlert();
    if (!validateAllQuestionSteps()) return;
    if (!validateStep(7)) return;

    if (!isEndpointConfigured()) {
      showFormAlert("A integração com o Google Planilhas ainda não foi configurada. Cole a URL /exec do Apps Script no arquivo influenciadoras/config.js.");
      return;
    }

    pendingSubmissionId = createSubmissionId();
    const payload = collectPayload(pendingSubmissionId);
    setSubmitting(true);
    postToGoogleSheets(payload);

    clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      if (!pendingSubmissionId) return;
      setSubmitting(false);
      pendingSubmissionId = "";
      showFormAlert("O envio pode ter sido registrado, mas o navegador não conseguiu receber a confirmação. Atualize a planilha antes de tentar novamente; o identificador da inscrição evita duplicidade.");
    }, 22000);
  }

  form.addEventListener("submit", submitApplication);
  form.addEventListener("change", (event) => {
    handleSocialNetworkChoice(event);
    updateConditionalFields();
    if (event.target.name) clearError(event.target.name);
    scheduleDraftSave();
  });
  form.addEventListener("input", (event) => {
    if (event.target.name) clearError(event.target.name);
    if (event.target === motivation) updateMotivationCount();
    scheduleDraftSave();
  });
  form.addEventListener("blur", normalizeFieldOnBlur, true);

  form.whatsapp.addEventListener("input", () => {
    form.whatsapp.value = formatPhoneInput(form.whatsapp.value);
  });

  $$('[data-next]').forEach((button) => button.addEventListener("click", goNext));
  $$('[data-back]').forEach((button) => button.addEventListener("click", goBack));

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-go-step]");
    if (!button) return;
    showStep(Number(button.dataset.goStep));
  });

  window.addEventListener("message", handleSubmissionMessage);

  const draft = loadDraft(true);
  if (draft) {
    const introButtonLabel = $(".intro-button span");
    if (introButtonLabel) introButtonLabel.textContent = "Continuar minha inscrição";
  }
  updateConditionalFields();
  updateMotivationCount();
  showStep(0, { scroll: false, focus: false });
})();
