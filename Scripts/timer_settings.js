const formEl = document.getElementById("settings-form");
const statusEl = document.getElementById("status");
const stopBtn = document.getElementById("stop-btn");


function setStatus(message)
{
  statusEl.textContent = message;

  if (message) {
    setTimeout(() => {
      statusEl.textContent = "";
    }, 2000);
  }
}


async function loadInitial()
{
  try {
    const response = await fetch("/api/settings");
    const config = await response.json();
    const duration = config.duration || 0;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    document.getElementById("message-input").value = config.message || "";
    document.getElementById("hours-input").value =
      String(hours).padStart(2, "0");
    document.getElementById("minutes-input").value =
      String(minutes).padStart(2, "0");
    document.getElementById("seconds-input").value =
      String(seconds).padStart(2, "0");

  } catch (error) {
    setStatus("Could not reach server");
  }
}


formEl.addEventListener(
  "submit",
  async (event) =>
{
  event.preventDefault();

  const message =
    document.getElementById("message-input")
    .value
    .trim();
  const hours =
    parseInt(
      document.getElementById("hours-input").value
    ) || 0;
  const minutes =
    parseInt(
      document.getElementById("minutes-input").value
    ) || 0;
  const seconds =
    parseInt(
      document.getElementById("seconds-input").value
    ) || 0;
  const totalSeconds =
    (hours * 3600) +
    (minutes * 60) +
    seconds;

  if (!message) {
    setStatus("Message required");
    return;
  }

  if (totalSeconds <= 0) {
    setStatus("Enter a valid duration");
    return;
  }

  try {
    await fetch("/api/settings",
    {
      method: "POST",
      headers:
      {
        "Content-Type":
          "application/json"
      },
      body:
        JSON.stringify(
        {
          message: message,
          duration: totalSeconds,
          running: true,
          startedAt: Date.now()
        })
    });

    setStatus("Timer started ✓");

  } catch (error) {
    setStatus("Server error");
  }
});


stopBtn.addEventListener(
  "click",
  async () =>
{
  try {
    await fetch("/api/settings",
    {
      method: "POST",
      headers:
      {
        "Content-Type":
          "application/json"
      },
      body:
        JSON.stringify(
        {
          message:
            document
            .getElementById("message-input")
            .value
            .trim(),
          duration: 0,
          running: false,
          startedAt: 0
        })
    });
    setStatus("Timer stopped");

  } catch (error) {
    setStatus("Server error");
  }

});


const TASKS_API = "/api/json?file=tasks.json";

const addTaskBtn = document.getElementById("add-task-btn");
const deleteTaskBtn = document.getElementById("delete-task-btn");


async function loadTasks()
{
  const response = await fetch(TASKS_API);
  return await response.json();
}


async function saveTasks(data)
{
  await fetch(TASKS_API,
  {
    method: "POST",
    headers:
    {
      "Content-Type": "application/json"
    },
    body:
      JSON.stringify(data)
  });
}


async function addTask()
{
  const input =
    document.getElementById("task-input");

  const text =
    input.value.trim();

  if (!text) {
    setStatus("Task text required");
    return;
  }


  try {

    const data = await loadTasks();

    if (!Array.isArray(data.tasks)) {
      data.tasks = [];
    }


    const now = Date.now();

    data.tasks.push(
    {
      id: now,
      text: text,
      state: "todo",
      order: (data.tasks.length + 1) * 10,
      created: now,
      started: null,
      completed: null
    });


    await saveTasks(data);

    input.value = "";

    setStatus("Task added ✓");


  } catch (error) {

    setStatus("Could not save task");

  }
}

async function deleteTask()
{
  const order =
    parseInt(
      document
      .getElementById("delete-task-index")
      .value
    );


  if (Number.isNaN(order)) {
    setStatus("Enter task order");
    return;
  }


  try {

    const data = await loadTasks();


    if (!Array.isArray(data.tasks)) {
      setStatus("No tasks found");
      return;
    }


    const index =
      data.tasks.findIndex(
        task => task.order === order
      );


    if (index === -1) {
      setStatus("Task not found");
      return;
    }


    data.tasks.splice(index, 1);


    await saveTasks(data);


    document
      .getElementById("delete-task-index")
      .value = "";


    setStatus("Task deleted ✓");


  } catch (error) {

    setStatus("Could not delete task");

  }
}

addTaskBtn.addEventListener(
  "click",
  addTask
);


deleteTaskBtn.addEventListener(
  "click",
  deleteTask
);



loadInitial();
