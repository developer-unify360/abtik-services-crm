import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Chip, IconButton,
  TablePagination, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, MenuItem, Alert, Snackbar,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { ClientService, type Client, type ClientCreateData } from './ClientService';

const industries = ['Technology', 'Manufacturing', 'Finance', 'Healthcare', 'Education', 'Retail', 'Other'];

const ClientListPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const [formData, setFormData] = useState<ClientCreateData>({
    client_name: '', company_name: '', gst_pan: '', email: '', mobile: '', industry: '',
  });

  const fetchClients = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      params.page = String(page + 1);
      const data = await ClientService.list(params);
      setClients(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  useEffect(() => { fetchClients(); }, [page, search]);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormData({ client_name: '', company_name: '', gst_pan: '', email: '', mobile: '', industry: '' });
    setOpenForm(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      client_name: client.client_name, company_name: client.company_name,
      gst_pan: client.gst_pan || '', email: client.email,
      mobile: client.mobile, industry: client.industry || '',
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingClient) {
        await ClientService.update(editingClient.id, formData);
        setSnackbar({ open: true, message: 'Client updated successfully', severity: 'success' });
      } else {
        await ClientService.create(formData);
        setSnackbar({ open: true, message: 'Client created successfully', severity: 'success' });
      }
      setOpenForm(false);
      fetchClients();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Operation failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>Clients</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          Add Client
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>
        <TextField
          placeholder="Search clients..."
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
              <TableCell sx={{ fontWeight: 600 }}>Client Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Mobile</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Industry</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#999' }}>
                  No clients found. Create a new client to get started.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} hover sx={{ '&:hover': { bgcolor: '#f8f9ff' } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{client.client_name}</TableCell>
                  <TableCell>{client.company_name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.mobile}</TableCell>
                  <TableCell>
                    {client.industry && <Chip label={client.industry} size="small" sx={{ bgcolor: '#e8eaf6', color: '#3f51b5' }} />}
                  </TableCell>
                  <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setViewingClient(client)}><ViewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleOpenEdit(client)}><EditIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
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
        <DialogTitle sx={{ fontWeight: 600 }}>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Client Name" required value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Company Name" required value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Email" type="email" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Mobile" required value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="GST / PAN" value={formData.gst_pan || ''}
                onChange={(e) => setFormData({ ...formData, gst_pan: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select label="Industry" value={formData.industry || ''}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}>
                <MenuItem value="">None</MenuItem>
                {industries.map((ind) => <MenuItem key={ind} value={ind}>{ind}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            {editingClient ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewingClient} onClose={() => setViewingClient(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Client Details</DialogTitle>
        <DialogContent>
          {viewingClient && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Name:</strong> {viewingClient.client_name}</Typography>
              <Typography><strong>Company:</strong> {viewingClient.company_name}</Typography>
              <Typography><strong>Email:</strong> {viewingClient.email}</Typography>
              <Typography><strong>Mobile:</strong> {viewingClient.mobile}</Typography>
              <Typography><strong>GST/PAN:</strong> {viewingClient.gst_pan || '—'}</Typography>
              <Typography><strong>Industry:</strong> {viewingClient.industry || '—'}</Typography>
              <Typography><strong>Created By:</strong> {viewingClient.created_by_name || '—'}</Typography>
              <Typography><strong>Created:</strong> {new Date(viewingClient.created_at).toLocaleString()}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingClient(null)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientListPage;
