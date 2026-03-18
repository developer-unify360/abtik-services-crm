import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, IconButton,
  TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, MenuItem, Alert, Snackbar, InputAdornment, Chip
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { UserService, RoleService, type User, type UserCreateData, type Role } from './UserService';

const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const [formData, setFormData] = useState<UserCreateData>({
    name: '', email: '', phone: '', role: '', password: '',
  });

  const fetchUsers = async () => {
    try {
      const params: Record<string, string> = { page: String(page + 1) };
      if (search) params.search = search;
      const data = await UserService.list(params);
      setUsers(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await RoleService.list();
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
    fetchRoles();
  }, [page, search]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', phone: '', role: '', password: '' });
    setOpenForm(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role_name || '',  // Use role_name for editing
      password: '', // Don't show existing password
    });
    setOpenForm(true);
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.email}"?`)) {
      return;
    }
    try {
      await UserService.delete(user.id);
      setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Delete failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        // For updates, only send non-empty fields
        const updateData: Partial<UserCreateData> = {};
        if (formData.name) updateData.name = formData.name;
        if (formData.phone) updateData.phone = formData.phone;
        if (formData.role) updateData.role = formData.role;
        if (formData.password) updateData.password = formData.password;
        
        await UserService.update(editingUser.id, updateData);
        setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
      } else {
        await UserService.create(formData);
        setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
      }
      setOpenForm(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Operation failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>Users</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          Add User
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>
        <TextField
          placeholder="Search users..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#999' }} /></InputAdornment> }}
          sx={{ width: 350 }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f9fafb' }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover sx={{ '&:hover': { bgcolor: '#f8f9ff' } }}>
                <TableCell sx={{ fontWeight: 500 }}>{user.name || '—'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role_name || 'No Role'}
                    size="small"
                    sx={{
                      bgcolor: '#e3f2fd',
                      color: '#1565c0',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status ? 'Active' : 'Inactive'}
                    size="small"
                    sx={{
                      bgcolor: user.status ? '#e8f5e9' : '#ffebee',
                      color: user.status ? '#2e7d32' : '#c62828',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(user)} sx={{ color: '#dc2626' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#999' }}>
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={totalCount} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
        />
      </TableContainer>

      {/* Create / Edit Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingUser ? 'Edit User' : 'New User'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Name" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Email" type="email" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingUser} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Phone" value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select label="Role" required value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Password" type="password" 
                required={!editingUser}
                value={formData.password || ''}
                placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UserListPage;
