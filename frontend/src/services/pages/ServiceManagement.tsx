import React, { useEffect, useState } from 'react';
import { useServiceStore } from '../store/useServiceStore';
import {
  Box, Typography, Paper, Button, IconButton, Grid, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  List, ListItem, ListItemButton, ListItemText, Snackbar, Alert
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  ChevronRight as ChevronRightIcon, Settings as SettingsIcon
} from '@mui/icons-material';

const ServiceManagement: React.FC = () => {
  const {
    categories, services, isLoading, fetchCategories, fetchServices,
    createCategory, updateCategory, deleteCategory,
    createService, updateService, deleteService
  } = useServiceStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [modalData, setModalData] = useState<any>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategory) {
      fetchServices(selectedCategory);
    } else {
      fetchServices();
    }
  }, [selectedCategory, fetchServices]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalData.id) {
        await updateCategory(modalData.id, modalData);
        setSnackbar({ open: true, message: 'Category updated successfully', severity: 'success' });
      } else {
        await createCategory(modalData);
        setSnackbar({ open: true, message: 'Category created successfully', severity: 'success' });
      }
      setShowCategoryModal(false);
      setModalData({});
      fetchCategories();
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Operation failed', severity: 'error' });
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...modalData, category: modalData.category || selectedCategory };
    try {
      if (modalData.id) {
        await updateService(modalData.id, data);
        setSnackbar({ open: true, message: 'Service updated successfully', severity: 'success' });
      } else {
        await createService(data);
        setSnackbar({ open: true, message: 'Service created successfully', severity: 'success' });
      }
      setShowServiceModal(false);
      setModalData({});
      fetchServices(selectedCategory || undefined);
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Operation failed', severity: 'error' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        setSnackbar({ open: true, message: 'Category deleted successfully', severity: 'success' });
        if (selectedCategory === id) {
          setSelectedCategory(null);
        }
        fetchCategories();
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Failed to delete category', severity: 'error' });
      }
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteService(id);
        setSnackbar({ open: true, message: 'Service deleted successfully', severity: 'success' });
        fetchServices(selectedCategory || undefined);
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Failed to delete service', severity: 'error' });
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>Service Catalog</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>Manage your service offerings and categories</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setModalData({}); setShowCategoryModal(true); }}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          New Category
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Categories Sidebar */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #f3f4f6', bgcolor: '#f9fafb' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Categories</Typography>
            </Box>
            <List disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  selected={!selectedCategory}
                  onClick={() => setSelectedCategory(null)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: '#eef2ff',
                      borderRight: '4px solid #4f46e5',
                      color: '#4f46e5',
                      '&:hover': { bgcolor: '#eef2ff' }
                    }
                  }}
                >
                  <ListItemText primary="All Services" />
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </ListItemButton>
              </ListItem>
              {(Array.isArray(categories) ? categories : []).map((cat) => (
                <ListItem key={cat.id} disablePadding secondaryAction={
                  <Box>
                    <IconButton edge="end" size="small" onClick={() => { setModalData(cat); setShowCategoryModal(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" size="small" onClick={() => handleDeleteCategory(cat.id)} sx={{ color: '#dc2626' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }>
                  <ListItemButton
                    selected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: '#eef2ff',
                        borderRight: '4px solid #4f46e5',
                        color: '#4f46e5',
                        '&:hover': { bgcolor: '#eef2ff' }
                      }
                    }}
                  >
                    <ListItemText primary={cat.name} />
                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Services List */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {selectedCategory
                  ? (categories as any[]).find(c => c.id === selectedCategory)?.name
                  : 'All Services'}
              </Typography>
              <Button
                variant="text"
                startIcon={<AddIcon />}
                onClick={() => { setModalData({ category: selectedCategory }); setShowServiceModal(true); }}
                sx={{ color: '#4f46e5', fontWeight: 500, '&:hover': { bgcolor: '#eef2ff' } }}
              >
                Add Service
              </Button>
            </Box>
          </Paper>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {(Array.isArray(services) ? services : []).map((service) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.id}>
                  <Paper sx={{
                    p: 2,
                    borderRadius: 2,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                    position: 'relative',
                    transition: 'box-shadow 0.2s'
                  }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, opacity: 0, transition: 'opacity 0.2s', '.MuiPaper-root:hover &': { opacity: 1 } }}>
                      <IconButton size="small" onClick={() => { setModalData(service); setShowServiceModal(true); }} sx={{ color: '#6b7280', '&:hover': { color: '#4f46e5', bgcolor: '#eef2ff' } }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteService(service.id)} sx={{ color: '#6b7280', '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box sx={{ p: 1, bgcolor: '#eef2ff', borderRadius: 1, color: '#4f46e5' }}>
                        <SettingsIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, pr: 3 }}>{service.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 2, minHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {service.description || 'No description provided.'}
                    </Typography>
                    <Box sx={{ pt: 2, borderTop: '1px solid #f3f4f6' }}>
                      <Chip label={service.category_name} size="small" sx={{ bgcolor: '#f3f4f6', color: '#6b7280', fontSize: 12 }} />
                    </Box>
                  </Paper>
                </Grid>
              ))}
              {services.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 6, borderRadius: 2, textAlign: 'center', border: '2px dashed #d1d5db' }}>
                    <Box sx={{ mb: 1 }}>
                      <AddIcon sx={{ fontSize: 40, color: '#d1d5db' }} />
                    </Box>
                    <Typography variant="body1" sx={{ color: '#6b7280' }}>No services found</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>Start by adding your first service to this category.</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onClose={() => setShowCategoryModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{modalData.id ? 'Edit Category' : 'New Category'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Name"
                value={modalData.name || ''}
                onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={modalData.description || ''}
                onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowCategoryModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategory}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Service Modal */}
      <Dialog open={showServiceModal} onClose={() => setShowServiceModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{modalData.id ? 'Edit Service' : 'New Service'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                select
                label="Category"
                value={modalData.category || selectedCategory || ''}
                onChange={(e) => setModalData({ ...modalData, category: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="">Select a category</option>
                {(categories as any[]).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Service Name"
                value={modalData.name || ''}
                onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={modalData.description || ''}
                onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowServiceModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveService}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}>
            Save Service
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ServiceManagement;
