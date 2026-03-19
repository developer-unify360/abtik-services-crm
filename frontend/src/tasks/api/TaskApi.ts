import apiClient from '../../api/apiClient';

// Types
export interface TaskBoard {
  id: string;
  name: string;
  description?: string;
  columns_count?: number;
  created_at: string;
  is_default: boolean;
  is_active: boolean;
}

export interface TaskColumn {
  id: string;
  name: string;
  status_key: string;
  color: string;
  position: number;
  WIP_LIMIT?: number;
  tasks_count?: number;
  tasks?: Task[];
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Task {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  task_type: 'task' | 'story' | 'bug' | 'subtask' | 'epic';
  status: string;
  status_display: string;
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  priority_display: string;
  board?: TaskBoard;
  board_name?: string;
  column?: TaskColumn;
  column_name?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  assignee_name?: string;
  assignee_email?: string;
  reporter?: {
    id: string;
    name: string;
  };
  reporter_name?: string;
  start_date?: string;
  due_date?: string;
  resolved_date?: string;
  closed_date?: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  is_blocked: boolean;
  blocking_reason?: string;
  is_archived: boolean;
  completion_notes?: string;
  subtasks_count: number;
  subtasks_completed: number;
  comments_count: number;
  attachments_count: number;
  time_spent_total: string;
  labels: TaskLabel[];
  created_at: string;
  updated_at: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  completed_by_name?: string;
  position: number;
}

export interface TaskComment {
  id: string;
  task: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  author_name: string;
  author_email: string;
  content: string;
  is_internal: boolean;
  edited_at?: string;
  edited_by_name?: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task: string;
  file_name: string;
  file_path: string;
  file_url?: string;
  file_size: number;
  mime_type: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface TaskTimeLog {
  id: string;
  task: string;
  user: {
    id: string;
    name: string;
  };
  user_name: string;
  time_spent: number;
  time_remaining?: number;
  description?: string;
  started_at: string;
  ended_at?: string;
  is_running: boolean;
  duration_formatted: string;
}

export interface TaskActivity {
  id: string;
  task: string;
  user: {
    id: string;
    name: string;
  };
  user_name: string;
  action: string;
  action_display: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
}

export interface KanbanBoard {
  id: string;
  name: string;
  description?: string;
  columns: KanbanColumn[];
}

export interface KanbanColumn {
  id: string;
  name: string;
  status_key: string;
  color: string;
  position: number;
  WIP_LIMIT?: number;
  tasks: Task[];
}

// API Functions
const taskApi = {
  // Boards
  getBoards: async (): Promise<TaskBoard[]> => {
    const response = await apiClient.get('/tasks/boards/');
    return response.data.data || response.data;
  },

  createBoard: async (data: Partial<TaskBoard>): Promise<TaskBoard> => {
    const response = await apiClient.post('/tasks/boards/', data);
    console.log("🚀 CREATE BOARD PAYLOAD:", data);
    return response.data.data;
  },

  // Columns
  getColumns: async (boardId: string): Promise<TaskColumn[]> => {
    const response = await apiClient.get('/tasks/columns/', { params: { board_id: boardId } });
    // DRF wrapper uses data: { success, data } in task endpoints
    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  createColumn: async (data: Partial<TaskColumn>): Promise<TaskColumn> => {
    const response = await apiClient.post('/tasks/columns/', data);
    return response.data.data;
  },

  // Labels
  getLabels: async (): Promise<TaskLabel[]> => {
    const response = await apiClient.get('/tasks/labels/');
    return response.data.data || response.data;
  },

  createLabel: async (data: Partial<TaskLabel>): Promise<TaskLabel> => {
    const response = await apiClient.post('/tasks/labels/', data);
    return response.data.data;
  },

  // Kanban Board
  getKanbanBoard: async (boardId?: string): Promise<KanbanBoard> => {
    const params = boardId ? { board_id: boardId } : {};
    const response = await apiClient.get('/tasks/kanban/', { params });
    return response.data.data;
  },

  // Tasks
  getTasks: async (params?: {
    status?: string;
    priority?: string;
    assignee?: string;
    board_id?: string;
    column_id?: string;
  }): Promise<Task[]> => {
    const response = await apiClient.get('/tasks/', { params });
    return response.data.data?.results || response.data.results || response.data;
  },

  getTask: async (taskId: string): Promise<Task> => {
    const response = await apiClient.get(`/tasks/${taskId}/`);
    return response.data.data;
  },

  createTask: async (data: Partial<Task>): Promise<Task> => {
    const response = await apiClient.post('/tasks/', data);
    return response.data.data;
  },

  updateTask: async (taskId: string, data: Partial<Task>): Promise<Task> => {
    const response = await apiClient.patch(`/tasks/${taskId}/`, data);
    return response.data.data;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}/`);
  },

  moveTask: async (taskId: string, columnId: string, position: number): Promise<Task> => {
    const response = await apiClient.post(`/tasks/${taskId}/move/`, {
      column_id: columnId,
      position,
    });
    return response.data.data;
  },

  assignTask: async (taskId: string, assigneeId: string | null): Promise<Task> => {
    const response = await apiClient.post(`/tasks/${taskId}/assign/`, {
      assignee_id: assigneeId,
    });
    return response.data.data;
  },

  updateTaskStatus: async (
    taskId: string,
    status: string,
    completionNotes?: string
  ): Promise<Task> => {
    const response = await apiClient.post(`/tasks/${taskId}/status/`, {
      status,
      completion_notes: completionNotes,
    });
    return response.data.data;
  },

  getMyTasks: async (): Promise<Task[]> => {
    const response = await apiClient.get('/tasks/my_tasks/');
    return response.data.data || response.data;
  },

  getBacklogTasks: async (): Promise<Task[]> => {
    const response = await apiClient.get('/tasks/backlog/');
    return response.data.data || response.data;
  },

  // Subtasks
  getSubtasks: async (taskId: string): Promise<TaskSubtask[]> => {
    const response = await apiClient.get('/tasks/subtasks/', { params: { task_id: taskId } });
    return response.data.data || response.data;
  },

  createSubtask: async (taskId: string, title: string): Promise<TaskSubtask> => {
    const response = await apiClient.post('/tasks/subtasks/', {
      parent_task: taskId,
      title,
    });
    return response.data.data;
  },

  updateSubtask: async (
    subtaskId: string,
    data: Partial<TaskSubtask>
  ): Promise<TaskSubtask> => {
    const response = await apiClient.patch(`/tasks/subtasks/${subtaskId}/`, data);
    return response.data.data;
  },

  completeSubtask: async (subtaskId: string): Promise<TaskSubtask> => {
    const response = await apiClient.post(`/tasks/subtasks/${subtaskId}/complete/`);
    return response.data.data;
  },

  deleteSubtask: async (subtaskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/subtasks/${subtaskId}/`);
  },

  // Comments
  getComments: async (taskId: string): Promise<TaskComment[]> => {
    const response = await apiClient.get('/tasks/comments/', { params: { task_id: taskId } });
    return response.data.data || response.data;
  },

  createComment: async (taskId: string, content: string, isInternal = false): Promise<TaskComment> => {
    const response = await apiClient.post('/tasks/comments/', {
      task: taskId,
      content,
      is_internal: isInternal,
    });
    return response.data.data;
  },

  updateComment: async (
    commentId: string,
    content: string
  ): Promise<TaskComment> => {
    const response = await apiClient.patch(`/tasks/comments/${commentId}/`, { content });
    return response.data.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/tasks/comments/${commentId}/`);
  },

  // Attachments
  getAttachments: async (taskId: string): Promise<TaskAttachment[]> => {
    const response = await apiClient.get('/tasks/attachments/', { params: { task_id: taskId } });
    return response.data.data || response.data;
  },

  uploadAttachment: async (taskId: string, file: File): Promise<TaskAttachment> => {
    const formData = new FormData();
    formData.append('task', taskId);
    formData.append('file', file);
    const response = await apiClient.post('/tasks/attachments/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  deleteAttachment: async (attachmentId: string): Promise<void> => {
    await apiClient.delete(`/tasks/attachments/${attachmentId}/`);
  },

  // Time Logs
  getTimeLogs: async (taskId: string): Promise<TaskTimeLog[]> => {
    const response = await apiClient.get('/tasks/time-logs/', { params: { task_id: taskId } });
    return response.data.data || response.data;
  },

  createTimeLog: async (data: {
    task: string;
    time_spent: number;
    description?: string;
    started_at: string;
    ended_at?: string;
  }): Promise<TaskTimeLog> => {
    const response = await apiClient.post('/tasks/time-logs/', data);
    return response.data.data;
  },

  // Activities
  getActivities: async (taskId: string): Promise<TaskActivity[]> => {
    const response = await apiClient.get('/tasks/activities/', { params: { task_id: taskId } });
    return response.data.data || response.data;
  },
};

export default taskApi;
