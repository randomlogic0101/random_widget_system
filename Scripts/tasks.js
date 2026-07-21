const API = "/api/json?file=tasks.json";

let tasks = [];
let lastTaskSnapshot = "";
let editing = false;
const MAX_VISIBLE_ROWS = 10;
const WAIT_TIME = 8000;
const SCROLL_SPEED = 40000;


// Convert old numeric states if needed
function normalizeTasks(data)
{
  tasks = data.tasks || [];

  tasks.forEach((task,index) =>
  {
    if(typeof task.state === "number")
    {
      task.state =
      [
        "todo",
        "started",
        "completed"
      ][task.state] || "todo";
    }

    if(!task.id)
      task.id = Date.now() + index;

    if(!task.created)
      task.created = Date.now();

    if(!("started" in task))
      task.started = null;

    if(!("completed" in task))
      task.completed = null;

    if(typeof task.order !== "number")
      task.order = (index + 1) * 10;
  });

  tasks.sort((a,b) => a.order - b.order);
}

// Load current state from server
async function refreshTasks()
{
  const response = await fetch(API,
  {
    cache:"no-store"
  });

  const data = await response.json();

  const snapshot =
    JSON.stringify(data);

  const changed =
    snapshot !== lastTaskSnapshot;

  lastTaskSnapshot = snapshot;

  normalizeTasks(data);

  return changed;
}


// Initial load
async function loadTasks()
{
  await refreshTasks();

  render();
  setupMarquee();
  setupVerticalScroll();
}

async function watchTasks()
{
  if(editing)
    return;

  try
  {
    const changed =
      await refreshTasks();

    if(changed)
    {
      render();
      setupMarquee();
      setupVerticalScroll();
    }

  }
  catch(error)
  {
    console.error(
      "Task refresh failed:",
      error
    );
  }
}


setInterval(
  watchTasks,
  5000
);


// Save current state
async function saveTasks()
{
  await fetch(API,
  {
    method:"POST",
    headers:
    {
      "Content-Type":"application/json"
    },
    body:JSON.stringify(
    {
      tasks:tasks
    })
  });
}

async function moveTask(taskId)
{
  // Don't refresh from server — use current local state
  tasks.sort((a, b) => a.order - b.order);

  const index = tasks.findIndex(t => t.id === taskId);

  // Can't move the last task down
  if (index < 0 || index >= tasks.length - 1 || tasks.length < 2)
    return;

  const nextIndex = index + 1; // No modulo wrap-around

  const current = tasks[index];
  const next = tasks[nextIndex];

  [current.order, next.order] = [next.order, current.order];

  await saveTasks();

  tasks.sort((a, b) => a.order - b.order);

  render();
  setupMarquee();
  setupVerticalScroll();
}

async function cycleState(taskId)  // Changed from index to taskId
{
  // Don't refresh from server — use current local state
  const task = tasks.find(t => t.id === taskId);

  if (!task)
    return;

  const now = Date.now();

  switch (task.state)
  {
    case "todo":
      task.state = "started";
      if (!task.started)
        task.started = now;
      break;

    case "started":
      task.state = "completed";
      if (!task.completed)
        task.completed = now;
      break;

    default:
      task.state = "todo";
      break;
  }

  await saveTasks();

  render();
  setupMarquee();
  setupVerticalScroll();
}




function render()
{
  const list = document.getElementById("task-list");

  list.innerHTML =
  `
    <div id="task-scroll"></div>
  `;

  const scroll = document.getElementById("task-scroll");

  tasks.forEach((task,index)=>
  {
    const row = document.createElement("div");

    row.className =
      "task-row " + stateName(task.state);

    row.innerHTML =
    `
    <span class="task-order">
      ${task.order}
    </span>
    <span class="task-status"></span>
    <span class="task-text-container">
      <span class="task-text">
        ${escapeHtml(task.text)}
      </span>
    </span>
    `;

    row.querySelector(".task-order").onclick = () =>
    {
      moveTask(task.id);
    };

    const text = row.querySelector(".task-text");

    text.contentEditable = true;

    text.addEventListener("focus",() =>
    {
      editing = true;
    });

    text.addEventListener("blur",async () =>
    {
      editing = false;

      await refreshTasks();

      const updatedTask = tasks.find(t =>
        t.id === task.id
      );

      if(updatedTask)
      {
        updatedTask.text =
          text.innerText.trim();

        await saveTasks();
      }

      render();
      setupMarquee();
      setupVerticalScroll();
    });

    row.querySelector(".task-status").onclick = () =>
    {
      cycleState(task.id);   // was: cycleState(index)
    };

    scroll.appendChild(row);
  });
}


function setupMarquee()
{
  document.querySelectorAll("#task-widget .task-text-container")
    .forEach(container =>
    {
      const text =
        container.querySelector(".task-text");

      text.classList.remove("marquee");

      const distance =
        text.scrollWidth -
        container.clientWidth;

      if(distance > 0)
      {
        text.style.setProperty(
          "--marquee-distance",
          `${distance}px`
        );

        text.classList.add("marquee");
      }
    });
}


function setupVerticalScroll()
{
  const scroll =
    document.getElementById("task-scroll");

  const viewport =
    document.getElementById("task-list");

  if(!scroll || !viewport)
    return;

  scroll.classList.remove("vertical-scroll");

  requestAnimationFrame(() =>
  {
    requestAnimationFrame(() =>
    {
      const overflow =
        scroll.scrollHeight -
        viewport.clientHeight;

      if(overflow <= 0)
        return;

      scroll.style.setProperty(
        "--scroll-distance",
        `${-overflow}px`
      );

      scroll.style.setProperty(
        "--scroll-time",
        `${Math.max(
          90000,
          overflow * 400
        )}ms`
      );

      scroll.classList.add("vertical-scroll");
    });
  });
}




function stateName(state)
{
  return state;
}


async function addTask()
{
  const input =
    document.getElementById("new-task");

  const text =
    input.value.trim();

  if(!text)
    return;

  await refreshTasks();

  const nextOrder =
    tasks.length === 0
      ? 10
      : Math.max(...tasks.map(t => t.order || 0)) + 10;

  tasks.push(
  {
    id: Date.now(),
    text: text,
    state: "todo",
    order: nextOrder,
    created: Date.now(),
    started: null,
    completed: null
  });

  input.value = "";

  await saveTasks();

  render();
  setupMarquee();
  setupVerticalScroll();
}


function escapeHtml(text)
{
  return text
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}


document.getElementById("add-task").onclick =
  addTask;


document.getElementById("new-task")
.addEventListener("keydown", event =>
{
  if(event.key === "Enter")
    addTask();
});


document.getElementById("delete-completed")
.onclick = async () =>
{
  await refreshTasks();

  tasks =
    tasks.filter(t =>
      t.state !== "completed"
    );

  await saveTasks();

  render();
  setupMarquee();
  setupVerticalScroll();
};


loadTasks();

