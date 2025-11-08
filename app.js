let currentData = null;
let currentProject = null;

async function loadTasks() {
  try {
    const response = await fetch('tasks.json?t=' + Date.now());
    currentData = await response.json();
    currentProject = window.location.hash.slice(1) || currentData.currentProject;
    
    if (!currentData.projects[currentProject]) {
      currentProject = currentData.currentProject;
    }
    
    renderProjectTabs();
    renderStats();
    renderTasks();
  } catch (error) {
    document.getElementById('tasks').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Error loading tasks</div>
        <div class="empty-state-hint">${error.message}</div>
      </div>
    `;
  }
}

function renderProjectTabs() {
  const container = document.getElementById('project-tabs');
  container.innerHTML = Object.keys(currentData.projects)
    .map(name => `
      <button class="tab ${name === currentProject ? 'active' : ''}" 
              onclick="switchProject('${name}')">
        ${name}
      </button>
    `).join('');
}

function switchProject(name) {
  window.location.hash = name;
  currentProject = name;
  renderProjectTabs();
  renderStats();
  renderTasks();
}

function renderStats() {
  const project = currentData.projects[currentProject];
  const allTasks = getAllTasks(project.folders);
  const openTasks = allTasks.filter(t => t.status === 'open');
  const closedTasks = allTasks.filter(t => t.status === 'closed');
  const highPriority = openTasks.filter(t => t.priority === 'H');

  document.getElementById('stats').innerHTML = `
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${openTasks.length}</div>
        <div class="stat-label">Open Tasks</div>
      </div>
      <div class="stat">
        <div class="stat-value">${closedTasks.length}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${highPriority.length}</div>
        <div class="stat-label">High Priority</div>
      </div>
      <div class="stat">
        <div class="stat-value">${currentData.archive?.filter(a => a.project === currentProject).length || 0}</div>
        <div class="stat-label">Archived</div>
      </div>
    </div>
  `;
}

function renderTasks() {
  const project = currentData.projects[currentProject];
  const container = document.getElementById('tasks');
  container.innerHTML = '';

  const allTasks = getAllTasks(project.folders);
  
  if (allTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">No tasks yet</div>
        <div class="empty-state-hint">Create your first task with: task home / + my task H</div>
      </div>
    `;
    return;
  }

  renderFolderStructure(project.folders, container, []);
}

function renderFolderStructure(folders, container, path) {
  Object.entries(folders).forEach(([name, content]) => {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder';
    
    const folderPath = [...path, name].join(' / ');
    folderDiv.innerHTML = `
      <div class="folder-header">
        📁 ${folderPath}
      </div>
    `;
    
    if (Array.isArray(content)) {
      const openTasks = content.filter(t => t.status === 'open');
      const closedTasks = content.filter(t => t.status === 'closed');

      // Group open tasks by priority
      const high = openTasks.filter(t => t.priority === 'H');
      const medium = openTasks.filter(t => t.priority === 'M');
      const low = openTasks.filter(t => t.priority === 'L');

      if (high.length > 0) {
        renderTaskGroup(folderDiv, '🔥 High Priority', high, 'high');
      }
      if (medium.length > 0) {
        renderTaskGroup(folderDiv, '⚡ Medium Priority', medium, 'medium');
      }
      if (low.length > 0) {
        renderTaskGroup(folderDiv, '📌 Low Priority', low, 'low');
      }
      if (closedTasks.length > 0) {
        renderTaskGroup(folderDiv, `✓ Completed (${closedTasks.length})`, closedTasks, 'low', true);
      }
    } else if (typeof content === 'object') {
      renderFolderStructure(content, folderDiv, [...path, name]);
    }
    
    container.appendChild(folderDiv);
  });
}

function renderTaskGroup(container, title, tasks, priorityClass, closed = false) {
  const groupDiv = document.createElement('div');
  groupDiv.className = 'task-group';
  groupDiv.innerHTML = `<div class="task-group-title">${title}</div>`;
  
  tasks.forEach(task => {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task ${closed ? 'closed' : ''}`;
    
    taskDiv.innerHTML = `
      <div class="priority priority-${priorityClass}">${task.priority}</div>
      <div class="task-name">${task.name}</div>
      <div class="task-meta">
        ${task.tags.length > 0 ? `
          <div class="tags">
            ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
        ${closed ? '<span class="status-badge">✓ Done</span>' : ''}
      </div>
    `;
    
    groupDiv.appendChild(taskDiv);
  });
  
  container.appendChild(groupDiv);
}

function getAllTasks(folders) {
  let tasks = [];
  
  Object.values(folders).forEach(content => {
    if (Array.isArray(content)) {
      tasks.push(...content);
    } else if (typeof content === 'object') {
      tasks.push(...getAllTasks(content));
    }
  });
  
  return tasks;
}

// Load tasks on page load
loadTasks();

// Refresh every 30 seconds
setInterval(loadTasks, 30000);