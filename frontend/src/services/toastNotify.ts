import toast from 'react-hot-toast';

export const toastSuccess = (message: string) => {
  toast.success(message, {
    className: 'text-sm font-medium border border-emerald-100 bg-white shadow-lg',
  });
};

export const toastError = (error: any) => {
  if (typeof error === 'string') {
    toast.error(error, {
      className: 'text-sm font-medium border border-rose-100 bg-white shadow-lg',
    });
    return;
  }

  const data = error.response?.data;
  if (!data) {
    toast.error(error.message || 'Connection error', {
      className: 'text-sm font-medium border border-rose-100 bg-white shadow-lg',
    });
    return;
  }

  const messages: string[] = [];
  const flatten = (obj: any) => {
    if (typeof obj === 'string') {
      messages.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(flatten);
    } else if (typeof obj === 'object' && obj !== null) {
      if (obj.detail && typeof obj.detail === 'string') {
        messages.push(obj.detail);
      } else {
        Object.values(obj).forEach(flatten);
      }
    }
  };

  flatten(data);
  const finalMessage = Array.from(new Set(messages)).join(' | ') || 'Operation failed';

  toast.error(finalMessage, {
    className: 'text-sm font-medium border border-rose-100 bg-white shadow-lg max-w-[400px]',
    duration: 5000,
  });
};

export const toastWait = (message: string) => {
  return toast.loading(message, {
    className: 'text-sm font-medium border border-blue-100 bg-white shadow-lg',
  });
};
