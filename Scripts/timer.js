const labelEl = document.getElementById("label");
const timerEl = document.getElementById("timer");
const timerBox = document.getElementById("timer-box");

let tickInterval = null;
let pollInterval = null;

let timerStartedAt = 0;
let timerDuration = 0;
let timerRunning = false;

let lastConfig = null;

let hiddenAfterExpire = false;


function formatTime(sec) {

    sec = Math.max(0, sec);

    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");

    return `${h}:${m}:${s}`;
}


function updateTimer() {

    let remaining = 0;


    if (timerRunning && timerDuration > 0) {

        const elapsed =
            Math.floor(
                (Date.now() - timerStartedAt) / 1000
            );

        remaining =
            Math.max(
                0,
                timerDuration - elapsed
            );
    }


    if (remaining > 0) {

        timerEl.textContent =
            formatTime(remaining);

        timerEl.classList.remove("blinking");


    } else {

        timerEl.textContent =
            "00:00:00";

        timerEl.classList.add("blinking");
    }


    if (!hiddenAfterExpire) {

        timerBox.style.visibility = "visible";

    }
}


timerBox.addEventListener("click", () => {

    if (
        timerEl.classList.contains("blinking")
    ) {

        hiddenAfterExpire = true;

        timerBox.style.visibility = "hidden";
    }

});


function configChanged(config) {

    if (!lastConfig) {
        return true;
    }


    return (
        config.startedAt !== lastConfig.startedAt ||
        config.duration !== lastConfig.duration ||
        config.running !== lastConfig.running ||
        config.message !== lastConfig.message
    );
}


async function pollSettings() {

    try {

        const res = await fetch("/api/settings", {
            cache: "no-store"
        });


        const config = await res.json();


        labelEl.textContent =
            config.message ||
            "Stream Starting In:";


        if (configChanged(config)) {

            timerStartedAt =
                config.startedAt || 0;

            timerDuration =
                config.duration || 0;

            timerRunning =
                config.running || false;


            hiddenAfterExpire = false;

            timerBox.style.visibility =
                "visible";


            lastConfig = {
                startedAt: config.startedAt,
                duration: config.duration,
                running: config.running,
                message: config.message
            };
        }


        updateTimer();


    } catch (err) {

        // Server unavailable.
        // Keep displaying current state.
    }
}


pollSettings();


pollInterval =
    setInterval(
        pollSettings,
        1000
    );


tickInterval =
    setInterval(
        updateTimer,
        1000
    );

