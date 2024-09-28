let ws; // Deklariere ws für den WebSocket-Client im globalen Gültigkeitsbereich
let reconnectInterval = 100; // Zeit in Millisekunden für den erneuten Verbindungsaufbau
let messageQueue = []; // Warteschlange für Nachrichten, bis der WebSocket geöffnet ist

document.addEventListener("DOMContentLoaded", () => {
    const connectWebSocket = () => {
        ws = new WebSocket(`ws://${window.location.host}`);

        ws.onopen = () => {
            console.log("WebSocket connection opened");
            document.getElementById("status").innerText = "Connected";

            // Sende alle wartenden Nachrichten
            while (messageQueue.length > 0) {
                const message = messageQueue.shift();
                console.log("Sending queued message:", message);
                ws.send(message);
            }
        };

        ws.onmessage = (event) => {
            try {
                const { type, data } = JSON.parse(event.data);
                console.log("Data received from WebSocket:", { type, data });

                if (type === 'OEEData') {
                    console.log("Received chart data:", data);
                    updateTimelineChart(timelineChart, data);
                } else if (type === 'oeeData') {
                    console.log("Received process data:", data);
                    updateProcessData(data.processData);
                    updateGauge(oeeGauge, data.oee, 'oeeValue');
                    updateGauge(availabilityGauge, data.availability, 'availabilityValue');
                    updateGauge(performanceGauge, data.performance, 'performanceValue');
                    updateGauge(qualityGauge, data.quality, 'qualityValue');
                    updateOEELevel(data.level); // Update OEE Level
                } else if (type === 'Microstops') {
                    if (Array.isArray(data)) {
                        console.log("Received machine data:", data);
                        updateInterruptionTable(data);
                    } else {
                        console.error("Received machine data is not an array");
                    }
                } else if (type === 'ratingsData') {
                    console.log("Received ratings data:", data);
                    updateRatings(data);
                } else {
                    console.error("Invalid data received from WebSocket:", { type, data });
                }
            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        };

        ws.onclose = (event) => {
            console.log("WebSocket connection closed. Code:", event.code, "Reason:", event.reason);
            document.getElementById("status").innerText = "Disconnected";
            setTimeout(connectWebSocket, reconnectInterval); // Erneuten Verbindungsaufbau nach einem Intervall versuchen
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error: ${error.message}`);
            document.getElementById("status").innerText = "Error";
        };
    };

    connectWebSocket();

    // Initialisiere andere Komponenten
    const oeeGauge = initGauge('oeeGauge', 'OEE');
    const availabilityGauge = initGauge('availabilityGauge', 'Availability');
    const performanceGauge = initGauge('performanceGauge', 'Performance');
    const qualityGauge = initGauge('qualityGauge', 'Quality');
    const timelineChart = initTimelineChart('timelineChart');

    document.getElementById("timeZone").addEventListener("change", (event) => {
        updateTimeZone(event.target.value);
        updateCurrentTime();
        const processData = getCurrentProcessData();
        if (processData) {
            updateProcessData(processData);
        }
        const Microstops = getCurrentMicrostops();
        if (Microstops) {
            updateInterruptionTable(Microstops);
        }
    });

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000); // Aktualisiere die aktuelle Zeit jede Sekunde

    const accordion = document.querySelector('.accordion');
    const panel = document.querySelector('.panel');

    accordion.addEventListener('click', function() {
        this.classList.toggle('active');
        if (panel.style.display === 'block') {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'block';
        }
    });

    fetch('/ratings')
        .then(response => response.json())
        .then(ratings => updateRatings(ratings))
        .catch(error => console.error('Error fetching ratings:', error));
});

let currentProcessData = null; // Speichere die aktuellen Prozessdaten
let currentMicrostops = null; // Speichere die aktuellen Maschinendaten
let currentOEEData = null; // Speichere die aktuellen Diagrammdaten

function updateProcessData(processData) {
    currentProcessData = processData; // Speichere die Daten für zukünftige Verwendungen
    const timeZone = document.getElementById("timeZone").value;

    document.getElementById("orderNumber").innerText = processData.ProcessOrderNumber;
    document.getElementById("materialNumber").innerText = processData.MaterialNumber;
    document.getElementById("materialDescription").innerText = processData.MaterialDescription;
    document.getElementById("startTime").innerText = moment.tz(processData.StartTime, "UTC").tz(timeZone).format("YYYY-MM-DD HH:mm:ss");
    document.getElementById("endTime").innerText = moment.tz(processData.EndTime, "UTC").tz(timeZone).format("YYYY-MM-DD HH:mm:ss");
    document.getElementById("plannedQuantity").innerText = processData.plannedProductionQuantity;
    document.getElementById("plannedDowntime").innerText = processData.plannedDowntime;
    document.getElementById("unplannedDowntime").innerText = processData.unplannedDowntime;
    document.getElementById("lineCode").innerText = processData.lineCode || 'N/A';
}

function getCurrentProcessData() {
    return currentProcessData;
}

function getCurrentMicrostops() {
    return currentMicrostops;
}

function initGauge(elementId, label) {
    const opts = {
        angle: 0.15,
        lineWidth: 0.2,
        radiusScale: 0.7,
        pointer: {
            length: 0.6,
            strokeWidth: 0.035,
            color: '#000000'
        },
        staticLabels: {
            font: "10px sans-serif",
            labels: [0, 50, 70, 100],
            color: "#ffffff",
            fractionDigits: 0
        },
        staticZones: [
            { strokeStyle: "#F03E3E", min: 0, max: 50 },
            { strokeStyle: "#FFDD00", min: 50, max: 70 },
            { strokeStyle: "#30B32D", min: 70, max: 100 }
        ],
        limitMax: false,
        limitMin: false,
        highDpiSupport: true
    };

    const target = document.getElementById(elementId);
    const gauge = new Gauge(target).setOptions(opts);
    gauge.maxValue = 100;
    gauge.setMinValue(0);
    gauge.animationSpeed = 32;

    return gauge;
}

function updateGauge(gauge, value, valueElementId) {
    gauge.set(value);
    const valueElement = document.getElementById(valueElementId);
    if (valueElement) {
        valueElement.innerText = value + '%';
    } else {
        console.error(`Element mit ID ${valueElementId} nicht gefunden`);
    }
}

function updateOEELevel(level) {
    const oeeLevelElement = document.getElementById("oeeLevelValue");
    if (oeeLevelElement) {
        oeeLevelElement.innerText = level;
    } else {
        console.error("Element mit ID oeeLevelValue nicht gefunden");
    }
}

function initTimelineChart(elementId) {
    return new Chart(document.getElementById(elementId), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                { label: 'Production', data: [], backgroundColor: 'green' },
                { label: 'Break', data: [], backgroundColor: 'blue' },
                { label: 'Unplanned Downtime', data: [], backgroundColor: 'red' },
                { label: 'Planned Downtime', data: [], backgroundColor: 'orange' }
            ]
        },
        options: {
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Duration (minutes)'
                    }
                }
            }
        }
    });
}

function updateTimelineChart(chart, data) {
    currentOEEData = data; // Speichere die Daten für zukünftige Verwendungen
    const timeZone = document.getElementById("timeZone").value;

    if (data.labels && data.datasets) {
        chart.data.labels = data.labels.map(label => {
            const utcTime = moment.utc(label);
            const localTime = utcTime.clone().tz(timeZone);
            return localTime.format("HH:mm") + " - " + localTime.clone().add(1, 'hour').format("HH:mm");
        });
        chart.data.datasets[0].data = data.datasets[0].data.map(Math.round); // Runde auf die nächste Minute
        chart.data.datasets[1].data = data.datasets[1].data.map(Math.round); // Runde auf die nächste Minute
        chart.data.datasets[2].data = data.datasets[2].data.map(Math.round); // Runde auf die nächste Minute
        chart.data.datasets[3].data = data.datasets[3].data.map(Math.round); // Runde auf die nächste Minute
        chart.update();
    } else {
        console.error("Invalid data format for timeline chart:", data);
    }
}

function updateTimeZone(timeZone) {
    const startTimeElement = document.getElementById("startTime");
    const endTimeElement = document.getElementById("endTime");

    const startTime = startTimeElement.innerText;
    const endTime = endTimeElement.innerText;

    startTimeElement.innerText = moment.tz(startTime, "UTC").tz(timeZone).format("YYYY-MM-DD HH:mm:ss");
    endTimeElement.innerText = moment.tz(endTime, "UTC").tz(timeZone).format("YYYY-MM-DD HH:mm:ss");
}

function updateCurrentTime() {
    const timeZone = document.getElementById("timeZone").value;
    const currentTimeElement = document.getElementById("currentTime");
    currentTimeElement.innerText = moment().tz(timeZone).format("YYYY-MM-DD HH:mm:ss");
}

function updateInterruptionTable(data) {
    currentMicrostops = data; // Speichere die Daten für zukünftige Verwendungen
    const tableBody = document.querySelector("#interruptionTable tbody");
    tableBody.innerHTML = ""; // Bestehende Tabellendaten löschen

    data.forEach(entry => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${entry.ProcessOrderNumber}</td>
            <td>${moment.tz(entry.Start, "UTC").tz(document.getElementById("timeZone").value).format("YYYY-MM-DD HH:mm:ss")}</td>
            <td>${moment.tz(entry.End, "UTC").tz(document.getElementById("timeZone").value).format("YYYY-MM-DD HH:mm:ss")}</td>
            <td>${entry.Differenz}</td>
            <td class="droppable" data-id="${entry.ProcessOrderID}" data-value="${entry.ID}">${entry.Reason || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.droppable').forEach(cell => {
        cell.addEventListener('drop', drop);
        cell.addEventListener('dragover', allowDrop);
    });
}

function updateRatings(ratings) {
    const ratingsContainer = document.getElementById('ratings');
    ratingsContainer.innerHTML = ''; // Bestehende Bewertungen löschen

    ratings.forEach(rating => {
        const label = document.createElement('span');
        label.className = 'rating-label';
        label.draggable = true;
        label.dataset.rating = rating.description;
        label.style.backgroundColor = rating.color;
        label.textContent = rating.description;
        label.addEventListener('dragstart', drag);
        ratingsContainer.appendChild(label);
    });
}

function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.getAttribute('data-rating'));
}

function drop(event) {
    event.preventDefault();
    const rating = event.dataTransfer.getData("text");
    const processOrderId = event.target.getAttribute('data-id');
    const valueId = event.target.getAttribute('data-value');

    console.log(`Process Order ID: ${processOrderId}, Value ID: ${valueId}, Rating: ${rating}`);

    event.target.textContent = rating;

    const updatedData = {
        ProcessOrderID: processOrderId,
        ID: valueId,
        Reason: rating
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'updateRating', data: updatedData }));
    } else {
        console.error("WebSocket is not open. Queueing message.");
        messageQueue.push(JSON.stringify({ type: 'updateRating', data: updatedData }));
    }

    currentMicrostops.forEach(entry => {
        if (entry.ID === valueId) {
            entry.Reason = rating;
        }
    });
}