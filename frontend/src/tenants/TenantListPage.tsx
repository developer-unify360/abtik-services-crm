import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, IconButton,
  TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, MenuItem, Alert, Snackbar, InputAdornment, Chip
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { TenantService, type Tenant, type TenantCreateData } from './TenantService';

const TenantListPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const [formData, setFormData] = useState<TenantCreateData>({
    name: '', industry: '', status: 'active',
  });

  const fetchTenants = async () => {
    try {
      const params: Record<string, string> = { page: String(page + 1) };
      if (search) params.search = search;
      const data = await TenantService.list(params);
      setTenants(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    }
  };

  useEffect(() => { fetchTenants(); }, [page, search]);

  const handleOpenCreate = () => {
    setEditingTenant(null);
    setFormData({ name: '', industry: '', status: 'active' });
    setOpenForm(true);
  };

  const handleOpenEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name, industry: tenant.industry || '', status: tenant.status,
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingTenant) {
        await TenantService.update(editingTenant.id, formData);
        setSnackbar({ open: true, message: 'Tenant updated successfully', severity: 'success' });
      } else {
        await TenantService.create(formData);
        setSnackbar({ open: true, message: 'Tenant created successfully', severity: 'success' });
      }
      setOpenForm(false);
      fetchTenants();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Operation failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>Organizations (Tenants)</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          Add Organization
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>
        <TextField
          placeholder="Search organizations..."
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
              <TableCell sx={{ fontWeight: 600 }}>Industry</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id} hover sx={{ '&:hover': { bgcolor: '#f8f9ff' } }}>
                <TableCell sx={{ fontWeight: 500 }}>{tenant.name}</TableCell>
                <TableCell>{tenant.industry || '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={tenant.status}
                    size="small"
                    sx={{
                      bgcolor: tenant.status === 'active' ? '#e8f5e9' : '#ffebee',
                      color: tenant.status === 'active' ? '#2e7d32' : '#c62828',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenEdit(tenant)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#999' }}>
                  No organizations found.
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
        <DialogTitle sx={{ fontWeight: 600 }}>{editingTenant ? 'Edit Organization' : 'New Organization'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Name" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Industry" value={formData.industry || ''}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select label="Status" value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            {editingTenant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TenantListPage;
