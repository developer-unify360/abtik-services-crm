import React, { useEffect, useState } from 'react';
import { useServiceStore } from '../store/useServiceStore';
import { BookingService } from '../../bookings/BookingService';
import { UserService } from '../../users/UserService';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, IconButton,
  TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, MenuItem, Alert, Snackbar, InputAdornment, Chip,
  FormControl, InputLabel, Select
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon,
  Delete as DeleteIcon, Person as PersonIcon, ArrowForward as ArrowRightIcon,
  FilterList as FilterIcon, CheckCircle as CheckCircleIcon,
  Schedule as ClockIcon, Error as AlertCircleIcon, Cancel as XCircleIcon
} from '@mui/icons-material';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb' },
  assigned: { label: 'Assigned', color: '#2563eb', bg: '#eff6ff' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: '#f5f3ff' },
  waiting_client: { label: 'Waiting Client', color: '#ea580c', bg: '#fff7ed' },
  completed: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
  closed: { label: 'Closed', color: '#64748b', bg: '#f8fafc' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: '#64748b' },
  medium: { label: 'Medium', color: '#2563eb' },
  high: { label: 'High', color: '#ea580c' },
  urgent: { label: 'Urgent', color: '#dc2626' },
};

interface Booking {
  id: string;
  client_name: string;
  company_name: string;
  booking_date: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role_name: string;
}

const ServiceRequestList: React.FC = () => {
  const {
    serviceRequests, services, categories, isLoading,
    fetchServiceRequests, fetchServices, fetchCategories,
    createServiceRequest, assignServiceRequest, updateServiceRequestStatus
  } = useServiceStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const [formData, setFormData] = useState({
    booking: '',
    service: '',
    priority: 'medium',
    assigned_to: '',
    status: 'pending',
  });

  useEffect(() => {
    fetchServiceRequests();
    fetchServices();
    fetchCategories();
    fetchBookings();
    fetchUsers();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await BookingService.list();
      setBookings(data.results || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await UserService.list();
      const userList = Array.isArray(response) ? response : response?.results || [];
      const teamMembers = userList.filter((user: User) =>
        user.role_name === 'IT Staff' || user.role_name === 'IT Manager' || user.role_name === 'Admin'
      );
      setUsers(teamMembers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchServiceRequests(Object.fromEntries(Object.entries(newFilters).filter(([_, v]) => v)));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createServiceRequest({
        booking: formData.booking,
        service: formData.service,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
      });
      setShowCreateModal(false);
      setFormData({ booking: '', service: '', priority: 'medium', assigned_to: '', status: 'pending' });
      setSnackbar({ open: true, message: 'Service request created successfully', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Failed to create service request', severity: 'error' });
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequest) {
      try {
        await assignServiceRequest(selectedRequest.id, { assigned_to: formData.assigned_to });
        setShowAssignModal(false);
        setSelectedRequest(null);
        setSnackbar({ open: true, message: 'Service request assigned successfully', severity: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Failed to assign service request', severity: 'error' });
      }
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequest) {
      try {
        await updateServiceRequestStatus(selectedRequest.id, { status: formData.status as 'pending' | 'assigned' | 'in_progress' | 'waiting_client' | 'completed' | 'closed' });
        setShowStatusModal(false);
        setSelectedRequest(null);
        setSnackbar({ open: true, message: 'Status updated successfully', severity: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
      }
    }
  };

  const openAssignModal = (request: any) => {
    setSelectedRequest(request);
    setFormData({ ...formData, assigned_to: request.assigned_to || '' });
    setShowAssignModal(true);
  };

  const openStatusModal = (request: any) => {
    setSelectedRequest(request);
    setFormData({ ...formData, status: request.status });
    setShowStatusModal(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>Service Requests</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>Manage client service requests and track progress</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateModal(true)}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          New Service Request
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FilterIcon sx={{ color: '#9ca3af' }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="waiting_client">Waiting Client</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={filters.priority}
              label="Priority"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = serviceRequests.filter(r => r.status === key).length;
          return (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={key}>
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: config.bg }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: config.color }}>{config.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: config.color, mt: 0.5 }}>{count}</Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Service Requests Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <Typography>Loading...</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 600 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Client / Booking</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {serviceRequests.map((request) => (
                <TableRow key={request.id} hover sx={{ '&:hover': { bgcolor: '#f8f9ff' } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{request.service_name}</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>{request.category_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{request.booking_details?.company_name || 'N/A'}</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {request.booking_details?.booking_date ? new Date(request.booking_details.booking_date).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: priorityConfig[request.priority]?.color, fontWeight: 500 }}>
                      {priorityConfig[request.priority]?.label || request.priority}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {request.assigned_user ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <PersonIcon sx={{ fontSize: 14, color: '#4f46e5' }} />
                        </Box>
                        <Typography variant="body2">{request.assigned_user.name}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>Unassigned</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusConfig[request.status]?.label || request.status}
                      size="small"
                      sx={{
                        bgcolor: statusConfig[request.status]?.bg,
                        color: statusConfig[request.status]?.color,
                        fontWeight: 500
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openAssignModal(request)} sx={{ color: '#9ca3af', '&:hover': { color: '#4f46e5', bgcolor: '#eef2ff' } }}>
                      <PersonIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => openStatusModal(request)} sx={{ color: '#9ca3af', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}>
                      <ArrowRightIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {serviceRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                    <Box sx={{ mb: 1 }}>
                      <AddIcon sx={{ fontSize: 40, color: '#d1d5db' }} />
                    </Box>
                    <Typography>No service requests found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>New Service Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Booking</InputLabel>
                <Select
                  value={formData.booking}
                  label="Booking"
                  onChange={(e) => setFormData({ ...formData, booking: e.target.value })}
                >
                  <MenuItem value="">Select a booking</MenuItem>
                  {bookings.map((booking) => (
                    <MenuItem key={booking.id} value={booking.id}>
                      {booking.company_name} - {new Date(booking.booking_date).toLocaleDateString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Service</InputLabel>
                <Select
                  value={formData.service}
                  label="Service"
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                >
                  <MenuItem value="">Select a service</MenuItem>
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name} ({service.category_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowCreateModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateSubmit}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            Create Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Assign Service Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Assign <strong>{selectedRequest?.service_name}</strong> to a team member.
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Assign To</InputLabel>
                <Select
                  value={formData.assigned_to}
                  label="Assign To"
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <MenuItem value="">Select team member</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.role_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowAssignModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignSubmit}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={showStatusModal} onClose={() => setShowStatusModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Update Status</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Update status for <strong>{selectedRequest?.service_name}</strong>
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="waiting_client">Waiting for Client</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowStatusModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusSubmit}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ServiceRequestList;
