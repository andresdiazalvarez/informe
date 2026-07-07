const DB_NAME = "report-uploader-db";
const DB_VERSION = 1;
const STORE_NAME = "reports";
const TEXT_RECORDS_KEY = "report-uploader-text-records";

const state = {
  reports: [],
  textRecords: [],
  selectedFiles: [],
  selectedId: null,
  statusFilter: "todos",
  typeFilter: "todos",
  query: "",
  sort: "recent",
  previewUrl: null,
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  pickFiles: document.querySelector("#pickFiles"),
  dropZone: document.querySelector("#dropZone"),
  reportForm: document.querySelector("#reportForm"),
  reportTitle: document.querySelector("#reportTitle"),
  reportProject: document.querySelector("#reportProject"),
  reportType: document.querySelector("#reportType"),
  reportStatus: document.querySelector("#reportStatus"),
  reportNotes: document.querySelector("#reportNotes"),
  textRecordForm: document.querySelector("#textRecordForm"),
  textRecordTitle: document.querySelector("#textRecordTitle"),
  textRecordBody: document.querySelector("#textRecordBody"),
  textRecordSelect: document.querySelector("#textRecordSelect"),
  textRecordStatus: document.querySelector("#textRecordStatus"),
  textRecordCount: document.querySelector("#textRecordCount"),
  deleteTextRecord: document.querySelector("#deleteTextRecord"),
  selectedFilesLabel: document.querySelector("#selectedFilesLabel"),
  reportsList: document.querySelector("#reportsList"),
  reportCardTemplate: document.querySelector("#reportCardTemplate"),
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  statusFilters: document.querySelectorAll(".status-filter"),
  previewEmpty: document.querySelector("#previewEmpty"),
  previewContent: document.querySelector("#previewContent"),
  exportCsv: document.querySelector("#exportCsv"),
  visibleCount: document.querySelector("#visibleCount"),
  totalReports: document.querySelector("#totalReports"),
  pendingReports: document.querySelector("#pendingReports"),
  monthReports: document.querySelector("#monthReports"),
  countAll: document.querySelector("#countAll"),
  countPending: document.querySelector("#countPending"),
  countReviewed: document.querySelector("#countReviewed"),
  countArchived: document.querySelector("#countArchived"),
};

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("status", "status");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function getAllReports() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveReport(report) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteReport(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function fileExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase().slice(0, 5) : "DOC";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTextRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(TEXT_RECORDS_KEY) || "[]");
    state.textRecords = Array.isArray(records) ? records : [];
  } catch {
    state.textRecords = [];
  }
}

function saveTextRecords() {
  localStorage.setItem(TEXT_RECORDS_KEY, JSON.stringify(state.textRecords));
}

function renderTextRecords(selectedId = "") {
  elements.textRecordSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecciona un texto guardado";
  elements.textRecordSelect.append(placeholder);

  state.textRecords
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, "es"))
    .forEach((record) => {
      const option = document.createElement("option");
      option.value = record.id;
      option.textContent = record.title;
      elements.textRecordSelect.append(option);
    });

  elements.textRecordSelect.value = selectedId;
  elements.textRecordCount.textContent = `${state.textRecords.length} guardado${state.textRecords.length === 1 ? "" : "s"}`;
}

function selectTextRecord(id) {
  const record = state.textRecords.find((item) => item.id === id);
  if (!record) {
    elements.textRecordTitle.value = "";
    elements.textRecordBody.value = "";
    elements.textRecordStatus.textContent = "Sin texto seleccionado";
    return;
  }

  elements.textRecordTitle.value = record.title;
  elements.textRecordBody.value = record.body;
  elements.textRecordStatus.textContent = `Texto cargado: ${record.title}`;
}

function handleTextRecordSubmit(event) {
  event.preventDefault();

  const title = elements.textRecordTitle.value.trim();
  const body = elements.textRecordBody.value.trim();
  if (!title || !body) {
    alert("Escribe un titulo y un texto antes de guardar.");
    return;
  }

  const selectedId = elements.textRecordSelect.value;
  const existingIndex = state.textRecords.findIndex((record) => record.id === selectedId);
  const record = {
    id: existingIndex >= 0 ? selectedId : makeId(),
    title,
    body,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    state.textRecords[existingIndex] = record;
  } else {
    state.textRecords.push(record);
  }

  saveTextRecords();
  renderTextRecords(record.id);
  selectTextRecord(record.id);
}

function deleteSelectedTextRecord() {
  const selectedId = elements.textRecordSelect.value;
  if (!selectedId) {
    alert("Escoge un titulo para eliminarlo.");
    return;
  }

  state.textRecords = state.textRecords.filter((record) => record.id !== selectedId);
  saveTextRecords();
  renderTextRecords();
  selectTextRecord("");
}

function setSelectedFiles(files) {
  state.selectedFiles = Array.from(files);
  if (state.selectedFiles.length === 0) {
    elements.selectedFilesLabel.textContent = "Sin archivos seleccionados";
    return;
  }

  const names = state.selectedFiles.map((file) => file.name).join(", ");
  elements.selectedFilesLabel.textContent = `${state.selectedFiles.length} archivo(s): ${names}`;

  if (!elements.reportTitle.value && state.selectedFiles.length === 1) {
    elements.reportTitle.value = state.selectedFiles[0].name.replace(/\.[^/.]+$/, "");
  }
}

function filteredReports() {
  const query = state.query.trim().toLowerCase();
  const reports = state.reports.filter((report) => {
    const matchesStatus = state.statusFilter === "todos" || report.status === state.statusFilter;
    const matchesType = state.typeFilter === "todos" || report.type === state.typeFilter;
    const haystack = [report.title, report.project, report.notes, report.fileName, report.type, report.status]
      .join(" ")
      .toLowerCase();
    return matchesStatus && matchesType && haystack.includes(query);
  });

  return reports.sort((a, b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title, "es");
    if (state.sort === "project") return a.project.localeCompare(b.project, "es");
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function updateMetrics() {
  const now = new Date();
  const sameMonth = (dateValue) => {
    const date = new Date(dateValue);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const pending = state.reports.filter((report) => report.status === "pendiente").length;
  const reviewed = state.reports.filter((report) => report.status === "revisado").length;
  const archived = state.reports.filter((report) => report.status === "archivado").length;

  elements.totalReports.textContent = state.reports.length;
  elements.pendingReports.textContent = pending;
  elements.monthReports.textContent = state.reports.filter((report) => sameMonth(report.createdAt)).length;
  elements.countAll.textContent = state.reports.length;
  elements.countPending.textContent = pending;
  elements.countReviewed.textContent = reviewed;
  elements.countArchived.textContent = archived;
}

function renderReports() {
  const reports = filteredReports();
  elements.reportsList.replaceChildren();
  elements.visibleCount.textContent = `${reports.length} visible${reports.length === 1 ? "" : "s"}`;

  if (reports.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "No hay informes que coincidan con los filtros actuales.";
    elements.reportsList.append(empty);
    updateMetrics();
    return;
  }

  reports.forEach((report) => {
    const card = elements.reportCardTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("selected", report.id === state.selectedId);
    card.querySelector(".file-badge").textContent = fileExtension(report.fileName);
    card.querySelector(".report-title").textContent = report.title;
    card.querySelector(".report-meta").textContent = `${report.project || "Sin proyecto"} · ${formatDate(report.createdAt)} · ${formatBytes(report.size)}`;
    card.querySelector(".report-type").textContent = report.type;
    const status = card.querySelector(".report-status");
    status.textContent = report.status;
    status.classList.add(`status-${report.status}`);
    card.querySelector(".report-main").addEventListener("click", () => selectReport(report.id));
    elements.reportsList.append(card);
  });

  updateMetrics();
}

function revokePreviewUrl() {
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
  }
}

function renderPreview(report) {
  revokePreviewUrl();
  elements.previewEmpty.classList.add("hidden");
  elements.previewContent.classList.remove("hidden");
  elements.previewContent.replaceChildren();

  const header = document.createElement("div");
  header.className = "preview-header";
  header.innerHTML = `<h3></h3><span></span>`;
  header.querySelector("h3").textContent = report.title;
  header.querySelector("span").textContent = report.fileName;

  const details = document.createElement("dl");
  details.className = "detail-list";
  const detailItems = [
    ["Proyecto", report.project || "Sin proyecto"],
    ["Tipo", report.type],
    ["Estado", report.status],
    ["Fecha", formatDate(report.createdAt)],
    ["Tamaño", formatBytes(report.size)],
    ["Notas", report.notes || "Sin notas"],
  ];
  details.innerHTML = detailItems.map(([label, value]) => `<dt>${label}</dt><dd></dd>`).join("");
  details.querySelectorAll("dd").forEach((dd, index) => {
    dd.textContent = detailItems[index][1];
  });

  const frame = document.createElement("div");
  frame.className = "preview-frame";
  state.previewUrl = URL.createObjectURL(report.blob);

  if (report.mimeType === "application/pdf") {
    const iframe = document.createElement("iframe");
    iframe.title = `Vista previa de ${report.fileName}`;
    iframe.src = state.previewUrl;
    frame.append(iframe);
  } else if (report.mimeType.startsWith("image/")) {
    const img = document.createElement("img");
    img.alt = report.fileName;
    img.src = state.previewUrl;
    frame.append(img);
  } else if (report.mimeType.startsWith("text/") || report.fileName.toLowerCase().endsWith(".csv")) {
    const pre = document.createElement("pre");
    report.blob.text().then((text) => {
      pre.textContent = text.slice(0, 10000);
    });
    frame.append(pre);
  } else {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "Este formato no tiene vista previa en el navegador. Puedes descargarlo para revisarlo.";
    frame.append(empty);
  }

  const actions = document.createElement("div");
  actions.className = "preview-actions";
  const download = document.createElement("a");
  download.className = "download-button";
  download.href = state.previewUrl;
  download.download = report.fileName;
  download.textContent = "Descargar";
  const remove = document.createElement("button");
  remove.className = "danger-button";
  remove.type = "button";
  remove.textContent = "Eliminar";
  remove.addEventListener("click", async () => {
    const confirmed = confirm(`¿Eliminar "${report.title}"?`);
    if (!confirmed) return;
    await deleteReport(report.id);
    state.reports = state.reports.filter((item) => item.id !== report.id);
    state.selectedId = null;
    renderEmptyPreview();
    renderReports();
  });
  actions.append(download, remove);

  elements.previewContent.append(header, details, frame, actions);
}

function renderEmptyPreview() {
  revokePreviewUrl();
  elements.previewContent.classList.add("hidden");
  elements.previewEmpty.classList.remove("hidden");
  elements.previewContent.replaceChildren();
}

function selectReport(id) {
  state.selectedId = id;
  const report = state.reports.find((item) => item.id === id);
  if (report) renderPreview(report);
  renderReports();
}

async function handleSubmit(event) {
  event.preventDefault();

  if (state.selectedFiles.length === 0) {
    alert("Selecciona al menos un archivo para guardar.");
    return;
  }

  const titleBase = elements.reportTitle.value.trim();
  const project = elements.reportProject.value.trim();
  const type = elements.reportType.value;
  const status = elements.reportStatus.value;
  const notes = elements.reportNotes.value.trim();
  const createdAt = new Date().toISOString();

  const reports = state.selectedFiles.map((file, index) => ({
    id: makeId(),
    title: titleBase || file.name.replace(/\.[^/.]+$/, ""),
    project,
    type,
    status,
    notes,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    createdAt,
    blob: file,
    batchIndex: index,
  }));

  await Promise.all(reports.map(saveReport));
  state.reports = [...reports, ...state.reports];
  state.selectedFiles = [];
  elements.fileInput.value = "";
  elements.reportForm.reset();
  setSelectedFiles([]);
  selectReport(reports[0].id);
}

function exportCsv() {
  const reports = filteredReports();
  if (reports.length === 0) {
    alert("No hay informes para exportar.");
    return;
  }

  const headers = ["Titulo", "Proyecto", "Tipo", "Estado", "Archivo", "Tamano", "Fecha", "Notas"];
  const rows = reports.map((report) => [
    report.title,
    report.project,
    report.type,
    report.status,
    report.fileName,
    report.size,
    report.createdAt,
    report.notes,
  ]);

  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `informes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  elements.pickFiles.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", (event) => setSelectedFiles(event.target.files));

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("dragging");
    });
  });

  elements.dropZone.addEventListener("drop", (event) => {
    setSelectedFiles(event.dataTransfer.files);
  });

  elements.reportForm.addEventListener("submit", handleSubmit);
  elements.textRecordForm.addEventListener("submit", handleTextRecordSubmit);
  elements.textRecordSelect.addEventListener("change", (event) => selectTextRecord(event.target.value));
  elements.deleteTextRecord.addEventListener("click", deleteSelectedTextRecord);
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderReports();
  });
  elements.typeFilter.addEventListener("change", (event) => {
    state.typeFilter = event.target.value;
    renderReports();
  });
  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderReports();
  });
  elements.statusFilters.forEach((button) => {
    button.addEventListener("click", () => {
      state.statusFilter = button.dataset.status;
      elements.statusFilters.forEach((item) => item.classList.toggle("active", item === button));
      renderReports();
    });
  });
  elements.exportCsv.addEventListener("click", exportCsv);
}

async function init() {
  bindEvents();
  loadTextRecords();
  renderTextRecords();
  state.reports = await getAllReports();
  renderReports();
}

init().catch((error) => {
  console.error(error);
  alert("No se pudo iniciar la app de informes.");
});
