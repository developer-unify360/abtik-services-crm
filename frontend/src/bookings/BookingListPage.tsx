import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Chip, IconButton,
  TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, MenuItem, Alert, Snackbar, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { BookingService, type Booking, type BookingCreateData } from './BookingService';

const paymentTypes = [
  { value: 'new_payment', label: 'New Payment' },
  { value: 'remaining_payment', label: 'Remaining Payment' },
  { value: 'complimentary', label: 'Complimentary' },
  { value: 'converted', label: 'Converted' },
  { value: 'transfer', label: 'Transfer' },
];

const statusColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fff8e1', color: '#f9a825' },
  confirmed: { bg: '#e3f2fd', color: '#1565c0' },
  in_progress: { bg: '#e3f2fd', color: '#1976d2' },
  completed: { bg: '#e8f5e9', color: '#2e7d32' },
  cancelled: { bg: '#ffebee', color: '#c62828' },
};

const BookingListPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const [formData, setFormData] = useState<BookingCreateData>({
    client_id: '', payment_type: 'new_payment', bank_account: '',
    booking_date: new Date().toISOString().split('T')[0], payment_date: '', remarks: '',
  });

  const fetchBookings = async () => {
    try {
      const params: Record<string, string> = { page: String(page + 1) };
      if (statusFilter) params.status = statusFilter;
      const data = await BookingService.list(params);
      setBookings(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  const handleOpenCreate = () => {
    setEditingBooking(null);
    setFormData({
      client_id: '', payment_type: 'new_payment', bank_account: '',
      booking_date: new Date().toISOString().split('T')[0], payment_date: '', remarks: '',
    });
    setOpenForm(true);
  };

  const handleOpenEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      client_id: booking.client, payment_type: booking.payment_type, bank_account: booking.bank_account || '',
      booking_date: booking.booking_date, payment_date: booking.payment_date || '',
      remarks: booking.remarks || '', status: booking.status,
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingBooking) {
        await BookingService.update(editingBooking.id, formData);
        setSnackbar({ open: true, message: 'Booking updated successfully', severity: 'success' });
      } else {
        await BookingService.create(formData);
        setSnackbar({ open: true, message: 'Booking created successfully', severity: 'success' });
      }
      setOpenForm(false);
      fetchBookings();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Operation failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const getStatusChip = (status: string, display: string) => {
    const style = statusColors[status] || { bg: '#f5f5f5', color: '#666' };
    return <Chip label={display} size="small" sx={{ bgcolor: style.bg, color: style.color, fontWeight: 500 }} />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>Bookings</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          Add Booking
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2, borderRadius: 2, display: 'flex', gap: 2 }}>
        <TextField
          select label="Status" size="small" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="confirmed">Confirmed</MenuItem>
          <MenuItem value="in_progress">In Progress</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </TextField>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f9fafb' }}>
              <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Payment Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Booking Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#999' }}>
                  No bookings found. Create a new booking to get started.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id} hover sx={{ '&:hover': { bgcolor: '#f8f9ff' } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{booking.client_name}</TableCell>
                  <TableCell>{booking.company_name}</TableCell>
                  <TableCell>{booking.payment_type_display}</TableCell>
                  <TableCell>{new Date(booking.booking_date).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusChip(booking.status, booking.status_display)}</TableCell>
                  <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setViewingBooking(booking)}><ViewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleOpenEdit(booking)}><EditIcon fontSize="small" /></IconButton>
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
        <DialogTitle sx={{ fontWeight: 600 }}>{editingBooking ? 'Edit Booking' : 'New Booking'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {!editingBooking && (
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Client ID" required value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  helperText="Enter the client UUID" />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select label="Payment Type" required value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}>
                {paymentTypes.map((pt) => <MenuItem key={pt.value} value={pt.value}>{pt.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Bank Account" value={formData.bank_account || ''}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Booking Date" type="date" required value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Payment Date" type="date" value={formData.payment_date || ''}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            {editingBooking && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth select label="Status" value={formData.status || 'pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={3} label="Remarks" value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            {editingBooking ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewingBooking} onClose={() => setViewingBooking(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Booking Details</DialogTitle>
        <DialogContent>
          {viewingBooking && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Client:</strong> {viewingBooking.client_name}</Typography>
              <Typography><strong>Company:</strong> {viewingBooking.company_name}</Typography>
              <Typography><strong>BDE:</strong> {viewingBooking.bde_name || '—'}</Typography>
              <Typography><strong>Payment Type:</strong> {viewingBooking.payment_type_display}</Typography>
              <Typography><strong>Bank Account:</strong> {viewingBooking.bank_account || '—'}</Typography>
              <Typography><strong>Booking Date:</strong> {viewingBooking.booking_date}</Typography>
              <Typography><strong>Payment Date:</strong> {viewingBooking.payment_date || '—'}</Typography>
              <Box><strong>Status:</strong> {getStatusChip(viewingBooking.status, viewingBooking.status_display)}</Box>
              <Typography><strong>Remarks:</strong> {viewingBooking.remarks || '—'}</Typography>
              <Typography><strong>Created:</strong> {new Date(viewingBooking.created_at).toLocaleString()}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingBooking(null)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BookingListPage;
