(() => {
  "use strict";

  const data = window.POSTCODE_DATA || {};
  const euro = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
  const decimal = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const moneyNumber = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const storageKey = "thissen-postcodecalculator-settings-v3";
  const vehicleLabels = { truck: "Vrachtwagen", van: "Bestelwagen" };
  const vehicleRates = { truck: 0.55, van: 0.26 };
  const truckProfile = {
    label: "3,5–12 t · Euro VI · CO₂-klasse 1",
    timeFactor: 1.12,
    tollRates: { flanders: 0.101, wallonia: 0.061, brussels: 0.099 },
  };
  const regionLabels = { flanders: "Vlaanderen", wallonia: "Wallonië", brussels: "Brussel" };

  const postcodeInput = document.querySelector("#postcode");
  const postcodeError = document.querySelector("#postcode-error");
  const singleResult = document.querySelector("#single-result");
  const kmRateInput = document.querySelector("#km-rate");
  const hourlyRateInput = document.querySelector("#hourly-rate");
  const batchInput = document.querySelector("#batch-input");
  const batchResults = document.querySelector("#batch-results");
  const batchMessage = document.querySelector("#batch-message");
  const tableWrap = document.querySelector("#table-wrap");
  const downloadButton = document.querySelector("#download-csv");
  let currentPostcode = null;
  let currentRows = [];
  let currentInvalid = [];
  let activeVehicle = "truck";

  const parseNumber = (input) => Math.max(0, Number(String(input.value).replace(",", ".")) || 0);
  const getVehicle = () => document.querySelector('input[name="vehicle"]:checked').value;
  const getTechnicians = () => Number(document.querySelector('input[name="technicians"]:checked').value);
  const getBasis = () => document.querySelector('input[name="basis"]:checked').value;
  const formatKm = (value) => `${decimal.format(value)} km`;

  function formatDuration(minutes) {
    const rounded = Math.max(0, Math.round(minutes));
    if (rounded < 60) return `${rounded} min`;
    const hours = Math.floor(rounded / 60);
    const rest = rounded % 60;
    return rest ? `${hours} u ${rest} min` : `${hours} u`;
  }

  function durationParts(minutes) {
    const rounded = Math.max(0, Math.round(minutes));
    if (rounded < 60) return { value: String(rounded), unit: "min" };
    const hours = Math.floor(rounded / 60);
    const rest = String(rounded % 60).padStart(2, "0");
    return { value: `${hours}:${rest}`, unit: "uur:min" };
  }

  function regionFor(postcode) {
    const value = Number(postcode);
    if (value >= 1000 && value <= 1299) return "brussels";
    if ((value >= 1300 && value <= 1499) || (value >= 4000 && value <= 7999)) return "wallonia";
    return "flanders";
  }

  function zoneFor(distance) {
    if (distance <= 35) return { number: 1, label: "Zone 1", range: "0–35 km" };
    if (distance <= 60) return { number: 2, label: "Zone 2", range: ">35–60 km" };
    if (distance <= 85) return { number: 3, label: "Zone 3", range: ">60–85 km" };
    if (distance <= 110) return { number: 4, label: "Zone 4", range: ">85–110 km" };
    return { number: 5, label: "Zone 5", range: ">110 km" };
  }

  function recordFor(postcode) {
    const row = data[postcode];
    if (!row) return null;
    return {
      postcode,
      place: row[0],
      distance: row[1],
      duration: row[2] ?? Math.round((row[1] / 65) * 60),
    };
  }

  function getConfig() {
    const basis = getBasis();
    const vehicle = getVehicle();
    return {
      basis,
      basisLabel: basis === "return" ? "retour" : "enkele rit",
      multiplier: basis === "return" ? 2 : 1,
      vehicle,
      vehicleLabel: vehicleLabels[vehicle],
      kmRate: parseNumber(kmRateInput),
      hourlyRate: parseNumber(hourlyRateInput),
      technicians: getTechnicians(),
      timeFactor: vehicle === "truck" ? truckProfile.timeFactor : 1,
    };
  }

  function calculateCosts(record) {
    const config = getConfig();
    const distance = record.distance * config.multiplier;
    const duration = record.duration * config.timeFactor * config.multiplier;
    const vehicleCost = distance * config.kmRate;
    const region = regionFor(record.postcode);
    const tollRate = config.vehicle === "truck" ? truckProfile.tollRates[region] : 0;
    const tollCost = distance * tollRate;
    const labourCost = (duration / 60) * config.hourlyRate * config.technicians;
    return {
      config,
      distance,
      duration,
      vehicleCost,
      region,
      tollRate,
      tollCost,
      labourCost,
      total: vehicleCost + tollCost + labourCost,
    };
  }

  function configSummary() {
    const config = getConfig();
    const technicians = `${config.technicians} ${config.technicians === 1 ? "technieker" : "techniekers"}`;
    return `${config.vehicleLabel} · ${technicians} · ${config.basisLabel}`;
  }

  function updateVehicleProfileNote() {
    const note = document.querySelector("#vehicle-profile-note");
    note.textContent = getVehicle() === "truck"
      ? `${truckProfile.label} · rijtijd +12% · Toll Collect/Viapass`
      : "Geen kilometerheffing · standaard rijtijd";
  }

  function showSingle(postcode) {
    const record = recordFor(postcode);
    if (!record) {
      postcodeError.textContent = /^\d{4}$/.test(postcode)
        ? "Deze Belgische postcode staat niet in de gegevenslijst."
        : "Vul een geldige Belgische postcode van vier cijfers in.";
      singleResult.hidden = true;
      currentPostcode = null;
      return;
    }

    postcodeError.textContent = "";
    currentPostcode = postcode;
    const zone = zoneFor(record.distance);
    const cost = calculateCosts(record);
    const duration = durationParts(cost.duration);
    document.querySelector("#result-postcode").textContent = `Postcode ${postcode}`;
    document.querySelector("#result-place").textContent = record.place;
    document.querySelector("#result-zone").textContent = zone.label;
    document.querySelector("#result-zone-range").textContent = zone.range;
    document.querySelector("#result-distance").textContent = decimal.format(record.distance);
    document.querySelector("#result-return").textContent = decimal.format(record.distance * 2);
    document.querySelector("#result-duration").textContent = duration.value;
    document.querySelector("#result-duration-note").textContent = `${duration.unit} · ${cost.config.vehicleLabel.toLowerCase()} · ${cost.config.basisLabel}`;
    document.querySelector("#result-cost").textContent = moneyNumber.format(cost.total);
    document.querySelector("#result-cost-note").textContent = `euro · ${configSummary()}`;
    document.querySelector("#result-vehicle-cost").textContent = euro.format(cost.vehicleCost);
    document.querySelector("#result-toll-cost").textContent = euro.format(cost.tollCost);
    document.querySelector("#result-toll-label").textContent = `Geschatte tolkost ${regionLabels[cost.region]} · ${euro.format(cost.tollRate)}/km`;
    document.querySelector("#result-toll-wrap").hidden = cost.config.vehicle !== "truck";
    document.querySelector("#result-labour-cost").textContent = euro.format(cost.labourCost);
    singleResult.hidden = false;
  }

  function extractPostcodes(value) {
    const tokens = value.split(/[^0-9]+/).filter(Boolean);
    return [...new Set(tokens)];
  }

  function updateBatchMessage() {
    if (!currentRows.length) return;
    const invalidNote = currentInvalid.length ? ` · niet herkend: ${currentInvalid.join(", ")}` : "";
    batchMessage.textContent = `${currentRows.length} ${currentRows.length === 1 ? "postcode" : "postcodes"} · ${configSummary()}${invalidNote}`;
  }

  function renderBatch() {
    batchResults.replaceChildren();

    currentRows.forEach((record) => {
      const zone = zoneFor(record.distance);
      const cost = calculateCosts(record);
      const row = document.createElement("tr");
      const cells = [
        record.postcode,
        record.place,
        zone.label,
        formatKm(record.distance),
        formatKm(record.distance * 2),
        formatDuration(cost.duration),
        euro.format(cost.tollCost),
        euro.format(cost.total),
      ];
      cells.forEach((value, index) => {
        const cell = document.createElement("td");
        if (index >= 3) cell.className = "numeric";
        if (index === 2) {
          const badge = document.createElement("span");
          badge.className = "table-zone";
          badge.textContent = value;
          cell.append(badge);
        } else {
          cell.textContent = value;
        }
        row.append(cell);
      });
      batchResults.append(row);
    });

    tableWrap.hidden = currentRows.length === 0;
    downloadButton.disabled = currentRows.length === 0;
    updateBatchMessage();
  }

  function calculateBatch() {
    const tokens = extractPostcodes(batchInput.value);
    currentRows = [];
    currentInvalid = [];
    tokens.forEach((postcode) => {
      const record = recordFor(postcode);
      if (record) currentRows.push(record);
      else currentInvalid.push(postcode);
    });
    renderBatch();
    if (!tokens.length) batchMessage.textContent = "Voer minstens één postcode in.";
    else if (!currentRows.length) batchMessage.textContent = `Geen geldige postcode gevonden · niet herkend: ${currentInvalid.join(", ")}`;
  }

  function refreshResults() {
    saveSettings();
    if (currentPostcode) showSingle(currentPostcode);
    if (currentRows.length) renderBatch();
  }

  function csvValue(value) {
    return `"${String(value).replaceAll('"', '""')}"`;
  }

  function csvNumber(value, decimals = 2) {
    return Number(value).toFixed(decimals).replace(".", ",");
  }

  function downloadCsv() {
    const config = getConfig();
    const rows = [
      [
        "Postcode", "Gemeente", "Zone", "Zonebereik", "Enkele rit (km)", "Retour (km)",
        "Rijtijd voertuig enkele rit (min)", "Rijtijd voertuig retour (min)", "Kostenbasis", "Voertuig",
        "Techniekers", "Voertuigtarief per km", "Uurloon per technieker", "Voertuigkost",
        "Tolregio", "Toltarief per km", "Geschatte tolkost", "Uurloonkost verplaatsing", "Totale transportkost",
      ],
      ...currentRows.map((record) => {
        const zone = zoneFor(record.distance);
        const cost = calculateCosts(record);
        return [
          record.postcode,
          record.place,
          zone.label,
          zone.range,
          csvNumber(record.distance, 1),
          csvNumber(record.distance * 2, 1),
          csvNumber(record.duration * config.timeFactor, 0),
          csvNumber(record.duration * config.timeFactor * 2, 0),
          config.basisLabel,
          config.vehicleLabel,
          config.technicians,
          csvNumber(config.kmRate),
          csvNumber(config.hourlyRate),
          csvNumber(cost.vehicleCost),
          regionLabels[cost.region],
          csvNumber(cost.tollRate, 3),
          csvNumber(cost.tollCost),
          csvNumber(cost.labourCost),
          csvNumber(cost.total),
        ];
      }),
    ];
    const csv = "\ufeff" + rows.map((row) => row.map(csvValue).join(";")).join("\r\n");
    const objectURL = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = objectURL;
    link.download = `ritten-vanaf-wommelgem-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectURL);
  }

  function saveSettings() {
    vehicleRates[getVehicle()] = parseNumber(kmRateInput);
    const settings = {
      vehicle: getVehicle(),
      vehicleRates,
      hourlyRate: parseNumber(hourlyRateInput),
      technicians: getTechnicians(),
      basis: getBasis(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (_) {
      // The calculator remains fully functional when storage is disabled.
    }
  }

  function restoreSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem(storageKey));
      if (!settings) return;
      if (settings.vehicleRates) {
        vehicleRates.truck = Number(settings.vehicleRates.truck) || vehicleRates.truck;
        vehicleRates.van = Number(settings.vehicleRates.van) || vehicleRates.van;
      }
      const vehicle = settings.vehicle === "van" ? "van" : "truck";
      document.querySelector(`input[name="vehicle"][value="${vehicle}"]`).checked = true;
      document.querySelector(`input[name="technicians"][value="${settings.technicians === 2 ? 2 : 1}"]`).checked = true;
      document.querySelector(`input[name="basis"][value="${settings.basis === "return" ? "return" : "single"}"]`).checked = true;
      hourlyRateInput.value = Number(settings.hourlyRate) || 35;
    } catch (_) {
      // Invalid or blocked storage falls back to the documented defaults.
    }
  }

  restoreSettings();
  activeVehicle = getVehicle();
  kmRateInput.value = vehicleRates[activeVehicle].toFixed(2);
  updateVehicleProfileNote();

  document.querySelector("#single-form").addEventListener("submit", (event) => {
    event.preventDefault();
    showSingle(postcodeInput.value.trim());
  });
  postcodeInput.addEventListener("input", () => {
    postcodeInput.value = postcodeInput.value.replace(/\D/g, "").slice(0, 4);
    postcodeError.textContent = "";
  });
  document.querySelector("#batch-calculate").addEventListener("click", calculateBatch);
  batchInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") calculateBatch();
  });
  kmRateInput.addEventListener("input", refreshResults);
  hourlyRateInput.addEventListener("input", refreshResults);
  document.querySelectorAll('input[name="vehicle"]').forEach((input) => {
    input.addEventListener("change", () => {
      vehicleRates[activeVehicle] = parseNumber(kmRateInput);
      activeVehicle = input.value;
      kmRateInput.value = vehicleRates[activeVehicle].toFixed(2);
      updateVehicleProfileNote();
      refreshResults();
    });
  });
  document.querySelectorAll('input[name="technicians"], input[name="basis"]').forEach((input) => {
    input.addEventListener("change", refreshResults);
  });
  downloadButton.addEventListener("click", downloadCsv);

  postcodeInput.value = "2000";
  showSingle("2000");
  batchInput.value = "2000\n1000\n9000\n3500\n8000";
  calculateBatch();
})();
